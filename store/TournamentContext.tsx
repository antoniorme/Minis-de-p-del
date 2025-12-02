import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { TournamentState, TournamentAction, Player, Pair, Match, Group } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getMatchRating, calculateEloDelta, calculateDisplayRanking, manualToElo } from '../utils/Elo';

const GROUP_NAMES = ['A', 'B', 'C', 'D'];
const STORAGE_KEY = 'padelpro_local_db_v3'; 
export const TOURNAMENT_CATEGORIES = ['Iniciación', '5ª CAT', '4ª CAT', '3ª CAT', '2ª CAT', '1ª CAT'];

export type GenerationMethod = 'elo' | 'manual' | 'arrival';

// --- Logic Helpers ---

// Helper para obtener el ELO combinado de una pareja
// EXPORTADO para usar en UI (Registro)
export const getPairElo = (pair: Pair, players: Player[]): number => {
    const p1 = players.find(p => p.id === pair.player1Id);
    const p2 = players.find(p => p.id === pair.player2Id);
    // Usamos calculateDisplayRanking para tener el valor más realista, o fallback a 1200
    const score1 = p1 ? calculateDisplayRanking(p1) : 1200;
    const score2 = p2 ? calculateDisplayRanking(p2) : 1200;
    return score1 + score2;
};

// Generación de grupos basada en el método seleccionado
const generateGroupsHelper = (pairs: Pair[], players: Player[], method: GenerationMethod = 'manual'): Group[] => {
  let activePairs = pairs.filter(p => !p.isReserve);
  
  if (method === 'elo') {
      // Ordenar por ELO (Mayor a Menor) -> Grupo A los mejores
      activePairs = [...activePairs].sort((a, b) => {
          const eloA = getPairElo(a, players);
          const eloB = getPairElo(b, players);
          return eloB - eloA;
      });
  } else if (method === 'arrival') {
      // Ordenar por ID o fecha de creación (si existe ID secuencial o timestamp)
      // Asumimos que los IDs de BD o local mantienen cierta cronología o usamos created_at si existiera
      // Fallback simple: ordenación por ID string (suele funcionar con timestamps/uuids secuenciales)
      activePairs = [...activePairs].sort((a, b) => (a.id > b.id ? 1 : -1));
  } 
  // method === 'manual': NO HACEMOS SORT, respetamos el orden del array actual (tal como se ve en pantalla)

  activePairs = activePairs.slice(0, 16);

  const groups: Group[] = [];
  for (let i = 0; i < 4; i++) {
    groups.push({
      id: GROUP_NAMES[i],
      pairIds: activePairs.slice(i * 4, (i + 1) * 4).map(p => p.id)
    });
  }
  return groups;
};

// Reconstruye los grupos basándose en los partidos ya generados
// Esto es vital para que al recargar la página (F5) los grupos no vuelvan al orden de creación
const reconstructGroupsFromMatches = (pairs: Pair[], matches: Match[], players: Player[]): Group[] => {
    const groupMap: Record<string, Set<string>> = {
        'A': new Set(), 'B': new Set(), 'C': new Set(), 'D': new Set()
    };

    // Lógica inversa del calendario:
    // Ronda 1, Pista 1 -> Grupo A
    // Ronda 1, Pista 3 -> Grupo B
    // Ronda 1, Pista 5 -> Grupo C
    // Ronda 2, Pista 5 -> Grupo D (El D descansa en R1)

    matches.forEach(m => {
        if (m.phase !== 'group') return;
        
        let targetGroup = '';
        if (m.round === 1) {
            if (m.courtId === 1 || m.courtId === 2) targetGroup = 'A';
            else if (m.courtId === 3 || m.courtId === 4) targetGroup = 'B';
            else if (m.courtId === 5 || m.courtId === 6) targetGroup = 'C';
        } else if (m.round === 2) {
             // Solo necesitamos capturar al D que no jugó en R1
             if (m.courtId === 5 || m.courtId === 6) targetGroup = 'D';
        }

        if (targetGroup && groupMap[targetGroup]) {
            groupMap[targetGroup].add(m.pairAId);
            groupMap[targetGroup].add(m.pairBId);
        }
    });

    // Convertimos sets a arrays y buscamos las parejas que faltan (por si acaso no hay partidos aún)
    const groups: Group[] = GROUP_NAMES.map(name => ({
        id: name,
        pairIds: Array.from(groupMap[name])
    }));

    // Fallback: Si no hay partidos (ej. inicio torneo pero F5 rápido), 
    // RECALCULAMOS por ELO para asegurar que no se pierda el orden de nivel.
    const totalAssigned = groups.reduce((acc, g) => acc + g.pairIds.length, 0);
    if (totalAssigned < 16 && matches.length === 0) {
        // Por defecto al recargar sin partidos, asumimos ELO para seguridad, 
        // aunque idealmente deberíamos persistir el método de generación.
        return generateGroupsHelper(pairs, players, 'elo');
    }

    return groups;
};

