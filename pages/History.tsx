import React, { useState } from 'react';
import { useHistory } from '../store/HistoryContext';
import { useTournament } from '../store/TournamentContext';
import { Calendar, Trophy, ChevronDown, ChevronUp, User } from 'lucide-react';
import { Player, Pair } from '../types';

const History: React.FC = () => {
  const { pastTournaments } = useHistory();
  const { formatPlayerName } = useTournament(); // Use shared helper
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatDate = (isoString: string) => {
      return new Date(isoString).toLocaleDateString('es-ES', { 
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });
  };

  // Helper to get pair name from historical data
  const getPairName = (pairId: string, players: Player[], pairs: Pair[]) => {
      const pair = pairs.find(p => p.id === pairId);
      if (!pair) return 'Desconocido';
      const p1 = players.find(p => p.id === pair.player1Id);
      const p2 = players.find(p => p.id === pair.player2Id);
      return `${formatPlayerName(p1)} & ${formatPlayerName(p2)}`;
  };

  const getRoundName = (round: number) => {
      if (round <= 4) return `Ronda ${round} (Grupos)`;
      if (round === 5) return 'Cuartos de Final';
      if (round === 6) return 'Semifinales';
      if (round === 7) return 'Final / Semis Cons.';
      if (round === 8) return 'Final Consolación';
      return `Ronda ${round}`;
  };

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-3xl font-bold text-slate-900">Historial de Minis</h2>
      
      {pastTournaments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Trophy size={48} className="mx-auto text-slate-300 mb-4"/>
              <p className="text-slate-500">Aún no hay torneos finalizados.</p>
          </div>
      ) : (
          <div className="space-y-4">
              {pastTournaments.map(t => (
                  <div key={t.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div 
                        onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                          <div>
                              <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-bold mb-1">
                                  <Calendar size={14}/> {formatDate(t.date)}
                              </div>
                              <div className="text-lg font-bold text-slate-900">Mini {t.playerCount} Jugadores</div>
                          </div>
                          <div className="bg-slate-100 p-2 rounded-full text-slate-500">
                              {expandedId === t.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                          </div>
                      </div>

                      {expandedId === t.id && (
                          <div className="bg-slate-50 p-5 border-t border-slate-100 animate-fade-in">
                              {/* Winners Section */}
                              <div className="grid grid-cols-2 gap-4 mb-6">
                                  <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                                      <div className="text-xs font-bold text-emerald-600 uppercase mb-2">Campeón Principal</div>
                                      <div className="flex items-center gap-2 font-black text-slate-800 text-sm md:text-base">
                                          <Trophy size={16} className="text-emerald-500 shrink-0"/>
                                          {t.winnerMain}
                                      </div>
                                  </div>
                                  <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                                      <div className="text-xs font-bold text-blue-600 uppercase mb-2">Campeón Consolación</div>
                                      <div className="flex items-center gap-2 font-black text-slate-800 text-sm md:text-base">
                                          <Trophy size={16} className="text-blue-500 shrink-0"/>
                                          {t.winnerConsolation}
                                      </div>
                                  </div>
                              </div>

                              {/* Matches List */}
                              {t.data && t.data.matches.length > 0 ? (
                                  <div className="space-y-4">
                                      <h4 className="font-bold text-slate-700 border-b border-slate-200 pb-2">Resultados del Torneo</h4>
                                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                          {t.data.matches
                                            .sort((a, b) => b.round - a.round) // Sort by round desc
                                            .map(m => {
                                                if (!m.isFinished) return null;
                                                const p1Name = getPairName(m.pairAId, t.data!.players, t.data!.pairs);
                                                const p2Name = getPairName(m.pairBId, t.data!.players, t.data!.pairs);
                                                const winner = (m.scoreA || 0) > (m.scoreB || 0) ? 'A' : 'B';
                                                
                                                return (
                                                  <div key={m.id} className="bg-white p-3 rounded-lg border border-slate-200 text-sm shadow-sm">
                                                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-2 flex justify-between">
                                                          <span>{getRoundName(m.round)}</span>
                                                          {m.bracket && <span className={m.bracket === 'main' ? 'text-emerald-500' : 'text-blue-500'}>{m.bracket === 'main' ? 'Principal' : 'Consolación'}</span>}
                                                      </div>
                                                      <div className="flex justify-between items-center">
                                                          <div className={`flex-1 font-bold ${winner === 'A' ? 'text-emerald-700' : 'text-slate-600'}`}>{p1Name}</div>
                                                          <div className="px-3 font-black text-slate-900">{m.scoreA} - {m.scoreB}</div>
                                                          <div className={`flex-1 font-bold text-right ${winner === 'B' ? 'text-emerald-700' : 'text-slate-600'}`}>{p2Name}</div>
                                                      </div>
                                                  </div>
                                                );
                                            })}
                                      </div>
                                  </div>
                              ) : (
                                  <div className="text-center py-4 text-slate-400 text-sm italic">
                                      No hay detalles de partidos disponibles para este torneo.
                                  </div>
                              )}
                              
                              <div className="mt-4 text-center">
                                  <span className="text-xs text-slate-400">ID: {t.id}</span>
                              </div>
                          </div>
                      )}
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default History;