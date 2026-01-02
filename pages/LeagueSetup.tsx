
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeague } from '../store/LeagueContext';
import { THEME } from '../utils/theme';
import { 
    Calendar, Trophy, Plus, X, ArrowLeft, Save, 
    Gift, ChevronRight, Info, AlertCircle, Settings2,
    CalendarDays
} from 'lucide-react';

const LeagueSetup: React.FC = () => {
    const navigate = useNavigate();
    const { league, createLeague } = useLeague();
    
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('2024-01-12');
    const [endDate, setEndDate] = useState('2024-04-15');
    const [playoffDate, setPlayoffDate] = useState('2024-04-17');
    
    const [categories, setCategories] = useState(league.categories);

    const handleAddCategory = () => {
        const newCat = {
            id: `cat-${Date.now()}`,
            name: '',
            prize_winner: '',
            prize_runnerup: '',
            pairs_count: 0
        };
        setCategories([...categories, newCat]);
    };

    const removeCategory = (id: string) => {
        setCategories(categories.filter(c => c.id !== id));
    };

    const updateCategory = (id: string, field: string, value: string) => {
        setCategories(categories.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleSave = async () => {
        if (!title) return alert("Ponle un nombre a la liga");
        if (categories.some(c => !c.name)) return alert("Todas las categorías deben tener nombre");
        
        await createLeague({
            title,
            startDate,
            endDate,
            playoffDate,
            categories
        });
        
        navigate('/league');
    };

    return (
        <div className="space-y-8 pb-32 animate-fade-in">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/league')} className="p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-2xl font-black text-white">Configurar Nueva Liga</h2>
            </div>

            {/* Ficha Principal */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-indigo-200 space-y-8">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre de la Competición</label>
                    <input 
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Ej. I Liga de Invierno PadelPro"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-1.5 text-slate-900 font-bold text-xl outline-none focus:border-indigo-400 transition-all"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={14} className="text-indigo-400"/> Inicio Liga
                        </label>
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={14} className="text-rose-400"/> Fin Liga
                        </label>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                            <Trophy size={14} /> Fase Final
                        </label>
                        <input 
                            type="date" 
                            value={playoffDate}
                            onChange={e => setPlayoffDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none"
                        />
                    </div>
                </div>

                <div className="bg-indigo-50 rounded-2xl p-4 flex gap-3 items-start border border-indigo-100">
                    <Info className="text-indigo-500 shrink-0" size={20}/>
                    <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                        La fase regular se jugará entre el <strong>{new Date(startDate).toLocaleDateString()}</strong> y el <strong>{new Date(endDate).toLocaleDateString()}</strong>. El cuadro de eliminatorias comenzará el <strong>{new Date(playoffDate).toLocaleDateString()}</strong>.
                    </p>
                </div>
            </div>

            {/* Categorías */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <Settings2 size={20}/> Categorías y Premios
                    </h3>
                    <button 
                        onClick={handleAddCategory}
                        className="p-2 bg-white text-indigo-500 rounded-xl hover:scale-105 transition-transform shadow-lg"
                    >
                        <Plus size={24}/>
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {categories.map((cat, idx) => (
                        <div key={cat.id} className="bg-white rounded-[2rem] p-6 shadow-xl border border-indigo-100 animate-slide-up">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex-1 mr-4">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombre Categoría</label>
                                    <input 
                                        value={cat.name}
                                        onChange={e => updateCategory(cat.id, 'name', e.target.value)}
                                        placeholder="Ej. 2ª Masculina"
                                        className="w-full bg-transparent border-b-2 border-slate-100 py-2 font-black text-slate-800 text-xl outline-none focus:border-indigo-400 transition-all"
                                    />
                                </div>
                                <button 
                                    onClick={() => removeCategory(cat.id)}
                                    className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                >
                                    <X size={20}/>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                                    <label className="text-[9px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1 mb-2">
                                        <Gift size={12}/> Premio Campeones
                                    </label>
                                    <input 
                                        value={cat.prize_winner}
                                        onChange={e => updateCategory(cat.id, 'prize_winner', e.target.value)}
                                        placeholder="Ej. Pala Bullpadel Hack"
                                        className="w-full bg-white border border-amber-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none"
                                    />
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-2">
                                        <Gift size={12}/> Premio Subcampeones
                                    </label>
                                    <input 
                                        value={cat.prize_runnerup}
                                        onChange={e => updateCategory(cat.id, 'prize_runnerup', e.target.value)}
                                        placeholder="Ej. Equipación Técnica"
                                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Guardar */}
            <div className="pt-6">
                <button 
                    onClick={handleSave}
                    className="w-full py-6 bg-white text-indigo-500 rounded-[1.5rem] font-black text-lg shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                    <Save size={24}/> CREAR LIGA Y CONTINUAR
                </button>
            </div>
        </div>
    );
};

export default LeagueSetup;
