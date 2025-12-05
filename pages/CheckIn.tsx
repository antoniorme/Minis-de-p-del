
import React, { useMemo, useState } from 'react';
import { useTournament } from '../store/TournamentContext';
import { DollarSign, Droplets, Circle, Users, Check, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { Pair, Player } from '../types';

const CheckIn: React.FC = () => {
  const { state, dispatch, formatPlayerName, substitutePairDB } = useTournament(); 
  
  // States for Substitution Modal
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [activePairToSub, setActivePairToSub] = useState<string | null>(null);

  const getPlayer = (id: string) => state.players.find(p => p.id === id);

  // Helper: Simulate R1 matches
  const firstRoundSchedule = useMemo(() => {
      if (state.status === 'active' || state.groups.length > 0) {
          return {
              matches: state.matches.filter(m => m.round === 1),
              groups: state.groups
          };
      }
      return null;
  }, [state.pairs, state.status, state.matches, state.groups]);

  // Identify Reserves
  const reservePairs = state.pairs.filter(p => p.isReserve);
  // Identify Active Pairs (Non-reserves)
  const activePairsList = state.pairs.filter(p => !p.isReserve);

  const getPairsForCourt = (courtId: number) => {
      if (state.status !== 'setup' && firstRoundSchedule) {
         const match = firstRoundSchedule.matches.find(m => m.courtId === courtId);
         if (!match) return [];
         return [activePairsList.find(p => p.id === match.pairAId), activePairsList.find(p => p.id === match.pairBId)].filter(Boolean) as Pair[];
      }
      const idxStart = (courtId - 1) * 2;
      // FIX: Removed the artificial limiter (if idxStart >= 12) to ensure pairs on Court 7/8 are shown
      return activePairsList.slice(idxStart, idxStart + 2);
  };
  
  const restingPairs = state.status === 'setup' 
      ? activePairsList.slice(12, 16) 
      : (firstRoundSchedule?.groups.find(g => g.id === 'D')?.pairIds.map(pid => activePairsList.find(p => p.id === pid)!).filter(Boolean) || []);

  const openSubModal = (pairId: string) => {
      setActivePairToSub(pairId);
      setSubModalOpen(true);
  };

  const handleSubstitution = async (reserveId: string) => {
      if (!activePairToSub) return;
      if (confirm("¿Estás seguro de realizar este cambio? La pareja reserva ocupará el puesto y estadísticas de la titular.")) {
          try {
              await substitutePairDB(activePairToSub, reserveId);
              setSubModalOpen(false);
              setActivePairToSub(null);
          } catch (e: any) {
              alert(e.message);
          }
      }
  };

  const PairCard = ({ pair, idx }: { pair: Pair, idx: number | string }) => {
        const p1 = getPlayer(pair.player1Id);
        const p2 = getPlayer(pair.player2Id);
        const allPaid = pair.paidP1 && pair.paidP2;
        
        return (
            <div className={`bg-white rounded-xl p-4 shadow-sm border-2 relative ${allPaid ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-100'}`}>
                {/* Swap Button (Absolute) */}
                <button 
                    onClick={() => openSubModal(pair.id)}
                    className="absolute top-2 right-2 p-2 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                >
                    <RefreshCw size={16} />
                </button>

                {/* Top Row: ID & Water */}
                <div className="flex justify-between items-start mb-4 pr-8">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pareja {idx}</span>
                    <button 
                    onClick={() => dispatch({ type: 'TOGGLE_WATER', payload: pair.id })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-sm ${pair.waterReceived ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-white border border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500'}`}
                    >
                        <Droplets size={14} fill={pair.waterReceived ? "currentColor" : "none"}/> 
                        {pair.waterReceived ? 'OK' : 'AGUA'}
                    </button>
                </div>

                {/* Players & Payment Buttons */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                        <span className={`text-base font-bold truncate pr-2 ${pair.paidP1 ? 'text-slate-800' : 'text-rose-500'}`}>{formatPlayerName(p1)}</span>
                        <button 
                        onClick={() => p1 && dispatch({type: 'TOGGLE_PAID', payload: p1.id})} 
                        className={`w-10 h-10 flex items-center justify-center rounded-lg shadow-sm transition-all border shrink-0 ${pair.paidP1 ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-slate-300 border-slate-200 hover:border-emerald-400 hover:text-emerald-400'}`}
                        >
                            {pair.paidP1 ? <Check size={20} strokeWidth={4} /> : <DollarSign size={20}/>}
                        </button>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                        <span className={`text-base font-bold truncate pr-2 ${pair.paidP2 ? 'text-slate-800' : 'text-rose-500'}`}>{formatPlayerName(p2)}</span>
                        <button 
                        onClick={() => p2 && dispatch({type: 'TOGGLE_PAID', payload: p2.id})} 
                        className={`w-10 h-10 flex items-center justify-center rounded-lg shadow-sm transition-all border shrink-0 ${pair.paidP2 ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-slate-300 border-slate-200 hover:border-emerald-400 hover:text-emerald-400'}`}
                        >
                            {pair.paidP2 ? <Check size={20} strokeWidth={4} /> : <DollarSign size={20}/>}
                        </button>
                    </div>
                </div>
            </div>
        )
  };

  return (
    <div className="space-y-8 pb-32">
      <h2 className="text-3xl font-bold text-slate-900">Control y Pistas</h2>

      {/* Courts List */}
      <div className="space-y-10">
        {state.courts.map(court => {
            const pairsOnCourt = getPairsForCourt(court.id);
            
            return (
                <div key={court.id} className="relative">
                    {/* Clean Header */}
                    <div className="flex items-center justify-between mb-4 bg-slate-800 text-white p-4 rounded-xl shadow-md">
                        <span className="text-2xl font-black tracking-tight">PISTA {court.id}</span>
                        <button 
                            onClick={() => dispatch({ type: 'TOGGLE_BALLS', payload: court.id })}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors border ${court.ballsGiven ? 'bg-white text-emerald-700 border-white' : 'bg-slate-700 text-slate-300 border-slate-600'}`}
                        >
                            <Circle size={18} fill={court.ballsGiven ? "currentColor" : "none"} />
                            {court.ballsGiven ? 'Bolas OK' : 'Dar Bolas'}
                        </button>
                    </div>

                    {/* Cards Container */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-2 border-l-4 border-slate-200">
                        {pairsOnCourt.length > 0 ? pairsOnCourt.map((pair, idx) => (
                            <PairCard key={pair.id} pair={pair} idx={pair.id.split('-')[1] || idx+1} />
                        )) : (
                            <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-xl">Sin partidos asignados</div>
                        )}
                    </div>
                </div>
            );
        })}
      </div>

      {/* Resting Section */}
      {restingPairs.length > 0 && (
          <div className="mt-12 bg-slate-100 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-slate-500 font-bold mb-6 uppercase flex items-center gap-2">
                  <Users size={20}/> Descansan Turno 1 (Grupo D)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {restingPairs.map((pair, idx) => (
                      <PairCard key={pair.id} pair={pair} idx={pair.id.split('-')[1] || idx+1} />
                  ))}
              </div>
          </div>
      )}

      {/* RESERVES SECTION */}
      {reservePairs.length > 0 && (
          <div className="mt-12">
               <div className="flex items-center gap-2 mb-4 px-2">
                   <div className="bg-amber-100 p-2 rounded-lg text-amber-600"><Users size={20}/></div>
                   <h3 className="text-lg font-bold text-slate-800">Banquillo / Reservas</h3>
                   <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{reservePairs.length}</span>
               </div>
               <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                   {reservePairs.map((pair, idx) => {
                       const p1 = getPlayer(pair.player1Id);
                       const p2 = getPlayer(pair.player2Id);
                       return (
                           <div key={pair.id} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex items-center justify-between">
                               <div>
                                   <div className="text-xs font-bold text-amber-500 uppercase mb-1">Reserva #{idx+1}</div>
                                   <div className="font-bold text-slate-700">{formatPlayerName(p1)}</div>
                                   <div className="font-bold text-slate-700">& {formatPlayerName(p2)}</div>
                               </div>
                               <button 
                                onClick={() => {
                                    alert("Para usar esta reserva, pulsa el botón de intercambio (flechas) en la tarjeta de la pareja titular que quieras sustituir.");
                                }}
                                className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100"
                               >
                                   <RefreshCw size={20}/>
                               </button>
                           </div>
                       )
                   })}
               </div>
          </div>
      )}

      {/* SUBSTITUTION MODAL */}
      {subModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                          <RefreshCw className="text-blue-600"/> Sustituir Pareja
                      </h3>
                      <button onClick={() => setSubModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
                          <X size={20}/>
                      </button>
                  </div>
                  
                  {reservePairs.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl mb-4">
                          No hay reservas disponibles.
                      </div>
                  ) : (
                      <>
                        <p className="text-sm text-slate-500 mb-4">Selecciona qué pareja reserva entrará en lugar de la titular:</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                            {reservePairs.map((rp, idx) => {
                                const p1 = getPlayer(rp.player1Id);
                                const p2 = getPlayer(rp.player2Id);
                                return (
                                    <button 
                                        key={rp.id}
                                        onClick={() => handleSubstitution(rp.id)}
                                        className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all flex justify-between items-center group"
                                    >
                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase group-hover:text-blue-500">Reserva #{idx+1}</div>
                                            <div className="font-bold text-slate-800 text-sm">{formatPlayerName(p1)} & {formatPlayerName(p2)}</div>
                                        </div>
                                        <div className="bg-white p-2 rounded-full border border-slate-200 text-slate-300 group-hover:text-blue-500 group-hover:border-blue-200">
                                            <Check size={16}/>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                      </>
                  )}
                  
                  <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-xs rounded-lg border border-blue-100 flex items-start gap-2">
                       <AlertTriangle size={14} className="shrink-0 mt-0.5"/>
                       <span>La pareja reserva heredará la posición, los partidos jugados y las estadísticas de la pareja a la que sustituye.</span>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CheckIn;
