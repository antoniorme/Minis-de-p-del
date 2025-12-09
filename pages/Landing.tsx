
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Smartphone } from 'lucide-react';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 items-center justify-center p-6 text-center">
      <div className="mb-8 animate-bounce p-6 bg-white rounded-full shadow-lg">
        <Trophy size={80} className="text-[#575AF9]" />
      </div>
      
      <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-[#2B2DBF] to-[#575AF9] bg-clip-text text-transparent">
        Minis de Padel
      </h1>
      
      <p className="text-slate-500 mb-12 max-w-xs mx-auto leading-relaxed">
        Organiza torneos americanos, gestiona parejas, pistas y resultados en tiempo real desde tu móvil.
      </p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button 
          onClick={() => navigate('/auth?mode=login')}
          className="w-full py-4 bg-[#575AF9] hover:bg-[#2B2DBF] text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
        >
          Iniciar Sesión
        </button>
        
        <button 
          onClick={() => navigate('/auth?mode=register')}
          className="w-full py-4 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl font-bold text-slate-600 transition-transform active:scale-95 shadow-sm"
        >
          Crear Cuenta
        </button>

        <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-300 text-xs font-bold uppercase">o</span>
            <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <button 
          onClick={() => navigate('/p/dashboard')}
          className="w-full py-4 bg-slate-800 text-slate-200 hover:bg-slate-900 rounded-xl font-bold transition-transform active:scale-95 shadow-sm flex items-center justify-center gap-3"
        >
          <Smartphone size={20} />
          Soy Jugador
        </button>
      </div>

      <footer className="mt-16 text-xs text-slate-400">
        © {new Date().getFullYear()} PadelPro App v1.0
      </footer>
    </div>
  );
};

export default Landing;
