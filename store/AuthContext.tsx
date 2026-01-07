
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type UserRole = 'admin' | 'player' | 'superadmin' | 'pending' | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  role: UserRole;
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
  signOut: async () => {},
  isOfflineMode: false,
  checkUserRole: async () => 'player',
  loginWithDevBypass: () => {},
});

// Lista blanca para acceso de emergencia a SuperAdmin/Admin si falla la DB
const HARDCODED_ADMINS = ['admin@padelpro.local', 'antoniorme@gmail.com'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Función crítica optimizada: Determina el rol
  const checkUserRole = async (uid: string, userEmail?: string): Promise<UserRole> => {
      console.groupCollapsed(`[Auth] CheckRole ${userEmail || uid}`);
      
      // 1. Acceso de Emergencia (Instantáneo)
      if (userEmail && HARDCODED_ADMINS.includes(userEmail)) {
          console.log("⚠️ Lista blanca.");
          console.groupEnd();
          if (userEmail === 'antoniorme@gmail.com') return 'superadmin';
          return 'admin';
      }

      // 2. Comprobación en paralelo para velocidad
      try {
          const clubPromise = supabase
              .from('clubs')
              .select('id')
              .eq('owner_id', uid)
              .maybeSingle();

          const superPromise = supabase
              .from('superadmins')
              .select('id')
              .eq('email', userEmail)
              .maybeSingle();

          // Ejecutamos ambas consultas a la vez
          const [clubRes, superRes] = await Promise.all([clubPromise, superPromise]);

          if (superRes.data) {
              console.log("✅ Rol: SUPERADMIN");
              console.groupEnd();
              return 'superadmin';
          }

          if (clubRes.data) {
              console.log("✅ Rol: ADMIN (Club detectado)");
              console.groupEnd();
              return 'admin';
          }

          // Si no es club ni superadmin, miramos si es jugador
          const { data: playerData } = await supabase
              .from('players')
              .select('id')
              .eq('user_id', uid)
              .maybeSingle();

          if (playerData) {
              console.log("✅ Rol: PLAYER");
              console.groupEnd();
              return 'player';
          }

      } catch (e) {
          console.error("Error verificando rol:", e);
      }

      console.log("❓ Rol: PENDING");
      console.groupEnd();
      return 'pending';
  };

  const loginWithDevBypass = (targetRole: 'admin' | 'player' | 'superadmin') => {
      setIsOfflineMode(true);
      const devUser = {
          id: targetRole === 'admin' ? 'dev-admin-id' : targetRole === 'superadmin' ? 'dev-super-id' : 'dev-player-id',
          email: targetRole === 'superadmin' ? 'antoniorme@gmail.com' : targetRole === 'admin' ? 'admin@padelpro.local' : 'player@padelpro.local',
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {}
      } as User;
      
      setUser(devUser);
      setSession({ user: devUser, access_token: 'mock-token' } as Session);
      setRole(targetRole);
      setLoading(false);
      sessionStorage.setItem('padelpro_dev_mode', 'true');
  };

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
        // TIMEOUT DE SEGURIDAD (Reducido a 3s para mejor UX)
        const safetyTimer = setTimeout(() => {
            if (mounted && loading) {
                console.warn("[Auth] Timeout: Forzando carga.");
                setLoading(false);
            }
        }, 3000);

        // Check Offline Mode
        // @ts-ignore
        if ((supabase as any).supabaseUrl === 'https://placeholder.supabase.co' || sessionStorage.getItem('padelpro_dev_mode') === 'true') {
             if(mounted) {
                 setIsOfflineMode(true);
                 setLoading(false);
             }
             clearTimeout(safetyTimer);
             return;
        }

        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) throw error;
            
            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);
                
                if (session?.user) {
                    const r = await checkUserRole(session.user.id, session.user.email);
                    if (mounted) setRole(r);
                }
            }
        } catch (error) {
            console.error("[Auth] Error inicial:", error);
            if(mounted) {
                setSession(null);
                setUser(null);
                setRole(null);
            }
        } finally {
            if (mounted) setLoading(false);
            clearTimeout(safetyTimer);
        }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isOfflineMode && mounted) {
          setSession(session);
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          
          if (currentUser && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
              setLoading(true);
              const r = await checkUserRole(currentUser.id, currentUser.email);
              if (mounted) {
                  setRole(r);
                  setLoading(false);
              }
          } else if (!currentUser) {
              setRole(null);
          }
      }
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, [isOfflineMode]);

  const signOut = async () => {
    if (isOfflineMode) {
        sessionStorage.removeItem('padelpro_dev_mode');
        window.location.reload();
        return;
    } 
    
    try {
        await supabase.auth.signOut();
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    } finally {
        setUser(null);
        setSession(null);
        setRole(null);
        localStorage.removeItem('padel_sim_player_id');
        setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, role, signOut, isOfflineMode, checkUserRole, loginWithDevBypass }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
