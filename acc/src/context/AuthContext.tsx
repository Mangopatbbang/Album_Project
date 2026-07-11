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
    let seq = 0;

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
        const user = session?.user ?? null;

        // TOKEN_REFRESHED: 토큰만 갱신됐고 유저/프로필은 변하지 않음
        // 불필요한 DB 쿼리 없이 authUser만 업데이트
        if (event === 'TOKEN_REFRESHED') {
          setAuthState(prev => ({ ...prev, authUser: user }));
          return;
        }

        // 여러 이벤트가 연속 발화할 때 가장 최신 콜백만 반영
        const mySeq = ++seq;
        // 로그인 이벤트면 프로필 fetch 전까지 loading=true 유지 (비로그인 UI 플래시 방지)
        if (user) setAuthState(prev => ({ ...prev, loading: true }));
        let profile: UserProfile | null = null;
        try {
          profile = user ? await fetchProfileData(user.id) : null;
        } catch {
          // DB 오류 시에도 state 업데이트는 반드시 실행 (loading stuck 방지)
        }
        if (cancelled || seq !== mySeq) return;
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
