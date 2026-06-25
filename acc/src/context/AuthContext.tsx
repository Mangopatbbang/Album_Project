"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type UserProfile = {
  id: string;
  display_name: string;
  emoji: string;
  role: "admin" | "user";
  auth_id: string;
  avatar_url?: string | null;
  onboarded?: boolean | null;
};

type AuthContextType = {
  authUser: SupabaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  authUser: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

async function fetchProfileData(userId: string): Promise<UserProfile | null> {
  const { data } = await supabaseBrowser
    .from("users")
    .select("id, display_name, emoji, role, auth_id, avatar_url, onboarded")
    .eq("auth_id", userId)
    .single();
  return (data as UserProfile | null);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Single state object — one setState = one render, no cascading re-renders on load
  const [authState, setAuthState] = useState<{
    authUser: SupabaseUser | null;
    profile: UserProfile | null;
    loading: boolean;
  }>({ authUser: null, profile: null, loading: true });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (cancelled) return;
      const user = session?.user ?? null;
      const profile = user ? await fetchProfileData(user.id) : null;
      if (cancelled) return;
      setAuthState({ authUser: user, profile, loading: false });
    }
    init();

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null;
        const profile = user ? await fetchProfileData(user.id) : null;
        setAuthState({ authUser: user, profile, loading: false });
      }
    );

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabaseBrowser.auth.getSession();
    if (!session?.user) return;
    const profile = await fetchProfileData(session.user.id);
    setAuthState(prev => ({ ...prev, profile }));
  }, []);

  const signOut = useCallback(async () => {
    await supabaseBrowser.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ ...authState, signOut, refreshProfile }),
    [authState, signOut, refreshProfile],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
