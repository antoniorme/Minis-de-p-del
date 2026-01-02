import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LeagueState, LeagueCategory, LeagueGroup, LeagueMatch, Pair, LeaguePhase } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useHistory } from './HistoryContext';

interface LeagueContextType {
    league: LeagueState;
    leaguesList: any[];
    fetchLeagues: () => Promise<void>;
    selectLeague: (id: string) => Promise<void>;
    updateLeagueScore: (matchId: string, setsA: number, setsB: number, scoreText: string) => Promise<void>;
    createLeague: (data: Partial<LeagueState>) => Promise<string | null>;
    generateLeagueGroups: (categoryId: string, groupsCount: number, method: 'elo-balanced' | 'elo-mixed') => Promise<void>;
    advanceToPlayoffs: (categoryId: string) => Promise<void>;
    addPairToLeague: (pair: Partial<Pair>) => Promise<void>;
    isLeagueModuleEnabled: boolean;
}

const initialLeagueState: LeagueState = {
    title: '',
    status: 'registration',
    startDate: '2024-01-12',
    endDate: '2024-04-15',
    playoffDate: '2024-04-17',
    categories: [
        { id: 'cat-1', name: '2ª Categoría', prize_winner: 'Pala Gama Alta', prize_runnerup: 'Paletero Pro', pairs_count: 0 },
        { id: 'cat-2', name: '3ª Categoría', prize_winner: 'Pala Gama Media', prize_runnerup: 'Mochila Técnica', pairs_count: 0 }
    ],
    groups: [],
    matches: [],
    pairs: [],
    loading: false
};

const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

