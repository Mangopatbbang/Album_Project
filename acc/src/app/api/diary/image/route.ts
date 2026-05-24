import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateUser } from "@/lib/validateUser";
import { randomUUID } from "crypto";

// POST /api/diary/image — 청음일기 사진 업로드 (diary-images bucket, public)
export async function POST(req: NextRequest) {
  const authed = await validateUser(req);
  if (!authed) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "file 필수" }, { status: 400 });

  const MAX_MB = 10;
  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json({ error: `이미지는 ${MAX_MB}MB 이하여야 합니다` }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const uuid = randomUUID();
  const path = `${authed.id}/${uuid}.${ext}`;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { error } = await supabaseServer.storage
    .from("diary-images")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabaseServer.storage
    .from("diary-images")
    .getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}

// DELETE /api/diary/image?url=... — 사진 삭제
export async function DELETE(req: NextRequest) {
  const authed = await validateUser(req);
  if (!authed) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url 필수" }, { status: 400 });

  // URL에서 path 추출: .../diary-images/{userId}/{uuid}.ext
  const match = url.match(/diary-images\/(.+)$/);
  if (!match) return NextResponse.json({ error: "잘못된 URL" }, { status: 400 });

  const path = match[1];
  // 본인 폴더인지 확인
  if (!path.startsWith(`${authed.id}/`)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const { error } = await supabaseServer.storage
    .from("diary-images")
    .remove([path]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
