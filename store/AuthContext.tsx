
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
  authLogs: string[];
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
  authLogs: [],
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
  const [authStatus, setAuthStatus] = useState('Monitor de Sistema Activo');
  const [authLogs, setAuthLogs] = useState<string[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const addLog = (msg: string) => {
      console.log(`[SYS-DIAG] ${msg}`);
      setAuthLogs(prev => [...prev.slice(-15), `${new Date().toLocaleTimeString().split(' ')[0]} > ${msg}`]);
  };

  const checkUserRole = useCallback(async (uid: string, userEmail?: string): Promise<UserRole> => {
      if (!uid) {
          addLog("!!! ERROR: UID inexistente en la sesión");
          return null;
      }
      
      addLog(`PASO 1: Verificando identidad [${uid.substring(0,8)}...]`);
      
      if (userEmail === 'antoniorme@gmail.com') {
          addLog("PASO 1.1: Identificado como SuperAdmin (Hardcoded)");
          return 'superadmin';
      }
      
      try {
          // --- CHEQUEO CLUB ---
          addLog("PASO 2: Consultando tabla 'clubs'...");
          const clubQuery = supabase.from('clubs').select('id, name, owner_id').eq('owner_id', uid).maybeSingle();
          
          // Timeout para el diagnóstico
          const clubResult: any = await Promise.race([
              clubQuery,
              new Promise((_, r) => setTimeout(() => r(new Error("TIMEOUT_CLUBS_DB")), 4000))
          ]);

          if (clubResult.error) {
              addLog(`!!! ERROR DB CLUBS: ${clubResult.error.code} - ${clubResult.error.message}`);
          } else if (clubResult.data) {
              addLog(`OK: Dueño del club '${clubResult.data.name}' detectado`);
              return 'admin';
          } else {
              addLog("INFO: No eres dueño de ningún club en tabla 'clubs'");
          }

          // --- CHEQUEO SUPERADMIN ---
          addLog("PASO 3: Consultando tabla 'superadmins'...");
          const saQuery = supabase.from('superadmins').select('id, email').eq('email', userEmail).maybeSingle();
          
          const saResult: any = await Promise.race([
              saQuery,
              new Promise((_, r) => setTimeout(() => r(new Error("TIMEOUT_SA_DB")), 4000))
          ]);

          if (saResult.error) {
              addLog(`!!! ERROR DB SA: ${saResult.error.code} - ${saResult.error.message}`);
          } else if (saResult.data) {
              addLog("OK: Rol SuperAdmin confirmado en DB");
              return 'superadmin';
          } else {
              addLog("INFO: No eres SuperAdmin registrado");
          }

          // --- CHEQUEO JUGADOR ---
          addLog("PASO 4: Buscando ficha de jugador vinculada...");
          const { data: playerData, error: playerError } = await supabase.from('players').select('id').eq('profile_user_id', uid).maybeSingle();
          
          if (playerError) {
              addLog(`!!! ERROR DB PLAYERS: ${playerError.message}`);
          } else if (playerData) {
              addLog(`OK: Ficha de jugador encontrada [ID: ${playerData.id}]`);
              return 'player';
          } else {
              addLog("AVISO: No tienes club ni ficha de jugador. Acceso limitado.");
          }

          return 'player';
      } catch (e: any) {
          addLog(`!!! EXCEPCIÓN CRÍTICA: ${e.message}`);
          setAuthStatus(`Fallo de conexión: ${e.message}`);
          return null; 
      }
  }, []);

  useEffect(() => {
    const initSession = async () => {
        addLog("Iniciando conexión con Supabase Auth...");
        try {
            const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
                addLog(`!!! ERROR SESIÓN: ${sessionError.message}`);
                setLoading(false);
                return;
            }

            if (currentSession) {
                setSession(currentSession);
                setUser(currentSession.user);
                addLog(`Sesión recuperada para: ${currentSession.user.email}`);
                const r = await checkUserRole(currentSession.user.id, currentSession.user.email);
                if (r) {
                    setRole(r);
                    addLog("PASO FINAL: Permisos validados. Iniciando interfaz...");
                    // Solo quitamos el loading si tenemos un rol claro
                    setLoading(false);
                } else {
                    addLog("!!! BLOQUEO: No se pudo determinar el rol del usuario.");
                    setAuthStatus("Error de Permisos: Consulta los logs.");
                    // No ponemos loading(false) para que veas el error
                }
            } else {
                addLog("No hay sesión activa. Esperando Login.");
                setLoading(false);
            }
        } catch (error: any) {
            addLog(`!!! ERROR INICIO: ${error.message}`);
            setLoading(false);
        }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      addLog(`EVENTO AUTH: ${event}`);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          if (session?.user) {
              setUser(session.user);
              const r = await checkUserRole(session.user.id, session.user.email);
              setRole(r);
              setLoading(false);
          }
      }
      if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setRole(null);
          setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkUserRole]);

  const signOut = async () => {
    setLoading(true);
    addLog("Cerrando sesión...");
    await supabase.auth.signOut();
    window.location.reload();
  };

  const loginWithDevBypass = (targetRole: 'admin' | 'player' | 'superadmin') => {
      addLog(`BYPASS ACTIVADO: Rol forzado -> ${targetRole}`);
      setIsOfflineMode(true);
      const devUser = { id: `dev-${targetRole}`, email: `${targetRole}@local.test` } as User;
      setUser(devUser);
      setSession({ user: devUser, access_token: 'mock' } as Session);
      setRole(targetRole);
      setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, role, authStatus, authLogs, signOut, isOfflineMode, checkUserRole, loginWithDevBypass }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
