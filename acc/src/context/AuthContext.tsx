"use client";

import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from "react";
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

  // Ref to track current user ID: avoids stale closure inside onAuthStateChange callback
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let seq = 0;

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
        const user = session?.user ?? null;

        // TOKEN_REFRESHED: 토큰만 갱신 — authUser 토큰만 교체, DB 쿼리 불필요
        if (event === 'TOKEN_REFRESHED') {
          currentUserIdRef.current = user?.id ?? null;
          setAuthState(prev => ({ ...prev, authUser: user }));
          return;
        }

        // 로그아웃: 즉시 초기화
        if (!user) {
          currentUserIdRef.current = null;
          setAuthState({ authUser: null, profile: null, loading: false });
          return;
        }

        const mySeq = ++seq;

        // 유저 ID가 바뀌었을 때만 loading=true (새 로그인 or 다른 계정)
        // 같은 유저의 SIGNED_IN 재발화(탭 포커스, 세션 재검증 등)는 loading 변경 없이 조용히 처리
        const isNewUser = currentUserIdRef.current !== user.id;
        currentUserIdRef.current = user.id;

        if (isNewUser) {
          setAuthState(prev => ({ ...prev, authUser: user, loading: true }));
        } else {
          setAuthState(prev => ({ ...prev, authUser: user }));
        }

        let profile: UserProfile | null = null;
        try {
          profile = await fetchProfileData(user.id);
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
