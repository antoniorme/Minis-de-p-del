
import React, { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import { TournamentState, TournamentAction, Player, Pair, Match, Group, TournamentFormat, GenerationMethod, TournamentSummary } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useHistory } from './HistoryContext'; 
import { useNotifications } from './NotificationContext'; 
import * as Logic from '../utils/TournamentLogic';

const STORAGE_KEY = 'padelpro_local_db_v3';
const LOCAL_HISTORY_KEY = 'padelpro_local_history'; 
const PENDING_SCORES_KEY = 'padelpro_pending_scores';

export const TOURNAMENT_CATEGORIES = ['Iniciación', '5ª CAT', '4ª CAT', '3ª CAT', '2ª CAT', '1ª CAT'];

const initialState: TournamentState = {
  status: 'finished', // Default to finished/idle
  currentRound: 0, format: '16_mini', players: [], pairs: [], matches: [], groups: [], courts: [], loading: true,
  tournamentList: [],
  title: 'Mini Torneo', price: 15, prizes: [], includedItems: ['Bolas Nuevas', 'Agua'], levelRange: 'Abierto'
};

interface PendingScore {
    matchId: string;
    scoreA: number;
    scoreB: number;
    timestamp: number;
}

interface TournamentContextType {
    state: TournamentState; dispatch: React.Dispatch<TournamentAction>; loadData: () => Promise<void>;
    addPlayerToDB: (p: Partial<Player>, ownerId?: string) => Promise<string | null>; updatePlayerInDB: (p: Partial<Player>) => Promise<void>;
    deletePlayerDB: (id: string) => Promise<void>;
    createPairInDB: (p1: string, p2: string | null, status?: 'confirmed' | 'pending') => Promise<string | null>; 
    updatePairDB: (pairId: string, p1: string, p2: string) => Promise<void>;
    assignPartnerDB: (pairId: string, partnerId: string, mergeWithPairId?: string) => Promise<void>;
    startTournamentDB: (method: GenerationMethod, customOrderedPairs?: Pair[]) => Promise<void>;
    updateScoreDB: (matchId: string, sA: number, sB: number) => Promise<void>; nextRoundDB: () => Promise<void>;
    deletePairDB: (pairId: string) => Promise<void>; archiveAndResetDB: () => Promise<void>; resetToSetupDB: () => Promise<void>; 
    regenerateMatchesDB: () => Promise<string>; hardResetDB: () => Promise<void>; formatPlayerName: (p?: Player) => string;
    setTournamentFormat: (fmt: TournamentFormat) => Promise<void>;
    getPairElo: (pair: Pair, players: Player[]) => number;
    substitutePairDB: (activePairId: string, reservePairId: string) => Promise<void>;
    finishTournamentDB: () => Promise<void>;
    respondToInviteDB: (pairId: string, action: 'accept' | 'reject') => Promise<void>;
    updateTournamentSettings: (settings: Partial<TournamentState>) => Promise<void>;
    createNewTournament: (metadata: Partial<TournamentState>) => Promise<void>;
    
    // NEW MULTI-TOURNAMENT METHODS
    fetchTournamentList: () => Promise<void>;
    selectTournament: (tournamentId: string) => Promise<void>;
    closeTournament: () => void;

    togglePaymentDB: (playerId: string, pairId: string, isP1: boolean) => Promise<void>;
    toggleWaterDB: (pairId: string) => Promise<void>;
    toggleBallsDB: (courtId: number) => Promise<void>;
    
    pendingSyncCount: number; // Expose to UI
}