const generateGroupMatchesHelper = (groups: Group[]): Partial<Match>[] => {
  const matches: Partial<Match>[] = [];
  const createMatches = (groupId: string, round: number, idxs: number[][], court: number) => {
      const g = groups.find(x => x.id === groupId);
      if(!g) return [];
      return idxs.map((pairIdx, i) => {
          if (!g.pairIds[pairIdx[0]] || !g.pairIds[pairIdx[1]]) return null;
          return {
              round, phase: 'group' as const, bracket: null, courtId: court + i,
              pairAId: g.pairIds[pairIdx[0]], pairBId: g.pairIds[pairIdx[1]],
              scoreA: null, scoreB: null, isFinished: false
          };
      }).filter(Boolean) as Partial<Match>[];
  };
  
  matches.push(...createMatches('A', 1, [[0,1], [2,3]], 1));
  matches.push(...createMatches('B', 1, [[0,1], [2,3]], 3));
  matches.push(...createMatches('C', 1, [[0,1], [2,3]], 5));
  matches.push(...createMatches('A', 2, [[0,2], [1,3]], 1));
  matches.push(...createMatches('B', 2, [[0,2], [1,3]], 3));
  matches.push(...createMatches('D', 2, [[0,1], [2,3]], 5));
  matches.push(...createMatches('A', 3, [[0,3], [1,2]], 1));
  matches.push(...createMatches('C', 3, [[0,2], [1,3]], 3));
  matches.push(...createMatches('D', 3, [[0,2], [1,3]], 5));
  matches.push(...createMatches('B', 4, [[0,3], [1,2]], 1));
  matches.push(...createMatches('C', 4, [[0,3], [1,2]], 3));
  matches.push(...createMatches('D', 4, [[0,3], [1,2]], 5));

  return matches;
};

const recalculateStats = (pairs: Pair[], matches: Match[]) => {
    const statsMap: Record<string, { played: number, won: number, gameDiff: number }> = {};
    pairs.forEach(p => { statsMap[p.id] = { played: 0, won: 0, gameDiff: 0 }; });

    matches.forEach(m => {
        if (!m.isFinished || m.scoreA === null || m.scoreB === null) return;
        if (!statsMap[m.pairAId]) statsMap[m.pairAId] = { played: 0, won: 0, gameDiff: 0 };
        if (!statsMap[m.pairBId]) statsMap[m.pairBId] = { played: 0, won: 0, gameDiff: 0 };
        statsMap[m.pairAId].played += 1;
        statsMap[m.pairAId].gameDiff += (m.scoreA - m.scoreB);
        if (m.scoreA > m.scoreB) statsMap[m.pairAId].won += 1;
        statsMap[m.pairBId].played += 1;
        statsMap[m.pairBId].gameDiff += (m.scoreB - m.scoreA);
        if (m.scoreB > m.scoreA) statsMap[m.pairBId].won += 1;
    });
    return pairs.map(p => ({ ...p, stats: statsMap[p.id] || { played: 0, won: 0, gameDiff: 0 } }));
};

const getRankedPairsForGroup = (pairs: Pair[], groups: Group[], groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return [];
    const groupPairs = group.pairIds.map(pid => pairs.find(p => p.id === pid)).filter(Boolean) as Pair[];
    return groupPairs.sort((a, b) => {
        if (b.stats.won !== a.stats.won) return b.stats.won - a.stats.won;
        return b.stats.gameDiff - a.stats.gameDiff;
    });
};

const inferMatchCategory = (players: Player[]): string => {
    const p = players[0];
    return p?.main_category || p?.categories?.[0] || '4ª CAT';
};

