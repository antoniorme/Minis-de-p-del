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
        const isProduction = window.location.hostname.includes('vercel.app');
        
        if (!isProduction) {
            console.log("🛠️ DESARROLLO LOCAL: Login desactivado.");
            setIsOfflineMode(true);
            const devUser = {
                id: 'dev-user-id',
                email: 'admin@padelpro.local',
                aud: 'authenticated',
                created_at: new Date().toISOString(),
                app_metadata: {},
                user_metadata: {}
            } as User;
            setUser(devUser);
            setSession({ user: devUser, access_token: 'mock' } as Session);
            setLoading(false);
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isOfflineMode) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [isOfflineMode]);

  const signOut = async () => {
    if (isOfflineMode) {
        window.location.reload();
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