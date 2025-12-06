
import React, { useState } from 'react';
import { useTournament, TOURNAMENT_CATEGORIES } from '../store/TournamentContext';
import { THEME } from '../utils/theme';
import { Users, Trash2, Edit2, Plus, Search, Check, Save, User, X, AlertTriangle, TrendingUp } from 'lucide-react';

const Registration: React.FC = () => {
  const { state, addPlayerToDB, createPairInDB, updatePairDB, deletePairDB, formatPlayerName, getPairElo } = useTournament();
  
  // MODAL STATES
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [isEditingPairId, setIsEditingPairId] = useState<string | null>(null);
  
  const [selectedP1, setSelectedP1] = useState('');
  const [selectedP2, setSelectedP2] = useState('');
  
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  
  const currentFormat = state.format || '16_mini';
  const activePairs = state.pairs || [];
  const limit = currentFormat === '10_mini' ? 10 : 16;
  
  const totalRegistered = activePairs.length;

  const assignedPlayerIds = activePairs.reduce((acc, pair) => {
      if (isEditingPairId && pair.id === isEditingPairId) return acc;
      if (pair.player1Id) acc.add(pair.player1Id);
      if (pair.player2Id) acc.add(pair.player2Id);
      return acc;
  }, new Set<string>());

  const PlayerSelector = ({ label, selectedId, onSelect, otherSelectedId }: any) => {
      const [tab, setTab] = useState<'search' | 'new'>('search');
      const [searchQuery, setSearchQuery] = useState('');
      const [newPlayer, setNewPlayer] = useState({ name: '', nickname: '', categories: [] as string[], saveRecord: true, manual_rating: 5 });
      
      const selectedPlayer = state.players.find(p => p.id === selectedId);
      
      const filteredPlayers = state.players.filter(p => {
          const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                (p.nickname && p.nickname.toLowerCase().includes(searchQuery.toLowerCase()));
          const notAssigned = !assignedPlayerIds.has(p.id);
          const notOtherSlot = p.id !== otherSelectedId;
          
          return matchesSearch && notAssigned && notOtherSlot;
      });

      const handleCreatePlayer = async () => {
          if(!newPlayer.name) return;
          const newId = await addPlayerToDB(newPlayer);
          if(newId) { onSelect(newId); setNewPlayer({ name: '', nickname: '', categories: [], saveRecord: true, manual_rating: 5 }); setTab('search'); }
      };
      const toggleNewCat = (cat: string) => { setNewPlayer(prev => { const exists = prev.categories.includes(cat); return { ...prev, categories: exists ? prev.categories.filter(c => c !== cat) : [...prev.categories, cat] }; }); };

      return (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 shadow-sm">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">{label}</label>
              {selectedId ? (
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-indigo-200 shadow-sm animate-fade-in">
                      <div className="flex items-center gap-3">
                          <div style={{ color: THEME.cta }} className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center border border-indigo-200"><User size={16} /></div>
                          <div>
                              <div className="font-bold text-slate-800 text-sm">{formatPlayerName(selectedPlayer)}</div>
                          </div>
                      </div>
                      <button onClick={() => onSelect('')} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><X size={18}/></button>
                  </div>
              ) : (
                  <>
                      <div className="flex bg-white p-1 rounded-lg border border-slate-200 mb-3 shadow-sm">
                          <button onClick={() => setTab('search')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${tab === 'search' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Search size={14}/> Buscar</button>
                          <button onClick={() => setTab('new')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${tab === 'new' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Plus size={14}/> Nuevo</button>
                      </div>
                      {tab === 'search' ? (
                          <div className="animate-fade-in">
                              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Escribe para buscar..." className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg mb-2 focus:border-[#575AF9] outline-none text-slate-800 placeholder:text-slate-400 shadow-inner" />
                              <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                  {filteredPlayers.slice(0, 50).map(p => (
                                      <button key={p.id} onClick={() => onSelect(p.id)} className="w-full text-left p-2 hover:bg-blue-50 rounded flex items-center justify-between text-sm text-slate-700 border border-transparent hover:border-blue-100 transition-colors">
                                          <span className="font-medium">{formatPlayerName(p)}</span>
                                          <div className="flex items-center gap-2">{p.categories?.[0] && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{p.categories[0]}</span>}</div>
                                      </button>
                                  ))}
                                  {filteredPlayers.length === 0 && <p className="text-xs text-center text-slate-400 py-4 italic">No hay jugadores disponibles.</p>}
                              </div>
                          </div>
                      ) : (
                          <div className="space-y-3 animate-fade-in">
                              <input placeholder="Nombre completo" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-[#575AF9] text-slate-800 placeholder:text-slate-400" />
                              <input placeholder="Apodo (opcional)" value={newPlayer.nickname} onChange={e => setNewPlayer({...newPlayer, nickname: e.target.value})} className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-[#575AF9] text-slate-800 placeholder:text-slate-400" />
                              
                              <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                                  <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nivel (ELO Manual)</label>
                                    <span style={{ color: THEME.cta }} className="text-sm font-black">{newPlayer.manual_rating}</span>
                                  </div>
                                  <input 
                                    type="range" min="1" max="10" step="0.5" 
                                    value={newPlayer.manual_rating} 
                                    onChange={e => setNewPlayer({...newPlayer, manual_rating: parseFloat(e.target.value)})}
                                    className="w-full accent-[#575AF9] h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                                  />
                              </div>

                              <div className="flex flex-wrap gap-1.5">{TOURNAMENT_CATEGORIES.map(c => (<button key={c} onClick={() => toggleNewCat(c)} className={`px-2.5 py-1.5 text-[10px] font-bold rounded-md border transition-all ${newPlayer.categories.includes(c) ? 'bg-[#575AF9] text-white border-[#575AF9] shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200'}`}>{c}</button>))}</div>
                              
                              <button onClick={handleCreatePlayer} style={{ backgroundColor: THEME.cta }} className="w-full py-3 text-white rounded-lg text-sm font-bold shadow-md transition-colors flex items-center justify-center gap-2 hover:opacity-90"><Check size={16}/> Crear y Usar Jugador</button>
                          </div>
                      )}
                  </>
              )}
          </div>
      );
  };

  const openNewPairModal = () => {
    setIsEditingPairId(null);
    setSelectedP1('');
    setSelectedP2('');
    setIsPairModalOpen(true);
  };

  const startEditPair = (pairId: string) => {
      const pair = state.pairs.find(p => p.id === pairId);
      if (!pair) return;
      setSelectedP1(pair.player1Id);
      setSelectedP2(pair.player2Id);
      setIsEditingPairId(pairId);
      setIsPairModalOpen(true);
  };

  const closePairModal = () => {
      setIsPairModalOpen(false);
      setIsEditingPairId(null);
      setSelectedP1('');
      setSelectedP2('');
  };

  const handleSavePair = async () => {
      if (!selectedP1 || !selectedP2) return setAlertMessage("Selecciona dos jugadores.");
      if (selectedP1 === selectedP2) return setAlertMessage("Los jugadores deben ser distintos.");

      if (isEditingPairId) {
          await updatePairDB(isEditingPairId, selectedP1, selectedP2);
      } else {
          if (state.pairs.length >= 32) return setAlertMessage("Límite de parejas alcanzado.");
          await createPairInDB(selectedP1, selectedP2);
      }
      
      closePairModal();
  };

  const deletePairHandler = async () => {
      if (showDeleteModal) {
          await deletePairDB(showDeleteModal);
          setShowDeleteModal(null);
      }
  };

  const PairList = ({ pairs, title, colorClass }: { pairs: any[], title: string, colorClass: string }) => (
      <div className="mt-8">
            <h3 className={`text-sm uppercase font-bold mb-4 tracking-wider ${colorClass}`}>{title}</h3>
            <div className="space-y-3">
                {pairs.map((pair, idx) => {
                    const p1 = state.players.find(p => p.id === pair.player1Id);
                    const p2 = state.players.find(p => p.id === pair.player2Id);
                    const pairElo = getPairElo(pair, state.players);

                    return (
                        <div key={pair.id} className="bg-white p-4 rounded-xl flex items-center justify-between border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4 overflow-hidden w-full">
                                <span className="bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-slate-500 border border-slate-200">{idx + 1}</span>
                                <div className="flex flex-col w-full">
                                    <div className="text-base font-bold text-slate-800 truncate">{formatPlayerName(p1)}</div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span style={{ color: THEME.cta }} className="text-xs font-black">&</span>
                                        <div className="text-base font-bold text-slate-800 truncate">{formatPlayerName(p2)}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center justify-center bg-slate-50 px-2 py-1 rounded border border-slate-100 min-w-[50px]">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1"><TrendingUp size={8}/> ELO</span>
                                    <span className="text-xs font-black text-slate-700">{pairElo}</span>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button onClick={() => startEditPair(pair.id)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors"><Edit2 size={18}/></button>
                                    <button onClick={() => setShowDeleteModal(pair.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg border border-slate-100 hover:border-red-200 transition-colors"><Trash2 size={18}/></button>
                                </div>
                            </div>
                        </div>
                    )
                })}
                 {pairs.length === 0 && <p className="text-slate-400 text-sm italic p-6 text-center border-2 border-dashed border-slate-200 rounded-xl">No hay parejas registradas.</p>}
            </div>
      </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div><h2 className="text-2xl font-bold text-slate-900">Registro</h2><p className="text-sm text-slate-500">Gestión de Inscripciones</p></div>
        <div className={`flex flex-col items-end text-blue-600`}><span className="text-4xl font-bold">{totalRegistered}</span></div>
      </div>

      <button onClick={openNewPairModal} className="w-full bg-white hover:bg-indigo-50 border-2 border-indigo-100 hover:border-[#575AF9] p-6 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-sm active:scale-95 group">
          <div style={{ color: THEME.cta }} className="bg-indigo-100 p-3 rounded-full group-hover:bg-indigo-200 transition-colors"><Users size={32} /></div>
          <span className="font-black text-indigo-900 text-lg">AÑADIR NUEVA PAREJA</span>
      </button>
      
      <PairList pairs={activePairs} title="Parejas Inscritas" colorClass="text-slate-600" />

      {/* PAIR MODAL */}
      {isPairModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4">
              <div className="bg-white w-full h-full sm:h-[85vh] sm:rounded-3xl sm:max-w-lg shadow-2xl animate-slide-up flex flex-col">
                  {/* Compact Header */}
                  <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Users style={{ color: THEME.cta }} size={20}/>
                          {isEditingPairId ? 'Editar Pareja' : 'Nueva Pareja'}
                      </h3>
                      <button onClick={closePairModal} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                          <X size={20}/>
                      </button>
                  </div>
                  
                  {/* Scrollable Body containing inputs AND buttons */}
                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                      <PlayerSelector 
                        label="JUGADOR 1" 
                        selectedId={selectedP1} 
                        onSelect={setSelectedP1} 
                        otherSelectedId={selectedP2}
                      />
                      <div className="flex justify-center items-center gap-4 my-4">
                          <div className="h-px bg-slate-200 flex-1"></div>
                          <span className="bg-slate-100 text-slate-400 text-xs px-3 py-1 rounded-full font-bold border border-slate-200">&</span>
                          <div className="h-px bg-slate-200 flex-1"></div>
                      </div>
                      <PlayerSelector 
                        label="JUGADOR 2" 
                        selectedId={selectedP2} 
                        onSelect={setSelectedP2} 
                        otherSelectedId={selectedP1}
                      />
                      
                      {/* Buttons at the end of content */}
                      <div className="flex gap-3 mt-8 pb-8 sm:pb-0">
                          <button onClick={closePairModal} className="flex-1 py-4 bg-slate-100 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancelar</button>
                          <button onClick={handleSavePair} style={{ backgroundColor: THEME.cta }} className="flex-1 py-4 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-colors active:scale-95 hover:opacity-90"><Save size={20} /> Guardar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
      
      {showDeleteModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in text-center">
                  <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600">
                      <Trash2 size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">¿Eliminar Pareja?</h3>
                  <p className="text-slate-500 mb-6 text-sm">
                      Se borrará la inscripción de esta pareja. <br/>
                      <span className="font-bold text-slate-700">Los jugadores NO se borrarán</span> de la base de datos del club.
                  </p>
                  <div className="flex gap-3">
                      <button onClick={() => setShowDeleteModal(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold">Cancelar</button>
                      <button onClick={deletePairHandler} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold shadow-lg">Eliminar</button>
                  </div>
              </div>
          </div>
      )}

      {alertMessage && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600">
                      <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">Atención</h3>
                  <p className="text-slate-500 mb-6">{alertMessage}</p>
                  <button onClick={() => setAlertMessage(null)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg">Entendido</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default Registration;
