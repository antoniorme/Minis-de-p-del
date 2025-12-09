
import React, { useState, useEffect } from 'react';
import { useTournament, TOURNAMENT_CATEGORIES } from '../../store/TournamentContext';
import { THEME, getFormatColor } from '../../utils/theme';
import { Calendar, Users, ArrowRight, Clock, CheckCircle, Search, UserPlus, X, Mail, Check, Trash2, AlertTriangle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calculateInitialElo } from '../../utils/Elo';

const PlayerTournaments: React.FC = () => {
    const { state, createPairInDB, formatPlayerName, respondToInviteDB, deletePairDB, addPlayerToDB } = useTournament();
    const navigate = useNavigate();

    // Get current logged-in player ID from LocalStorage (Simulator)
    const [myPlayerId, setMyPlayerId] = useState<string>('');
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [modalTab, setModalTab] = useState<'club' | 'guest'>('club');
    
    // Club Search State
    const [selectedPartnerId, setSelectedPartnerId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Guest Creation State
    const [guestName, setGuestName] = useState('');
    const [guestLevel, setGuestLevel] = useState(5);
    const [guestCategory, setGuestCategory] = useState<string>('Iniciación');
    const [smartMatchWarning, setSmartMatchWarning] = useState<any[]>([]);

    useEffect(() => {
        const storedId = localStorage.getItem('padel_sim_player_id');
        if (storedId) setMyPlayerId(storedId);
        else navigate('/p/dashboard');
    }, [navigate]);

    // CHECK REGISTRATION STATUS
    // Find any pair I am part of, excluding rejected ones
    const myRegistration = state.pairs.find(p => (p.player1Id === myPlayerId || p.player2Id === myPlayerId) && p.status !== 'rejected');
    const isRegistered = !!myRegistration;
    const isPending = myRegistration?.status === 'pending';
    
    // Am I the inviter or invitee? (Assumption: P1 is usually creator)
    const isInviter = myRegistration && myRegistration.player1Id === myPlayerId;

    // Resolve Partner Name if registered
    let partnerName = '...';
    let partnerId = '';
    if (isRegistered) {
        partnerId = myRegistration.player1Id === myPlayerId ? myRegistration.player2Id : myRegistration.player1Id;
        const partner = state.players.find(p => p.id === partnerId);
        partnerName = formatPlayerName(partner);
    }

    // Determine tournament status for display
    const hasTournament = state.status !== 'finished';
    const isRegistrationOpen = state.status === 'setup';
    const themeColor = getFormatColor(state.format);
    const formatLabel = state.format ? state.format.replace('_mini', '') : '16';

    // --- ACTIONS ---

    const handleInviteClubPlayer = async () => {
        if (!selectedPartnerId) return;
        // Create as PENDING
        await createPairInDB(myPlayerId, selectedPartnerId, 'pending');
        setIsRegisterModalOpen(false);
    };

    const handleCreateGuest = async () => {
        if (!guestName) return;
        // 1. Create Guest Player with explicitly set NICKNAME to ensure display works in admin
        const initialElo = calculateInitialElo([guestCategory, 'Invitado'], guestLevel);
        const newId = await addPlayerToDB({
            name: guestName + ' (Invitado)',
            nickname: guestName, // IMPORTANT: Set nickname to the input name for clean display
            categories: [guestCategory, 'Invitado'],
            manual_rating: guestLevel,
            global_rating: initialElo
        });

        if (newId) {
            // 2. Create Confirmed Pair (Since I control the guest)
            await createPairInDB(myPlayerId, newId, 'confirmed');
            setIsRegisterModalOpen(false);
        }
    };

    const handleAcceptInvite = async () => {
        if (myRegistration) await respondToInviteDB(myRegistration.id, 'accept');
    };

    const handleRejectInvite = async () => {
        if (myRegistration) {
            await respondToInviteDB(myRegistration.id, 'reject');
            // If rejected, usually we want to delete it to clear the view or keep history
            // For MVP, rejecting deletes the pair so user can be invited again or invite others
            await deletePairDB(myRegistration.id); 
        }
    };

    const handleCancelInvite = async () => {
        if (myRegistration) await deletePairDB(myRegistration.id);
    };

    // Filter available partners: Not me, Not already registered/pending
    const availablePartners = state.players.filter(p => {
        if (p.id === myPlayerId) return false;
        // Check if player is in any non-rejected pair
        const isBusy = state.pairs.some(pair => (pair.player1Id === p.id || pair.player2Id === p.id) && pair.status !== 'rejected');
        if (isBusy) return false;
        
        return p.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Smart Matching Effect
    useEffect(() => {
        if (modalTab === 'guest' && guestName.length > 2) {
            const matches = state.players.filter(p => p.name.toLowerCase().includes(guestName.toLowerCase()));
            setSmartMatchWarning(matches);
        } else {
            setSmartMatchWarning([]);
        }
    }, [guestName, modalTab, state.players]);

    return (
        <div className="p-6 space-y-6 pb-24">
            <h2 className="text-2xl font-black text-slate-900">Torneos Disponibles</h2>

            {/* INBOX NOTIFICATION */}
            {isRegistered && isPending && !isInviter && (
                <div className="bg-white p-4 rounded-xl border-l-4 border-blue-500 shadow-md animate-slide-up">
                    <div className="flex items-start gap-3">
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Mail size={20}/></div>
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-800 text-sm">Invitación Recibida</h4>
                            <p className="text-xs text-slate-500 mt-1">
                                <span className="font-bold text-slate-700">{partnerName}</span> te ha invitado a jugar.
                            </p>
                            <div className="flex gap-2 mt-3">
                                <button onClick={handleAcceptInvite} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700">Aceptar</button>
                                <button onClick={handleRejectInvite} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-xs font-bold hover:bg-slate-200">Rechazar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* REJECTED NOTIFICATIONS (If I was the sender and it got rejected) */}
            {/* Note: In current logic, rejection deletes the pair, so the sender just sees they are not registered anymore. 
                For a better UX, we would need a persistent notification system, but for MVP this is acceptable. */}

            {hasTournament ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden relative transform transition-all hover:scale-[1.02]">
                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${isRegistered ? (isPending ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-blue-100 text-blue-600 border-blue-200') : isRegistrationOpen ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {isRegistered ? (isPending ? 'Pendiente' : 'Inscrito') : isRegistrationOpen ? 'Inscripción Abierta' : 'En Curso'}
                    </div>

                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-3">
                            <span style={{ backgroundColor: themeColor }} className="text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">MINI {formatLabel}</span>
                            <span className="text-slate-400 text-xs font-bold flex items-center gap-1"><Clock size={12}/> Hoy</span>
                        </div>
                        
                        <h3 className="text-xl font-black text-slate-900 mb-4 leading-tight">Mini Torneo {formatLabel} Parejas</h3>

                        {isRegistered ? (
                             <div className={`p-4 rounded-xl border mb-6 flex items-center gap-3 ${isPending ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                                 <div className={`bg-white p-2 rounded-full shadow-sm ${isPending ? 'text-amber-500' : 'text-blue-500'}`}>
                                     {isPending ? <Clock size={20}/> : <CheckCircle size={20}/>}
                                 </div>
                                 <div className="flex-1">
                                     <div className={`text-xs font-bold uppercase ${isPending ? 'text-amber-500' : 'text-blue-400'}`}>
                                         {isPending ? (isInviter ? 'Esperando a...' : 'Te invita...') : 'Tu Compañero'}
                                     </div>
                                     <div className="text-base font-black text-slate-800">{partnerName}</div>
                                 </div>
                                 {isPending && isInviter && (
                                     <button onClick={handleCancelInvite} className="p-2 text-slate-400 hover:text-red-500 bg-white rounded-lg border border-slate-100 shadow-sm"><Trash2 size={16}/></button>
                                 )}
                             </div>
                        ) : (
                            <div className="flex items-center gap-6 text-sm text-slate-600 mb-8">
                                <div className="flex items-center gap-1.5"><Users size={18} className="text-slate-400"/><span className="font-bold text-slate-900">{state.pairs.filter(p=>!p.status||p.status==='confirmed').length}</span><span className="text-xs">confirmados</span></div>
                                <div className="flex items-center gap-1.5"><Calendar size={18} className="text-slate-400"/><span className="text-xs font-bold">Club PadelPro</span></div>
                            </div>
                        )}

                        {!isRegistered && (
                            <button 
                                onClick={() => setIsRegisterModalOpen(true)}
                                disabled={!isRegistrationOpen}
                                style={{ backgroundColor: isRegistrationOpen ? THEME.cta : '#e2e8f0', color: isRegistrationOpen ? 'white' : '#94a3b8' }}
                                className="w-full py-4 rounded-xl font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                {isRegistrationOpen ? <>Inscribirse <ArrowRight size={20}/></> : <>Ver Resultados</>}
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200"><Calendar size={64} className="mx-auto text-slate-200 mb-6"/><h3 className="text-lg font-bold text-slate-700 mb-1">No hay torneos activos</h3></div>
            )}

            {/* PARTNER SELECTION MODAL */}
            {isRegisterModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4">
                     <div className="bg-white w-full h-[90vh] sm:h-auto sm:max-h-[85vh] sm:rounded-3xl sm:max-w-md shadow-2xl animate-slide-up flex flex-col">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0">
                             <h3 className="text-lg font-bold text-slate-900">Inscripción</h3>
                             <button onClick={() => setIsRegisterModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X size={20}/></button>
                        </div>
                        
                        {/* TABS */}
                        <div className="flex p-2 gap-2 bg-slate-50 border-b border-slate-100">
                            <button onClick={() => setModalTab('club')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${modalTab === 'club' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Buscar Socio</button>
                            <button onClick={() => setModalTab('guest')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${modalTab === 'guest' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Invitado</button>
                        </div>

                        {/* CONTENT */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            
                            {/* TAB: CLUB */}
                            {modalTab === 'club' && (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 text-slate-400" size={18}/>
                                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar nombre..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-bold text-slate-700"/>
                                    </div>
                                    <div className="space-y-2">
                                        {availablePartners.map(p => (
                                            <button key={p.id} onClick={() => setSelectedPartnerId(p.id)} className={`w-full text-left p-3 rounded-xl border flex justify-between items-center transition-all ${selectedPartnerId === p.id ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-100 hover:border-blue-200'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${selectedPartnerId === p.id ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{p.name[0]}</div>
                                                    <div><div className={`font-bold text-sm ${selectedPartnerId === p.id ? 'text-blue-900' : 'text-slate-700'}`}>{formatPlayerName(p)}</div><div className="text-xs text-slate-400">{p.categories?.[0] || 'Sin Nivel'}</div></div>
                                                </div>
                                                {selectedPartnerId === p.id && <CheckCircle className="text-blue-500" size={20}/>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TAB: GUEST */}
                            {modalTab === 'guest' && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-xs text-amber-800 mb-4">
                                        Usar para amigos fuera del club. La inscripción se confirmará inmediatamente.
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1">Nombre Invitado</label>
                                        <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Ej. Primo de Juan" className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500"/>
                                    </div>
                                    
                                    {/* SMART MATCH WARNING */}
                                    {smartMatchWarning.length > 0 && (
                                        <div className="bg-white border-2 border-orange-100 p-3 rounded-xl shadow-sm">
                                            <h5 className="text-xs font-bold text-orange-500 uppercase flex items-center gap-1 mb-2"><AlertTriangle size={14}/> Posibles Duplicados</h5>
                                            <div className="space-y-1">
                                                {smartMatchWarning.map(p => (
                                                    <div key={p.id} className="text-sm text-slate-600 flex items-center gap-2">
                                                        <User size={14} className="text-slate-400"/> {formatPlayerName(p)}
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-2 italic">Si es uno de estos, búscalo en la pestaña "Buscar Socio".</p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1">Nivel Aproximado (1-10)</label>
                                        <div className="flex items-center gap-4">
                                            <input type="range" min="1" max="10" step="0.5" value={guestLevel} onChange={e => setGuestLevel(parseFloat(e.target.value))} className="w-full accent-blue-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                            <span className="font-bold text-xl text-blue-600">{guestLevel}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Categoría Base</label>
                                        <div className="flex flex-wrap gap-2">
                                            {TOURNAMENT_CATEGORIES.map(cat => (
                                                <button key={cat} onClick={() => setGuestCategory(cat)} className={`px-2 py-1 rounded text-xs font-bold border transition-colors ${guestCategory === cat ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-500 border-slate-300'}`}>{cat}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100">
                             {modalTab === 'club' ? (
                                <button 
                                    onClick={handleInviteClubPlayer}
                                    disabled={!selectedPartnerId}
                                    style={{ backgroundColor: selectedPartnerId ? THEME.cta : '#e2e8f0' }}
                                    className="w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Mail size={20}/> Enviar Invitación
                                </button>
                             ) : (
                                <button 
                                    onClick={handleCreateGuest}
                                    disabled={!guestName}
                                    style={{ backgroundColor: guestName ? THEME.cta : '#e2e8f0' }}
                                    className="w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Check size={20}/> Confirmar Invitado
                                </button>
                             )}
                        </div>
                     </div>
                </div>
            )}
        </div>
    );
};

export default PlayerTournaments;
