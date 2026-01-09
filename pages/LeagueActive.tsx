
import React, { useState, useMemo, useEffect } from 'react';
import { useLeague } from '../store/LeagueContext';
import { useTournament } from '../store/TournamentContext';
import { 
    Edit3, X, Image as ImageIcon,
    ChevronDown, ChevronUp, Clock, Info, GitMerge,
    Users, ArrowRight, Settings, PlusCircle, CheckCircle,
    Calendar as CalendarIcon, Trash2, LayoutGrid, TrendingUp, Shuffle, Repeat, Plus, ChevronRight, Edit2, AlertTriangle, Save, Trophy, UserPlus, ArrowRightCircle, ArrowLeftCircle, FolderPlus, BarChart3, AlertCircle, PlayCircle
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PosterGenerator } from '../components/PosterGenerator';
import { THEME } from '../utils/theme';
import { PlayerSelector } from '../components/PlayerSelector';

interface Standing {
    pairId: string;
    pairName: string;
    played: number;
    won: number;
    lost: number;
    setsF: number;
    setsC: number;
    points: number;
}

const LeagueActive: React.FC = () => {
    const { league, updateLeagueScore, advanceToPlayoffs, addPairToLeague, deletePairFromLeague, updateLeaguePair, generateLeagueGroups, addLeagueCategory } = useLeague();
    const { state, formatPlayerName, addPlayerToDB, getPairElo } = useTournament();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // TAB CONTROL VIA URL (Default: management)
    const activeTab = (searchParams.get('tab') as 'management' | 'registration' | 'standings' | 'calendar' | 'playoffs') || 'management';

    // CATEGORY STATE (Default to 'overview')
    const [activeCategoryId, setActiveCategoryId] = useState<string>('overview');
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // Match Editing
    const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
    const [scoreText, setScoreText] = useState('');
    const [setsA, setSetsA] = useState(0);
    const [setsB, setSetsB] = useState(0);
    const [expandedRound, setExpandedRound] = useState<number | null>(null);
    
    // Modals & Confirmations
    const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
    const [isPairModalOpen, setIsPairModalOpen] = useState(false); // Handles Add & Edit
    const [editingPairId, setEditingPairId] = useState<string | null>(null); // For pair editing
    
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [showGenerateConfirm, setShowGenerateConfirm] = useState<boolean>(false);
    
    // PLAYOFF WIZARD STATE
    const [showPlayoffWizard, setShowPlayoffWizard] = useState(false);
    const [poQuota, setPoQuota] = useState(4); // Qualifiers per group
    const [poCross, setPoCross] = useState<'crossed' | 'internal'>('crossed');
    const [poFormat, setPoFormat] = useState<'single' | 'double'>('single');

    const [alertMessage, setAlertMessage] = useState<{type: 'error' | 'success', message: string} | null>(null);

    // Form Data
    const [p1, setP1] = useState('');
    const [p2, setP2] = useState('');
    const [doubleRound, setDoubleRound] = useState(false);
    const [genMethod, setGenMethod] = useState<'elo-balanced' | 'elo-mixed'>('elo-balanced');

    // Poster Logic
    const [showPoster, setShowPoster] = useState(false);
    const [posterData, setPosterData] = useState<any>(null);

    // Helper: Change tab
    const setTab = (tab: string) => {
        setSearchParams({ tab });
    };

    const getPairName = (id: string) => {
        if (id === 'TBD') return 'Por determinar...';
        const pair = league.pairs.find(p => p.id === id);
        if (!pair) return 'Pareja Desc.';
        const p1 = state.players.find(p => p.id === pair.player1Id);
        const p2 = state.players.find(p => p.id === pair.player2Id);
        return `${formatPlayerName(p1)} & ${formatPlayerName(p2)}`;
    };

    const getPositionLabel = (pos?: string, both?: boolean) => {
        if (!pos) return null;
        return (
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                {pos === 'right' ? <ArrowRightCircle size={10}/> : <ArrowLeftCircle size={10}/>}
                {pos === 'right' ? 'Derecha' : 'Revés'}
                {both && <span title="Juega en ambos lados">+</span>}
            </div>
        );
    };

    // Calculate Standings for a specific category (used in Overview and Detail)
    const getCategoryStats = (catId: string) => {
        const catPairs = league.pairs.filter(p => p.category_id === catId && p.player2Id);
        const catMatches = league.matches.filter(m => m.category_id === catId && m.phase === 'group');
        
        const finishedMatches = catMatches.filter(m => m.isFinished).length;
        const totalMatches = catMatches.length;
        
        // Calculate Leader
        const standings: Record<string, Standing> = {};
        catPairs.forEach(p => {
            standings[p.id] = { pairId: p.id, pairName: getPairName(p.id), played: 0, won: 0, lost: 0, setsF: 0, setsC: 0, points: 0 };
        });
        
        catMatches.filter(m => m.isFinished).forEach(m => {
            if (standings[m.pairAId]) {
                standings[m.pairAId].played++;
                standings[m.pairAId].setsF += m.setsA || 0; standings[m.pairAId].setsC += m.setsB || 0;
                if (m.setsA! > m.setsB!) { standings[m.pairAId].won++; standings[m.pairAId].points += 3; }
                else { standings[m.pairAId].lost++; standings[m.pairAId].points += 1; }
            }
            if (standings[m.pairBId]) {
                standings[m.pairBId].played++;
                standings[m.pairBId].setsF += m.setsB || 0; standings[m.pairBId].setsC += m.setsA || 0;
                if (m.setsB! > m.setsA!) { standings[m.pairBId].won++; standings[m.pairBId].points += 3; }
                else { standings[m.pairBId].lost++; standings[m.pairBId].points += 1; }
            }
        });

        const sortedStandings = Object.values(standings).sort((a, b) => b.points !== a.points ? b.points - a.points : (b.setsF - b.setsC) - (a.setsF - a.setsC));
        const leader = sortedStandings.length > 0 ? sortedStandings[0] : null;
        
        // Alerts
        const inactivePairs = sortedStandings.filter(s => s.played === 0).length;

        return {
            totalPairs: catPairs.length,
            finishedMatches,
            totalMatches,
            progress: totalMatches > 0 ? Math.round((finishedMatches / totalMatches) * 100) : 0,
            leader,
            inactivePairs
        };
    };

    const calculateStandings = useMemo(() => {
        if (!activeCategoryId || activeCategoryId === 'overview') return [];
        // Re-use logic for current view
        const stats = getCategoryStats(activeCategoryId);
        // We need the full array, so let's just re-run the sort logic which is cheap
        const catPairs = league.pairs.filter(p => p.category_id === activeCategoryId && p.player2Id);
        const catMatches = league.matches.filter(m => m.category_id === activeCategoryId && m.phase === 'group' && m.isFinished);
        const standings: Record<string, Standing> = {};
        catPairs.forEach(p => { standings[p.id] = { pairId: p.id, pairName: getPairName(p.id), played: 0, won: 0, lost: 0, setsF: 0, setsC: 0, points: 0 }; });
        catMatches.forEach(m => {
             if (standings[m.pairAId]) {
                standings[m.pairAId].played++;
                standings[m.pairAId].setsF += m.setsA || 0; standings[m.pairAId].setsC += m.setsB || 0;
                if (m.setsA! > m.setsB!) { standings[m.pairAId].won++; standings[m.pairAId].points += 3; }
                else { standings[m.pairAId].lost++; standings[m.pairAId].points += 1; }
            }
            if (standings[m.pairBId]) {
                standings[m.pairBId].played++;
                standings[m.pairBId].setsF += m.setsB || 0; standings[m.pairBId].setsC += m.setsA || 0;
                if (m.setsB! > m.setsA!) { standings[m.pairBId].won++; standings[m.pairBId].points += 3; }
                else { standings[m.pairBId].lost++; standings[m.pairBId].points += 1; }
            }
        });
        return Object.values(standings).sort((a, b) => b.points !== a.points ? b.points - a.points : (b.setsF - b.setsC) - (a.setsF - a.setsC));
    }, [league.matches, league.pairs, activeCategoryId]);

    const handleGenerateWinnerPoster = () => {
        const topPair = calculateStandings[0];
        if (!topPair) return;
        setPosterData({
            title: league.title,
            winnerNames: topPair.pairName,
            category: 'Campeones',
            type: 'champions'
        });
        setShowPoster(true);
    };

    const handleSaveScore = async () => {
        if (!editingMatchId) return;
        await updateLeagueScore(editingMatchId, setsA, setsB, scoreText);
        setEditingMatchId(null);
    };

    const matchesByRound = useMemo(() => {
        if (!activeCategoryId || activeCategoryId === 'overview') return {};
        const matches = league.matches.filter(m => m.category_id === activeCategoryId && m.phase === 'group');
        const rounds: Record<number, any[]> = {};
        matches.forEach(m => {
            const r = m.round || 1;
            if (!rounds[r]) rounds[r] = [];
            rounds[r].push(m);
        });
        return rounds;
    }, [league.matches, activeCategoryId]);

    const roundNumbers = Object.keys(matchesByRound).map(Number).sort((a,b) => a - b);

    // --- PAIR MANAGEMENT LOGIC ---
    
    const openAddModal = () => {
        setEditingPairId(null);
        setP1('');
        setP2('');
        setIsPairModalOpen(true);
    };

    const openEditModal = (pairId: string) => {
        const pair = league.pairs.find(p => p.id === pairId);
        if (!pair) return;
        setEditingPairId(pairId);
        setP1(pair.player1Id);
        setP2(pair.player2Id || '');
        setIsPairModalOpen(true);
    };

    const handleSavePair = async () => {
        const targetCategory = activeCategoryId === 'overview' ? league.categories[0]?.id : activeCategoryId;
        if (!p1 || !targetCategory) return; 
        
        if (editingPairId) {
            await updateLeaguePair(editingPairId, p1, p2);
        } else {
            await addPairToLeague({
                player1Id: p1,
                player2Id: p2 || null,
                category_id: targetCategory,
                name: 'Pareja Liga'
            });
        }
        
        setP1('');
        setP2('');
        setIsPairModalOpen(false);
        setEditingPairId(null);
    };

    const handleDeleteConfirm = async () => {
        if (showDeleteConfirm) {
            await deletePairFromLeague(showDeleteConfirm);
            setShowDeleteConfirm(null);
        }
    };

    // --- CATEGORY LOGIC ---
    const handleAddCategory = async () => {
        if (!newCategoryName) return;
        await addLeagueCategory(newCategoryName);
        setShowAddCategory(false);
        setNewCategoryName('');
    };

    // --- GENERATION LOGIC ---

    const handlePreGenerate = (method: 'elo-balanced' | 'elo-mixed') => {
        if (!activeCategoryId || activeCategoryId === 'overview') return;
        const pairsInCategory = league.pairs.filter(p => p.category_id === activeCategoryId && p.player2Id);
        if (pairsInCategory.length < 4) {
            setAlertMessage({ type: 'error', message: "Se necesitan al menos 4 parejas completas para generar la liga." });
            return;
        }
        setGenMethod(method);
        setShowGenerateConfirm(true);
    };

    const handleConfirmGenerate = async () => {
        if (!activeCategoryId || activeCategoryId === 'overview') return;
        const pairsInCategory = league.pairs.filter(p => p.category_id === activeCategoryId && p.player2Id);
        const groupsCount = pairsInCategory.length >= 12 ? 2 : 1;
        await generateLeagueGroups(activeCategoryId, groupsCount, genMethod, doubleRound);
        setShowGenerateConfirm(false);
        setTab('calendar');
    };

    const handleConfirmPlayoffs = async () => {
        if (!activeCategoryId || activeCategoryId === 'overview') return;
        await advanceToPlayoffs(activeCategoryId, {
            qualifiersPerGroup: poQuota,
            crossType: poCross,
            mode: poFormat
        });
        setShowPlayoffWizard(false);
        setTab('playoffs');
    };

    // Filter available players
    const availablePlayers = useMemo(() => {
        return state.players.filter(p => {
            const isAssigned = league.pairs.some(lp => {
                if (editingPairId && lp.id === editingPairId) return false;
                return lp.player1Id === p.id || lp.player2Id === p.id;
            });
            return !isAssigned;
        });
    }, [state.players, league.pairs, editingPairId]);

    // Component for a Match Row
    const MatchRow: React.FC<{ match: any }> = ({ match }) => (
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group">
            <div className="flex-1 min-w-0 pr-4">
                {match.round_label && <div className="text-[9px] font-black uppercase text-indigo-400 mb-1">{match.round_label}</div>}
                <div className={`flex justify-between items-center mb-1 ${match.winnerId === match.pairAId ? 'text-indigo-600 font-black' : 'text-slate-700 font-medium'}`}>
                    <span className="text-sm truncate">{getPairName(match.pairAId)}</span>
                    <span className="text-lg ml-2">{match.setsA ?? '-'}</span>
                </div>
                <div className={`flex justify-between items-center ${match.winnerId === match.pairBId ? 'text-indigo-600 font-black' : 'text-slate-700 font-medium'}`}>
                    <span className="text-sm truncate">{getPairName(match.pairBId)}</span>
                    <span className="text-lg ml-2">{match.setsB ?? '-'}</span>
                </div>
                {match.score_text && <div className="text-[10px] text-slate-400 mt-1">{match.score_text}</div>}
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); setEditingMatchId(match.id); setSetsA(match.setsA || 0); setSetsB(match.setsB || 0); setScoreText(match.score_text || ''); }} 
                className="p-2 bg-slate-50 text-slate-300 hover:text-indigo-500 rounded-lg hover:bg-indigo-50 transition-colors"
            >
                <Edit3 size={18}/>
            </button>
        </div>
    );

    // --- OVERVIEW COMPONENT ---
    const renderOverview = () => {
        return (
            <div className="space-y-6 animate-slide-up">
                {/* Global Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-200">
                        <div className="flex items-center gap-2 mb-1 opacity-80 text-xs font-bold uppercase tracking-widest"><Users size={14}/> Total Parejas</div>
                        <div className="text-3xl font-black">{league.pairs.filter(p=>p.player2Id).length}</div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-1 text-slate-400 text-xs font-bold uppercase tracking-widest"><BarChart3 size={14}/> Progreso Liga</div>
                        <div className="text-3xl font-black text-slate-800">
                            {league.matches.length > 0 ? Math.round((league.matches.filter(m=>m.isFinished).length / league.matches.length) * 100) : 0}%
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider ml-1">Resumen por Categoría</h3>
                    {league.categories.map(cat => {
                        const stats = getCategoryStats(cat.id);
                        const isSetup = stats.totalMatches === 0;

                        return (
                            <div 
                                key={cat.id} 
                                onClick={() => { setActiveCategoryId(cat.id); setTab('management'); }}
                                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:scale-[1.02] active:scale-100 transition-all cursor-pointer relative overflow-hidden group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{cat.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`w-2 h-2 rounded-full ${isSetup ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                            <span className="text-xs font-bold text-slate-500 uppercase">{isSetup ? 'Inscripción' : 'En Juego'}</span>
                                        </div>
                                    </div>
                                    {isSetup ? (
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-slate-800">{stats.totalPairs}</div>
                                            <div className="text-[9px] text-slate-400 uppercase font-bold">Inscritos</div>
                                        </div>
                                    ) : (
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-slate-800">{stats.progress}%</div>
                                            <div className="text-[9px] text-slate-400 uppercase font-bold">Jugado</div>
                                        </div>
                                    )}
                                </div>

                                {isSetup ? (
                                    <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-indigo-500">
                                        <span>Gestionar Inscripciones</span>
                                        <ArrowRightCircle size={16}/>
                                    </div>
                                ) : (
                                    <div className="mt-2 space-y-3">
                                        {/* Leader Mini Bar */}
                                        <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3 border border-slate-100">
                                            <div className="bg-amber-100 text-amber-600 p-1.5 rounded-lg"><Trophy size={14}/></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[9px] font-bold text-slate-400 uppercase">Líder Actual</div>
                                                <div className="text-sm font-bold text-slate-800 truncate">{stats.leader?.pairName || 'N/A'}</div>
                                            </div>
                                            <div className="text-lg font-black text-slate-900">{stats.leader?.points || 0} <span className="text-[9px] text-slate-400 font-normal">pts</span></div>
                                        </div>

                                        {/* Alerts */}
                                        {stats.inactivePairs > 0 && (
                                            <div className="flex items-center gap-2 text-xs font-bold text-rose-500 bg-rose-50 p-2 rounded-lg">
                                                <AlertCircle size={14}/> {stats.inactivePairs} parejas sin jugar
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    };

    // IF LOADING OR NO CATEGORY SELECTED (SHOULD NOT HAPPEN WITH NEW LOGIC, BUT SAFEGUARD)
    if (!activeCategoryId && league.categories.length === 0) return <div className="p-10 text-center animate-pulse text-white">Cargando datos de la liga...</div>;

    // DATA PREP FOR SPECIFIC CATEGORY VIEW
    const allPairs = league.pairs.filter(p => p.category_id === activeCategoryId);
    const completePairs = allPairs.filter(p => p.player2Id).sort((a,b) => b.id.localeCompare(a.id));
    const incompletePairs = allPairs.filter(p => !p.player2Id).sort((a,b) => b.id.localeCompare(a.id));
    const displayPairs = [...incompletePairs, ...completePairs];

    const hasMatches = league.matches.some(m => m.category_id === activeCategoryId);
    const hasPlayoffMatches = league.matches.some(m => m.category_id === activeCategoryId && m.phase === 'playoff');
    
    let currentCategoryStatus = 'Inscripción';
    if (hasMatches) currentCategoryStatus = 'Fase Grupos';
    if (hasPlayoffMatches) currentCategoryStatus = 'Playoffs';

    return (
        <div className="space-y-6 pb-32 animate-fade-in">
            {/* Header (General for all tabs) */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white">{league.title}</h2>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'standings' && (
                        <button onClick={handleGenerateWinnerPoster} className="p-2.5 bg-amber-500 text-white rounded-xl shadow-lg hover:scale-105 transition-transform"><ImageIcon size={20}/></button>
                    )}
                </div>
            </div>

            {/* CATEGORY NAV BAR */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                <button 
                    onClick={() => setActiveCategoryId('overview')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${activeCategoryId === 'overview' ? 'bg-white text-indigo-900 border-white' : 'bg-white/10 text-white border-white/10 hover:bg-white/20'}`}
                >
                    <LayoutGrid size={12}/> Resumen
                </button>
                <div className="w-px h-6 bg-white/20 mx-1"></div>
                {league.categories.map(cat => (
                    <button 
                        key={cat.id} 
                        onClick={() => { setActiveCategoryId(cat.id); setTab('management'); }}
                        style={{ backgroundColor: activeCategoryId === cat.id ? THEME.cta : 'rgba(255,255,255,0.1)', color: 'white' }}
                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${activeCategoryId === cat.id ? 'border-transparent' : 'border-white/10 hover:bg-white/20'}`}
                    >
                        {cat.name}
                    </button>
                ))}
                <button 
                    onClick={() => setShowAddCategory(true)}
                    className="px-3 py-2 rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/10 transition-colors"
                >
                    <Plus size={14}/>
                </button>
            </div>

            {/* --- VIEW ROUTER --- */}
            
            {activeCategoryId === 'overview' ? (
                renderOverview()
            ) : (
                <>
                    {/* TAB: MANAGEMENT (GESTIÓN) */}
                    {activeTab === 'management' && (
                        <div className="space-y-6 animate-slide-up">
                            <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-indigo-100">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900">Estado: {league.categories.find(c=>c.id===activeCategoryId)?.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`w-2.5 h-2.5 rounded-full ${!hasMatches ? 'bg-orange-500' : 'bg-emerald-500'}`}></span>
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{currentCategoryStatus}</span>
                                        </div>
                                    </div>
                                    <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
                                        <Settings size={24}/>
                                    </div>
                                </div>

                                {/* GENERATOR MOVED HERE */}
                                {!hasMatches ? (
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                            <LayoutGrid size={16} className="text-indigo-500"/> Configuración Calendario
                                        </h4>
                                        
                                        {completePairs.length < 4 ? (
                                            <div className="text-xs text-slate-500 italic bg-white p-3 rounded-lg border border-slate-200">
                                                Se necesitan al menos 4 parejas para generar la liga.
                                                <br/>
                                                <button onClick={() => setTab('registration')} className="text-indigo-600 font-bold mt-1 underline">Ir a Registro</button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                                                    <div className="text-xs font-bold text-slate-600">Formato: {doubleRound ? 'Ida y Vuelta' : 'Solo Ida'}</div>
                                                    <button onClick={() => setDoubleRound(!doubleRound)} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-500"><Repeat size={14}/></button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button onClick={() => handlePreGenerate('elo-balanced')} className="p-3 bg-white border-2 border-slate-100 hover:border-indigo-200 rounded-xl text-xs font-bold text-slate-700 transition-all flex flex-col items-center gap-1">
                                                        <TrendingUp size={16} className="text-indigo-500"/> Por Nivel
                                                    </button>
                                                    <button onClick={() => handlePreGenerate('elo-mixed')} className="p-3 bg-white border-2 border-slate-100 hover:border-indigo-200 rounded-xl text-xs font-bold text-slate-700 transition-all flex flex-col items-center gap-1">
                                                        <Shuffle size={16} className="text-indigo-500"/> Sorteo Mix
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
                                        <CheckCircle className="text-emerald-500" size={24}/>
                                        <div>
                                            <div className="font-bold text-emerald-800 text-sm">Competición en Curso</div>
                                            <div className="text-xs text-emerald-600">Gestiona los partidos en la pestaña Jornadas.</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-white uppercase tracking-widest px-2">Accesos Directos</h4>
                                <button onClick={() => setTab('registration')} className="w-full flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 transition-all text-left text-white">
                                    <div className="flex items-center gap-3">
                                        <Users size={20}/> 
                                        <div>
                                            <div className="font-bold">Gestionar Inscripciones</div>
                                            <div className="text-[10px] opacity-70">Añadir parejas y cerrar grupos</div>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="opacity-50"/>
                                </button>
                                
                                {hasMatches && (
                                    <button onClick={() => setTab('standings')} className="w-full flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 transition-all text-left text-white">
                                        <div className="flex items-center gap-3">
                                            <GitMerge size={20}/> 
                                            <div>
                                                <div className="font-bold">Playoffs</div>
                                                <div className="text-[10px] opacity-70">Generar cruces (disponible en 'Clasi')</div>
                                            </div>
                                        </div>
                                        <ChevronRight size={20} className="opacity-50"/>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB: REGISTRATION (REGISTRO) */}
                    {activeTab === 'registration' && (
                        <div className="space-y-6 animate-slide-up">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-indigo-100 text-center">
                                    <div className="text-3xl font-black text-indigo-500">{completePairs.length}</div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Parejas</div>
                                </div>
                                <button 
                                    onClick={openAddModal}
                                    className="bg-indigo-500 rounded-[2rem] p-6 shadow-lg border border-indigo-400 text-center text-white active:scale-95 transition-transform group"
                                >
                                    <div className="flex justify-center mb-1 group-hover:scale-110 transition-transform"><Plus size={32} strokeWidth={3}/></div>
                                    <div className="text-[10px] font-black uppercase tracking-widest">Añadir Pareja</div>
                                </button>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 px-2">Listado {league.categories.find(c=>c.id===activeCategoryId)?.name}</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {displayPairs.map((pair, idx) => {
                                        const player1 = state.players.find(p => p.id === pair.player1Id);
                                        const player2 = pair.player2Id ? state.players.find(p => p.id === pair.player2Id) : null;
                                        const isSolo = !player2;
                                        const pairElo = getPairElo(pair, state.players);

                                        return (
                                            <div 
                                                key={pair.id} 
                                                className={`p-4 rounded-xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${isSolo ? 'bg-amber-50 border-2 border-amber-200 order-first' : 'bg-white border border-slate-200'}`}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isSolo ? 'bg-amber-200 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{idx + 1}</span>
                                                        {isSolo && <span className="text-[9px] uppercase font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Busca Pareja</span>}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => openEditModal(pair.id)} className={`p-1.5 rounded-lg transition-colors ${isSolo ? 'text-amber-600 hover:bg-amber-100' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-50'}`}><Edit2 size={16}/></button>
                                                        <button onClick={() => setShowDeleteConfirm(pair.id)} className={`p-1.5 rounded-lg transition-colors ${isSolo ? 'text-amber-600 hover:bg-amber-100' : 'text-slate-400 hover:text-red-600 hover:bg-slate-50'}`}><Trash2 size={16}/></button>
                                                    </div>
                                                </div>

                                                <div className="space-y-1 mb-3">
                                                    <div className="text-sm font-bold text-slate-800 truncate">{formatPlayerName(player1)}</div>
                                                    {isSolo && player1 && (
                                                        <div className="mt-1 flex items-center gap-2">
                                                            {getPositionLabel(player1.preferred_position, player1.play_both_sides)}
                                                        </div>
                                                    )}
                                                    
                                                    {player2 ? (
                                                        <div className="flex items-center gap-2">
                                                            <span style={{ color: THEME.cta }} className="text-xs font-black">&</span>
                                                            <div className="text-sm font-bold text-slate-800 truncate">{formatPlayerName(player2)}</div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-amber-500 italic mt-1 flex items-center gap-1">
                                                            <UserPlus size={12}/> Esperando compañero...
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {!isSolo && (
                                                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                                        <div className="bg-slate-50 px-2 py-1 rounded text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                                            <TrendingUp size={10}/> ELO {pairElo}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {displayPairs.length === 0 && (
                                    <div className="text-center py-10 text-slate-400 text-sm italic bg-white/5 rounded-2xl border border-white/10">No hay inscripciones aún.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB: STANDINGS (CLASI) */}
                    {activeTab === 'standings' && (
                        <div className="space-y-4 animate-slide-up">
                            <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-indigo-100">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b">
                                        <tr><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Pos</th><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Pareja</th><th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase">PG</th><th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase">Pts</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {calculateStandings.map((s, idx) => (
                                            <tr key={s.pairId} onClick={() => setSelectedPairId(s.pairId)} className="hover:bg-slate-50/80 cursor-pointer transition-colors">
                                                <td className="px-6 py-5"><span className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${idx < 3 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>{idx + 1}</span></td>
                                                <td className="px-6 py-5"><div className="font-bold text-slate-800 text-sm">{s.pairName}</div></td>
                                                <td className="px-4 py-5 text-center font-bold text-emerald-500">{s.won}</td>
                                                <td className="px-4 py-5 text-center"><span className="bg-indigo-50 text-indigo-600 font-black px-3 py-1 rounded-lg text-sm">{s.points}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {hasMatches && (
                                <button 
                                    onClick={() => setShowPlayoffWizard(true)}
                                    className="w-full py-4 bg-white text-indigo-500 border-2 border-dashed border-indigo-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-colors"
                                >
                                    GENERAR CUADRO ELIMINATORIO
                                </button>
                            )}
                        </div>
                    )}

                    {/* TAB: CALENDAR (JORNADAS) */}
                    {activeTab === 'calendar' && (
                        <div className="space-y-4 animate-slide-up">
                            {roundNumbers.map(round => {
                                const isExpanded = expandedRound === round;
                                const roundMatches = matchesByRound[round];
                                const finishedCount = roundMatches.filter(m => m.isFinished).length;
                                const totalCount = roundMatches.length;
                                
                                return (
                                    <div key={round} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                                        <button 
                                            onClick={() => setExpandedRound(isExpanded ? null : round)}
                                            className={`w-full p-5 flex justify-between items-center transition-colors ${isExpanded ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${isExpanded ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>J{round}</div>
                                                <div className="text-left">
                                                    <div className="font-bold text-slate-900">Jornada {round}</div>
                                                    <div className="text-[10px] font-bold uppercase text-slate-400">{finishedCount}/{totalCount} Partidos</div>
                                                </div>
                                            </div>
                                            {isExpanded ? <ChevronUp className="text-slate-400"/> : <ChevronDown className="text-slate-400"/>}
                                        </button>
                                        
                                        {isExpanded && (
                                            <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                                                {roundMatches.map(m => <MatchRow key={m.id} match={m} />)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* TAB: PLAYOFFS */}
                    {activeTab === 'playoffs' && (
                        <div className="space-y-8 animate-slide-up">
                            {!hasPlayoffMatches ? (
                                <div className="text-center py-20 bg-white/10 rounded-[2.5rem] border-2 border-dashed border-white/20">
                                    <GitMerge size={48} className="mx-auto text-white/50 mb-4"/><p className="text-white/70 font-bold px-10">Termina la fase de grupos para generar el cuadro final.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {league.matches.filter(m => m.category_id === activeCategoryId && m.phase === 'playoff').map(m => (
                                        <MatchRow key={m.id} match={m} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* MODALS */}
            
            {/* ADD CATEGORY MODAL */}
            {showAddCategory && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
                        <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2"><FolderPlus className="text-indigo-500"/> Nueva Categoría</h3>
                        <input autoFocus value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Ej. 3ª División" className="w-full p-3 border rounded-xl bg-slate-50 outline-none focus:border-indigo-500 font-bold mb-4"/>
                        <div className="flex gap-2">
                            <button onClick={() => setShowAddCategory(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancelar</button>
                            <button onClick={handleAddCategory} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg">Crear</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PAIR ADD/EDIT MODAL */}
            {isPairModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4">
                    <div className="bg-white w-full h-[90vh] sm:h-auto sm:max-h-[85vh] sm:rounded-[2.5rem] sm:max-w-md shadow-2xl animate-slide-up flex flex-col">
                        <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100">
                             <h3 className="text-xl font-black text-slate-900">{editingPairId ? 'Editar Pareja' : 'Inscribir Pareja'}</h3>
                             <button onClick={() => setIsPairModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X size={20}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <PlayerSelector 
                                label="CAPITÁN (Jugador 1)" 
                                selectedId={p1} 
                                onSelect={setP1} 
                                otherSelectedId={p2}
                                players={availablePlayers.concat(p1 ? [state.players.find(p=>p.id===p1)!].filter(Boolean) : [])}
                                onAddPlayer={addPlayerToDB}
                                formatName={formatPlayerName}
                            />
                            <div className="flex justify-center -my-3 relative z-10"><span className="bg-white text-indigo-400 text-xs px-2 py-1 rounded-full font-black border border-indigo-100">&</span></div>
                            <PlayerSelector 
                                label="JUGADOR 2" 
                                selectedId={p2} 
                                onSelect={setP2} 
                                otherSelectedId={p1}
                                players={availablePlayers.concat(p2 ? [state.players.find(p=>p.id===p2)!].filter(Boolean) : [])}
                                onAddPlayer={addPlayerToDB}
                                formatName={formatPlayerName}
                            />
                            
                            <div className="mt-8">
                                <button 
                                    onClick={handleSavePair}
                                    disabled={!p1 && !p2} 
                                    className="w-full py-5 bg-indigo-500 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:grayscale transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Save size={20}/> 
                                    {editingPairId ? 'GUARDAR CAMBIOS' : (!p2 ? 'AÑADIR COMO SOLO' : 'CONFIRMAR INSCRIPCIÓN')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-scale-in text-center">
                        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">¿Eliminar Pareja?</h3>
                        <p className="text-slate-500 mb-6 text-sm">
                            Esta acción eliminará a la pareja de la liga. Los jugadores no se borrarán del club.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold">Cancelar</button>
                            <button onClick={handleDeleteConfirm} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold shadow-lg">Eliminar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* GENERATE CONFIRMATION MODAL */}
            {showGenerateConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-scale-in text-center">
                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                            <LayoutGrid size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">Generar Calendario</h3>
                        <p className="text-slate-500 mb-6 text-sm">
                            Se generarán los grupos y partidos para <strong>{league.categories.find(c=>c.id===activeCategoryId)?.name}</strong>. <br/>
                            <strong>Método:</strong> {genMethod === 'elo-balanced' ? 'Equilibrado por Nivel' : 'Sorteo Mix'}.<br/>
                            <strong>Formato:</strong> {doubleRound ? 'Ida y Vuelta' : 'Solo Ida'}.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowGenerateConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold">Cancelar</button>
                            <button onClick={handleConfirmGenerate} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PLAYOFF WIZARD MODAL */}
            {showPlayoffWizard && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-scale-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <Trophy className="text-amber-500"/> Configurar Playoffs
                            </h3>
                            <button onClick={() => setShowPlayoffWizard(false)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X size={20}/></button>
                        </div>

                        <div className="space-y-6">
                            {/* QUOTA */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Clasificados por Grupo</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[1, 2, 4, 8].map(num => (
                                        <button 
                                            key={num} 
                                            onClick={() => setPoQuota(num)}
                                            className={`py-3 rounded-xl font-bold transition-all border-2 ${poQuota === num ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}`}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* CROSS TYPE */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Tipo de Cruce</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setPoCross('crossed')}
                                        className={`p-3 rounded-xl border-2 text-left transition-all ${poCross === 'crossed' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}
                                    >
                                        <div className="font-bold text-slate-800 text-sm">Cruzado</div>
                                        <div className="text-[10px] text-slate-500">1º A vs 4º B</div>
                                    </button>
                                    <button 
                                        onClick={() => setPoCross('internal')}
                                        className={`p-3 rounded-xl border-2 text-left transition-all ${poCross === 'internal' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}
                                    >
                                        <div className="font-bold text-slate-800 text-sm">Interno</div>
                                        <div className="text-[10px] text-slate-500">1º A vs 4º A</div>
                                    </button>
                                </div>
                            </div>

                            {/* FORMAT */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Formato de Partido</label>
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button 
                                        onClick={() => setPoFormat('single')} 
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${poFormat === 'single' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                                    >
                                        Partido Único
                                    </button>
                                    <button 
                                        onClick={() => setPoFormat('double')} 
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${poFormat === 'double' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                                    >
                                        Ida y Vuelta
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button 
                                    onClick={handleConfirmPlayoffs}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <GitMerge size={20}/> GENERAR CUADRO
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* GENERIC ALERT MODAL */}
            {alertMessage && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-scale-in text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${alertMessage.type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {alertMessage.type === 'error' ? <AlertTriangle size={32} /> : <CheckCircle size={32} />}
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">{alertMessage.type === 'error' ? 'Atención' : 'Éxito'}</h3>
                        <p className="text-slate-500 mb-6 text-sm">{alertMessage.message}</p>
                        <button onClick={() => setAlertMessage(null)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg">Entendido</button>
                    </div>
                </div>
            )}

            {/* SCORE EDITOR MODAL */}
            {editingMatchId && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-scale-in relative">
                        <button onClick={() => setEditingMatchId(null)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full"><X size={20}/></button>
                        <h3 className="text-xl font-black text-slate-900 mb-8">Editar Resultado</h3>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Sets P1</label><input type="number" value={setsA} onChange={e => setSetsA(parseInt(e.target.value))} className="w-full bg-slate-50 border p-4 text-2xl font-black text-center rounded-2xl outline-none focus:border-indigo-400"/></div>
                                <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Sets P2</label><input type="number" value={setsB} onChange={e => setSetsB(parseInt(e.target.value))} className="w-full bg-slate-50 border p-4 text-2xl font-black text-center rounded-2xl outline-none focus:border-indigo-400"/></div>
                            </div>
                            <input value={scoreText} onChange={e => setScoreText(e.target.value)} placeholder="6/4 7/5" className="w-full bg-slate-50 border p-4 font-bold rounded-2xl text-center outline-none focus:border-indigo-400"/>
                            <button onClick={handleSaveScore} className="w-full py-5 bg-indigo-500 text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all">GUARDAR RESULTADO</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PAIR DETAILS MODAL (SCHEDULE) */}
            {selectedPairId && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-end sm:items-center justify-center sm:p-4">
                    <div className="bg-white w-full h-[85vh] sm:h-auto sm:max-h-[85vh] sm:rounded-[2.5rem] sm:max-w-md shadow-2xl animate-slide-up flex flex-col overflow-hidden">
                        <div className="bg-slate-900 p-6 text-white shrink-0">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-black leading-tight w-3/4">{getPairName(selectedPairId)}</h3>
                                <button onClick={() => setSelectedPairId(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><X size={20}/></button>
                            </div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Clock size={12}/> Calendario Completo</div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50 space-y-3">
                            {league.matches
                                .filter(m => (m.pairAId === selectedPairId || m.pairBId === selectedPairId) && m.category_id === activeCategoryId)
                                .sort((a,b) => (a.round || 0) - (b.round || 0))
                                .map(m => (
                                    <div key={m.id} className="relative">
                                        <div className="absolute -left-2 top-4 w-4 h-px bg-slate-300"></div>
                                        <div className="pl-4">
                                            <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Jornada {m.round}</div>
                                            <MatchRow match={m} />
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            )}

            <PosterGenerator isOpen={showPoster} onClose={() => setShowPoster(false)} data={posterData} />
        </div>
    );
};

export default LeagueActive;
