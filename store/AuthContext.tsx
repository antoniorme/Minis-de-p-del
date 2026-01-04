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
  addLog: (msg: string) => void;
  recoveryMode: boolean;
  setRecoveryMode: (val: boolean) => void;
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
  addLog: () => {},
  recoveryMode: false,
  setRecoveryMode: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState('Monitor Activo');
  const [authLogs, setAuthLogs] = useState<string[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);

  const addLog = useCallback((msg: string) => {
      console.log(`[AUTH-SYS] ${msg}`);
      setAuthLogs(prev => [...prev.slice(-30), `${new Date().toLocaleTimeString().split(' ')[0]} > ${msg}`]);
  }, []);

  const checkUserRole = useCallback(async (uid: string, userEmail?: string): Promise<UserRole> => {
      if (!uid) return null;
      addLog(`CHECK ROL: ${userEmail}`);
      if (userEmail === 'antoniorme@gmail.com') return 'superadmin';
      try {
          const { data: saData } = await supabase.from('superadmins').select('id').eq('email', userEmail).maybeSingle();
          if (saData) return 'superadmin';
      } catch (e) {}
      try {
          const { data: clubData } = await supabase.from('clubs').select('id').eq('owner_id', uid).maybeSingle();
          if (clubData) return 'admin';
      } catch (e) {}
      return 'player';
  }, [addLog]);

  useEffect(() => {
    const getUrlParam = (url: string, key: string) => {
        const reg = new RegExp(`[#?&]${key}=([^&]*)`);
        const match = url.match(reg);
        return match ? match[1] : null;
    };

    const handleUrlTokens = async () => {
        const fullUrl = window.location.href;
        if (fullUrl.includes('access_token=')) {
            addLog("DETECTADOS TOKENS. CAPTURANDO...");
            
            const accessToken = getUrlParam(fullUrl, 'access_token');
            const refreshToken = getUrlParam(fullUrl, 'refresh_token');

            if (accessToken && refreshToken) {
                addLog("TOKENS OK. VALIDANDO SESIÓN...");
                try {
                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });
                    
                    if (error) {
                        addLog(`ERROR SESIÓN: ${error.message}`);
                    } else if (data.session) {
                        addLog("¡SESIÓN FORZADA OK!");
                        
                        // LIMPIEZA DE URL: Muy importante para evitar que el estado se ensucie
                        window.history.replaceState(null, '', window.location.pathname + '#/auth');
                        
                        setRecoveryMode(true);
                        setSession(data.session);
                        setUser(data.session.user);
                        const r = await checkUserRole(data.session.user.id, data.session.user.email);
                        setRole(r);
                        return true;
                    }
                } catch (e: any) {
                    addLog(`EXCEPCIÓN URL: ${e.message}`);
                }
            }
        }
        return false;
    };

    const initSession = async () => {
        addLog("Iniciando secuencia...");
        const recoveredFromUrl = await handleUrlTokens();
        
        if (!recoveredFromUrl) {
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                if (currentSession) {
                    addLog("SESIÓN PERSISTENTE OK");
                    setSession(currentSession);
                    setUser(currentSession.user);
                    const r = await checkUserRole(currentSession.user.id, currentSession.user.email);
                    setRole(r);
                }
            } catch (error: any) {
                addLog(`FALLO GET_SESSION: ${error.message}`);
            }
        }
        setLoading(false);
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      addLog(`EVENTO_SDK: ${event}`);
      
      if (event === 'PASSWORD_RECOVERY') {
          setRecoveryMode(true);
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session) {
              setSession(session);
              setUser(session.user);
              if (!role) {
                  const r = await checkUserRole(session.user.id, session.user.email);
                  setRole(r);
              }
          }
      }
      if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setRole(null);
          setRecoveryMode(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkUserRole, addLog, role]);

  const signOut = async () => {
    setLoading(true);
    addLog("Saliendo...");
    await supabase.auth.signOut();
    window.location.reload();
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
        session, user, loading, role, authStatus, authLogs, signOut, 
        isOfflineMode, checkUserRole, loginWithDevBypass, addLog,
        recoveryMode, setRecoveryMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);