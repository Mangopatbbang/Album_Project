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

// ─── Profile cache (sessionStorage, 30분 TTL) ────────────────────────────────
// 재방문 시 DB 조회 없이 즉각 렌더 → 체감 로딩 제거
const CACHE_KEY = "acc_profile_v1";
const CACHE_TTL = 30 * 60 * 1000;

function readCache(): UserProfile | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { profile, cachedAt } = JSON.parse(raw) as { profile: UserProfile; cachedAt: number };
    if (Date.now() - cachedAt > CACHE_TTL) { sessionStorage.removeItem(CACHE_KEY); return null; }
    return profile;
  } catch { return null; }
}

function writeCache(profile: UserProfile) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ profile, cachedAt: Date.now() })); }
  catch { /* ignore */ }
}

function clearCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}
// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<{
    authUser: SupabaseUser | null;
    profile: UserProfile | null;
    loading: boolean;
  }>({ authUser: null, profile: null, loading: true });

  const currentUserIdRef = useRef<string | null>(null);
  // 모든 profile fetch 요청이 공유하는 seq 카운터
  // onAuthStateChange 핸들러와 refreshProfile 모두 이 카운터를 증가시켜
  // 가장 마지막으로 시작된 fetch만 상태에 반영됨 (signup 레이스컨디션 방지)
  const profileFetchSeqRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
        const user = session?.user ?? null;

        // 토큰 자동 갱신 — authUser 교체만, UI 변화 없음
        if (event === "TOKEN_REFRESHED") {
          currentUserIdRef.current = user?.id ?? null;
          setAuthState(prev => ({ ...prev, authUser: user }));
          return;
        }

        // 로그아웃 / 세션 없음 — 즉시 초기화 + 캐시 삭제
        if (!user) {
          currentUserIdRef.current = null;
          clearCache();
          setAuthState({ authUser: null, profile: null, loading: false });
          return;
        }

        const isNewUser = currentUserIdRef.current !== user.id;
        currentUserIdRef.current = user.id;

        if (event === "INITIAL_SESSION") {
          const cachedProfile = readCache();
          const cacheHit = cachedProfile?.auth_id === user.id;

          if (cacheHit) {
            // 캐시 즉시 적용 → loading 해제 (DB 조회 대기 없음)
            setAuthState({ authUser: user, profile: cachedProfile!, loading: false });

            // 백그라운드에서 최신 profile 갱신
            const seq = ++profileFetchSeqRef.current;
            fetchProfileData(user.id)
              .then((fresh) => {
                if (cancelled || profileFetchSeqRef.current !== seq) return;
                if (fresh) { writeCache(fresh); setAuthState(prev => ({ ...prev, profile: fresh })); }
              })
              .catch(() => { /* 갱신 실패 시 캐시 유지 */ });
          } else {
            // 캐시 없음 or 다른 유저 — fetch 완료 후 loading 해제
            clearCache();
            setAuthState(prev => ({ ...prev, authUser: user, loading: true }));
            const seq = ++profileFetchSeqRef.current;
            let profile: UserProfile | null = null;
            try {
              profile = await fetchProfileData(user.id);
              if (profile) writeCache(profile);
            } catch { /* DB 오류 시 profile=null */ }
            if (cancelled || profileFetchSeqRef.current !== seq) return;
            setAuthState({ authUser: user, profile, loading: false });
          }
          return;
        }

        // SIGNED_IN — 새 로그인이면 profile fetch, 재발화면 조용히 처리
        if (isNewUser) {
          setAuthState(prev => ({ ...prev, authUser: user, loading: true }));
          const seq = ++profileFetchSeqRef.current;
          let profile: UserProfile | null = null;
          try {
            profile = await fetchProfileData(user.id);
            if (profile) writeCache(profile);
          } catch { /* DB 오류 */ }
          if (cancelled || profileFetchSeqRef.current !== seq) return;
          setAuthState({ authUser: user, profile, loading: false });
        } else {
          // 같은 유저 SIGNED_IN 재발화 (탭 포커스, 세션 재검증 등) — loading 변화 없음
          setAuthState(prev => ({ ...prev, authUser: user }));
        }
      }
    );

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabaseBrowser.auth.getSession();
    if (!session?.user) return;
    // seq 증가로 이전 pending fetch를 무효화 (signup 이후 호출 시 SIGNED_IN fetch 덮어쓰기 방지)
    const seq = ++profileFetchSeqRef.current;
    let profile: UserProfile | null = null;
    try {
      profile = await fetchProfileData(session.user.id);
      if (profile) writeCache(profile);
    } catch { /* ignore */ }
    if (profileFetchSeqRef.current !== seq) return;
    setAuthState(prev => ({ ...prev, profile }));
  }, []);

  const signOut = useCallback(async () => {
    clearCache(); // SIGNED_OUT 이벤트보다 먼저 캐시 제거 (즉각 반영)
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