const initialState: TournamentState = {
  status: 'setup',
  currentRound: 0,
  players: [],
  pairs: [],
  matches: [],
  groups: [],
  courts: Array.from({ length: 6 }, (_, i) => ({ id: i + 1, ballsGiven: false })),
  loading: true
};

interface TournamentContextType {
    state: TournamentState;
    dispatch: React.Dispatch<TournamentAction>;
    loadData: () => Promise<void>;
    addPlayerToDB: (p: Partial<Player>) => Promise<string | null>;
    updatePlayerInDB: (p: Partial<Player>) => Promise<void>;
    createPairInDB: (p1: string, p2: string) => Promise<void>;
    updatePairDB: (pairId: string, p1: string, p2: string) => Promise<void>;
    startTournamentDB: (method: GenerationMethod) => Promise<void>;
    updateScoreDB: (matchId: string, sA: number, sB: number) => Promise<void>;
    nextRoundDB: () => Promise<void>;
    deletePairDB: (pairId: string) => Promise<void>;
    archiveAndResetDB: () => Promise<void>;
    regenerateMatchesDB: () => Promise<string>;
    hardResetDB: () => Promise<void>;
    formatPlayerName: (p?: Player) => string;
}

const TournamentContext = createContext<TournamentContextType>({
    state: initialState,
    dispatch: () => null,
    loadData: async () => {},
    addPlayerToDB: async () => null,
    updatePlayerInDB: async () => {},
    createPairInDB: async () => {},
    updatePairDB: async () => {},
    startTournamentDB: async () => {},
    updateScoreDB: async () => {},
    nextRoundDB: async () => {},
    deletePairDB: async () => {},
    archiveAndResetDB: async () => {},
    regenerateMatchesDB: async () => "",
    hardResetDB: async () => {},
    formatPlayerName: () => ''
});

