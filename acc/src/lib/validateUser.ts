import { supabaseServer } from "@/lib/supabase";

export async function validateUser(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabaseServer.from("users").select("id").eq("id", userId).single();
  return !!data;
}
