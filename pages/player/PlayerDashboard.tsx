
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../../store/TournamentContext';
import { useHistory } from '../../store/HistoryContext';
import { useNotifications } from '../../store/NotificationContext';
import { useAuth } from '../../store/AuthContext';
import { THEME } from '../../utils/theme';
import { Activity, TrendingUp, Award, Calendar, ChevronRight, LogOut, UserCircle, Bell, ShieldAlert, ArrowLeft } from 'lucide-react';
import { calculateDisplayRanking } from '../../utils/Elo';

const PlayerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { state, formatPlayerName } = useTournament();
    const { pastTournaments } = useHistory();
    const { unreadCount } = useNotifications();
    const { role, signOut, user } = useAuth();

    // ID del jugador simulado o real
    const [myPlayerId, setMyPlayerId] = useState<string>(() => {
        return localStorage.getItem('padel_sim_player_id') || '';
    });

    useEffect(() => {
        if (myPlayerId) {
            localStorage.setItem('padel_sim_player_id', myPlayerId);
        }
    }, [myPlayerId]);

    const isAdmin = role === 'admin' || role === 'superadmin';
    const currentPlayer = state.players.find(p => p.id === myPlayerId);

    // Si eres ADMIN y NO tienes un ID de jugador seleccionado aún,
    // vamos a intentar buscar si existe un jugador con tu mismo nombre o email
    useEffect(() => {
        if (isAdmin && !myPlayerId && state.players.length > 0) {
            const autoPlayer = state.players.find(p => p.email === user?.email);
            if (autoPlayer) setMyPlayerId(autoPlayer.id);
        }
    }, [isAdmin, myPlayerId, state.players, user]);

    const stats = useMemo(() => {
        if (!currentPlayer) return null;
        const result = { matches: 0, wins: 0, winRate: 0 };
        const processData = (tData: any) => {
            const myPairs = tData.pairs.filter((p: any) => p.player1Id === myPlayerId || p.player2Id === myPlayerId);
            myPairs.forEach((pair: any) => {
                const matches = tData.matches.filter((m: any) => m.isFinished && (m.pairAId === pair.id || m.pairBId === pair.id));
                matches.forEach((m: any) => {
                    result.matches++;
                    const isPairA = m.pairAId === pair.id;
                    const won = (isPairA && (m.scoreA || 0) > (m.scoreB || 0)) || (!isPairA && (m.scoreB || 0) > (m.scoreA || 0));
                    if (won) result.wins++;
                });
            });
        };
        pastTournaments.forEach(pt => { if (pt.data) processData(pt.data); });
        if (state.status !== 'setup') processData(state);
        result.winRate = result.matches > 0 ? Math.round((result.wins / result.matches) * 100) : 0;
        return result;
    }, [currentPlayer, pastTournaments, state, myPlayerId]);

    const handleExit = async () => {
        if (isAdmin) navigate('/dashboard');
        else { await signOut(); navigate('/'); }
    };

    // Si el usuario es ADMIN y entra aquí, no bloqueamos con el selector a menos que quiera
    if (!currentPlayer && !isAdmin) {
        return (
            <div className="p-8 min-h-screen flex flex-col justify-center items-center text-center bg-white">
                <UserCircle size={64} className="text-slate-300 mb-4"/>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Identifícate</h2>
                <p className="text-slate-500 mb-8">Selecciona tu perfil de jugador para ver tus estadísticas.</p>
                <select 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-[#575AF9]"
                    onChange={(e) => setMyPlayerId(e.target.value)}
                    value=""
                >
                    <option value="" disabled>Seleccionar Jugador...</option>
                    {state.players.map(p => (
                        <option key={p.id} value={p.id}>{formatPlayerName(p)}</option>
                    ))}
                </select>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 relative pb-24">
            
            {/* Header de Administrador (Botón de pánico/retorno) */}
            {isAdmin && (
                <div className="bg-indigo-600 -mx-6 -mt-6 p-4 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-2 text-white">
                        <ShieldAlert size={20}/>
                        <span className="text-xs font-black uppercase tracking-wider">Modo Vista Jugador</span>
                    </div>
                    <button 
                        onClick={() => navigate('/dashboard')}
                        className="bg-white text-indigo-600 px-4 py-1.5 rounded-lg text-xs font-black flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                    >
                        <ArrowLeft size={14}/> VOLVER A GESTIÓN
                    </button>
                </div>
            )}

            {/* Selector de identidad para admins (Discreto) */}
            {isAdmin && (
                <div className="bg-slate-100 p-3 rounded-xl flex items-center justify-between gap-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase leading-none">Simular como:</span>
                    <select 
                        value={myPlayerId} 
                        onChange={(e) => setMyPlayerId(e.target.value)}
                        className="bg-transparent border-none font-bold text-slate-700 text-xs outline-none flex-1"
                    >
                        <option value="">Seleccionar...</option>
                        {state.players.map(p => <option key={p.id} value={p.id}>{formatPlayerName(p)}</option>)}
                    </select>
                </div>
            )}

            {/* Si no hay jugador seleccionado pero es admin, mostramos placeholder */}
            {!currentPlayer ? (
                <div className="py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                        <UserCircle size={40}/>
                    </div>
                    <h3 className="text-slate-400 font-bold">Selecciona un jugador arriba para ver la App</h3>
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Hola de nuevo,</h1>
                            <h2 className="text-3xl font-black text-slate-900">{currentPlayer.nickname || currentPlayer.name.split(' ')[0]}</h2>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-black text-indigo-600 border-2 border-white shadow-sm">
                            {currentPlayer.name[0]}
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl bg-gradient-to-br from-[#2B2DBF] to-[#575AF9]">
                        <div className="absolute top-0 right-0 p-6 opacity-20"><TrendingUp size={120} /></div>
                        <div className="relative z-10">
                            <div className="text-emerald-300 font-bold text-xs uppercase tracking-widest mb-1 flex items-center gap-1"><Activity size={14}/> Ranking PadelPro</div>
                            <div className="text-6xl font-black tracking-tighter mb-2">{calculateDisplayRanking(currentPlayer)}</div>
                            <div className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold border border-white/10">{currentPlayer.categories?.[0] || 'Iniciación'}</div>
                        </div>
                        <div className="relative z-10 mt-8 grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                            <div><div className="text-2xl font-black">{stats?.winRate}%</div><div className="text-[10px] text-indigo-200 uppercase font-bold">Victorias</div></div>
                            <div><div className="text-2xl font-black">{stats?.matches}</div><div className="text-[10px] text-indigo-200 uppercase font-bold">Partidos</div></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => navigate('/p/tournaments')} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-all"><div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Calendar size={24} /></div><span className="text-xs font-black text-slate-700 uppercase tracking-wider">Torneos</span></button>
                        <button onClick={() => navigate('/p/profile')} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-all"><div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center"><Award size={24} /></div><span className="text-xs font-black text-slate-700 uppercase tracking-wider">Historial</span></button>
                    </div>
                </>
            )}
        </div>
    );
};

export default PlayerDashboard;
