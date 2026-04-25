import { NextResponse } from "next/server";
import { fetchAllUserAvatarUrls } from "@/lib/stats";

export async function GET() {
  const data = await fetchAllUserAvatarUrls();
  return NextResponse.json(data);
}