const reducer = (state: TournamentState, action: TournamentAction): TournamentState => {
    switch (action.type) {
        case 'SET_STATE': return { ...state, ...action.payload };
        case 'SET_LOADING': return { ...state, loading: action.payload };
        case 'RESET_LOCAL': return initialState;
        case 'TOGGLE_BALLS': return { ...state, courts: state.courts.map(c => c.id === action.payload ? { ...c, ballsGiven: !c.ballsGiven } : c) };
        case 'TOGGLE_WATER': return { ...state, pairs: state.pairs.map(p => p.id === action.payload ? { ...p, waterReceived: !p.waterReceived } : p) };
        case 'TOGGLE_PAID': return { ...state, pairs: state.pairs.map(p => { if (p.player1Id === action.payload) return { ...p, paidP1: !p.paidP1 }; if (p.player2Id === action.payload) return { ...p, paidP2: !p.paidP2 }; return p; }) };
        case 'LOAD_DEMO_DATA':
             const demoPlayers: Player[] = Array.from({ length: 32 }, (_, i) => ({ id: `demo-p-${i}`, name: `Jugador ${i+1}`, categories: ['4ª CAT'], user_id: 'dev', global_rating: 1200 - (i * 20), main_category: '4ª CAT', category_ratings: { '4ª CAT': 1200 } }));
             const demoPairs: Pair[] = [];
             for(let i=0; i<16; i++) { demoPairs.push({ id: `pair-${i}`, player1Id: demoPlayers[i*2].id, player2Id: demoPlayers[i*2+1].id, name: 'Pareja', waterReceived: false, paidP1: false, paidP2: false, stats: {played:0, won:0, gameDiff:0}, isReserve: false }); }
             return { ...state, players: demoPlayers, pairs: demoPairs, status: 'setup' };
        default: return state;
    }
};

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const { user, isOfflineMode } = useAuth();

    const loadData = useCallback(async () => {
        if (!user) return;
        dispatch({ type: 'SET_LOADING', payload: true });

        if (isOfflineMode) {
            const localData = localStorage.getItem(STORAGE_KEY);
            if (localData) {
                dispatch({ type: 'SET_STATE', payload: JSON.parse(localData) });
            } else {
                dispatch({ type: 'SET_STATE', payload: { players: [], pairs: [], status: 'setup' } });
            }
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
        }

        try {
            const { data: players } = await supabase.from('players').select('*').eq('user_id', user.id).order('name');
            const { data: tournaments } = await supabase.from('tournaments').select('*').eq('user_id', user.id).neq('status', 'finished').limit(1);
            const activeTournament = tournaments?.[0];

            if (!activeTournament) {
                dispatch({ type: 'SET_STATE', payload: { id: undefined, status: 'setup', players: players || [], pairs: [], matches: [], groups: [] } });
            } else {
                const { data: pairs } = await supabase.from('tournament_pairs').select('*').eq('tournament_id', activeTournament.id).order('created_at', { ascending: true });
                const { data: matches } = await supabase.from('matches').select('*').eq('tournament_id', activeTournament.id);
                
                let mappedPairs: Pair[] = (pairs || []).map(p => ({
                    id: p.id, tournament_id: p.tournament_id, player1Id: p.player1_id, player2Id: p.player2_id,
                    name: p.name || 'Pareja', waterReceived: p.water_received, paidP1: p.paid_p1, paidP2: p.paid_p2,
                    stats: { played: 0, won: 0, gameDiff: 0 }, 
                    isReserve: false 
                }));

                // Mark reserves based on index
                mappedPairs = mappedPairs.map((p, idx) => ({ ...p, isReserve: idx >= 16 }));

                const mappedMatches: Match[] = (matches || []).map(m => ({
                    id: m.id, round: m.round, phase: (m as any).phase || 'group', bracket: m.bracket as any,
                    courtId: m.court_id, pairAId: m.pair_a_id, pairBId: m.pair_b_id,
                    scoreA: m.score_a, scoreB: m.score_b, isFinished: m.is_finished,
                    elo_processed: (m as any).elo_processed
                }));

                mappedPairs = recalculateStats(mappedPairs, mappedMatches);
                
                // IMPORTANT: If matches exist, we MUST reconstruct groups from matches to maintain ELO seeding consistency on refresh
                let groups: Group[] = [];
                if (mappedMatches.length > 0) {
                    groups = reconstructGroupsFromMatches(mappedPairs, mappedMatches, players || []);
                } else {
                    // Fallback para estado activo sin partidos
                    const isSetup = activeTournament.status === 'setup';
                    groups = generateGroupsHelper(mappedPairs, players || [], isSetup ? 'manual' : 'elo');
                }

                if (activeTournament.current_round > 0 && mappedMatches.length === 0) {
                     console.warn("CORRUPTED STATE DETECTED. Resetting tournament to setup.");
                     await supabase.from('matches').delete().eq('tournament_id', activeTournament.id);
                     await supabase.from('tournaments').update({ status: 'setup', current_round: 0 }).eq('id', activeTournament.id);
                     dispatch({ type: 'SET_STATE', payload: { 
                        id: activeTournament.id, status: 'setup', currentRound: 0, players: players || [], pairs: mappedPairs, matches: [], groups: groups 
                     }});
                } else {
                    dispatch({ type: 'SET_STATE', payload: {
                        id: activeTournament.id, status: activeTournament.status as any, currentRound: activeTournament.current_round || 0,
                        players: players || [], pairs: mappedPairs, matches: mappedMatches, groups: groups
                    }});
                }
            }
        } catch (e) {
            console.warn("Supabase load error:", e);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [user, isOfflineMode]);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        if(isOfflineMode && state.players.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
    }, [state, isOfflineMode]);

    // --- ACTIONS ---

    const addPlayerToDB = async (p: Partial<Player>): Promise<string | null> => {
        // Init ELO based on manual rating if present, else 1200
        const initialElo = p.manual_rating ? manualToElo(p.manual_rating) : 1200;

        const newP = { 
            ...p, 
            global_rating: initialElo, 
            category_ratings: {}, 
            main_category: p.categories?.[0] || 'Iniciación', 
            matches_played: 0 
        };

        if (isOfflineMode) {
            const newId = `local-${Date.now()}`;
            dispatch({ type: 'SET_STATE', payload: { players: [...state.players, { ...newP, id: newId } as Player] } });
            return newId;
        }
        
        const { data, error } = await supabase.from('players').insert({ 
            user_id: user!.id, name: p.name, nickname: p.nickname, email: p.email, phone: p.phone, categories: p.categories,
            global_rating: initialElo, main_category: newP.main_category, category_ratings: {}, manual_rating: p.manual_rating
        }).select().single();
        
        if(error || !data) return null;
        loadData();
        return data.id;
    };

    const updatePlayerInDB = async (p: Partial<Player>) => {
        if (isOfflineMode) {
             const updated = state.players.map(pl => pl.id === p.id ? { ...pl, ...p } as Player : pl);
             dispatch({ type: 'SET_STATE', payload: { players: updated } });
             return;
        }
        if(!p.id) return;
        await supabase.from('players').update({ name: p.name, nickname: p.nickname, email: p.email, phone: p.phone, categories: p.categories, manual_rating: p.manual_rating }).eq('id', p.id);
        loadData();
    }

    const createPairInDB = async (p1: string, p2: string) => {
        const activePairCount = state.pairs.length;
        const isReserve = activePairCount >= 16;

        if (isOfflineMode) {
            const newPair = { 
                id: `pair-${Date.now()}`, player1Id: p1, player2Id: p2, name: 'Pareja', 
                waterReceived: false, paidP1: false, paidP2: false, 
                stats: { played: 0, won: 0, gameDiff: 0 }, 
                isReserve // Set Reserve Status
            };
            dispatch({ type: 'SET_STATE', payload: { pairs: [...state.pairs, newPair] } });
            return;
        }
        let tId = state.id;
        if (!tId) {
            const { data } = await supabase.from('tournaments').insert({ user_id: user!.id, status: 'setup', current_round: 0 }).select().single();
            if(data) tId = data.id;
        }
        if(tId) {
            await supabase.from('tournament_pairs').insert({ 
                tournament_id: tId, player1_id: p1, player2_id: p2, name: `Pareja`
                // Note: isReserve status is derived from order in this simplified schema, 
                // but ideally we would store it. For now, we rely on created_at order.
            });
            loadData();
        }
    };

    const updatePairDB = async (pairId: string, p1: string, p2: string) => {
        if (isOfflineMode) {
            const updatedPairs = state.pairs.map(p => p.id === pairId ? { ...p, player1Id: p1, player2Id: p2 } : p);
            dispatch({ type: 'SET_STATE', payload: { pairs: updatedPairs } });
            return;
        }
        await supabase.from('tournament_pairs').update({ player1_id: p1, player2_id: p2 }).eq('id', pairId);
        loadData();
    };

    const deletePairDB = async (pairId: string) => {
        if (isOfflineMode) {
            const filtered = state.pairs.filter(p => p.id !== pairId);
            // RECALCULATE RESERVES IMMEDIATELY for offline mode
            const reindexed = filtered.map((p, idx) => ({ ...p, isReserve: idx >= 16 }));
            dispatch({ type: 'SET_STATE', payload: { pairs: reindexed } });
            return;
        }
        // If deleting from DB, simply delete.
        await supabase.from('tournament_pairs').delete().eq('id', pairId);
        
        // Optimistic update locally to fix the "missing main player" bug immediately
        const filtered = state.pairs.filter(p => p.id !== pairId);
        const reindexed = filtered.map((p, idx) => ({ ...p, isReserve: idx >= 16 }));
        dispatch({ type: 'SET_STATE', payload: { pairs: reindexed } });

        // Trigger full reload to sync
        loadData();
    }

    const regenerateMatchesDB = async (): Promise<string> => {
        if (isOfflineMode || !state.id) return "Offline";
        const groups = generateGroupsHelper(state.pairs, state.players, 'manual'); 
        const matches = generateGroupMatchesHelper(groups);
        const { data: existingMatches } = await supabase.from('matches').select('round, pair_a_id, pair_b_id').eq('tournament_id', state.id);
        const matchesToInsert = matches.filter(m => {
            const exists = existingMatches?.some(ex => ex.round === m.round && ((ex.pair_a_id === m.pairAId && ex.pair_b_id === m.pairBId) || (ex.pair_a_id === m.pairBId && ex.pair_b_id === m.pairAId)));
            return !exists;
        });
        if (matchesToInsert.length > 0) {
            const dbMatches = matchesToInsert.map(m => ({
                tournament_id: state.id!, round: m.round, court_id: m.courtId, pair_a_id: m.pairAId, pair_b_id: m.pairBId, is_finished: false
            }));
            await supabase.from('matches').insert(dbMatches);
            loadData();
            return `Regenerados ${matchesToInsert.length} partidos.`;
        } else {
            return "No se detectaron partidos faltantes.";
        }
    };

    const startTournamentDB = async (method: GenerationMethod) => {
        const activePairs = state.pairs.filter(p => !p.isReserve);
        if (activePairs.length !== 16) {
            throw new Error(`Se necesitan 16 parejas titulares. Tienes ${activePairs.length}.`);
        }
        
        // --- GROUP GENERATION WITH SELECTED METHOD ---
        const groups = generateGroupsHelper(state.pairs, state.players, method);
        const matches = generateGroupMatchesHelper(groups);

        if (isOfflineMode) {
            const localMatches = matches.map((m, i) => ({ ...m, id: `match-${i}`, scoreA: null, scoreB: null, isFinished: false } as Match));
            dispatch({ type: 'SET_STATE', payload: { status: 'active', currentRound: 1, groups, matches: localMatches } });
            return;
        }
        if (!state.id) return;
        
        // CLEAN START
        await supabase.from('matches').delete().eq('tournament_id', state.id);

        const dbMatches = matches.map(m => ({
            tournament_id: state.id!, round: m.round, court_id: m.courtId,
            pair_a_id: m.pairAId, pair_b_id: m.pairBId, is_finished: false, phase: 'group'
        }));
        const { error } = await supabase.from('matches').insert(dbMatches);
        if (!error) {
            await supabase.from('tournaments').update({ status: 'active', current_round: 1 }).eq('id', state.id);
            loadData();
        }
    };

    const updateScoreDB = async (matchId: string, sA: number, sB: number) => {
        if (isOfflineMode) {
            const newMatches = state.matches.map(m => m.id === matchId ? { ...m, scoreA: sA, scoreB: sB, isFinished: true } : m);
            const newPairs = recalculateStats(state.pairs, newMatches);
            dispatch({ type: 'SET_STATE', payload: { matches: newMatches, pairs: newPairs } });
            return;
        }

        await supabase.from('matches').update({ score_a: sA, score_b: sB, is_finished: true }).eq('id', matchId);
        
        const newMatches = state.matches.map(m => m.id === matchId ? { ...m, scoreA: sA, scoreB: sB, isFinished: true } : m);
        const newPairs = recalculateStats(state.pairs, newMatches);
        dispatch({ type: 'SET_STATE', payload: { matches: newMatches, pairs: newPairs } });

        // ELO Calculation
        const match = state.matches.find(m => m.id === matchId);
        if (match && !match.elo_processed) {
            const pairA = state.pairs.find(p => p.id === match.pairAId);
            const pairB = state.pairs.find(p => p.id === match.pairBId);
            if (pairA && pairB) {
                const p1 = state.players.find(p => p.id === pairA.player1Id);
                const p2 = state.players.find(p => p.id === pairA.player2Id);
                const p3 = state.players.find(p => p.id === pairB.player1Id);
                const p4 = state.players.find(p => p.id === pairB.player2Id);

                if (p1 && p2 && p3 && p4) {
                    const matchCategory = inferMatchCategory([p1, p2, p3, p4]);
                    const r1 = getMatchRating(p1, matchCategory);
                    const r2 = getMatchRating(p2, matchCategory);
                    const r3 = getMatchRating(p3, matchCategory);
                    const r4 = getMatchRating(p4, matchCategory);

                    const avgEloA = (r1 + r2) / 2;
                    const avgEloB = (r3 + r4) / 2;
                    const delta = calculateEloDelta(avgEloA, avgEloB, sA, sB);

                    const applyUpdate = async (p: Player, d: number) => {
                        const newRatings = { ...p.category_ratings } || {};
                        const currentCatRating = newRatings[matchCategory] || (p.global_rating || 1200);
                        newRatings[matchCategory] = Math.round(currentCatRating + d);
                        const newGlobal = Math.round((p.global_rating || 1200) + (d * 0.25)); 
                        await supabase.from('players').update({ global_rating: newGlobal, category_ratings: newRatings, matches_played: (p.matches_played || 0) + 1 }).eq('id', p.id);
                    };

                    await Promise.all([applyUpdate(p1, delta), applyUpdate(p2, delta), applyUpdate(p3, -delta), applyUpdate(p4, -delta)]);
                    await supabase.from('matches').update({ elo_processed: true } as any).eq('id', matchId);
                }
            }
        }
    };

    const nextRoundDB = async () => {
        const nextR = state.currentRound + 1;
        let playoffMatches: Partial<Match>[] = [];

        // FINISH GROUP PHASE -> GENERATE QF (Round 5)
        if (state.currentRound === 4) {
            const pairsWithStats = recalculateStats(state.pairs, state.matches);
            const rankingsA = getRankedPairsForGroup(pairsWithStats, state.groups, 'A');
            const rankingsB = getRankedPairsForGroup(pairsWithStats, state.groups, 'B');
            const rankingsC = getRankedPairsForGroup(pairsWithStats, state.groups, 'C');
            const rankingsD = getRankedPairsForGroup(pairsWithStats, state.groups, 'D');

            const safeGet = (arr: Pair[], idx: number) => arr[idx] || arr[0] || state.pairs[0];

            // MAIN DRAW (1st & 2nd)
            playoffMatches.push({ round: 5, bracket: 'main', phase: 'qf', courtId: 1, pairAId: safeGet(rankingsA, 0).id, pairBId: safeGet(rankingsC, 1).id }); // 1A vs 2C
            playoffMatches.push({ round: 5, bracket: 'main', phase: 'qf', courtId: 2, pairAId: safeGet(rankingsC, 0).id, pairBId: safeGet(rankingsA, 1).id }); // 1C vs 2A
            playoffMatches.push({ round: 5, bracket: 'main', phase: 'qf', courtId: 3, pairAId: safeGet(rankingsB, 0).id, pairBId: safeGet(rankingsD, 1).id }); // 1B vs 2D
            playoffMatches.push({ round: 5, bracket: 'main', phase: 'qf', courtId: 4, pairAId: safeGet(rankingsD, 0).id, pairBId: safeGet(rankingsB, 1).id }); // 1D vs 2B

            // CONSOLATION DRAW (3rd & 4th)
            playoffMatches.push({ round: 5, bracket: 'consolation', phase: 'qf', courtId: 5, pairAId: safeGet(rankingsA, 2).id, pairBId: safeGet(rankingsC, 3).id }); // 3A vs 4C
            playoffMatches.push({ round: 5, bracket: 'consolation', phase: 'qf', courtId: 6, pairAId: safeGet(rankingsC, 2).id, pairBId: safeGet(rankingsA, 3).id }); // 3C vs 4A
            playoffMatches.push({ round: 5, bracket: 'consolation', phase: 'qf', courtId: 5, pairAId: safeGet(rankingsB, 2).id, pairBId: safeGet(rankingsD, 3).id }); // 3B vs 4D
            playoffMatches.push({ round: 5, bracket: 'consolation', phase: 'qf', courtId: 6, pairAId: safeGet(rankingsD, 2).id, pairBId: safeGet(rankingsB, 3).id }); // 3D vs 4B
        }

        // GENERATE SF (Round 6)
        else if (state.currentRound === 5) {
            const qfMatches = state.matches.filter(m => m.round === 5);
            // const getWinner = (matches: Match[], idx: number) => { ... } // Unused helper
            
            // Main Bracket Matches 
            const mainQF = qfMatches.filter(m => m.bracket === 'main');
            const main1 = mainQF.find(m => m.courtId === 1);
            const main2 = mainQF.find(m => m.courtId === 2);
            const main3 = mainQF.find(m => m.courtId === 3);
            const main4 = mainQF.find(m => m.courtId === 4);

            const wMain1 = main1 ? ((main1.scoreA||0)>(main1.scoreB||0)?main1.pairAId:main1.pairBId) : null;
            const wMain2 = main2 ? ((main2.scoreA||0)>(main2.scoreB||0)?main2.pairAId:main2.pairBId) : null;
            const wMain3 = main3 ? ((main3.scoreA||0)>(main3.scoreB||0)?main3.pairAId:main3.pairBId) : null;
            const wMain4 = main4 ? ((main4.scoreA||0)>(main4.scoreB||0)?main4.pairAId:main4.pairBId) : null;

            if (wMain1 && wMain3) playoffMatches.push({ round: 6, bracket: 'main', phase: 'sf', courtId: 1, pairAId: wMain1, pairBId: wMain3 });
            if (wMain2 && wMain4) playoffMatches.push({ round: 6, bracket: 'main', phase: 'sf', courtId: 2, pairAId: wMain2, pairBId: wMain4 });

            // Consolation
            const consQF = qfMatches.filter(m => m.bracket === 'consolation');
            if (consQF.length >= 4) {
                 const getW = (m: Match) => (m.scoreA || 0) > (m.scoreB || 0) ? m.pairAId : m.pairBId;
                 // Assuming array order matches pair creation order for consolation 3A vs 4C etc.
                 playoffMatches.push({ round: 6, bracket: 'consolation', phase: 'sf', courtId: 3, pairAId: getW(consQF[0]), pairBId: getW(consQF[2]) });
                 playoffMatches.push({ round: 6, bracket: 'consolation', phase: 'sf', courtId: 4, pairAId: getW(consQF[1]), pairBId: getW(consQF[3]) });
            }
        }

        // GENERATE FINALS (Round 7)
        else if (state.currentRound === 6) {
             const sfMatches = state.matches.filter(m => m.round === 6);
             const getWinner = (court: number, bracket: string) => {
                 const m = sfMatches.find(m => m.courtId === court && m.bracket === bracket);
                 return m ? ((m.scoreA || 0) > (m.scoreB || 0) ? m.pairAId : m.pairBId) : null;
             };

             const wSF1 = getWinner(1, 'main');
             const wSF2 = getWinner(2, 'main');
             if (wSF1 && wSF2) playoffMatches.push({ round: 7, bracket: 'main', phase: 'final', courtId: 1, pairAId: wSF1, pairBId: wSF2 });

             const wSFC1 = getWinner(3, 'consolation');
             const wSFC2 = getWinner(4, 'consolation');
             if (wSFC1 && wSFC2) playoffMatches.push({ round: 7, bracket: 'consolation', phase: 'final', courtId: 2, pairAId: wSFC1, pairBId: wSFC2 });
        }

        if (playoffMatches.length > 0) {
             const dbMatches = playoffMatches.map(m => ({
                tournament_id: state.id!, round: m.round, court_id: m.courtId,
                pair_a_id: m.pairAId, pair_b_id: m.pairBId, is_finished: false, bracket: m.bracket, phase: m.phase
             }));
             
             if (isOfflineMode) {
                 const newMatches = [...state.matches, ...playoffMatches.map((m, i) => ({ ...m, id: `po-${Date.now()}-${i}`, scoreA: null, scoreB: null, isFinished: false } as Match))];
                 dispatch({ type: 'SET_STATE', payload: { currentRound: nextR, matches: newMatches } });
             } else {
                 await supabase.from('matches').insert(dbMatches);
                 await supabase.from('tournaments').update({ current_round: nextR }).eq('id', state.id);
                 loadData();
             }
        } else {
             if (state.currentRound >= 7) {
                 if(isOfflineMode) {
                     dispatch({ type: 'SET_STATE', payload: { status: 'finished' } });
                 } else {
                    await supabase.from('tournaments').update({ status: 'finished' }).eq('id', state.id);
                    loadData();
                 }
             }
        }
    };

    const archiveAndResetDB = async () => {
         if (isOfflineMode) {
             dispatch({ type: 'RESET_LOCAL' });
             return;
         }
         if (state.id) {
             await supabase.from('tournaments').update({ status: 'finished' }).eq('id', state.id);
             dispatch({ type: 'RESET_LOCAL' });
         }
    };

    const hardResetDB = async () => { 
        if(isOfflineMode) {
            localStorage.removeItem(STORAGE_KEY);
            window.location.reload();
            return;
        }
        if(state.id) {
             await supabase.from('matches').delete().eq('tournament_id', state.id);
             await supabase.from('tournament_pairs').delete().eq('tournament_id', state.id);
             await supabase.from('tournaments').delete().eq('id', state.id);
             loadData();
        }
    };

    const formatPlayerName = (p?: Player) => {
        if (!p) return 'Jugador';
        if (p.nickname) return p.nickname;
        
        const parts = p.name.trim().split(/\s+/);
        if (parts.length >= 2) {
            const firstName = parts[0];
            const lastName = parts[1];
            // Aseguramos que tenga al menos 1 letra para evitar errores
            return `${firstName} ${lastName.substring(0, 3)}.`;
        }
        return parts[0];
    };

    return (
        <TournamentContext.Provider value={{
            state, dispatch, loadData, addPlayerToDB, updatePlayerInDB, createPairInDB, updatePairDB,
            startTournamentDB, updateScoreDB, nextRoundDB, deletePairDB, archiveAndResetDB, regenerateMatchesDB,
            hardResetDB, formatPlayerName
        }}>
            {children}
        </TournamentContext.Provider>
    );
};

export const useTournament = () => useContext(TournamentContext);