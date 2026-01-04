import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { TournamentProvider } from './store/TournamentContext';
import { LeagueProvider } from './store/LeagueContext';
import { AuthProvider, useAuth } from './store/AuthContext';
import { HistoryProvider, useHistory } from './store/HistoryContext';
import { TimerProvider } from './store/TimerContext';
import { NotificationProvider } from './store/NotificationContext';
import { Layout } from './components/Layout';
import { PlayerLayout } from './components/PlayerLayout';
import { ShieldAlert, RefreshCw, Terminal, User, Shield, Crown, Code, AlertCircle, Activity, Trophy, Loader2, Lock, Eye, EyeOff, CheckCircle2, ShieldCheck, Key } from 'lucide-react';
import { supabase } from './lib/supabase';

// Pages
import Dashboard from './pages/Dashboard';
import Registration from './pages/Registration';
import CheckIn from './pages/CheckIn';
import ActiveTournament from './pages/ActiveTournament';
import Results from './pages/Results';
import Landing from './pages/Landing';
import AuthPage from './pages/Auth';
import PlayerManager from './pages/PlayerManager';
import History from './pages/History';
import ClubProfile from './pages/ClubProfile';
import Help from './pages/Help';
import AdminPlayerProfile from './pages/PlayerProfile'; 
import Onboarding from './pages/Onboarding'; 
import JoinTournament from './pages/public/JoinTournament';
import TournamentSetup from './pages/TournamentSetup';
import SuperAdmin from './pages/SuperAdmin'; 
import Notifications from './pages/Notifications';
import NotificationSettings from './pages/NotificationSettings';
import PendingVerification from './pages/PendingVerification';

// League Pages
import LeagueDashboard from './pages/LeagueDashboard';
import LeagueSetup from './pages/LeagueSetup';
import LeagueGroups from './pages/LeagueGroups';
import LeagueActive from './pages/LeagueActive';

// Player Pages
import PlayerDashboard from './pages/player/PlayerDashboard';
import PlayerTournaments from './pages/player/PlayerTournaments';
import TournamentBrowser from './pages/player/TournamentBrowser';
import PlayerAppProfile from './pages/player/PlayerProfile';

const hostname = window.location.hostname;
const IS_DEV_ENV = 
  hostname === 'localhost' || 
  hostname === '127.0.0.1' || 
  hostname.includes('googleusercontent') || 
  hostname.includes('webcontainer') ||
  hostname.includes('idx.google.com');

