import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: any | null;
  user: any | null;
  profile: any | null;
  signOut: () => Promise<void>;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  signOut: async () => {},
  isLoading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedSession = sessionStorage.getItem('crm_session');
    if (storedSession) {
      try {
        const parsedData = JSON.parse(storedSession);
        setProfile(parsedData);
        setUser({ id: parsedData.id, email: parsedData.email });
        setSession({ user: { id: parsedData.id, email: parsedData.email } });
      } catch (e) {
        console.error("Invalid session data");
        sessionStorage.removeItem('crm_session');
      }
    }
    setIsLoading(false);
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setProfile(data);
      
      sessionStorage.setItem('crm_session', JSON.stringify(data));
      setUser({ id: data.id, email: data.email });
      setSession({ user: { id: data.id, email: data.email } });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    sessionStorage.removeItem('crm_session');
    setSession(null);
    setUser(null);
    setProfile(null);
    window.location.href = '/login';
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, signOut, isLoading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
