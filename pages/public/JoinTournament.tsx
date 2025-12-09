
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournament, TOURNAMENT_CATEGORIES } from '../../store/TournamentContext';
import { THEME } from '../../utils/theme';
import { User, Check, Trophy, Users, Search, ArrowRight, UserPlus, AlertTriangle } from 'lucide-react';
import { calculateInitialElo } from '../../utils/Elo';

const JoinTournament: React.FC = () => {
    const { clubId } = useParams<{ clubId: string }>();
    const navigate = useNavigate();
    const { addPlayerToDB, createPairInDB, state, loadData } = useTournament();

    const [step, setStep] = useState(1);
    
    // --- STEP 1: IDENTITY ---
    const [isGuest, setIsGuest] = useState(true); // For now default to guest flow for public
    
    // --- STEP 2: MY DATA ---
    const [myName, setMyName] = useState('');
    const [myPhone, setMyPhone] = useState('');
    const [myCategories, setMyCategories] = useState<string[]>([]);
    
    // --- STEP 3: PARTNER ---
    const [partnerType, setPartnerType] = useState<'search' | 'new' | 'solo' | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPartnerId, setSelectedPartnerId] = useState('');
    
    // New Partner Data
    const [partnerName, setPartnerName] = useState('');
    const [partnerLevel, setPartnerLevel] = useState(5);

    // Initial Load to ensure we have players for search (if RLS allows)
    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleNext = () => {
        if (step === 2 && !myName) return alert("Por favor, introduce tu nombre.");
        if (step === 3 && !partnerType) return alert("Elige una opción para tu compañero.");
        setStep(prev => prev + 1);
    };

    const toggleCategory = (cat: string) => {
        setMyCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
    };

    const handleFinish = async () => {
        if (!clubId) return;

        // 1. Create Myself
        const myElo = calculateInitialElo(myCategories, 5); // Default manual 5 for guests
        const myId = await addPlayerToDB({
            name: myName + ' (App)',
            nickname: myName,
            phone: myPhone,
            categories: myCategories,
            global_rating: myElo
        }, clubId); // Pass clubId as ownerId

        if (!myId) return alert("Error al crear jugador.");

        // 2. Handle Partner
        let p2Id: string | null = null;

        if (partnerType === 'search') {
            p2Id = selectedPartnerId;
        } else if (partnerType === 'new') {
            const pElo = calculateInitialElo(['Invitado'], partnerLevel);
            p2Id = await addPlayerToDB({
                name: partnerName + ' (Invitado)',
                nickname: partnerName,
                categories: ['Invitado'],
                manual_rating: partnerLevel,
                global_rating: pElo
            }, clubId);
        } else if (partnerType === 'solo') {
            p2Id = null;
        }

        // 3. Create Pair
        await createPairInDB(myId, p2Id, 'confirmed'); // Confirmed because self-registered

        alert("¡Inscripción realizada con éxito!");
        navigate('/'); // Redirect to landing
    };

    // Filter players for search
    const filteredPlayers = state.players.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col h-[90vh]">
                {/* HEADER */}
                <div className="bg-slate-900 p-6 text-white text-center">
                    <h1 className="text-xl font-bold">Inscripción al Torneo</h1>
                    <div className="flex justify-center gap-2 mt-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-[#575AF9]' : 'bg-slate-700'}`}></div>
                        ))}
                    </div>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    
                    {/* STEP 1: WELCOME */}
                    {step === 1 && (
                        <div className="text-center space-y-6 animate-fade-in pt-8">
                            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-[#575AF9]">
                                <Trophy size={40}/>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900">¡Bienvenido!</h2>
                            <p className="text-slate-500">¿Tienes cuenta en el club o eres nuevo?</p>
                            
                            <div className="space-y-3">
                                <button onClick={() => navigate('/auth')} className="w-full py-4 border-2 border-slate-100 rounded-xl font-bold text-slate-600 hover:border-slate-300">
                                    Ya tengo cuenta
                                </button>
                                <button onClick={() => { setIsGuest(true); setStep(2); }} style={{ backgroundColor: THEME.cta }} className="w-full py-4 text-white rounded-xl font-bold shadow-lg">
                                    Continuar como Invitado
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: MY DATA */}
                    {step === 2 && (
                        <div className="space-y-6 animate-slide-left">
                            <h2 className="text-xl font-bold text-slate-900">Tus Datos</h2>
                            
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Nombre Completo</label>
                                <input value={myName} onChange={e => setMyName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 font-bold text-slate-800" placeholder="Ej. Alex García" autoFocus/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Teléfono</label>
                                <input value={myPhone} onChange={e => setMyPhone(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 font-bold text-slate-800" placeholder="600 000 000"/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Tus Categorías (Nivel)</label>
                                <div className="flex flex-wrap gap-2">
                                    {TOURNAMENT_CATEGORIES.map(cat => (
                                        <button 
                                            key={cat} 
                                            onClick={() => toggleCategory(cat)}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${myCategories.includes(cat) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PARTNER */}
                    {step === 3 && (
                        <div className="space-y-6 animate-slide-left">
                            <h2 className="text-xl font-bold text-slate-900">Tu Compañero</h2>
                            
                            <div className="grid grid-cols-1 gap-3">
                                {/* OPTION A: SEARCH */}
                                <button 
                                    onClick={() => setPartnerType(partnerType === 'search' ? null : 'search')}
                                    className={`p-4 rounded-xl border-2 text-left transition-all ${partnerType === 'search' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-300'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-full shadow-sm"><Search size={20} className="text-blue-500"/></div>
                                        <div>
                                            <div className="font-bold text-slate-800">Buscar en el Club</div>
                                            <div className="text-xs text-slate-500">Ya ha jugado antes</div>
                                        </div>
                                    </div>
                                </button>
                                {partnerType === 'search' && (
                                    <div className="pl-4 animate-fade-in">
                                        <input 
                                            placeholder="Escribe nombre..." 
                                            value={searchQuery} 
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full p-3 border rounded-lg text-sm mb-2"
                                        />
                                        <div className="space-y-1 max-h-40 overflow-y-auto">
                                            {filteredPlayers.map(p => (
                                                <button 
                                                    key={p.id} 
                                                    onClick={() => setSelectedPartnerId(p.id)}
                                                    className={`w-full text-left p-2 text-sm rounded ${selectedPartnerId === p.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'}`}
                                                >
                                                    {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* OPTION B: NEW GUEST */}
                                <button 
                                    onClick={() => setPartnerType(partnerType === 'new' ? null : 'new')}
                                    className={`p-4 rounded-xl border-2 text-left transition-all ${partnerType === 'new' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-slate-300'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-full shadow-sm"><UserPlus size={20} className="text-emerald-500"/></div>
                                        <div>
                                            <div className="font-bold text-slate-800">Registrar Amigo</div>
                                            <div className="text-xs text-slate-500">Es nuevo</div>
                                        </div>
                                    </div>
                                </button>
                                {partnerType === 'new' && (
                                    <div className="pl-4 space-y-3 animate-fade-in">
                                        <input 
                                            placeholder="Nombre completo" 
                                            value={partnerName} 
                                            onChange={e => setPartnerName(e.target.value)}
                                            className="w-full p-3 border rounded-lg text-sm"
                                        />
                                        <div>
                                            <label className="text-xs font-bold text-slate-500">Nivel (1-10)</label>
                                            <div className="flex items-center gap-2">
                                                <input type="range" min="1" max="10" step="0.5" value={partnerLevel} onChange={e => setPartnerLevel(parseFloat(e.target.value))} className="w-full"/>
                                                <span className="font-bold text-emerald-600">{partnerLevel}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* OPTION C: SOLO */}
                                <button 
                                    onClick={() => setPartnerType('solo')}
                                    className={`p-4 rounded-xl border-2 text-left transition-all ${partnerType === 'solo' ? 'border-amber-500 bg-amber-50' : 'border-slate-100 hover:border-slate-300'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-full shadow-sm"><User size={20} className="text-amber-500"/></div>
                                        <div>
                                            <div className="font-bold text-slate-800">Voy Solo</div>
                                            <div className="text-xs text-slate-500">Busco pareja</div>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: CONFIRM */}
                    {step === 4 && (
                        <div className="text-center space-y-6 animate-fade-in pt-4">
                            <h2 className="text-2xl font-black text-slate-900">Resumen</h2>
                            
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-left space-y-4">
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase">Jugador 1</div>
                                    <div className="text-lg font-bold text-slate-900">{myName}</div>
                                    <div className="text-xs text-slate-500">{myCategories.join(', ')}</div>
                                </div>
                                <div className="border-t border-slate-200 pt-4">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Jugador 2</div>
                                    <div className="text-lg font-bold text-slate-900">
                                        {partnerType === 'solo' ? <span className="text-amber-500 italic">Buscando Pareja...</span> : 
                                         partnerType === 'search' ? (state.players.find(p => p.id === selectedPartnerId)?.name) : 
                                         partnerName}
                                    </div>
                                </div>
                            </div>

                            {partnerType === 'solo' && (
                                <div className="bg-amber-50 p-3 rounded-xl text-xs text-amber-800 flex items-start gap-2 text-left border border-amber-100">
                                    <AlertTriangle size={16} className="shrink-0"/>
                                    Entrarás en la bolsa de jugadores. El organizador te asignará una pareja si hay disponibilidad.
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* FOOTER ACTIONS */}
                <div className="p-6 border-t border-slate-100 bg-slate-50">
                    <div className="flex gap-3">
                        {step > 1 && (
                            <button onClick={() => setStep(prev => prev - 1)} className="px-6 py-4 bg-white text-slate-600 font-bold rounded-xl border border-slate-200 hover:bg-slate-50">
                                Atrás
                            </button>
                        )}
                        <button 
                            onClick={step === 4 ? handleFinish : handleNext}
                            style={{ backgroundColor: THEME.cta }} 
                            className="flex-1 py-4 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 hover:opacity-90"
                        >
                            {step === 4 ? <>Confirmar Inscripción <Check size={20}/></> : <>Siguiente <ArrowRight size={20}/></>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JoinTournament;
