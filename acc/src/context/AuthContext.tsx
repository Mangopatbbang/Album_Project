"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type UserProfile = {
  id: string;
  display_name: string;
  emoji: string;
  role: "admin" | "user";
  auth_id: string;
  avatar_url?: string | null;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    const { data, error } = await supabaseBrowser
      .from("users")
      .select("id, display_name, emoji, role, auth_id, avatar_url")
      .eq("auth_id", userId)
      .single();
    if (error) {
      // avatar_url 컬럼이 아직 없을 경우 폴백
      const { data: fallback } = await supabaseBrowser
        .from("users")
        .select("id, display_name, emoji, role, auth_id")
        .eq("auth_id", userId)
        .single();
      setProfile(fallback as UserProfile | null);
      return;
    }
    setProfile(data as UserProfile | null);
  }

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(async ({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) await fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      (_event, session) => {
        setAuthUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    const { data: { session } } = await supabaseBrowser.auth.getSession();
    if (session?.user) await fetchProfile(session.user.id);
  };

  const signOut = async () => {
    await supabaseBrowser.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ authUser, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
