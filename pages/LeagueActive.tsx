
import React, { useState, useMemo } from 'react';
import { useLeague } from '../store/LeagueContext';
import { useTournament } from '../store/TournamentContext';
import { 
    Trophy, List, ChevronRight, Share2, Edit3, X, Save,
    ArrowLeft, GitMerge, Star, Hash, Image as ImageIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PosterGenerator } from '../components/PosterGenerator';

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
    const { league, updateLeagueScore, advanceToPlayoffs } = useLeague();
    const { state, formatPlayerName } = useTournament();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<'standings' | 'matches' | 'playoffs'>('standings');
    const [selectedCatId, setSelectedCatId] = useState(league.categories[0]?.id);
    const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
    const [scoreText, setScoreText] = useState('');
    const [setsA, setSetsA] = useState(0);
    const [setsB, setSetsB] = useState(0);

    // Poster Logic
    const [showPoster, setShowPoster] = useState(false);
    const [posterData, setPosterData] = useState<any>(null);

    const getPairName = (id: string) => {
        if (id === 'TBD') return 'Por determinar...';
        const pair = league.pairs.find(p => p.id === id);
        if (!pair) return 'Pareja Desc.';
        const p1 = state.players.find(p => p.id === pair.player1Id);
        const p2 = state.players.find(p => p.id === pair.player2Id);
        return `${formatPlayerName(p1)} & ${formatPlayerName(p2)}`;
    };

    const calculateStandings = useMemo(() => {
        const standings: Record<string, Standing> = {};
        league.pairs.filter(p => p.category_id === selectedCatId).forEach(p => {
            standings[p.id] = { pairId: p.id, pairName: getPairName(p.id), played: 0, won: 0, lost: 0, setsF: 0, setsC: 0, points: 0 };
        });
        league.matches.filter(m => m.category_id === selectedCatId && m.phase === 'group' && m.isFinished).forEach(m => {
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
    }, [league.matches, league.pairs, selectedCatId]);

    const handleGenerateWinnerPoster = () => {
        const topPair = calculateStandings[0];
        if (!topPair) return;
        setPosterData({
            title: league.title,
            winnerNames: topPair.pairName,
            category: league.categories.find(c => c.id === selectedCatId)?.name,
            type: 'champions'
        });
        setShowPoster(true);
    };

    const handleSaveScore = async () => {
        if (!editingMatchId) return;
        await updateLeagueScore(editingMatchId, setsA, setsB, scoreText);
        setEditingMatchId(null);
    };

    const PlayoffMatch: React.FC<{ match: any }> = ({ match }) => (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-2 bg-white border-b border-slate-100 flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {match.id.includes('qf') ? 'Cuartos' : match.id.includes('sf') ? 'Semi' : 'Final'}
                </span>
                <button onClick={() => { setEditingMatchId(match.id); setSetsA(match.setsA || 0); setSetsB(match.setsB || 0); setScoreText(match.score_text || ''); }} className="p-1 text-indigo-400 hover:bg-indigo-50 rounded">
                    <Edit3 size={14}/>
                </button>
            </div>
            <div className="p-3 space-y-2">
                <div className={`flex justify-between items-center ${match.winnerId === match.pairAId ? 'text-indigo-600' : 'text-slate-700'}`}>
                    <span className="text-xs font-bold truncate w-4/5">{getPairName(match.pairAId)}</span>
                    <span className="font-black">{match.setsA ?? '-'}</span>
                </div>
                <div className={`flex justify-between items-center ${match.winnerId === match.pairBId ? 'text-indigo-600' : 'text-slate-700'}`}>
                    <span className="text-xs font-bold truncate w-4/5">{getPairName(match.pairBId)}</span>
                    <span className="font-black">{match.setsB ?? '-'}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 pb-32 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/league')} className="p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"><ArrowLeft size={20} /></button>
                    <h2 className="text-2xl font-black text-white">{league.title}</h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleGenerateWinnerPoster} className="p-2.5 bg-amber-500 text-white rounded-xl shadow-lg hover:scale-105 transition-transform"><ImageIcon size={20}/></button>
                    <button className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-lg hover:scale-105 transition-transform"><Share2 size={20}/></button>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {league.categories.map(cat => (
                    <button key={cat.id} onClick={() => setSelectedCatId(cat.id)} className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap ${selectedCatId === cat.id ? 'bg-white text-indigo-500 shadow-lg' : 'bg-indigo-500 text-indigo-100'}`}>{cat.name}</button>
                ))}
            </div>

            <div className="flex bg-indigo-500 p-1 rounded-2xl">
                <button onClick={() => setActiveTab('standings')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all ${activeTab === 'standings' ? 'bg-white text-indigo-500' : 'text-indigo-100'}`}><Trophy size={16}/> Clasificación</button>
                <button onClick={() => setActiveTab('matches')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all ${activeTab === 'matches' ? 'bg-white text-indigo-500' : 'text-indigo-100'}`}><List size={16}/> Partidos</button>
                <button onClick={() => setActiveTab('playoffs')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all ${activeTab === 'playoffs' ? 'bg-white text-indigo-500' : 'text-indigo-100'}`}><GitMerge size={16}/> Playoff</button>
            </div>

            {activeTab === 'standings' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-indigo-100">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b">
                                <tr><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Pos</th><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Pareja</th><th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase">PG</th><th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase">Pts</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {calculateStandings.map((s, idx) => (
                                    <tr key={s.pairId} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-5"><span className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${idx < 3 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>{idx + 1}</span></td>
                                        <td className="px-6 py-5"><div className="font-bold text-slate-800 text-sm">{s.pairName}</div></td>
                                        <td className="px-4 py-5 text-center font-bold text-emerald-500">{s.won}</td>
                                        <td className="px-4 py-5 text-center"><span className="bg-indigo-50 text-indigo-600 font-black px-3 py-1 rounded-lg text-sm">{s.points}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {league.status === 'groups' && <button onClick={() => advanceToPlayoffs(selectedCatId!)} className="w-full py-4 bg-white text-indigo-500 border-2 border-dashed border-indigo-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-colors">GENERAR CUADRO ELIMINATORIO</button>}
                </div>
            )}

            {activeTab === 'matches' && (
                <div className="space-y-4">
                    {league.matches.filter(m => m.category_id === selectedCatId && m.phase === 'group').map(m => (
                        <div key={m.id} className="bg-white rounded-[2rem] p-6 shadow-xl border border-indigo-50 group">
                            <div className="flex justify-between items-center mb-4">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${m.isFinished ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{m.isFinished ? 'Finalizado' : 'Fase Regular'}</span>
                                <button onClick={() => { setEditingMatchId(m.id); setSetsA(m.setsA || 0); setSetsB(m.setsB || 0); setScoreText(m.score_text || ''); }} className="p-2 text-slate-300 hover:text-indigo-500 transition-all"><Edit3 size={18}/></button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                <div className="flex justify-between items-center"><span className="font-black text-slate-800 text-sm truncate w-4/5">{getPairName(m.pairAId)}</span><span className="text-xl font-black text-indigo-500">{m.setsA ?? '-'}</span></div>
                                <div className="flex justify-between items-center"><span className="font-black text-slate-800 text-sm truncate w-4/5">{getPairName(m.pairBId)}</span><span className="text-xl font-black text-indigo-500">{m.setsB ?? '-'}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'playoffs' && (
                <div className="space-y-8 animate-fade-in">
                    {league.status !== 'playoffs' ? (
                        <div className="text-center py-20 bg-white/10 rounded-[2.5rem] border-2 border-dashed border-white/20">
                            <GitMerge size={48} className="mx-auto text-white/50 mb-4"/><p className="text-white/70 font-bold px-10">Termina la fase de grupos para generar el cuadro final.</p>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            <div className="bg-white rounded-[2.5rem] p-6 shadow-xl space-y-8">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2"><Star size={12}/> Cuartos de Final</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {league.matches.filter(m => m.category_id === selectedCatId && m.id.startsWith('qf-')).map(m => <PlayoffMatch key={m.id} match={m} />)}
                                    </div>
                                </div>
                                <div className="space-y-4 border-t border-slate-50 pt-6">
                                    <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2"><GitMerge size={12}/> Semifinales</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {league.matches.filter(m => m.category_id === selectedCatId && m.id.startsWith('sf-')).map(m => <PlayoffMatch key={m.id} match={m} />)}
                                    </div>
                                </div>
                                <div className="space-y-4 border-t border-indigo-100 pt-6">
                                    <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2"><Trophy size={16}/> Gran Final</h4>
                                    <div className="max-w-md mx-auto">
                                        {league.matches.filter(m => m.category_id === selectedCatId && m.id.startsWith('final-')).map(m => <PlayoffMatch key={m.id} match={m} />)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

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

            <PosterGenerator 
                isOpen={showPoster} 
                onClose={() => setShowPoster(false)} 
                data={posterData} 
            />
        </div>
    );
};

export default LeagueActive;
