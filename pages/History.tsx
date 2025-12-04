
import React, { useState } from 'react';
import { useHistory } from '../store/HistoryContext';
import { useTournament } from '../store/TournamentContext';
import { Calendar, Trophy, ChevronDown, ChevronUp, User, Users, Grid, GitMerge, Shield } from 'lucide-react';
import { Player, Pair, Match } from '../types';

type TabType = 'participants' | 'main' | 'cons' | 'group';

const History: React.FC = () => {
  const { pastTournaments } = useHistory();
  const { formatPlayerName, getPairElo } = useTournament(); 
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('main');

  const formatDate = (isoString: string) => {
      return new Date(isoString).toLocaleDateString('es-ES', { 
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });
  };

  const getPairName = (pairId: string, players: Player[], pairs: Pair[]) => {
      const pair = pairs.find(p => p.id === pairId);
      if (!pair) return 'Desconocido';
      const p1 = players.find(p => p.id === pair.player1Id);
      const p2 = players.find(p => p.id === pair.player2Id);
      return `${formatPlayerName(p1)} & ${formatPlayerName(p2)}`;
  };

  // Detective function to find winner name if DB field is missing
  const getComputedWinner = (tData: any, bracket: 'main' | 'consolation') => {
      const round = bracket === 'main' ? 7 : 8;
      const finalMatch = tData.matches.find((m: Match) => m.round === round && m.bracket === bracket && m.isFinished);
      
      if (!finalMatch) return 'No registrado';
      
      const winnerId = (finalMatch.scoreA || 0) > (finalMatch.scoreB || 0) ? finalMatch.pairAId : finalMatch.pairBId;
      return getPairName(winnerId, tData.players, tData.pairs);
  };

  const getRoundName = (round: number) => {
      if (round <= 4) return `Ronda ${round}`;
      if (round === 5) return 'Cuartos';
      if (round === 6) return 'Semifinales';
      if (round === 7) return 'Final';
      if (round === 8) return 'Final';
      return `R${round}`;
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
              {pastTournaments.map(t => {
                  const hasData = !!t.data;
                  // Fallback if data is missing from DB record
                  const displayWinnerMain = (t.winnerMain && t.winnerMain !== 'Desconocido') ? t.winnerMain : (hasData ? getComputedWinner(t.data, 'main') : 'Desconocido');
                  const displayWinnerCons = (t.winnerConsolation && t.winnerConsolation !== 'Desconocido') ? t.winnerConsolation : (hasData ? getComputedWinner(t.data, 'consolation') : 'Desconocido');

                  return (
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

                      {expandedId === t.id && hasData && (
                          <div className="bg-slate-50 border-t border-slate-100 animate-fade-in">
                              
                              {/* --- CHAMPIONS HEADER --- */}
                              <div className="p-5 grid grid-cols-2 gap-4">
                                  <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm relative overflow-hidden">
                                      <div className="absolute -right-2 -top-2 text-emerald-50 opacity-50"><Trophy size={48}/></div>
                                      <div className="text-[10px] font-bold text-emerald-600 uppercase mb-2 tracking-wider">Campeones</div>
                                      <div className="font-black text-slate-800 text-sm leading-tight">
                                          {displayWinnerMain}
                                      </div>
                                  </div>
                                  <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
                                      <div className="absolute -right-2 -top-2 text-blue-50 opacity-50"><Shield size={48}/></div>
                                      <div className="text-[10px] font-bold text-blue-600 uppercase mb-2 tracking-wider">Consolación</div>
                                      <div className="font-black text-slate-800 text-sm leading-tight">
                                          {displayWinnerCons}
                                      </div>
                                  </div>
                              </div>

                              {/* --- TABS --- */}
                              <div className="flex border-b border-slate-200 bg-white px-2">
                                  <button onClick={() => setActiveTab('participants')} className={`flex-1 py-3 text-[10px] uppercase font-bold border-b-2 transition-colors ${activeTab === 'participants' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                      Participantes
                                  </button>
                                  <button onClick={() => setActiveTab('main')} className={`flex-1 py-3 text-[10px] uppercase font-bold border-b-2 transition-colors ${activeTab === 'main' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                      Principal
                                  </button>
                                  <button onClick={() => setActiveTab('cons')} className={`flex-1 py-3 text-[10px] uppercase font-bold border-b-2 transition-colors ${activeTab === 'cons' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                      Consolación
                                  </button>
                                  <button onClick={() => setActiveTab('group')} className={`flex-1 py-3 text-[10px] uppercase font-bold border-b-2 transition-colors ${activeTab === 'group' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                      Grupos
                                  </button>
                              </div>

                              {/* --- CONTENT --- */}
                              <div className="p-5 max-h-96 overflow-y-auto">
                                  
                                  {activeTab === 'participants' && (
                                      <div className="space-y-2">
                                          {t.data!.pairs.filter(p => !p.isReserve).map((pair, idx) => (
                                              <div key={pair.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center text-sm">
                                                  <div className="flex items-center gap-3">
                                                      <span className="text-slate-400 font-bold text-xs">#{idx+1}</span>
                                                      <span className="font-bold text-slate-700">{getPairName(pair.id, t.data!.players, t.data!.pairs)}</span>
                                                  </div>
                                                  <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">{getPairElo(pair, t.data!.players)} pts</span>
                                              </div>
                                          ))}
                                      </div>
                                  )}

                                  {(activeTab === 'main' || activeTab === 'cons') && (
                                      <div className="space-y-3">
                                          {t.data!.matches
                                              .filter(m => m.isFinished && m.round > 4 && m.bracket === (activeTab === 'main' ? 'main' : 'consolation'))
                                              .sort((a, b) => b.round - a.round)
                                              .map(m => {
                                                  const p1Name = getPairName(m.pairAId, t.data!.players, t.data!.pairs);
                                                  const p2Name = getPairName(m.pairBId, t.data!.players, t.data!.pairs);
                                                  const winner = (m.scoreA || 0) > (m.scoreB || 0) ? 'A' : 'B';
                                                  const isMain = activeTab === 'main';
                                                  
                                                  return (
                                                      <div key={m.id} className={`bg-white rounded-lg border text-sm overflow-hidden ${isMain ? 'border-emerald-100' : 'border-blue-100'}`}>
                                                          <div className={`px-3 py-1 text-[10px] font-bold uppercase flex justify-between ${isMain ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                                              <span>{getRoundName(m.round)}</span>
                                                              <span>Pista {m.courtId}</span>
                                                          </div>
                                                          <div className="p-3">
                                                              <div className="flex justify-between items-center mb-1">
                                                                  <span className={`font-bold truncate w-2/3 ${winner === 'A' ? 'text-slate-900' : 'text-slate-500'}`}>{p1Name}</span>
                                                                  <span className={`font-black ${winner === 'A' ? 'text-slate-900' : 'text-slate-300'}`}>{m.scoreA}</span>
                                                              </div>
                                                              <div className="flex justify-between items-center">
                                                                  <span className={`font-bold truncate w-2/3 ${winner === 'B' ? 'text-slate-900' : 'text-slate-500'}`}>{p2Name}</span>
                                                                  <span className={`font-black ${winner === 'B' ? 'text-slate-900' : 'text-slate-300'}`}>{m.scoreB}</span>
                                                              </div>
                                                          </div>
                                                      </div>
                                                  );
                                              })}
                                           {t.data!.matches.filter(m => m.round > 4 && m.bracket === (activeTab === 'main' ? 'main' : 'consolation')).length === 0 && (
                                               <p className="text-center text-slate-400 italic text-sm">No hay partidos registrados en esta fase.</p>
                                           )}
                                      </div>
                                  )}

                                  {activeTab === 'group' && (
                                      <div className="space-y-2">
                                           {t.data!.matches
                                              .filter(m => m.isFinished && m.round <= 4)
                                              .sort((a, b) => a.round - b.round)
                                              .map(m => {
                                                  const p1Name = getPairName(m.pairAId, t.data!.players, t.data!.pairs);
                                                  const p2Name = getPairName(m.pairBId, t.data!.players, t.data!.pairs);
                                                  return (
                                                      <div key={m.id} className="bg-white p-2 rounded border border-slate-100 text-xs flex justify-between items-center">
                                                          <div className="w-8 font-bold text-slate-300">R{m.round}</div>
                                                          <div className="flex-1 truncate text-right text-slate-600">{p1Name}</div>
                                                          <div className="px-2 font-bold text-slate-900">{m.scoreA}-{m.scoreB}</div>
                                                          <div className="flex-1 truncate text-left text-slate-600">{p2Name}</div>
                                                      </div>
                                                  )
                                              })}
                                      </div>
                                  )}
                              </div>
                              
                              <div className="pb-4 text-center">
                                  <span className="text-[10px] text-slate-300 uppercase">ID: {t.id.slice(0, 8)}...</span>
                              </div>
                          </div>
                      )}
                  </div>
              )})}
          </div>
      )}
    </div>
  );
};

export default History;
