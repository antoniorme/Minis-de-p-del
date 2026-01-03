
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
import { ShieldAlert, RefreshCw } from 'lucide-react';

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

const ProtectedRoute = ({ children, requireAdmin = false, requireSuperAdmin = false }: { children?: React.ReactNode, requireAdmin?: boolean, requireSuperAdmin?: boolean }) => {
  const { user, loading, role } = useAuth();
  const { clubData } = useHistory();
  const location = useLocation();

  if (loading) return null; // El componente padre maneja el loading
  if (!user) return <Navigate to="/" replace />;
  
  if (role === 'pending' && location.pathname !== '/pending') return <Navigate to="/pending" replace />;
  if (requireSuperAdmin && role !== 'superadmin') return <Navigate to="/dashboard" replace />;
  if (requireAdmin && role !== 'admin' && role !== 'superadmin') return <Navigate to="/p/dashboard" replace />;
  if (requireAdmin && clubData.name === 'Mi Club de Padel' && location.pathname !== '/onboarding' && role !== 'superadmin') return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, role, loading, authStatus } = useAuth();
  const location = useLocation();
  const [showForceButton, setShowForceButton] = useState(false);

  useEffect(() => {
      const timer = setTimeout(() => {
          if (loading) setShowForceButton(true);
      }, 5000);
      return () => clearTimeout(timer);
  }, [loading]);

  const isAuthPage = location.pathname.includes('/auth');

  if (loading && !isAuthPage) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-10 text-center font-sans">
        <div className="relative mb-8">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-indigo-500/10 rounded-full animate-pulse"></div>
            </div>
        </div>
        
        <h2 className="text-white font-black text-xl mb-2 tracking-tight uppercase">PadelPro</h2>
        <p className="text-indigo-400 font-bold text-xs uppercase tracking-[0.2em] mb-8 animate-pulse">
            {authStatus}
        </p>

        {showForceButton && (
            <div className="mt-4 animate-slide-up space-y-4 max-w-xs">
                <div className="bg-rose-900/20 border border-rose-500/30 p-4 rounded-2xl flex items-start gap-3 text-left">
                    <ShieldAlert className="text-rose-500 shrink-0" size={20}/>
                    <p className="text-[10px] text-rose-200 leading-relaxed font-medium">
                        La conexión está tardando más de lo esperado. Puede ser debido a tu red o a los servidores de Supabase.
                    </p>
                </div>
                <button 
                    onClick={() => window.location.reload()}
                    className="w-full py-3 bg-white text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-100 transition-all active:scale-95"
                >
                    <RefreshCw size={14}/> REINTENTAR CONEXIÓN
                </button>
            </div>
        )}
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
