import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export type AuthedUser = { id: string; role: string };

export async function validateUser(req: NextRequest): Promise<AuthedUser | null> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user }, error } = await supabaseServer.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabaseServer
    .from("users")
    .select("id, role, banned_at, ban_until")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return null;
  if (profile.banned_at) {
    // 임시밴 만료 체크: ban_until이 있고 현재 시간을 지났으면 자동 해제
    if (profile.ban_until && new Date(profile.ban_until) < new Date()) {
      await supabaseServer.from("users").update({ banned_at: null, ban_until: null }).eq("id", profile.id);
    } else {
      return null; // 여전히 밴 상태
    }
  }
  return { id: profile.id, role: profile.role };
}

export async function validateAdmin(req: NextRequest): Promise<AuthedUser | null> {
  const authed = await validateUser(req);
  if (!authed || authed.role !== "admin") return null;
  return authed;
}