export const LeagueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isOfflineMode } = useAuth();
    const { clubData } = useHistory();
    const [league, setLeague] = useState<LeagueState>(initialLeagueState);
    const [leaguesList, setLeaguesList] = useState<any[]>([]);

    const isLeagueModuleEnabled = clubData.league_enabled || false;

    const fetchLeagues = useCallback(async () => {
        if (!user && !isOfflineMode) return;
        if (isOfflineMode) {
            setLeaguesList([{ 
                id: 'local-league-1', 
                title: 'Liga Invierno 2024', 
                status: 'registration',
                startDate: '2024-01-12',
                endDate: '2024-04-15',
                pairsCount: 14
            }]);
            return;
        }
        const { data } = await supabase.from('leagues').select('*').eq('club_id', user?.id).order('created_at', { ascending: false });
        setLeaguesList(data || []);
    }, [user, isOfflineMode]);

    const selectLeague = async (id: string) => {
        setLeague(prev => ({ ...prev, loading: true }));
        if (isOfflineMode) {
            const saved = localStorage.getItem(`league_data_${id}`);
            if (saved) setLeague(JSON.parse(saved));
            else setLeague(prev => ({ ...prev, id, loading: false }));
        }
    };

    const createLeague = async (data: Partial<LeagueState>) => {
        const newId = `league-${Date.now()}`;
        const newLeague = { ...initialLeagueState, ...data, id: newId, status: 'registration' as LeaguePhase };
        if (isOfflineMode) {
            setLeague(newLeague);
            setLeaguesList(prev => [newLeague, ...prev]);
            localStorage.setItem(`league_data_${newId}`, JSON.stringify(newLeague));
            return newId;
        }
        return newId;
    };

    const generateLeagueGroups = async (categoryId: string, groupsCount: number, method: 'elo-balanced' | 'elo-mixed') => {
        const categoryPairs = league.pairs.filter(p => p.category_id === categoryId);
        if (categoryPairs.length < 4) throw new Error("Mínimo 4 parejas por categoría");

        const sortedPairs = [...categoryPairs].sort(() => Math.random() - 0.5);
        const newGroups: LeagueGroup[] = [];
        const newMatches: LeagueMatch[] = [];

        for (let i = 0; i < groupsCount; i++) {
            const gId = `group-${categoryId}-${i}`;
            const groupPairs = sortedPairs.filter((_, idx) => idx % groupsCount === i);
            
            newGroups.push({
                id: gId, category_id: categoryId,
                name: `Grupo ${String.fromCharCode(65 + i)}`,
                pairIds: groupPairs.map(p => p.id)
            });

            for (let j = 0; j < groupPairs.length; j++) {
                for (let k = j + 1; k < groupPairs.length; k++) {
                    newMatches.push({
                        id: `lm-${Date.now()}-${Math.random()}`,
                        league_id: league.id!, category_id: categoryId, group_id: gId,
                        phase: 'group', pairAId: groupPairs[j].id, pairBId: groupPairs[k].id,
                        setsA: null, setsB: null, isFinished: false
                    });
                }
            }
        }

        const updatedLeague = {
            ...league,
            status: 'groups' as LeaguePhase,
            groups: [...league.groups, ...newGroups],
            matches: [...league.matches, ...newMatches]
        };
        setLeague(updatedLeague);
        if (isOfflineMode) localStorage.setItem(`league_data_${league.id}`, JSON.stringify(updatedLeague));
    };

    const calculateStandings = (catId: string, groupId: string) => {
        const group = league.groups.find(g => g.id === groupId);
        if (!group) return [];

        const standings = group.pairIds.map(pId => {
            const pairMatches = league.matches.filter(m => m.category_id === catId && m.group_id === groupId && m.isFinished && (m.pairAId === pId || m.pairBId === pId));
            let pts = 0;
            pairMatches.forEach(m => {
                const isA = m.pairAId === pId;
                const won = isA ? (m.setsA! > m.setsB!) : (m.setsB! > m.setsA!);
                pts += won ? 3 : 1;
            });
            return { id: pId, pts };
        });

        return standings.sort((a, b) => b.pts - a.pts);
    };

    const advanceToPlayoffs = async (categoryId: string) => {
        const catGroups = league.groups.filter(g => g.category_id === categoryId);
        const newPlayoffMatches: LeagueMatch[] = [];
        
        if (catGroups.length === 2) {
            const stA = calculateStandings(categoryId, catGroups[0].id);
            const stB = calculateStandings(categoryId, catGroups[1].id);

            // QF 1: 1ºA vs 4ºB
            if (stA[0] && stB[3]) newPlayoffMatches.push({ id: `qf-1-${categoryId}`, league_id: league.id!, category_id: categoryId, phase: 'playoff', pairAId: stA[0].id, pairBId: stB[3].id, setsA: null, setsB: null, isFinished: false });
            // QF 2: 2ºB vs 3ºA
            if (stB[1] && stA[2]) newPlayoffMatches.push({ id: `qf-2-${categoryId}`, league_id: league.id!, category_id: categoryId, phase: 'playoff', pairAId: stB[1].id, pairBId: stA[2].id, setsA: null, setsB: null, isFinished: false });
            // QF 3: 1ºB vs 4ºA
            if (stB[0] && stA[3]) newPlayoffMatches.push({ id: `qf-3-${categoryId}`, league_id: league.id!, category_id: categoryId, phase: 'playoff', pairAId: stB[0].id, pairBId: stA[3].id, setsA: null, setsB: null, isFinished: false });
            // QF 4: 2ºA vs 3ºB
            if (stA[1] && stB[2]) newPlayoffMatches.push({ id: `qf-4-${categoryId}`, league_id: league.id!, category_id: categoryId, phase: 'playoff', pairAId: stA[1].id, pairBId: stB[2].id, setsA: null, setsB: null, isFinished: false });
        } else {
            const st = calculateStandings(categoryId, catGroups[0]?.id);
            // Formato 1v8, 4v5, 2v7, 3v6
            const pairings = [[0,7], [3,4], [1,6], [2,5]];
            pairings.forEach((p, idx) => {
                if (st[p[0]] && st[p[1]]) {
                    newPlayoffMatches.push({ id: `qf-${idx+1}-${categoryId}`, league_id: league.id!, category_id: categoryId, phase: 'playoff', pairAId: st[p[0]].id, pairBId: st[p[1]].id, setsA: null, setsB: null, isFinished: false });
                }
            });
        }

        const updatedLeague = {
            ...league,
            status: 'playoffs' as LeaguePhase,
            matches: [...league.matches, ...newPlayoffMatches]
        };
        setLeague(updatedLeague);
        if (isOfflineMode) localStorage.setItem(`league_data_${league.id}`, JSON.stringify(updatedLeague));
    };

    const updateLeagueScore = async (matchId: string, setsA: number, setsB: number, scoreText: string) => {
        let winnerId = '';
        const updatedMatches = league.matches.map(m => {
            if (m.id === matchId) {
                winnerId = setsA > setsB ? m.pairAId : m.pairBId;
                return { ...m, setsA, setsB, score_text: scoreText, isFinished: true, winnerId };
            }
            return m;
        });

        // Lógica de progresión en Playoff
        if (matchId.startsWith('qf-')) {
            const parts = matchId.split('-'); // qf, index, catId
            const idx = parseInt(parts[1]);
            const catId = parts[2];
            const sfId = `sf-${idx <= 2 ? 1 : 2}-${catId}`;
            
            const existingSf = updatedMatches.find(m => m.id === sfId);
            if (!existingSf) {
                updatedMatches.push({
                    id: sfId, league_id: league.id!, category_id: catId, phase: 'playoff',
                    pairAId: idx % 2 !== 0 ? winnerId : 'TBD',
                    pairBId: idx % 2 === 0 ? winnerId : 'TBD',
                    setsA: null, setsB: null, isFinished: false
                });
            } else {
                if (idx % 2 !== 0) existingSf.pairAId = winnerId;
                else existingSf.pairBId = winnerId;
            }
        } else if (matchId.startsWith('sf-')) {
            const parts = matchId.split('-');
            const catId = parts[2];
            const finalId = `final-1-${catId}`;
            const existingFinal = updatedMatches.find(m => m.id === finalId);
            if (!existingFinal) {
                updatedMatches.push({
                    id: finalId, league_id: league.id!, category_id: catId, phase: 'playoff',
                    pairAId: parts[1] === '1' ? winnerId : 'TBD',
                    pairBId: parts[1] === '2' ? winnerId : 'TBD',
                    setsA: null, setsB: null, isFinished: false
                });
            } else {
                if (parts[1] === '1') existingFinal.pairAId = winnerId;
                else existingFinal.pairBId = winnerId;
            }
        }

        const updatedLeague = { ...league, matches: updatedMatches };
        setLeague(updatedLeague);
        if (isOfflineMode) localStorage.setItem(`league_data_${league.id}`, JSON.stringify(updatedLeague));
    };

    const addPairToLeague = async (pairData: Partial<Pair>) => {
        const newPair: Pair = {
            id: `lp-${Date.now()}`, ...pairData, stats: { played: 0, won: 0, gameDiff: 0 },
            paidP1: false, paidP2: false, waterReceived: false
        } as Pair;
        const updatedLeague = { ...league, pairs: [...league.pairs, newPair] };
        setLeague(updatedLeague);
        if (isOfflineMode) localStorage.setItem(`league_data_${league.id}`, JSON.stringify(updatedLeague));
    };

    return (
        <LeagueContext.Provider value={{
            league, leaguesList, fetchLeagues, selectLeague, updateLeagueScore, createLeague,
            generateLeagueGroups, advanceToPlayoffs, addPairToLeague, isLeagueModuleEnabled
        }}>
            {children}
        </LeagueContext.Provider>
    );
};

export const useLeague = () => {
    const context = useContext(LeagueContext);
    if (!context) throw new Error('useLeague must be used within a LeagueProvider');
    return context;
};