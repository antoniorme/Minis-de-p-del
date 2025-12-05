
import React, { useState } from 'react';
import { useTournament, TOURNAMENT_CATEGORIES } from '../store/TournamentContext';
import { Search, Filter, Edit2, Save, User, Eye, Trophy, Activity, Plus, Check, X } from 'lucide-react';
import { Player } from '../types';
import { useNavigate } from 'react-router-dom';
// FIX: Use correct exported function name
import { calculateDisplayRanking, manualToElo } from '../utils/Elo'; 

const PlayerManager: React.FC = () => {
  const { state, updatePlayerInDB, addPlayerToDB, formatPlayerName } = useTournament();
  const navigate = useNavigate();
  const [filterCat, setFilterCat] = useState('all');
  const [search, setSearch] = useState('');
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  
  // State for Creating New Player
  const [isCreating, setIsCreating] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: '', nickname: '', categories: [] as string[], manual_rating: 5, email: '', phone: '' });

  const filteredPlayers = state.players.filter(p => {
      const matchesCat = filterCat === 'all' || (p.categories && p.categories.includes(filterCat));
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                            (p.nickname && p.nickname.toLowerCase().includes(search.toLowerCase()));
      return matchesCat && matchesSearch;
  });

  // LOGIC CHANGE: Ordenar alfabéticamente por nombre
  filteredPlayers.sort((a, b) => a.name.localeCompare(b.name));

  const handleSave = () => {
      if (editingPlayer) {
          updatePlayerInDB(editingPlayer);
          setEditingPlayer(null);
      }
  };
  
  const handleCreate = async () => {
      if (!newPlayer.name) return alert("El nombre es obligatorio");
      await addPlayerToDB(newPlayer);
      setIsCreating(false);
      setNewPlayer({ name: '', nickname: '', categories: [], manual_rating: 5, email: '', phone: '' });
  };
  
  const toggleEditCategory = (cat: string) => {
      if (!editingPlayer) return;
      setEditingPlayer(prev => {
          if (!prev) return null;
          const cats = prev.categories || [];
          const exists = cats.includes(cat);
          return {
              ...prev,
              categories: exists ? cats.filter(c => c !== cat) : [...cats, cat]
          };
      });
  };

  const toggleNewCategory = (cat: string) => {
      setNewPlayer(prev => {
          const cats = prev.categories || [];
          const exists = cats.includes(cat);
          return {
              ...prev,
              categories: exists ? cats.filter(c => c !== cat) : [...cats, cat]
          };
      });
  };

  // Helper para previsualizar el ranking en el modal
  const getPreviewRanking = (p: Partial<Player>) => {
      // Mock player object for calculation
      return calculateDisplayRanking({ ...p, global_rating: 1200 } as Player);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-slate-900">Gestión Jugadores</h2>
          <button onClick={() => setIsCreating(true)} className="p-3 bg-[#575AF9] text-white rounded-xl shadow-lg hover:bg-[#2B2DBF] transition-all active:scale-95">
              <Plus size={24} />
          </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={20}/>
              <input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#575AF9] text-slate-900"
                placeholder="Buscar por nombre..."
              />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              <button onClick={() => setFilterCat('all')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${filterCat === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>Todos</button>
              {TOURNAMENT_CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setFilterCat(cat)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors uppercase ${filterCat === cat ? 'bg-[#575AF9] text-white' : 'bg-slate-100 text-slate-500'}`}>{cat}</button>
              ))}
          </div>
      </div>

      {/* List */}
      <div className="space-y-3">
          {filteredPlayers.length === 0 && <div className="text-center py-10 text-slate-400">No se encontraron jugadores.</div>}
          {filteredPlayers.map((player, idx) => {
              const rankingScore = calculateDisplayRanking(player);
              return (
              <div key={player.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                  <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm">
                          {player.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                          <div className="font-bold text-slate-800 text-lg flex items-center gap-2">
                              {formatPlayerName(player)}
                              {player.rankingPoints ? <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1"><Trophy size={8}/> {player.rankingPoints}</span> : null}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-slate-500 bg-slate-100 px-1.5 rounded">{player.categories?.[0] || 'Sin Cat'}</span>
                              <span className="text-xs font-bold text-blue-600 flex items-center gap-1"><Activity size={10}/> {rankingScore} pts</span>
                          </div>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/players/${player.id}`)} className="p-2 text-slate-400 hover:text-[#575AF9] bg-slate-50 rounded-lg border border-slate-100 transition-colors"><Eye size={20} /></button>
                      <button onClick={() => setEditingPlayer(player)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg border border-slate-100 transition-colors"><Edit2 size={20} /></button>
                  </div>
              </div>
              );
          })}
      </div>

      {/* Create Modal */}
      {isCreating && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-900">Nuevo Jugador</h3>
                      <button onClick={() => setIsCreating(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="space-y-4">
                      <div><label className="text-xs font-bold text-slate-500 uppercase">Nombre Completo</label><input autoFocus value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} className="w-full border border-slate-300 rounded-lg p-3 mt-1 bg-white text-slate-900" placeholder="Ej. Juan Pérez" /></div>
                      <div><label className="text-xs font-bold text-slate-500 uppercase">Apodo (Opcional)</label><input value={newPlayer.nickname} onChange={e => setNewPlayer({...newPlayer, nickname: e.target.value})} className="w-full border border-slate-300 rounded-lg p-3 mt-1 bg-white text-slate-900" placeholder="Ej. Juanito" /></div>
                      
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <label className="text-xs font-bold text-amber-600 uppercase flex items-center gap-1 mb-2"><Trophy size={12}/> Valoración Inicial (1-10)</label>
                          <div className="flex items-center gap-4">
                              <input type="range" min="1" max="10" step="0.5" value={newPlayer.manual_rating} onChange={e => setNewPlayer({...newPlayer, manual_rating: parseFloat(e.target.value)})} className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                              <span className="font-bold text-xl text-amber-700 w-10 text-center">{newPlayer.manual_rating}</span>
                          </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Categorías</label>
                        <div className="flex flex-wrap gap-2">
                            {TOURNAMENT_CATEGORIES.map(cat => (
                                <button key={cat} onClick={() => toggleNewCategory(cat)} className={`px-2 py-1 rounded text-xs font-bold border transition-colors ${newPlayer.categories?.includes(cat) ? 'bg-[#575AF9] text-white border-[#575AF9]' : 'bg-white text-slate-500 border-slate-300'}`}>{cat}</button>
                            ))}
                        </div>
                      </div>
                  </div>
                  <div className="mt-8">
                      <button onClick={handleCreate} className="w-full py-3 bg-[#575AF9] hover:bg-[#2B2DBF] text-white rounded-xl font-bold flex items-center justify-center gap-2"><Check size={18}/> Crear Jugador</button>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Modal */}
      {editingPlayer && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-bold mb-6 text-slate-900">Editar Jugador</h3>
                  <div className="space-y-4">
                      <div><label className="text-xs font-bold text-slate-500 uppercase">Nombre Real</label><input value={editingPlayer.name} onChange={e => setEditingPlayer({...editingPlayer, name: e.target.value})} className="w-full border border-slate-300 rounded-lg p-3 mt-1 bg-white text-slate-900" /></div>
                      <div><label className="text-xs font-bold text-slate-500 uppercase">Apodo</label><input value={editingPlayer.nickname || ''} onChange={e => setEditingPlayer({...editingPlayer, nickname: e.target.value})} className="w-full border border-slate-300 rounded-lg p-3 mt-1 bg-white text-slate-900" /></div>
                      
                      {/* MANUAL RATING SLIDER WITH REAL-TIME PREVIEW */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <label className="text-xs font-bold text-amber-600 uppercase flex items-center gap-1 mb-2"><Trophy size={12}/> Valoración Manual (1-10)</label>
                          <div className="flex items-center gap-4">
                              <input 
                                type="range" min="1" max="10" step="0.5"
                                value={editingPlayer.manual_rating || 5} 
                                onChange={e => setEditingPlayer({...editingPlayer, manual_rating: parseFloat(e.target.value)})} 
                                className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
                              />
                              <span className="font-bold text-xl text-amber-700 w-10 text-center">{editingPlayer.manual_rating || 5}</span>
                          </div>
                          
                          <div className="mt-4 flex justify-between items-center text-xs">
                                <div>
                                    <span className="block text-slate-400 uppercase">ELO Estadístico</span>
                                    <span className="font-bold text-slate-700">{Math.round(editingPlayer.global_rating || 1200)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-slate-400 uppercase">Ranking Final</span>
                                    <span className="font-black text-[#575AF9] text-lg transition-all">{getPreviewRanking(editingPlayer)} pts</span>
                                </div>
                          </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Categorías</label>
                        <div className="flex flex-wrap gap-2">
                            {TOURNAMENT_CATEGORIES.map(cat => (
                                <button key={cat} onClick={() => toggleEditCategory(cat)} className={`px-2 py-1 rounded text-xs font-bold border transition-colors ${editingPlayer.categories?.includes(cat) ? 'bg-[#575AF9] text-white border-[#575AF9]' : 'bg-white text-slate-500 border-slate-300'}`}>{cat}</button>
                            ))}
                        </div>
                      </div>
                      <div><label className="text-xs font-bold text-slate-500 uppercase">Email</label><input value={editingPlayer.email || ''} onChange={e => setEditingPlayer({...editingPlayer, email: e.target.value})} className="w-full border border-slate-300 rounded-lg p-3 mt-1 bg-white text-slate-900" /></div>
                      <div><label className="text-xs font-bold text-slate-500 uppercase">Teléfono</label><input value={editingPlayer.phone || ''} onChange={e => setEditingPlayer({...editingPlayer, phone: e.target.value})} className="w-full border border-slate-300 rounded-lg p-3 mt-1 bg-white text-slate-900" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-8">
                      <button onClick={() => setEditingPlayer(null)} className="py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancelar</button>
                      <button onClick={handleSave} className="py-3 bg-[#575AF9] text-white rounded-xl font-bold"><Save size={18} className="inline mr-2"/> Guardar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PlayerManager;
