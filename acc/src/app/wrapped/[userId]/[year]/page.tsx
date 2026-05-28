import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import WrappedClient from "./WrappedClient";

export default async function WrappedPage({
  params,
}: {
  params: Promise<{ userId: string; year: string }>;
}) {
  const { userId, year } = await params;

  // 유저 존재 확인
  const { data: dbUser } = await supabaseServer
    .from("users")
    .select("id, role")
    .eq("id", userId)
    .single();

  if (!dbUser) notFound();

  const yearNum = parseInt(year);
  if (isNaN(yearNum) || yearNum < 2024 || yearNum > new Date().getFullYear()) notFound();

  return <WrappedClient userId={userId} year={yearNum} />;
}