// MODAL DE RECUPERACIÓN INTERNO
const RecoveryModal = () => {
    const { recoveryMode, setRecoveryMode, addLog } = useAuth();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!recoveryMode) return null;

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) { setError("Las claves no coinciden."); return; }
        if (password.length < 6) { setError("Mínimo 6 caracteres."); return; }
        
        setLoading(true);
        setError(null);
        addLog("ACTUALIZANDO CLAVE DESDE MODAL INTERNO...");

        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;
            
            addLog("CLAVE ACTUALIZADA CON ÉXITO.");
            setSuccess(true);
            setTimeout(() => {
                setRecoveryMode(false);
            }, 2000);
        } catch (err: any) {
            addLog(`ERROR MODAL: ${err.message}`);
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-slide-up border border-indigo-100">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#575AF9]">
                        <ShieldCheck size={32}/>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 leading-tight">Seguridad de Cuenta</h2>
                    <p className="text-slate-400 text-sm mt-2 font-medium uppercase tracking-widest text-[10px]">Cambio de Contraseña</p>
                </div>

                {success ? (
                    <div className="bg-emerald-50 p-6 rounded-3xl text-center space-y-3 animate-fade-in border border-emerald-100">
                        <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-2"/>
                        <p className="text-emerald-800 font-bold">¡Contraseña Guardada!</p>
                        <p className="text-emerald-600 text-xs">Ya puedes usar la aplicación normalmente.</p>
                    </div>
                ) : (
                    <form onSubmit={handleUpdate} className="space-y-4">
                        {error && (
                            <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
                                <AlertCircle size={14}/> {error}
                            </div>
                        )}
                        <div className="relative">
                            <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
                            <input type={showPass ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-12 text-slate-900 focus:border-[#575AF9] outline-none font-bold text-lg" placeholder="Nueva Clave" autoFocus/>
                            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-4 text-slate-400">
                                {showPass ? <EyeOff size={20}/> : <Eye size={20}/>}
                            </button>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
                            <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 focus:border-[#575AF9] outline-none font-bold text-lg" placeholder="Confirmar Clave"/>
                        </div>

                        <button type="submit" disabled={loading} className="w-full bg-[#575AF9] hover:bg-[#484bf0] disabled:opacity-50 py-4 rounded-2xl font-black text-white shadow-xl flex justify-center items-center gap-2 text-lg active:scale-95 transition-all mt-4">
                            {loading ? <Loader2 className="animate-spin" size={24} /> : <>GUARDAR CLAVE <Key size={20}/></>}
                        </button>
                    </form>
                )}
                
                <p className="text-center text-[10px] text-slate-400 mt-8 font-medium">SESIÓN VALIDADA POR TOKEN DE SEGURIDAD</p>
            </div>
        </div>
    );
};

const ProtectedRoute = ({ children, requireAdmin = false, requireSuperAdmin = false }: { children?: React.ReactNode, requireAdmin?: boolean, requireSuperAdmin?: boolean }) => {
  const { user, loading, role, recoveryMode } = useAuth();
  const { clubData } = useHistory();
  const location = useLocation();

  if (loading) return null; 
  if (!user) return <Navigate to="/" replace />;
  
  if (role === 'pending' && location.pathname !== '/pending') return <Navigate to="/pending" replace />;
  if (requireSuperAdmin && role !== 'superadmin') return <Navigate to="/dashboard" replace />;
  if (requireAdmin && role !== 'admin' && role !== 'superadmin') return <Navigate to="/p/dashboard" replace />;
  if (requireAdmin && clubData.name === 'Mi Club de Padel' && location.pathname !== '/onboarding' && role !== 'superadmin') return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, role, loading, authStatus, authLogs, signOut } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname.includes('/auth');

  if (loading && !isAuthPage) {
    if (!IS_DEV_ENV) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-xl shadow-indigo-100 flex items-center justify-center mb-8 animate-bounce">
                    <Trophy size={40} className="text-[#575AF9]" />
                </div>
                <div className="flex items-center gap-3 text-slate-400 font-bold text-sm tracking-widest uppercase">
                    <Loader2 size={18} className="animate-spin text-[#575AF9]"/> Iniciando Sistema
                </div>
            </div>
        );
    }

    return (
      <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-6 font-mono overflow-hidden">
        <div className="w-full max-w-md space-y-8">
            <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-6">
                    <Activity size={12} className="animate-pulse"/> Kernel Monitor v2.6
                </div>
                <h1 className="text-white font-black text-2xl tracking-tighter italic uppercase">SISTEMA DE <span className="text-indigo-500">GESTIÓN</span></h1>
            </div>

            <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 shadow-2xl relative">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-white/20 text-[9px] font-bold uppercase ml-2 tracking-widest">Logs de Identidad</span>
                    </div>
                </div>
                
                <div className="space-y-1.5 h-64 overflow-y-auto no-scrollbar text-[11px] leading-relaxed">
                    {authLogs.map((log, i) => {
                        const isError = log.includes('!!!') || log.includes('ERROR');
                        const isSuccess = log.includes('OK') || log.includes('DETECTADO');
                        return (
                            <div key={i} className={`${isError ? 'text-rose-400 bg-rose-400/5' : isSuccess ? 'text-emerald-400' : 'text-slate-400'} px-2 py-1 rounded`}>
                                {log}
                            </div>
                        );
                    })}
                    <div className="text-indigo-500 animate-pulse px-2">_ ANALIZANDO_DB...</div>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex gap-2">
                    <button onClick={() => window.location.reload()} className="flex-1 py-3 bg-white text-black rounded-xl font-black text-[10px] flex items-center justify-center gap-2 hover:bg-slate-100 transition-all active:scale-95">
                        <RefreshCw size={12}/> REINTENTAR
                    </button>
                    <button onClick={() => signOut()} className="flex-1 py-3 bg-white/5 text-white border border-white/10 rounded-xl font-black text-[10px] flex items-center justify-center gap-2">
                        <ShieldAlert size={12}/> CERRAR SESIÓN
                    </button>
                </div>
            </div>
            <p className="text-white/20 text-center text-[9px] font-bold uppercase tracking-[0.3em]">{authStatus}</p>
        </div>
      </div>
    );
  }

  const getHomeRoute = () => {
      if (!user) return <Landing />;
      if (role === 'superadmin') return <Navigate to="/superadmin" replace />;
      if (role === 'admin') return <Navigate to="/dashboard" replace />;
      if (role === 'pending') return <Navigate to="/pending" replace />;
      return <Navigate to="/p/dashboard" replace />;
  };

  return (
    <>
        <RecoveryModal />
        <Routes>
            <Route path="/" element={getHomeRoute()} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/pending" element={<ProtectedRoute><PendingVerification /></ProtectedRoute>} />
            <Route path="/join/:clubId" element={<JoinTournament />} />
            <Route path="/onboarding" element={<ProtectedRoute requireAdmin><Onboarding /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/notifications/settings" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />

            <Route path="/p/*" element={
                <ProtectedRoute>
                    <PlayerLayout>
                        <Routes>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<PlayerDashboard />} />
                            <Route path="explore" element={<TournamentBrowser />} />
                            <Route path="tournaments" element={<PlayerTournaments />} />
                            <Route path="profile" element={<PlayerAppProfile />} />
                            <Route path="*" element={<Navigate to="dashboard" replace />} />
                        </Routes>
                    </PlayerLayout>
                </ProtectedRoute>
            } />

            <Route path="/superadmin" element={
                <Layout>
                    <ProtectedRoute requireSuperAdmin>
                        <SuperAdmin />
                    </ProtectedRoute>
                </Layout>
            } />

            <Route path="/*" element={
                <Layout>
                    <Routes>
                        <Route path="/dashboard" element={<ProtectedRoute requireAdmin><Dashboard /></ProtectedRoute>} />
                        <Route path="/setup" element={<ProtectedRoute requireAdmin><TournamentSetup /></ProtectedRoute>} />
                        <Route path="/registration" element={<ProtectedRoute requireAdmin><Registration /></ProtectedRoute>} />
                        <Route path="/checkin" element={<ProtectedRoute requireAdmin><CheckIn /></ProtectedRoute>} />
                        <Route path="/active" element={<ProtectedRoute requireAdmin><ActiveTournament /></ProtectedRoute>} />
                        <Route path="/results" element={<ProtectedRoute requireAdmin><Results /></ProtectedRoute>} />
                        <Route path="/league" element={<ProtectedRoute requireAdmin><LeagueDashboard /></ProtectedRoute>} />
                        <Route path="/league/setup" element={<ProtectedRoute requireAdmin><LeagueSetup /></ProtectedRoute>} />
                        <Route path="/league/groups/:categoryId" element={<ProtectedRoute requireAdmin><LeagueGroups /></ProtectedRoute>} />
                        <Route path="/league/active" element={<ProtectedRoute requireAdmin><LeagueActive /></ProtectedRoute>} />
                        <Route path="/players" element={<ProtectedRoute requireAdmin><PlayerManager /></ProtectedRoute>} />
                        <Route path="/players/:playerId" element={<ProtectedRoute requireAdmin><AdminPlayerProfile /></ProtectedRoute>} />
                        <Route path="/history" element={<ProtectedRoute requireAdmin><History /></ProtectedRoute>} />
                        <Route path="/club" element={<ProtectedRoute requireAdmin><ClubProfile /></ProtectedRoute>} />
                        <Route path="/help" element={<ProtectedRoute requireAdmin><Help /></ProtectedRoute>} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </Layout>
            } />
        </Routes>
    </>
  );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HistoryProvider>
        <NotificationProvider>
            <TournamentProvider>
                <LeagueProvider>
                    <TimerProvider>
                        <HashRouter>
                        <AppRoutes />
                        </HashRouter>
                    </TimerProvider>
                </LeagueProvider>
            </TournamentProvider>
        </NotificationProvider>
      </HistoryProvider>
    </AuthProvider>
  );
};

export default App;