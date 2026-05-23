import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, AuthUser, UserProfile } from '@/types/auth';

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (authUser: User): Promise<AuthUser> => {
    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .maybeSingle();

    // Fetch roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', authUser.id);

    // If no roles found (empty array or null), default to guest
    const roles = (rolesData && rolesData.length > 0 
      ? rolesData.map(r => r.role) 
      : ['guest']) as AppRole[];

    return {
      id: authUser.id,
      email: authUser.email || '',
      profile: profile as UserProfile | null,
      roles,
    };
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        
        if (currentSession?.user) {
          // Use setTimeout to prevent potential race conditions
          setTimeout(async () => {
            const userData = await fetchUserData(currentSession.user);
            setUser(userData);
            setLoading(false);
          }, 0);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (existingSession?.user) {
        fetchUserData(existingSession.user).then(userData => {
          setSession(existingSession);
          setUser(userData);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const hasRole = (role: AppRole) => user?.roles.includes(role) || false;
  
  const hasAnyRole = (roles: AppRole[]) => roles.some(role => hasRole(role));

  const isStaff = hasAnyRole(['super_admin', 'admin', 'food_manager', 'kitchen_manager', 'waiter']);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      hasRole,
      hasAnyRole,
      isStaff,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
