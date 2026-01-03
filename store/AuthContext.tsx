
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type UserRole = 'admin' | 'player' | 'superadmin' | 'pending' | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  role: UserRole;
  authStatus: string;
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
      setAuthStatus(`Buscando permisos para: ${userEmail || 'UID ' + uid.substring(0,5)}...`);
      
      if (userEmail === 'antoniorme@gmail.com') {
          setAuthStatus("Rol detectado: SUPERADMIN");
          return 'superadmin';
      }
      
      // @ts-ignore
      if (supabase.supabaseUrl.includes('placeholder')) return 'admin';

      try {
          // 1. Prioridad: ¿Es SuperAdmin en la tabla?
          const { data: saData } = await supabase.from('superadmins').select('id').eq('email', userEmail).maybeSingle();
          if (saData) {
              setAuthStatus("Rol detectado: SUPERADMIN (Tabla)");
              return 'superadmin';
          }

          // 2. ¿Es dueño de un Club? (Administrador)
          // Hacemos una búsqueda limpia por owner_id
          const { data: clubData, error: clubError } = await supabase
              .from('clubs')
              .select('id, name')
              .eq('owner_id', uid)
              .maybeSingle();
          
          if (clubData) {
              setAuthStatus(`Rol detectado: ADMIN de ${clubData.name}`);
              return 'admin';
          }

          if (clubError) {
              console.error("Error buscando club:", clubError);
              setAuthStatus(`Error DB: ${clubError.message}`);
          }

          // 3. Fallback a Jugador
          setAuthStatus("No se encontró club. Asignando rol: JUGADOR");
          return 'player';
      } catch (e: any) {
          console.error("Excepción en checkUserRole:", e);
          setAuthStatus(`Error crítico: ${e.message || 'Desconocido'}`);
          return 'player';
      }
  }, []);

  useEffect(() => {
    // Aumentamos el timeout de seguridad a 12 segundos para dar tiempo a la DB
    timeoutRef.current = setTimeout(() => {
        if (loading) {
            console.warn("Safety timeout reached.");
            setAuthStatus("La base de datos no responde. Comprueba tu conexión.");
            setLoading(false);
        }
    }, 12000);

    const initSession = async () => {
        setAuthStatus("Verificando sesión...");
        try {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (currentSession) {
                setSession(currentSession);
                setUser(currentSession.user);
                const r = await checkUserRole(currentSession.user.id, currentSession.user.email);
                setRole(r);
            } else {
                setAuthStatus("Sin sesión activa");
            }
        } catch (error) {
            setAuthStatus("Error al recuperar sesión");
        } finally {
            setLoading(false);
        }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setAuthStatus(`Cambio de estado: ${event}`);
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
