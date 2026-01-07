
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
  checkUserRole: async () => null,
  loginWithDevBypass: () => {},
});

const ROLE_STORAGE_KEY = 'padelpro_user_role';
const HARDCODED_ADMINS = ['admin@padelpro.local', 'antoniorme@gmail.com'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Inicializar rol desde caché para velocidad inmediata
  const [role, setRoleState] = useState<UserRole>(() => {
      const cached = localStorage.getItem(ROLE_STORAGE_KEY);
      return (cached as UserRole) || null;
  });

  const setRole = (r: UserRole) => {
      setRoleState(r);
      if (r) localStorage.setItem(ROLE_STORAGE_KEY, r);
      else localStorage.removeItem(ROLE_STORAGE_KEY);
  };

  const checkUserRole = async (uid: string, userEmail?: string): Promise<UserRole> => {
      console.groupCollapsed(`[Auth] CheckRole Realtime: ${userEmail || uid}`);
      
      if (userEmail && HARDCODED_ADMINS.includes(userEmail)) {
          console.groupEnd();
          if (userEmail === 'antoniorme@gmail.com') return 'superadmin';
          return 'admin';
      }

      try {
          // Consultas directas a DB (Sin timeouts artificiales)
          // 1. SuperAdmin
          const { data: superAdmin } = await supabase.from('superadmins').select('id').eq('email', userEmail).maybeSingle();
          if (superAdmin) { console.groupEnd(); return 'superadmin'; }

          // 2. Club Owner
          const { data: club } = await supabase.from('clubs').select('id').eq('owner_id', uid).maybeSingle();
          if (club) { console.groupEnd(); return 'admin'; }

          // 3. Greedy Admin
          const [p, t] = await Promise.all([
              supabase.from('players').select('id').eq('user_id', uid).limit(1).maybeSingle(),
              supabase.from('tournaments').select('id').eq('user_id', uid).limit(1).maybeSingle()
          ]);
          if (p.data || t.data) { console.groupEnd(); return 'admin'; }

          // 4. Player
          const { data: playerProfile } = await supabase.from('players').select('id').eq('profile_user_id', uid).maybeSingle();
          if (playerProfile) { console.groupEnd(); return 'player'; }

          if (userEmail) {
              const { data: emailMatch } = await supabase.from('players').select('id').eq('email', userEmail).is('profile_user_id', null).maybeSingle();
              if (emailMatch) { console.groupEnd(); return 'player'; }
          }

      } catch (e) {
          console.error("Error verificando rol:", e);
      }

      console.warn("⛔ Rol no encontrado en DB");
      console.groupEnd();
      return null;
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
        // Check Offline Mode
        // @ts-ignore
        if ((supabase as any).supabaseUrl === 'https://placeholder.supabase.co' || sessionStorage.getItem('padelpro_dev_mode') === 'true') {
             if(mounted) { setIsOfflineMode(true); setLoading(false); }
             return;
        }

        try {
            // 1. Obtener Sesión (Rápido, local)
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            
            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);
                
                // ESTRATEGIA: Carga Optimista
                // Si tenemos un rol en caché, dejamos pasar al usuario INMEDIATAMENTE (loading = false).
                // Si no, esperamos a la DB.
                const hasCachedRole = !!role; 
                if (hasCachedRole) {
                    console.log("[Auth] Usando rol en caché para acceso inmediato.");
                    setLoading(false); 
                }

                if (session?.user) {
                    // 2. Verificación en Segundo Plano (Siempre se ejecuta)
                    // Esto asegura que la DB sea la fuente de la verdad final.
                    checkUserRole(session.user.id, session.user.email).then(serverRole => {
                        if (mounted) {
                            // Solo actualizamos si ha cambiado o si no teníamos caché
                            if (serverRole !== role) {
                                console.log("[Auth] Actualizando rol desde DB:", serverRole);
                                setRole(serverRole);
                            }
                            // Si no teníamos caché, ahora quitamos el loading
                            if (!hasCachedRole) setLoading(false);
                        }
                    });
                } else {
                    setRole(null);
                    setLoading(false);
                }
            }
        } catch (error) {
            console.error("[Auth] Error inicial:", error);
            if(mounted) {
                setSession(null);
                setUser(null);
                setRole(null);
                setLoading(false);
            }
        }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isOfflineMode && mounted) {
          setSession(session);
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          
          if (currentUser && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
              // Misma estrategia para cambios de auth
              checkUserRole(currentUser.id, currentUser.email).then(r => {
                  if (mounted) {
                      setRole(r);
                      setLoading(false);
                  }
              });
          } else if (!currentUser) {
              setRole(null);
              // No forzamos loading false aquí para evitar parpadeos en logout
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
        localStorage.removeItem(ROLE_STORAGE_KEY);
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
