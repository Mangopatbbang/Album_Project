import { supabaseServer } from "@/lib/supabase";

export async function validateAdmin(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabaseServer.from("users").select("role").eq("id", userId).single();
  return data?.role === "admin";
}
