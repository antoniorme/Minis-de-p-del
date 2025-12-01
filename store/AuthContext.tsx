import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isOfflineMode: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  isOfflineMode: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    const initSession = async () => {
        // 1. DETECCIÓN DE ENTORNO
        // Si el dominio NO es vercel.app, asumimos que estamos en local/preview
        // y activamos el modo offline automáticamente.
        const hostname = window.location.hostname;
        const isProduction = hostname.includes('vercel.app');
        
        if (!isProduction) {
            console.log("🛠️ ENTORNO LOCAL DETECTADO: Saltando Login...");
            setIsOfflineMode(true);
            
            // Creamos un usuario falso para que la app funcione
            const devUser = {
                id: 'dev-user-id',
                email: 'admin@padelpro.local',
                aud: 'authenticated',
                created_at: new Date().toISOString(),
                app_metadata: {},
                user_metadata: {}
            } as User;
            
            setUser(devUser);
            setSession({ user: devUser, access_token: 'mock-token' } as Session);
            setLoading(false);
            return; // IMPORTANTE: Salimos aquí para no intentar conectar a Supabase
        }

        // 2. PRODUCCIÓN (Vercel): Intentamos conectar a Supabase
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            setSession(session);
            setUser(session?.user ?? null);
        } catch (error) {
            console.error("Auth Error (Prod):", error);
            setSession(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    initSession();

    // Listener solo si no estamos en modo offline forzado
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isOfflineMode) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [isOfflineMode]); // Dependencia isOfflineMode para evitar bucles

  const signOut = async () => {
    if (isOfflineMode) {
        // En local, el logout solo recarga la página para "limpiar" la sesión falsa visualmente
        if(confirm("Estás en modo desarrollo local. ¿Recargar la página?")) {
            window.location.reload();
        }
    } else {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, isOfflineMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);