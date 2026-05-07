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
    .select("id, role")
    .eq("auth_id", user.id)
    .single();
  return profile ?? null;
}
