
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type UserRole = 'admin' | 'player' | 'superadmin' | 'pending' | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  role: UserRole;
  authStatus: string; // Nuevo: mensaje descriptivo del estado
  signOut: () => Promise<void>;
  isOfflineMode: boolean;
  checkUserRole: (uid: string, email?: string) => Promise<UserRole>;
  loginWithDevBypass: (role: 'admin' | 'player' | 'superadmin') => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  role: null,
  authStatus: 'Iniciando...',
  signOut: async () => {},
  isOfflineMode: false,
  checkUserRole: async () => 'player',
  loginWithDevBypass: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState('Esperando conexión...');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const timeoutRef = useRef<any>(null);

  const checkUserRole = useCallback(async (uid: string, userEmail?: string): Promise<UserRole> => {
      if (!uid) return null;
      setAuthStatus(`Verificando permisos para ${userEmail || 'usuario'}...`);
      
      if (userEmail === 'antoniorme@gmail.com') return 'superadmin';
      
      // @ts-ignore
      if (supabase.supabaseUrl.includes('placeholder')) return 'admin';

      try {
          // Timeout interno para la base de datos (3 segundos)
          const dbPromise = (async () => {
              const { data: saData } = await supabase.from('superadmins').select('id').eq('email', userEmail).maybeSingle();
              if (saData) return 'superadmin';

              const { data: clubData } = await supabase.from('clubs').select('id').eq('owner_id', uid).maybeSingle();
              if (clubData) return 'admin';

              return 'player';
          })();

          const timeoutPromise = new Promise<UserRole>((resolve) => 
              setTimeout(() => resolve('player'), 3500)
          );

          return await Promise.race([dbPromise, timeoutPromise]);
      } catch (e) {
          console.error("Role check failed", e);
          return 'player';
      }
  }, []);

  useEffect(() => {
    // Seguridad: Si en 8 segundos no hemos quitado el loading, lo quitamos por la fuerza
    timeoutRef.current = setTimeout(() => {
        if (loading) {
            console.warn("Safety timeout reached. Forcing app load.");
            setAuthStatus("Carga lenta detectada, forzando entrada...");
            setLoading(false);
        }
    }, 8000);

    const initSession = async () => {
        setAuthStatus("Buscando sesión activa...");
        const url = window.location.href;
        
        if (url.includes('access_token=')) {
            setAuthStatus("Procesando token de acceso...");
            try {
                const parts = url.split('#');
                const tokenPart = parts.find(p => p.includes('access_token='));
                if (tokenPart) {
                    const params = new URLSearchParams(tokenPart.startsWith('/') ? tokenPart.split('?')[1] : tokenPart);
                    const access_token = params.get('access_token');
                    if (access_token) {
                        const { data } = await supabase.auth.setSession({ access_token, refresh_token: '' });
                        if (data.session) {
                            setSession(data.session);
                            setUser(data.session.user);
                            const r = await checkUserRole(data.session.user.id, data.session.user.email);
                            setRole(r);
                        }
                    }
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
            return;
        }

        try {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (currentSession) {
                setSession(currentSession);
                setUser(currentSession.user);
                const r = await checkUserRole(currentSession.user.id, currentSession.user.email);
                setRole(r);
            }
        } catch (error) {
            console.warn("Auth init error", error);
        } finally {
            setAuthStatus("Listo");
            setLoading(false);
        }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setAuthStatus(`Evento detectado: ${event}`);
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
          const r = await checkUserRole(currentUser.id, currentUser.email);
          setRole(r);
      } else {
          setRole(null);
      }
      setLoading(false);
    });

    return () => {
        subscription.unsubscribe();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [checkUserRole]);

  const signOut = async () => {
    setLoading(true);
    try {
        await supabase.auth.signOut();
    } finally {
        setUser(null); setSession(null); setRole(null);
        localStorage.removeItem('padel_sim_player_id');
        setLoading(false);
    }
  };

  const loginWithDevBypass = (targetRole: 'admin' | 'player' | 'superadmin') => {
      setIsOfflineMode(true);
      const devUser = { id: `dev-${targetRole}`, email: `${targetRole}@local.test` } as User;
      setUser(devUser);
      setSession({ user: devUser, access_token: 'mock' } as Session);
      setRole(targetRole);
      setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, role, authStatus, signOut, isOfflineMode, checkUserRole, loginWithDevBypass }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
