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
        // DETECCIÓN INTELIGENTE DE ENTORNO
        // Si NO estamos en un dominio de Vercel, asumimos entorno de desarrollo/preview
        // y forzamos el modo offline para saltar el login.
        const hostname = window.location.hostname;
        const isProduction = hostname.includes('vercel.app');

        if (!isProduction) {
            console.log("🛠️ ENTORNO DE DESARROLLO DETECTADO: Login desactivado.");
            setIsOfflineMode(true);
            const devUser = {
                id: 'dev-user-id',
                email: 'admin@padelpro.local',
                app_metadata: {},
                user_metadata: {},
                aud: 'authenticated',
                created_at: new Date().toISOString()
            } as User;
            
            setUser(devUser);
            setSession({ user: devUser, access_token: 'mock-token' } as Session);
            setLoading(false);
            return; // IMPORTANTE: Salimos aquí para no llamar a Supabase
        }

        // LÓGICA DE PRODUCCIÓN (VERCEL)
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error || !session) {
                setSession(null);
                setUser(null);
            } else {
                setSession(session);
                setUser(session.user);
            }
        } catch (error) {
            console.error("Error Auth:", error);
        } finally {
            setLoading(false);
        }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Solo actualizamos si NO estamos en modo offline forzado
      if (!isOfflineMode) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // Dependencias vacías para ejecutar solo al montar

  const signOut = async () => {
    if (isOfflineMode) {
        if(confirm("Estás en modo desarrollo. ¿Quieres recargar la página?")) {
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