const TournamentContext = createContext<TournamentContextType>({
    state: initialState, dispatch: () => null, loadData: async () => {}, 
    addPlayerToDB: async () => null, updatePlayerInDB: async () => {}, deletePlayerDB: async () => {},
    createPairInDB: async () => null, updatePairDB: async () => {}, assignPartnerDB: async () => {}, startTournamentDB: async () => {}, updateScoreDB: async () => {}, nextRoundDB: async () => {},
    deletePairDB: async () => {}, archiveAndResetDB: async () => {}, resetToSetupDB: async () => {}, regenerateMatchesDB: async () => "", hardResetDB: async () => {},
    formatPlayerName: () => '', setTournamentFormat: async () => {}, getPairElo: () => 1200, substitutePairDB: async () => {},
    finishTournamentDB: async () => {}, respondToInviteDB: async () => {}, updateTournamentSettings: async () => {},
    createNewTournament: async () => {},
    fetchTournamentList: async () => {}, selectTournament: async () => {}, closeTournament: () => {},
    togglePaymentDB: async () => {}, toggleWaterDB: async () => {}, toggleBallsDB: async () => {},
    pendingSyncCount: 0
});

const reducer = (state: TournamentState, action: TournamentAction): TournamentState => {
    switch (action.type) {
        case 'SET_STATE': return { ...state, ...action.payload };
        case 'SET_TOURNAMENT_LIST': return { ...state, tournamentList: action.payload };
        case 'SET_FORMAT': return { ...state, format: action.payload };
        case 'UPDATE_SETTINGS': return { ...state, ...action.payload };
        case 'SET_LOADING': return { ...state, loading: action.payload };
        case 'RESET_LOCAL': return { ...initialState, players: state.players }; 
        case 'TOGGLE_BALLS': return { ...state, courts: state.courts.map(c => c.id === action.payload ? { ...c, ballsGiven: !c.ballsGiven } : c) };
        case 'TOGGLE_WATER': return { ...state, pairs: state.pairs.map(p => p.id === action.payload ? { ...p, waterReceived: !p.waterReceived } : p) };
        case 'TOGGLE_PAID': return { ...state, pairs: state.pairs.map(p => { if (p.player1Id === action.payload) return { ...p, paidP1: !p.paidP1 }; if (p.player2Id === action.payload) return { ...p, paidP2: !p.paidP2 }; return p; }) };
        case 'LOAD_DEMO_DATA': return { ...state, status: 'setup', format: '16_mini' };
        default: return state;
    }
};

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const { user, isOfflineMode, isOnline } = useAuth();
    const { clubData } = useHistory(); 
    const { addNotification } = useNotifications(); 
    const [pendingSyncCount, setPendingSyncCount] = useState(0);

    // SYNC LOGIC
    useEffect(() => {
        // Load initial pending count
        const pending = localStorage.getItem(PENDING_SCORES_KEY);
        if (pending) setPendingSyncCount(JSON.parse(pending).length);
    }, []);

    // Effect to process queue when Online
    useEffect(() => {
        const processQueue = async () => {
            if (!isOnline) return;
            const pendingStr = localStorage.getItem(PENDING_SCORES_KEY);
            if (!pendingStr) return;

            const queue: PendingScore[] = JSON.parse(pendingStr);
            if (queue.length === 0) return;

            console.log(`[Sync] Processing ${queue.length} pending scores...`);
            
            // Process sequentially to ensure consistency
            const failed: PendingScore[] = [];
            
            for (const item of queue) {
                try {
                    const { error } = await supabase.from('matches').update({ 
                        score_a: item.scoreA, 
                        score_b: item.scoreB, 
                        is_finished: true 
                    }).eq('id', item.matchId);
                    
                    if (error) throw error;
                } catch (e) {
                    console.error("[Sync] Failed item:", item, e);
                    failed.push(item);
                }
            }

            if (failed.length === 0) {
                localStorage.removeItem(PENDING_SCORES_KEY);
                setPendingSyncCount(0);
                console.log("[Sync] All Synced!");
            } else {
                localStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(failed));
                setPendingSyncCount(failed.length);
            }
        };

        if (isOnline) {
            processQueue();
        }
    }, [isOnline]);

    const checkOnline = () => {
        if (!isOnline && !isOfflineMode) throw new Error("Sin conexión a internet. No se pueden guardar cambios (excepto resultados).");
    };

    const formatPlayerName = useCallback((p?: Player) => {
        if (!p) return 'Jugador';
        if (p.nickname) return p.nickname;
        const parts = p.name.trim().split(/\s+/);
        if (parts.length >= 2) return `${parts[0]} ${parts[1].substring(0, 3)}.`;
        return parts[0];
    }, []);

    // 1. FETCH PLAYERS
    const loadPlayers = useCallback(async () => {
        if (!user && !isOfflineMode) return [];
        if (isOfflineMode) {
            const localData = localStorage.getItem(STORAGE_KEY);
            return localData ? JSON.parse(localData).players || [] : [];
        }
        // No checkOnline() here to allow reading cache or empty list if offline on load
        const { data: players } = await supabase.from('players').select('*').eq('user_id', user!.id).order('name');
        return players || [];
    }, [user, isOfflineMode]);

    // 2. FETCH TOURNAMENT LIST
    const fetchTournamentList = useCallback(async () => {
        if (!user && !isOfflineMode) return;
        if (isOfflineMode) {
            const localData = localStorage.getItem(STORAGE_KEY);
            if (localData) {
                const parsed = JSON.parse(localData);
                if (parsed.status !== 'finished' || parsed.id) {
                    dispatch({ type: 'SET_TOURNAMENT_LIST', payload: [{
                        id: parsed.id || 'local-active',
                        title: parsed.title || 'Torneo Local',
                        date: parsed.startDate || new Date().toISOString(),
                        status: parsed.status,
                        format: parsed.format,
                        playerCount: (parsed.pairs || []).length
                    }]});
                }
            }
            return;
        }

        // Allow fetching list even if offline (returns empty or cached by browser)
        if (!isOnline) return; 

        const { data: tournaments } = await supabase
            .from('tournaments')
            .select('*')
            .eq('user_id', user!.id)
            .neq('status', 'finished')
            .order('date', { ascending: true });

        if (tournaments) {
            const tIds = tournaments.map(t => t.id);
            const { data: allPairs } = await supabase
                .from('tournament_pairs')
                .select('tournament_id, status, player2_id')
                .in('tournament_id', tIds);

            const summaries: TournamentSummary[] = tournaments.map(t => {
                const count = allPairs 
                    ? allPairs.filter(p => p.tournament_id === t.id && p.status !== 'rejected').length 
                    : 0;
                return {
                    id: t.id,
                    title: t.title || 'Sin Título',
                    date: t.date,
                    status: t.status as any,
                    format: t.format,
                    playerCount: count
                }
            });
            dispatch({ type: 'SET_TOURNAMENT_LIST', payload: summaries });
        }
    }, [user, isOfflineMode, isOnline]);

    // 3. SELECT TOURNAMENT
    const selectTournament = useCallback(async (tournamentId: string) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        const courts = Array.from({ length: clubData.courtCount }, (_, i) => ({ id: i + 1, ballsGiven: false }));
        const players = await loadPlayers();

        if (isOfflineMode) {
            const localData = localStorage.getItem(STORAGE_KEY);
            if (localData) {
                const parsed = JSON.parse(localData);
                dispatch({ type: 'SET_STATE', payload: { ...parsed, players, courts } });
            }
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
        }

        if (!isOnline) {
            dispatch({ type: 'SET_LOADING', payload: false });
            // Should probably show an error or empty state if strictly online required
            return; 
        }

        try {
            const { data: tournament } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();
            if (!tournament) throw new Error("Torneo no encontrado");

            const { data: pairs } = await supabase.from('tournament_pairs').select('*').eq('tournament_id', tournamentId).order('created_at', { ascending: true });
            const { data: matches } = await supabase.from('matches').select('*').eq('tournament_id', tournamentId);

            const format: TournamentFormat = tournament.format || '16_mini';
            let limit = 16;
            if(format === '10_mini') limit = 10;
            if(format === '12_mini') limit = 12;
            if(format === '8_mini') limit = 8;

            let mappedPairs: Pair[] = (pairs || []).map(p => ({
                id: p.id, tournament_id: p.tournament_id, player1Id: p.player1_id, player2Id: p.player2_id,
                name: p.name || 'Pareja', waterReceived: p.water_received, paidP1: p.paid_p1, paidP2: p.paid_p2,
                stats: { played: 0, won: 0, gameDiff: 0 }, isReserve: false, status: p.status || 'confirmed'
            }));

            const mappedMatches: Match[] = (matches || []).map(m => {
                const isGroupStage = (format === '16_mini' && m.round <= 4) || (format !== '16_mini' && m.round <= 3);
                return {
                    id: m.id, round: m.round, 
                    phase: m.phase || (isGroupStage ? 'group' : 'qf'),
                    bracket: m.bracket as any,
                    courtId: m.court_id, pairAId: m.pair_a_id, pairBId: m.pair_b_id,
                    scoreA: m.score_a, scoreB: m.score_b, isFinished: m.is_finished
                };
            });

            // APPLY PENDING SCORES FROM QUEUE TO LOCAL STATE FOR UI CONSISTENCY
            const pendingStr = localStorage.getItem(PENDING_SCORES_KEY);
            if (pendingStr) {
                const pending: PendingScore[] = JSON.parse(pendingStr);
                pending.forEach(p => {
                    const matchIdx = mappedMatches.findIndex(m => m.id === p.matchId);
                    if (matchIdx >= 0) {
                        mappedMatches[matchIdx] = { ...mappedMatches[matchIdx], scoreA: p.scoreA, scoreB: p.scoreB, isFinished: true };
                    }
                });
            }

            mappedPairs = Logic.recalculateStats(mappedPairs, mappedMatches);
            
            let groups: Group[] = [];
            if (mappedMatches.length > 0) {
                 groups = Logic.reconstructGroupsFromMatches(mappedPairs, mappedMatches, players, format);
            } else {
                const isSetup = tournament.status === 'setup';
                if (!isSetup) groups = Logic.generateGroupsHelper(mappedPairs, players, 'elo-balanced', format); 
            }

            if (groups.length > 0) {
                 const activeIds = new Set(groups.flatMap(g => g.pairIds));
                 mappedPairs = mappedPairs.map(p => ({ ...p, isReserve: !activeIds.has(p.id) }));
            } else {
                 const completeConfirmed = mappedPairs.filter(p => p.player2Id && p.status === 'confirmed');
                 const others = mappedPairs.filter(p => !p.player2Id || p.status !== 'confirmed');
                 const completeConfirmedWithReserves = completeConfirmed.map((p, idx) => ({ ...p, isReserve: idx >= limit }));
                 mappedPairs = [...completeConfirmedWithReserves, ...others.map(p => ({...p, isReserve: true}))];
            }

            const tempKey = `padelpro_courts_${tournament.id}`;
            const savedCourts = localStorage.getItem(tempKey);
            const finalCourts = savedCourts ? JSON.parse(savedCourts) : courts;

            dispatch({ type: 'SET_STATE', payload: {
                id: tournament.id, 
                status: tournament.status as any, 
                currentRound: tournament.current_round || 0,
                players: players, 
                pairs: mappedPairs, 
                matches: mappedMatches, 
                groups: groups, 
                format, 
                courts: finalCourts,
                title: tournament.title,
                price: tournament.price,
                prizes: tournament.prizes,
                description: tournament.description,
                startDate: tournament.date,
                levelRange: tournament.level_range,
                includedItems: tournament.included_items
            }});

        } catch(e) {
            console.error(e);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [user, isOfflineMode, isOnline, clubData.courtCount, loadPlayers]);

    // 4. UNLOAD
    const closeTournament = () => {
        dispatch({ type: 'SET_STATE', payload: { id: undefined, status: 'finished', pairs: [], matches: [], groups: [], currentRound: 0 }});
        fetchTournamentList();
    };

    useEffect(() => { 
        const init = async () => {
            const players = await loadPlayers();
            dispatch({ type: 'SET_STATE', payload: { players } });
            fetchTournamentList();
        };
        init();
    }, [loadPlayers, fetchTournamentList]);

    const loadData = async () => { await fetchTournamentList(); };

    const saveLocal = (newState: TournamentState) => { 
        if (isOfflineMode) { localStorage.setItem(STORAGE_KEY, JSON.stringify(newState)); window.dispatchEvent(new Event('local-db-update')); } 
    };

    // --- ACTIONS ---

    const togglePaymentDB = async (playerId: string, pairId: string, isP1: boolean) => {
        dispatch({ type: 'TOGGLE_PAID', payload: playerId });
        if (isOfflineMode) { /* ... offline logic kept for dev ... */ return; }
        // Online Only
        checkOnline();
        const pair = state.pairs.find(p => p.id === pairId);
        if (!pair) return;
        const newVal = isP1 ? !pair.paidP1 : !pair.paidP2;
        await supabase.from('tournament_pairs').update({ [isP1 ? 'paid_p1' : 'paid_p2']: newVal }).eq('id', pairId);
    };

    const toggleWaterDB = async (pairId: string) => {
        dispatch({ type: 'TOGGLE_WATER', payload: pairId });
        if (isOfflineMode) return;
        checkOnline();
        const pair = state.pairs.find(p => p.id === pairId);
        if (!pair) return;
        await supabase.from('tournament_pairs').update({ water_received: !pair.waterReceived }).eq('id', pairId);
    };

    const toggleBallsDB = async (courtId: number) => {
        dispatch({ type: 'TOGGLE_BALLS', payload: courtId });
        if (!isOfflineMode) {
            if (state.id) {
                const updatedCourts = state.courts.map(c => c.id === courtId ? { ...c, ballsGiven: !c.ballsGiven } : c);
                localStorage.setItem(`padelpro_courts_${state.id}`, JSON.stringify(updatedCourts));
            }
        }
    };

    const setTournamentFormat = async (format: TournamentFormat) => {
        dispatch({ type: 'SET_FORMAT', payload: format });
        if (!isOfflineMode && state.id) { 
            checkOnline();
            await supabase.from('tournaments').update({ format }).eq('id', state.id); 
        }
    };

    const updateTournamentSettings = async (settings: Partial<TournamentState>) => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
        if (isOfflineMode) { saveLocal({...state, ...settings}); return; }
        if (state.id) {
             checkOnline();
             await supabase.from('tournaments').update({ 
                 title: settings.title, price: settings.price, prizes: settings.prizes,
                 description: settings.description, level_range: settings.levelRange, 
                 included_items: settings.includedItems, format: settings.format
            }).eq('id', state.id);
        }
    };

    const createNewTournament = async (metadata: Partial<TournamentState>) => {
        if (isOfflineMode) { /* ... */ return; }
        checkOnline();
        if (user) {
            const { data, error } = await supabase.from('tournaments').insert([{ 
                user_id: user.id, status: 'setup', format: metadata.format || '16_mini',
                title: metadata.title, price: metadata.price, prizes: metadata.prizes,
                description: metadata.description, level_range: metadata.levelRange,
                included_items: metadata.includedItems, date: metadata.startDate
            }]).select().single();
            if (error) throw error;
            await selectTournament(data.id);
        }
    };

    const addPlayerToDB = async (p: Partial<Player>, ownerId?: string) => {
        if (isOfflineMode) { /* ... */ return 'local-id'; }
        checkOnline();
        const targetUserId = ownerId || user?.id;
        const { data, error } = await supabase.from('players').insert([{ ...p, user_id: targetUserId }]).select().single();
        if (error) { console.error("Error creating player:", error); return null; } 
        const newPlayers = [...state.players, data];
        dispatch({ type: 'SET_STATE', payload: { players: newPlayers } });
        return data.id;
    };

    const updatePlayerInDB = async (p: Partial<Player>) => {
        if (isOfflineMode) { /* ... */ return; }
        checkOnline();
        await supabase.from('players').update(p).eq('id', p.id); 
        const newPlayers = state.players.map(x => x.id === p.id ? { ...x, ...p } as Player : x);
        dispatch({ type: 'SET_STATE', payload: { players: newPlayers } });
    };

    const deletePlayerDB = async (id: string) => {
        if (isOfflineMode) { /* ... */ return; }
        checkOnline();
        const { error } = await supabase.from('players').delete().eq('id', id);
        if (error) throw error;
        const newPlayers = state.players.filter(p => p.id !== id);
        dispatch({ type: 'SET_STATE', payload: { players: newPlayers } });
    };

    const createPairInDB = async (p1: string, p2: string | null, status: 'confirmed' | 'pending' = 'confirmed') => {
        if (isOfflineMode) { /* ... */ return 'pair-id'; }
        checkOnline();
        let tournamentId = state.id; 
        if (!tournamentId) return null;
        const { data } = await supabase.from('tournament_pairs').insert([{ tournament_id: tournamentId, player1_id: p1, player2_id: p2, status }]).select().single(); 
        if (p2 && status === 'pending') { const inviter = state.players.find(p => p.id === p1)?.name || 'Un jugador'; addNotification(p2, 'invite', 'Invitación a Torneo', `${inviter} te ha invitado a formar pareja.`, '/p/tournaments'); }
        await selectTournament(tournamentId); 
        return data?.id || null;
    };
    
    const assignPartnerDB = async (pairId: string, partnerId: string, mergeWithPairId?: string) => {
        if (isOfflineMode) { /* ... */ return; }
        checkOnline();
        await supabase.from('tournament_pairs').update({ player2_id: partnerId }).eq('id', pairId);
        if (mergeWithPairId) { await supabase.from('tournament_pairs').delete().eq('id', mergeWithPairId); }
        if(state.id) await selectTournament(state.id);
    };

    const respondToInviteDB = async (pairId: string, action: 'accept' | 'reject') => {
        if (isOfflineMode) { /* ... */ return; }
        checkOnline();
        const newStatus = action === 'accept' ? 'confirmed' : 'rejected';
        await supabase.from('tournament_pairs').update({ status: newStatus }).eq('id', pairId);
        if(state.id) await selectTournament(state.id);
    };

    const updatePairDB = async (pairId: string, p1: string, p2: string) => { if (isOfflineMode) return; checkOnline(); await supabase.from('tournament_pairs').update({ player1_id: p1, player2_id: p2 }).eq('id', pairId); if(state.id) await selectTournament(state.id); };
    const deletePairDB = async (pairId: string) => { if (isOfflineMode) return; checkOnline(); await supabase.from('tournament_pairs').delete().eq('id', pairId); if(state.id) await selectTournament(state.id); };
    
    const substitutePairDB = async (activePairId: string, reservePairId: string) => {
        if (isOfflineMode) return;
        checkOnline();
        const activePair = state.pairs.find(p => p.id === activePairId);
        const reservePair = state.pairs.find(p => p.id === reservePairId);
        if (!activePair || !reservePair) throw new Error("No se encontraron las parejas.");
        if (!reservePair.player2Id) throw new Error("La reserva debe ser una pareja completa.");
        const newActiveContent = { player1_id: reservePair.player1Id, player2_id: reservePair.player2Id, paid_p1: reservePair.paidP1, paid_p2: reservePair.paidP2, water_received: false };
        const newReserveContent = { player1_id: activePair.player1Id, player2_id: activePair.player2Id, paid_p1: activePair.paidP1, paid_p2: activePair.paidP2, water_received: activePair.waterReceived };
        await supabase.from('tournament_pairs').update(newActiveContent).eq('id', activePairId);
        await supabase.from('tournament_pairs').update(newReserveContent).eq('id', reservePairId);
        if(state.id) await selectTournament(state.id);
    };

    const startTournamentDB = async (method: GenerationMethod, customOrderedPairs?: Pair[]) => {
        if (isOfflineMode) { /* ... */ return; }
        checkOnline();
        // Logic to generate matches...
        let limit = 16;
        if(state.format === '10_mini') limit = 10;
        if(state.format === '12_mini') limit = 12;
        if(state.format === '8_mini') limit = 8;
        
        const allPairs = state.pairs.filter(p => p.status === 'confirmed' && p.player2Id !== null); 
        if (allPairs.length < limit) throw new Error(`Se necesitan al menos ${limit} parejas confirmadas y completas.`);

        let orderedPairs = customOrderedPairs || allPairs;
        if (method !== 'manual' && !customOrderedPairs) orderedPairs = Logic.sortPairsByMethod(allPairs, state.players, method);

        const groups = Logic.generateGroupsHelper(orderedPairs, state.players, method, state.format);
        let matches: Partial<Match>[] = [];
        if (state.format === '10_mini') matches = Logic.generateMatches10(groups);
        else if (state.format === '8_mini') matches = Logic.generateMatches8(groups);
        else if (state.format === '12_mini') matches = Logic.generateMatches12(groups, clubData.courtCount);
        else matches = Logic.generateMatches16(groups, clubData.courtCount);

        const activeIds = new Set(groups.flatMap(g => g.pairIds));
        
        if (!state.id) throw new Error("ID de torneo perdido.");
        await supabase.from('matches').delete().eq('tournament_id', state.id);
        await supabase.from('tournaments').update({ status: 'active', current_round: 1, format: state.format }).eq('id', state.id);
        
        const matchesDB = matches.map(m => ({ tournament_id: state.id, round: m.round, phase: m.phase, bracket: m.bracket, court_id: m.courtId, pair_a_id: m.pairAId, pair_b_id: m.pairBId, score_a: m.scoreA, score_b: m.scoreB, is_finished: m.isFinished }));
        const { error } = await supabase.from('matches').insert(matchesDB);
        if (error) { if (error.message.includes('phase')) { const matchesNoPhase = matchesDB.map(({ phase, ...rest }) => rest); const { error: retryError } = await supabase.from('matches').insert(matchesNoPhase); if (retryError) throw retryError; } else { throw error; } }
        activeIds.forEach(pairId => { const pair = state.pairs.find(p => p.id === pairId); if (pair) { addNotification(pair.player1Id, 'match_start', 'Torneo Iniciado', 'El torneo ha comenzado. Revisa tu pista.', '/p/tournaments'); if (pair.player2Id) addNotification(pair.player2Id, 'match_start', 'Torneo Iniciado', 'El torneo ha comenzado. Revisa tu pista.', '/p/tournaments'); } });
        if(state.id) await selectTournament(state.id);
    };

    const nextRoundDB = async () => {
        checkOnline();
        const nextRound = state.currentRound + 1;
        const newMatches = Logic.generateNextRoundMatches(state, clubData.courtCount);
        if (newMatches.length > 0) {
             const matchesDB = newMatches.map(m => ({ tournament_id: state.id, round: m.round, phase: m.phase, bracket: m.bracket, court_id: m.courtId, pair_a_id: m.pairAId, pair_b_id: m.pairBId, score_a: m.scoreA, score_b: m.scoreB, is_finished: m.isFinished }));
             await supabase.from('matches').insert(matchesDB);
        }
        await supabase.from('tournaments').update({ current_round: nextRound }).eq('id', state.id);
        if(state.id) await selectTournament(state.id);
    };

    // --- UPDATED SCORE FUNCTION WITH OFFLINE QUEUE ---
    const updateScoreDB = async (matchId: string, sA: number, sB: number) => { 
        // 1. OFFLINE RESILIENCE
        if (!isOnline && !isOfflineMode) {
            // Queue it
            const pendingStr = localStorage.getItem(PENDING_SCORES_KEY);
            const pendingQueue: PendingScore[] = pendingStr ? JSON.parse(pendingStr) : [];
            
            // Remove existing for same match if exists to update
            const filteredQueue = pendingQueue.filter(p => p.matchId !== matchId);
            filteredQueue.push({ matchId, scoreA: sA, scoreB: sB, timestamp: Date.now() });
            
            localStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(filteredQueue));
            setPendingSyncCount(filteredQueue.length);

            // Update Local State for UI feedback immediately
            const newMatches = state.matches.map(m => m.id === matchId ? { ...m, scoreA: sA, scoreB: sB, isFinished: true } : m);
            const newPairs = Logic.recalculateStats(state.pairs, newMatches);
            dispatch({ type: 'SET_STATE', payload: { ...state, matches: newMatches, pairs: newPairs } });
            
            return;
        }

        if (isOfflineMode) { 
            // Dev mode logic...
            const newMatches = state.matches.map(m => m.id === matchId ? { ...m, scoreA: sA, scoreB: sB, isFinished: true } : m); 
            const newPairs = Logic.recalculateStats(state.pairs, newMatches); 
            dispatch({ type: 'SET_STATE', payload: { ...state, matches: newMatches, pairs: newPairs } }); 
            saveLocal({ ...state, matches: newMatches, pairs: newPairs }); 
            return; 
        } 

        // Online Standard
        await supabase.from('matches').update({ score_a: sA, score_b: sB, is_finished: true }).eq('id', matchId); 
        
        const match = state.matches.find(m => m.id === matchId);
        if (match) { const title = "Partido Finalizado"; const msg = `Resultado: ${sA} - ${sB}. Revisa tu nuevo ELO.`; [match.pairAId, match.pairBId].forEach(pairId => { const pair = state.pairs.find(p => p.id === pairId); if (pair) { addNotification(pair.player1Id, 'result', title, msg, '/p/profile'); if (pair.player2Id) addNotification(pair.player2Id, 'result', title, msg, '/p/profile'); } }); }
        
        if(state.id) await selectTournament(state.id);
    };

    const finishTournamentDB = async () => {
        checkOnline();
        const { wMain, wCons } = Logic.calculateChampions(state, (id, p, pair) => { const pp = pair.find(x => x.id === id); if(!pp) return 'Desc.'; const p1 = p.find(x => x.id === pp.player1Id); const p2 = pp.player2Id ? p.find(x => x.id === pp.player2Id) : null; return `${formatPlayerName(p1)} & ${formatPlayerName(p2)}`; });
        if (state.id) { await supabase.from('tournaments').update({ status: 'finished', winner_main: wMain, winner_consolation: wCons }).eq('id', state.id); }
        const newState = { ...state, status: 'finished' as const }; dispatch({ type: 'SET_STATE', payload: newState });
    };

    const archiveAndResetDB = async () => {
        checkOnline();
        const { wMain, wCons } = Logic.calculateChampions(state, (id, p, pair) => { const pp = pair.find(x => x.id === id); if(!pp) return 'Desconocido'; const p1 = p.find(x => x.id === pp.player1Id); const p2 = pp.player2Id ? p.find(x => x.id === pp.player2Id) : null; return `${formatPlayerName(p1)} & ${formatPlayerName(p2)}`; });
        await supabase.from('tournaments').update({ status: 'finished', winner_main: wMain, winner_consolation: wCons }).eq('id', state.id);
        closeTournament(); 
    };

    const resetToSetupDB = async () => {
        if (isOfflineMode) { /* ... */ return; }
        checkOnline();
        if (!state.id) return;
        await supabase.from('tournaments').update({ status: 'setup', current_round: 0 }).eq('id', state.id);
        await supabase.from('matches').delete().eq('tournament_id', state.id);
        if(state.id) await selectTournament(state.id);
    };

    const regenerateMatchesDB = async () => { return "Not implemented"; };
    const hardResetDB = async () => { dispatch({ type: 'RESET_LOCAL' }); };

    return (
        <TournamentContext.Provider value={{
            state, dispatch, loadData,
            addPlayerToDB, updatePlayerInDB, deletePlayerDB, createPairInDB, updatePairDB, startTournamentDB,
            updateScoreDB, nextRoundDB, deletePairDB, archiveAndResetDB, resetToSetupDB, regenerateMatchesDB, hardResetDB,
            formatPlayerName, setTournamentFormat, getPairElo: Logic.getPairElo, substitutePairDB, finishTournamentDB, respondToInviteDB, assignPartnerDB,
            updateTournamentSettings, createNewTournament,
            fetchTournamentList, selectTournament, closeTournament,
            togglePaymentDB, toggleWaterDB, toggleBallsDB,
            pendingSyncCount
        }}>
            {children}
        </TournamentContext.Provider>
    );
};

export const useTournament = () => useContext(TournamentContext);
