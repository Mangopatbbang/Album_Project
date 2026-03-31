import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// POST /api/users/avatar — 프로필 이미지 업로드
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const userId = formData.get("userId") as string | null;

  if (!file || !userId) {
    return NextResponse.json({ error: "file, userId 필수" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}.${ext}`;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { error } = await supabaseServer.storage
    .from("avatars")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabaseServer.storage
    .from("avatars")
    .getPublicUrl(path);

  // 캐시 버스팅
  const url = `${publicUrl}?t=${Date.now()}`;

  return NextResponse.json({ url });
}
