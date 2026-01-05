import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Lógica de detección de roles mejorada y blindada
  const checkUserRole = useCallback(async (uid: string, userEmail?: string): Promise<UserRole> => {
      if (!uid) return null;
      console.log(`[Auth] Verificando rol para: ${userEmail || uid}`);

      // 1. SuperAdmin (Hardcoded para seguridad o DB)
      if (userEmail === 'antoniorme@gmail.com') return 'superadmin';
      try {
          const { data: saData } = await supabase.from('superadmins').select('id').eq('email', userEmail).maybeSingle();
          if (saData) return 'superadmin';
      } catch (e) {}

      try {
          // 2. Comprobación Directa: ¿Es dueño de un club con su ID actual?
          const { data: clubData } = await supabase.from('clubs').select('id').eq('owner_id', uid).maybeSingle();
          if (clubData) {
              console.log("[Auth] Rol detectado: Admin (Dueño de Club)");
              return 'admin';
          }

          // 3. Comprobación de Perfil de Jugador: ¿Tiene categoría 'Admin'?
          const { data: playerData } = await supabase
            .from('players')
            .select('id, categories, user_id')
            .eq('user_id', uid)
            .maybeSingle();
            
          if (playerData?.categories && Array.isArray(playerData.categories)) {
              if (playerData.categories.includes('Admin')) return 'admin';
          }

          // 4. LÓGICA DE RECUPERACIÓN (SELF-HEALING)
          // Si el usuario acaba de loguearse tras un reset de contraseña, su UUID de Auth es NUEVO.
          // Buscamos su rastro por EMAIL en la tabla de jugadores.
          if (userEmail) {
              const { data: playersByEmail } = await supabase
                  .from('players')
                  .select('id, user_id, categories')
                  .eq('email', userEmail);
              
              if (playersByEmail && playersByEmail.length > 0) {
                  // Tomamos el primer jugador encontrado con este email
                  const oldPlayerRecord = playersByEmail[0];
                  const oldUserId = oldPlayerRecord.user_id;

                  // Si el ID guardado en la tabla NO coincide con el ID actual de la sesión...
                  if (oldUserId && oldUserId !== uid) {
                      console.log(`[Auth] Detectado cambio de ID (Recuperación). Antiguo: ${oldUserId} -> Nuevo: ${uid}`);
                      
                      // CRÍTICO: Verificamos si el ID ANTIGUO era dueño de un club
                      const { data: oldClubData } = await supabase.from('clubs').select('id').eq('owner_id', oldUserId).maybeSingle();
                      
                      const isAdminByCat = oldPlayerRecord.categories && Array.isArray(oldPlayerRecord.categories) && oldPlayerRecord.categories.includes('Admin');
                      const isOwnerByOldId = !!oldClubData;

                      if (isOwnerByOldId || isAdminByCat) {
                          console.log("[Auth] Ejecutando migración de datos al nuevo usuario...");
                          
                          // Ejecutar actualizaciones en paralelo
                          await Promise.all([
                              // 1. Actualizar el dueño del club
                              isOwnerByOldId ? supabase.from('clubs').update({ owner_id: uid }).eq('owner_id', oldUserId) : Promise.resolve(),
                              // 2. Actualizar el perfil del jugador
                              supabase.from('players').update({ user_id: uid }).eq('id', oldPlayerRecord.id),
                              // 3. Actualizar torneos
                              supabase.from('tournaments').update({ user_id: uid }).eq('user_id', oldUserId),
                              // 4. Actualizar ligas
                              supabase.from('leagues').update({ club_id: uid }).eq('club_id', oldUserId)
                          ]);
                          
                          return 'admin';
                      }
                  }
              }
          }
      } catch (e) {
          console.error("[Auth] Error verificando rol:", e);
      }

      // Default
      return 'player';
  }, []);

  useEffect(() => {
    let mounted = true;

    // Función de inicio secuencial estricto
    const initAuth = async () => {
        try {
            // Paso 1: Obtener sesión
            const { data: { session: initialSession } } = await supabase.auth.getSession();
            
            if (mounted) {
                if (initialSession) {
                    setSession(initialSession);
                    setUser(initialSession.user);
                    // Paso 2: Determinar rol (esperar a que termine)
                    const detectedRole = await checkUserRole(initialSession.user.id, initialSession.user.email);
                    if (mounted) setRole(detectedRole);
                } else {
                    setSession(null);
                    setUser(null);
                    setRole(null);
                }
            }
        } catch (error) {
            console.error("Auth init error:", error);
        } finally {
            // Paso 3: Quitar pantalla de carga SIEMPRE
            if (mounted) setLoading(false);
        }
    };

    initAuth();

    // Escuchar cambios (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (!mounted) return;
        
        console.log(`[Auth] Evento: ${event}`);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
             setSession(currentSession);
             setUser(currentSession?.user ?? null);
             if (currentSession) {
                 const r = await checkUserRole(currentSession.user.id, currentSession.user.email);
                 if (mounted) setRole(r);
             }
             if (mounted) setLoading(false);
        } 
        else if (event === 'SIGNED_OUT') {
             setSession(null);
             setUser(null);
             setRole(null);
             setLoading(false);
        }
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, [checkUserRole]);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    window.location.reload(); // Hard reload para limpiar estados
  };

  const loginWithDevBypass = (role: 'admin' | 'player' | 'superadmin') => {
      setIsOfflineMode(true);
      const devUser = { id: `dev-${role}`, email: `${role}@sandbox.test` } as User;
      setUser(devUser);
      setSession({ user: devUser, access_token: 'mock' } as Session);
      setRole(role);
      setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ 
        session, user, loading, role, signOut, 
        isOfflineMode, checkUserRole, loginWithDevBypass
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);