import { supabaseBrowser } from "@/lib/supabase-browser";

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:session-expired"));
  }
  return res;
}
