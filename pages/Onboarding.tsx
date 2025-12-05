import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHistory } from '../store/HistoryContext';
import { THEME } from '../utils/theme';
import { Building, Check, UserCog, Users, Trophy, History, ArrowRight } from 'lucide-react';

const Onboarding: React.FC = () => {
    const navigate = useNavigate();
    const { updateClubData } = useHistory();
    
    // Phases: 'config' | 'tour'
    const [phase, setPhase] = useState<'config' | 'tour'>('config');
    const [tourStep, setTourStep] = useState(0);
    const [form, setForm] = useState({ name: '', courtCount: 6, address: '', phone: '' });

    const handleConfigSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateClubData(form);
        setPhase('tour');
    };

    const handleTourFinish = () => {
        navigate('/dashboard');
    };

    const tourSlides = [
        {
            title: "Gestión de Jugadores",
            text: "Crea tu base de datos de jugadores una sola vez. Se guardan para siempre en el club y podrás seleccionarlos rápidamente para futuros torneos.",
            icon: UserCog,
            color: "text-blue-500"
        },
        {
            title: "Parejas de Torneo",
            text: "Para cada torneo, crea parejas vinculando a dos jugadores. Al terminar, la pareja se disuelve pero los jugadores y sus estadísticas individuales persisten.",
            icon: Users,
            color: "text-emerald-500"
        },
        {
            title: "Formatos Flexibles",
            text: "Elige entre Mini 8, 10, 12 o 16. El sistema calcula automáticamente los grupos, los descansos (si hay pocas pistas) y los cruces de Playoffs.",
            icon: Trophy,
            color: "text-amber-500"
        },
        {
            title: "Historial Completo",
            text: "Todos los resultados se guardan. Consulta estadísticas de victorias, títulos y evolución de nivel en el perfil de cada jugador.",
            icon: History,
            color: "text-purple-500"
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            
            {phase === 'config' && (
                <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl animate-scale-in">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4" style={{ color: THEME.cta }}>
                            <Building size={40} />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900">Configura tu Club</h1>
                        <p className="text-slate-500 mt-2">Para organizar los torneos correctamente, necesitamos algunos datos básicos.</p>
                    </div>

                    <form onSubmit={handleConfigSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nombre del Club</label>
                            <input 
                                required
                                value={form.name}
                                onChange={e => setForm({...form, name: e.target.value})}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#575AF9] font-bold text-lg"
                                placeholder="Ej. Padel Center"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Número de Pistas</label>
                            <input 
                                type="number"
                                min="1"
                                max="50"
                                required
                                value={form.courtCount}
                                onChange={e => setForm({...form, courtCount: parseInt(e.target.value) || 0})}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#575AF9] font-bold text-lg text-center"
                            />
                            <p className="text-[10px] text-slate-400 mt-2 text-center">
                                Si tienes 8 o más pistas, los torneos de 16 parejas se jugarán sin descansos.
                            </p>
                        </div>

                        <button type="submit" style={{ backgroundColor: THEME.cta }} className="w-full py-4 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                            <Check size={20} /> Guardar y Continuar
                        </button>
                    </form>
                </div>
            )}

            {phase === 'tour' && (
                <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl animate-slide-left relative overflow-hidden min-h-[500px] flex flex-col justify-between">
                    <div className="text-center pt-8">
                        {tourSlides.map((slide, idx) => {
                             if (idx !== tourStep) return null;
                             const Icon = slide.icon;
                             return (
                                 <div key={idx} className="animate-fade-in">
                                     <div className={`w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 ${slide.color}`}>
                                         <Icon size={48} />
                                     </div>
                                     <h2 className="text-2xl font-black text-slate-900 mb-4">{slide.title}</h2>
                                     <p className="text-slate-500 leading-relaxed text-lg">
                                         {slide.text}
                                     </p>
                                 </div>
                             )
                        })}
                    </div>

                    <div className="flex flex-col gap-6 items-center">
                        <div className="flex gap-2">
                            {tourSlides.map((_, idx) => (
                                <div 
                                    key={idx} 
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === tourStep ? 'bg-[#575AF9] w-8' : 'bg-slate-200'}`}
                                />
                            ))}
                        </div>

                        <button 
                            onClick={() => {
                                if (tourStep < tourSlides.length - 1) setTourStep(prev => prev + 1);
                                else handleTourFinish();
                            }}
                            style={{ backgroundColor: THEME.cta }}
                            className="w-full py-4 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                        >
                            {tourStep < tourSlides.length - 1 ? (
                                <>Siguiente <ArrowRight size={20} /></>
                            ) : (
                                <>¡Empezar a Gestionar!</>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Onboarding;