
import React, { useState } from 'react';
import { useTournament } from '../store/TournamentContext';
import { THEME } from '../utils/theme';
import { useHistory } from '../store/HistoryContext';
import { useTimer } from '../store/TimerContext';
import { Users, PlayCircle, CheckCircle, Clock, Archive, Play, Trophy, Smartphone, Link, Check, Plus, Settings, Edit, Shuffle, ListOrdered, TrendingUp, X, Check as CheckIcon, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { TournamentFormat, GenerationMethod, Pair, Player } from '../types';

// MANUAL WIZARD COMPONENT (MOVED HERE)
interface WizardProps {
    pairs: Pair[];
    players: Player[];
    onComplete: (orderedPairs: Pair[]) => void;
    onCancel: () => void;
    formatName: (p?: Player) => string;
    limit: number; 
}

const ManualGroupingWizard: React.FC<WizardProps> = ({ pairs, players, onComplete, onCancel, formatName, limit }) => {
    const [currentGroupIdx, setCurrentGroupIdx] = useState(0); 
    const [orderedPairs, setOrderedPairs] = useState<Pair[]>([]);
    
    let groupNames = ['A', 'B', 'C', 'D'];
    if (limit === 10) groupNames = ['A', 'B'];
    if (limit === 8) groupNames = ['A', 'B'];
    if (limit === 12) groupNames = ['A', 'B', 'C'];
    
    const effectiveGroupSize = limit === 10 ? 5 : 4;
    const currentGroup = groupNames[currentGroupIdx];
    const assignedIds = new Set(orderedPairs.map(p => p.id));
    const availablePairs = pairs.filter(p => !assignedIds.has(p.id));
    const [selectedForGroup, setSelectedForGroup] = useState<string[]>([]);

    const toggleSelection = (id: string) => {
        if (selectedForGroup.includes(id)) setSelectedForGroup(selectedForGroup.filter(pid => pid !== id));
        else if (selectedForGroup.length < effectiveGroupSize) setSelectedForGroup([...selectedForGroup, id]);
    };

    const confirmGroup = () => {
        if (selectedForGroup.length !== effectiveGroupSize) return;
        const newGroupPairs = selectedForGroup.map(id => pairs.find(p => p.id === id)!);
        const newOrder = [...orderedPairs, ...newGroupPairs];
        setOrderedPairs(newOrder); setSelectedForGroup([]);
        if (currentGroupIdx < groupNames.length - 1) setCurrentGroupIdx(currentGroupIdx + 1);
        else onComplete(newOrder);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[150] flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl h-[85vh] flex flex-col">
                <div className="text-center mb-4"><h3 className="text-2xl font-black text-slate-900">Configurar Grupo {currentGroup}</h3><p className="text-slate-500 text-sm">Selecciona {effectiveGroupSize} parejas de la lista</p></div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-2 mb-4 custom-scrollbar">
                    {availablePairs.map(pair => {
                        const p1 = players.find(p => p.id === pair.player1Id);
                        const p2 = players.find(p => p.id === pair.player2Id);
                        const isSelected = selectedForGroup.includes(pair.id);
                        return (
                            <div key={pair.id} onClick={() => toggleSelection(pair.id)} className={`p-3 rounded-xl border-2 flex justify-between items-center cursor-pointer transition-all ${isSelected ? 'border-[#575AF9] bg-indigo-50' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                                <div><div className="font-bold text-slate-800 text-sm">{formatName(p1)}</div><div className="font-bold text-slate-800 text-sm">& {formatName(p2)}</div></div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#575AF9] border-[#575AF9]' : 'border-slate-300'}`}>{isSelected && <CheckIcon size={14} className="text-white" strokeWidth={3}/>}</div>
                            </div>
                        )
                    })}
                </div>
                <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
                    <div className="text-center font-bold text-[#575AF9] mb-2">Seleccionadas: {selectedForGroup.length} / {effectiveGroupSize}</div>
                    <button onClick={confirmGroup} disabled={selectedForGroup.length !== effectiveGroupSize} className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${selectedForGroup.length === effectiveGroupSize ? 'bg-[#575AF9] text-white animate-pulse' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>{currentGroupIdx === groupNames.length - 1 ? 'Finalizar y Empezar' : `Confirmar Grupo ${currentGroup} >`}</button>
                    <button onClick={onCancel} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancelar</button>
                </div>
            </div>
        </div>
    );
};

const Dashboard: React.FC = () => {
  const { state, startTournamentDB, setTournamentFormat, formatPlayerName } = useTournament();
  const { archiveTournament } = useHistory();
  const { resetTimer, startTimer } = useTimer();
  const { user } = useAuth();
  const navigate = useNavigate();

  // MODAL STATES
  const [modalConfig, setModalConfig] = useState<{
      type: 'archive' | null;
      isOpen: boolean;
  }>({ type: null, isOpen: false });

  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [generationMethod, setGenerationMethod] = useState<GenerationMethod>('elo-balanced');
  const [selectedFormat, setSelectedFormat] = useState<TournamentFormat>('16_mini');
  const [showManualWizard, setShowManualWizard] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [linkCopied, setLinkCopied] = useState(false);

  // Calculate stats based on computed isReserve flag
  const activePairsCount = state.pairs.filter(p => !p.isReserve && p.player2Id).length;
  const reservePairsCount = state.pairs.filter(p => p.isReserve && p.player2Id).length;
  
  // Format Label (e.g., "12", "16")
  const formatLabel = state.format ? state.format.replace('_mini', '') : '16';

  const StatCard = ({ title, value, subValue, icon: Icon, color, onClick }: any) => (
    <div 
      onClick={onClick}
      className="bg-white p-5 rounded-2xl border border-slate-200 cursor-pointer hover:border-blue-300 transition-all hover:shadow-md shadow-sm h-full flex flex-col justify-between group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${color.replace('text-', 'bg-').replace('400', '50')} ${color.replace('400', '600')}`}>
          <Icon size={24} />
        </div>
        {subValue && (
            <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded-full text-slate-500 border border-slate-200 whitespace-nowrap">
                {subValue}
            </span>
        )}
      </div>
      <div>
          <div className="text-2xl font-black text-slate-800 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{value}</div>
          <h3 className="text-slate-400 font-bold uppercase text-[10px] tracking-wider mt-1">{title}</h3>
      </div>
    </div>
  );

  const performAction = () => {
      if (modalConfig.type === 'archive') {
          archiveTournament(state);
      }
      setModalConfig({ type: null, isOpen: false });
  };
  
  const openModal = (type: 'archive') => {
      setModalConfig({ type, isOpen: true });
  }

  const handleCopyLink = () => {
      if (!user) return;
      const url = `${window.location.origin}/#/join/${user.id}`;
      navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
  };

  const ActivityIcon = (status: string) => {
    switch(status) {
      case 'active': return PlayCircle;
      case 'finished': return CheckCircle;
      default: return Clock;
    }
  }

  const getRoundLabel = (r: number) => {
      if (r === 0) return '-';
      if (r <= 4) return r;
      if (r === 5) return 'QF';
      if (r === 6) return 'SF';
      if (r >= 7) return 'Final';
      return r;
  };

  // GENERATION HANDLERS
  const handleOpenGeneration = () => {
      setSelectedFormat(state.format);
      setShowGenerationModal(true);
  }

  const handleFormatChange = (fmt: TournamentFormat) => {
      setSelectedFormat(fmt);
      setTournamentFormat(fmt);
  };

  const handleStartTournament = async () => {
      if (generationMethod === 'manual') { 
          setShowManualWizard(true); 
          // Do not close generation modal yet, wizard overlays it
          return; 
      }
      try { 
          await startTournamentDB(generationMethod); 
          resetTimer(); 
          startTimer();
          setShowGenerationModal(false);
          navigate('/active');
      } catch (e: any) { 
          setErrorMessage(e.message || "Error desconocido al iniciar torneo."); 
      }
  };

  const handleManualWizardComplete = async (orderedPairs: Pair[]) => {
      setShowManualWizard(false);
      try { 
          await startTournamentDB('manual', orderedPairs); 
          resetTimer(); 
          startTimer();
          setShowGenerationModal(false);
          navigate('/active');
      } catch (e: any) { 
          setErrorMessage(e.message || "Error al iniciar el torneo manual."); 
      }
  };

  const isSetupMode = state.status === 'setup';
  const isActiveMode = state.status === 'active';
  const isFinishedMode = state.status === 'finished';

  // Check start eligibility
  let limit = 16; 
  if (selectedFormat === '10_mini') limit = 10; 
  if (selectedFormat === '12_mini') limit = 12; 
  if (selectedFormat === '8_mini') limit = 8;
  const totalPairs = state.pairs.filter(p => p.player2Id).length;
  const canStart = totalPairs >= limit;

  return (
    <div className="space-y-6 pb-10">
      {/* Header with Format Badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Panel de Control</h2>
        <div className="flex items-center gap-2">
            {!isFinishedMode && (
                <span className="text-[10px] font-black px-3 py-1 bg-slate-800 text-white rounded-lg tracking-wider border border-slate-800 shadow-sm">
                    {state.title || 'MINI TORNEO'}
                </span>
            )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Jugadores" 
          value={state.players.length} 
          icon={Users} 
          color="text-blue-400" 
          onClick={() => navigate('/players')} 
        />
        <StatCard 
          title="Parejas" 
          value={activePairsCount}
          subValue={reservePairsCount > 0 ? `+${reservePairsCount} Res.` : null}
          icon={Trophy} 
          color={activePairsCount > 0 ? "text-emerald-400" : "text-slate-400"}
          onClick={() => navigate('/registration')}
        />
        <StatCard 
          title="Estado" 
          value={isActiveMode ? 'EN JUEGO' : isSetupMode ? 'INSCRIPCIÓN' : 'SIN TORNEO'} 
          icon={ActivityIcon(state.status)} 
          color={isActiveMode ? "text-rose-400" : isFinishedMode ? "text-slate-400" : "text-orange-400"} 
          onClick={() => navigate('/active')}
        />
        <StatCard 
          title="Ronda Actual" 
          value={getRoundLabel(state.currentRound)} 
          icon={Clock} 
          color="text-pink-400" 
          onClick={() => navigate('/active')}
        />
      </div>
      
      {/* Main Actions Area */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Acciones Principales</h3>
        
        <div className="grid grid-cols-1 gap-4">
          {/* 1. NO TOURNAMENT -> CREATE */}
          {isFinishedMode && (
             <button 
             onClick={() => navigate('/setup')}
             style={{ backgroundColor: THEME.cta }}
             className="w-full py-6 text-white rounded-xl font-bold transition-all shadow-md text-lg flex items-center justify-center gap-3 active:scale-[0.98] hover:opacity-90 animate-fade-in"
           >
             <div className="bg-white/20 p-2 rounded-full"><Plus size={24} strokeWidth={3}/></div>
             CREAR NUEVO TORNEO
           </button>
          )}

          {/* 2. SETUP MODE -> GENERATE & START */}
          {isSetupMode && (
             <div className="animate-fade-in">
                  <button 
                    onClick={handleOpenGeneration}
                    style={{ backgroundColor: THEME.cta }}
                    className="w-full py-6 text-white rounded-xl font-bold transition-all shadow-md hover:opacity-90 flex flex-col items-center justify-center gap-2 mb-4"
                  >
                     <div className="bg-white/20 p-3 rounded-full"><Play size={32} fill="currentColor"/></div>
                     <span className="text-lg">GENERAR CUADROS Y EMPEZAR</span>
                  </button>
                  
                  <div className="grid grid-cols-1 gap-4">
                      <button 
                        onClick={() => navigate('/registration')}
                        className="w-full py-4 bg-white border-2 border-indigo-100 hover:border-indigo-500 text-indigo-700 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group"
                      >
                        <Users size={20}/> Gestionar Inscripciones
                      </button>
                  </div>
             </div>
          )}

           {/* 3. ACTIVE MODE -> GO LIVE */}
           {isActiveMode && (
             <button 
             onClick={() => navigate('/active')}
             className="w-full py-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all animate-pulse shadow-md shadow-rose-200 text-xl flex items-center justify-center gap-3 active:scale-[0.98]"
           >
             <div className="bg-white/20 p-2 rounded-full"><PlayCircle size={28}/></div>
             IR AL TORNEO EN VIVO
           </button>
          )}

          {/* Secondary Actions */}
          {!isFinishedMode && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                   <button 
                    onClick={() => navigate('/setup')}
                    className="w-full py-4 bg-white border-2 border-slate-100 hover:border-blue-200 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl font-bold transition-all text-sm flex flex-col items-center justify-center gap-2"
                  >
                    <Edit size={24} className="opacity-50"/>
                    Editar Info
                  </button>
                  <button 
                    onClick={() => navigate('/checkin')}
                    className="w-full py-4 bg-white border-2 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-xl font-bold transition-all text-sm flex flex-col items-center justify-center gap-2"
                  >
                    <Clock size={24} className="opacity-50"/>
                    Control y Pagos
                  </button>
              </div>
          )}

          {/* Copy Link Button - Always useful if active */}
          {!isFinishedMode && (
              <button 
                onClick={handleCopyLink}
                className="w-full py-3 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2"
              >
                {linkCopied ? <Check size={18} /> : <Link size={18} />}
                {linkCopied ? '¡Enlace Copiado!' : 'Copiar Enlace de Inscripción Pública'}
              </button>
          )}

          {/* Archive Action (Only when finished but state not reset) */}
          {state.status === 'finished' && state.id && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <button 
                    onClick={() => openModal('archive')}
                    className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-all shadow-lg text-lg flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                        <Archive size={24} />
                        ARCHIVAR Y CERRAR TORNEO
                    </button>
                    <p className="text-center text-xs text-slate-400 mt-2">Guardará resultados en historial y preparará un nuevo torneo.</p>
                </div>
           )}

           {/* Preview Player App Button */}
           <div className="mt-6 pt-6 border-t border-slate-100">
               <button 
                onClick={() => navigate('/p/dashboard')}
                className="w-full py-3 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2"
              >
                <Smartphone size={18} />
                Vista Previa App Jugadores (Test)
              </button>
           </div>
        </div>
      </div>

      {/* GLOBAL CONFIRMATION MODAL */}
      {modalConfig.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-scale-in text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-blue-100 text-blue-600`}>
                      <Archive size={32}/>
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-900 mb-2">
                      ¿Archivar Torneo?
                  </h3>
                  
                  <p className="text-slate-500 mb-8 leading-relaxed">
                      El torneo se guardará en el historial y se preparará la app para uno nuevo.
                  </p>

                  <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={performAction}
                        style={{ backgroundColor: THEME.cta }}
                        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform`}
                      >
                          Confirmar Acción
                      </button>
                      <button 
                        onClick={() => setModalConfig({ type: null, isOpen: false })}
                        className="w-full py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200"
                      >
                          Cancelar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* GENERATION MODAL */}
      {showGenerationModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4">
              <div className="bg-white w-full h-[90vh] sm:h-auto sm:max-h-[85vh] sm:rounded-3xl sm:max-w-lg shadow-2xl animate-slide-up flex flex-col relative">
                  <button onClick={() => setShowGenerationModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X size={20}/></button>
                  
                  <div className="p-6 border-b border-slate-100">
                      <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                          <Settings className="text-slate-400"/> Configuración Técnica
                      </h2>
                      <div className={`mt-2 px-3 py-1 inline-block rounded-lg text-xs font-bold uppercase border ${canStart ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-orange-100 text-orange-600 border-orange-200'}`}>
                          {totalPairs}/{limit} Parejas Inscritas
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                      {/* Format Selection */}
                      <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Formato (Parejas)</h3>
                        <div className="grid grid-cols-4 gap-2">
                            {['16_mini', '12_mini', '10_mini', '8_mini'].map((fmt) => (
                                <button 
                                    key={fmt}
                                    onClick={() => handleFormatChange(fmt as TournamentFormat)} 
                                    className={`py-3 rounded-xl font-bold border-2 transition-all text-sm ${selectedFormat === fmt ? 'border-[#575AF9] bg-indigo-50 text-[#575AF9]' : 'border-slate-100 text-slate-500 hover:border-slate-300'}`}
                                >
                                    {fmt.replace('_mini', '')}
                                </button>
                            ))}
                        </div>
                      </div>

                      {/* Generation Method */}
                      <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Orden de Grupos</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={() => setGenerationMethod('arrival')} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${generationMethod === 'arrival' ? 'border-[#575AF9] bg-indigo-50 text-[#575AF9]' : 'border-slate-100 text-slate-500'}`}>
                                <Clock size={20}/> 
                                <div>
                                    <div className="font-bold text-sm uppercase">Ordenar por Llegada</div>
                                    <div className="text-xs opacity-70 font-normal">Orden de inscripción</div>
                                </div>
                            </button>
                            <button onClick={() => setGenerationMethod('elo-balanced')} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${generationMethod === 'elo-balanced' ? 'border-[#575AF9] bg-indigo-50 text-[#575AF9]' : 'border-slate-100 text-slate-500'}`}>
                                <TrendingUp size={20}/>
                                <div>
                                    <div className="font-bold text-sm uppercase">Ordenar por ELO</div>
                                    <div className="text-xs opacity-70 font-normal">Equilibrado (Mejores al A)</div>
                                </div>
                            </button>
                            <button onClick={() => setGenerationMethod('elo-mixed')} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${generationMethod === 'elo-mixed' ? 'border-[#575AF9] bg-indigo-50 text-[#575AF9]' : 'border-slate-100 text-slate-500'}`}>
                                <Shuffle size={20}/>
                                <div>
                                    <div className="font-bold text-sm uppercase">Ordenar Mezclados</div>
                                    <div className="text-xs opacity-70 font-normal">Sistema Cremallera (Mix Nivel)</div>
                                </div>
                            </button>
                            <button onClick={() => setGenerationMethod('manual')} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${generationMethod === 'manual' ? 'border-[#575AF9] bg-indigo-50 text-[#575AF9]' : 'border-slate-100 text-slate-500'}`}>
                                <ListOrdered size={20}/>
                                <div>
                                    <div className="font-bold text-sm uppercase">Ordenar Manualmente</div>
                                    <div className="text-xs opacity-70 font-normal">Seleccionar uno a uno</div>
                                </div>
                            </button>
                        </div>
                      </div>
                  </div>

                  <div className="p-6 border-t border-slate-100">
                      <button 
                        onClick={handleStartTournament} 
                        disabled={!canStart} 
                        style={{ backgroundColor: canStart ? THEME.cta : '#e2e8f0' }} 
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${canStart ? 'text-white active:scale-95 hover:opacity-90' : 'text-slate-400 cursor-not-allowed'}`}
                      >
                          <Play size={24} fill="currentColor" /> EMPEZAR TORNEO
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* ERROR MODAL */}
      {errorMessage && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                      <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">Error</h3>
                  <p className="text-slate-500 mb-6 text-sm break-words">{errorMessage}</p>
                  <button onClick={() => setErrorMessage(null)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg">
                      Entendido
                  </button>
              </div>
          </div>
      )}

      {/* MANUAL WIZARD OVERLAY */}
      {showManualWizard && (
          <ManualGroupingWizard 
            pairs={state.pairs.filter(p => !p.isReserve).slice(0, limit)} 
            players={state.players} 
            onCancel={() => setShowManualWizard(false)} 
            onComplete={handleManualWizardComplete} 
            formatName={formatPlayerName} 
            limit={limit} 
          />
      )}

    </div>
  );
};

export default Dashboard;
