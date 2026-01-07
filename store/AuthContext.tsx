
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

  // Función crítica: Determina el rol basándose ESTRICTAMENTE en la base de datos
  const checkUserRole = async (uid: string, userEmail?: string): Promise<UserRole> => {
      console.group(`[Auth] Verificando rol para: ${userEmail || uid}`);
      console.log("UID:", uid);

      // 1. Acceso de Emergencia (Hardcoded)
      if (userEmail && HARDCODED_ADMINS.includes(userEmail)) {
          console.log("⚠️ Usuario en lista blanca. Asignando rol privilegiado.");
          console.groupEnd();
          if (userEmail === 'antoniorme@gmail.com') return 'superadmin';
          return 'admin';
      }

      // 2. Comprobar si es SUPERADMIN en DB
      try {
          const { data: saData } = await supabase
              .from('superadmins')
              .select('id')
              .eq('email', userEmail)
              .maybeSingle();
          
          if (saData) {
              console.log("✅ Rol detectado: SUPERADMIN");
              console.groupEnd();
              return 'superadmin';
          }
      } catch (e) { console.warn("Check Superadmin falló", e); }

      // 3. Comprobar si es CLUB (ADMIN)
      try {
          // Usamos select('*') para evitar problemas de permisos a nivel de columna
          const { data: clubData, error } = await supabase
              .from('clubs')
              .select('*') 
              .eq('owner_id', uid)
              .maybeSingle();

          if (error) {
              console.error("❌ Error DB consultando tabla 'clubs':", error.message, error.details);
          } else {
              if (clubData) {
                  console.log(`✅ Rol detectado: ADMIN. Club encontrado: "${clubData.name}" (ID: ${clubData.id})`);
                  console.groupEnd();
                  return 'admin';
              } else {
                  console.warn(`⚠️ No se encontró ningún club donde owner_id = ${uid}.`);
                  console.log("Esto significa que el usuario logueado NO coincide con el dueño de ningún club en la DB.");
              }
          }
      } catch (e) { console.error("Excepción verificando club:", e); }

      // 4. Comprobar si es JUGADOR (PLAYER)
      try {
          const { data: playerData, error: playerError } = await supabase
              .from('players')
              .select('id')
              .eq('user_id', uid)
              .maybeSingle();
          
          if (playerData) {
              console.log("✅ Rol detectado: PLAYER (Ficha de jugador encontrada)");
              console.groupEnd();
              return 'player';
          } else if (playerError) {
              console.error("Error consultando players:", playerError);
          }
      } catch (e) { console.error("Excepción verificando player:", e); }

      // 5. Si no es nada
      console.log("❓ No se encontró rol. Asignando: PENDING");
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
        // TIMEOUT DE SEGURIDAD
        const safetyTimer = setTimeout(() => {
            if (mounted && loading) {
                console.warn("[Auth] Timeout: Forzando fin de carga por demora en respuesta.");
                setLoading(false);
            }
        }, 5000); // Aumentado a 5s para dar tiempo al debug

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
                    setRole(r);
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
      console.log(`[Auth] Evento: ${event}`);
      if (!isOfflineMode && mounted) {
          setSession(session);
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          
          if (currentUser) {
              if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                  setLoading(true);
                  const r = await checkUserRole(currentUser.id, currentUser.email);
                  setRole(r);
                  setLoading(false);
              }
          } else {
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
