
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/AuthContext';
import { Trophy, Loader2, ArrowLeft, Mail, Lock, Code2, CheckCircle } from 'lucide-react';

// Google Logo SVG Component
/*
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.04-3.71 1.04-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);
*/

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { checkUserRole, loginWithDevBypass, isOfflineMode } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showDevTools, setShowDevTools] = useState(false);

  useEffect(() => {
      const isPlaceholder = (supabase as any).supabaseUrl === 'https://placeholder.supabase.co';
      if (isOfflineMode || isPlaceholder) {
          setShowDevTools(true);
      }
  }, [isOfflineMode]);

  useEffect(() => {
    if (searchParams.get('mode') === 'register') {
      setIsLogin(false);
    }
  }, [searchParams]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if ((supabase as any).supabaseUrl === 'https://placeholder.supabase.co') {
        setError("Base de datos no conectada. Usa los botones de 'Modo Desarrollador' abajo para probar la app.");
        setLoading(false);
        setShowDevTools(true);
        return;
    }

    try {
      let result;
      if (isLogin) {
        result = await supabase.auth.signInWithPassword({ email, password });
      } else {
        result = await supabase.auth.signUp({ email, password });
      }

      if (result.error) throw result.error;

      // Handle Registration with Email Confirmation flow
      if (!isLogin && result.data.user && !result.data.session) {
          setSuccessMessage("¡Cuenta creada! Revisa tu email para confirmar tu registro antes de iniciar sesión.");
          setLoading(false);
          setIsLogin(true); // Switch to login mode
          return;
      }

      if (result.data.user) {
          const role = await checkUserRole(result.data.user.id, result.data.user.email);
          if (role === 'admin' || role === 'superadmin') {
              navigate('/dashboard');
          } else {
              navigate('/p/dashboard');
          }
      }

    } catch (err: any) {
      let message = err.message || 'Error de autenticación';
      if (message === 'Failed to fetch') message = 'Error de conexión.';
      else if (message.includes('Invalid login')) message = 'Credenciales incorrectas.';
      else if (message.includes('User already registered')) message = 'Este email ya está registrado.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /*
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
      // Note: The redirect happens immediately, so subsequent code might not run if successful
    } catch (err: any) {
      setError(err.message || 'Error al iniciar con Google');
      setLoading(false);
    }
  };
  */

  const handleBypass = (role: 'admin' | 'player' | 'superadmin') => {
      loginWithDevBypass(role);
      if (role === 'player') navigate('/p/dashboard');
      else navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-6">
      <button onClick={() => navigate('/')} className="text-slate-500 flex items-center gap-2 mb-8 font-bold text-sm hover:text-slate-800 transition-colors">
        <ArrowLeft size={20} /> Volver
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-white rounded-3xl mb-4 shadow-xl shadow-indigo-100">
             <Trophy size={48} className="text-[#575AF9]" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            {isLogin ? 'Bienvenido' : 'Crear Cuenta'}
          </h1>
          <p className="text-slate-400 text-sm">
            {isLogin ? 'Introduce tus credenciales' : 'Únete a la comunidad de padel'}
          </p>
        </div>

        {successMessage && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-xl text-sm mb-6 flex items-start gap-3 shadow-sm">
                <CheckCircle size={20} className="shrink-0 mt-0.5"/>
                <p className="font-medium">{successMessage}</p>
            </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl text-sm mb-6 text-center font-medium shadow-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* SOCIAL LOGIN - DISABLED TEMPORARILY
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || showDevTools}
            className="w-full bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 py-4 rounded-2xl font-bold text-slate-700 shadow-sm transition-all active:scale-95 flex items-center justify-center gap-3 text-base disabled:opacity-70"
          >
            <GoogleIcon />
            Continuar con Google
          </button>

          <div className="flex items-center gap-4 py-2">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">O usa tu email</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>
          */}

          <div className="relative">
            <Mail className="absolute left-4 top-4 text-slate-400" size={20} />
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 focus:border-[#575AF9] outline-none shadow-sm font-medium transition-all focus:ring-4 focus:ring-indigo-50"
              placeholder="Email"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)} minLength={6}
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 focus:border-[#575AF9] outline-none shadow-sm font-medium transition-all focus:ring-4 focus:ring-indigo-50"
              placeholder="Contraseña"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-[#575AF9] hover:bg-[#484bf0] disabled:opacity-70 py-4 rounded-2xl font-bold text-white shadow-xl shadow-indigo-200 transition-all active:scale-95 mt-4 flex justify-center items-center text-lg"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Entrar' : 'Registrarse')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button onClick={() => { setIsLogin(!isLogin); setError(null); setSuccessMessage(null); }} className="text-slate-500 text-sm font-medium hover:text-[#575AF9] transition-colors">
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>

        {/* DEVELOPER BYPASS TOOLS */}
        {showDevTools && (
            <div className="mt-12 pt-8 border-t border-slate-200 animate-fade-in">
                <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-bold uppercase mb-4">
                    <Code2 size={16}/> Modo Desarrollador (Simulación)
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <button 
                        onClick={() => handleBypass('admin')}
                        className="py-3 bg-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-900 transition-colors shadow-lg active:scale-95"
                    >
                        Entrar como CLUB
                    </button>
                    <button 
                        onClick={() => handleBypass('player')}
                        className="py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-colors shadow-lg active:scale-95"
                    >
                        Entrar como JUGADOR
                    </button>
                </div>
                <button 
                    onClick={() => handleBypass('superadmin')}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-colors shadow-lg active:scale-95"
                >
                    Entrar como SUPER ADMIN
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
