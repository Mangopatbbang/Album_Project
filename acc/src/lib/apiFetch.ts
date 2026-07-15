import { supabaseBrowser } from "@/lib/supabase-browser";

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const makeRequest = async () => {
    const { data: { session } } = await supabaseBrowser.auth.getSession();
    const token = session?.access_token;
    return fetch(url, {
      cache: "no-store",
      ...options,
      headers: {
        ...(options.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  };

  let res = await makeRequest();

  // 401이면 토큰 강제 갱신 후 1회 재시도 (TOKEN_REFRESHED 타이밍 이슈 방어)
  if (res.status === 401) {
    const { error } = await supabaseBrowser.auth.refreshSession();
    if (!error) {
      res = await makeRequest();
    }
  }

  // 재시도 후에도 401이면 진짜 세션 만료
  if (res.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:session-expired"));
  }

  return res;
}
