import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

const SHEET_CSV_URL = process.env.SHEET_CSV_URL!;

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const headerIndex = lines.findIndex((line) => line.startsWith("id,"));
  if (headerIndex === -1) throw new Error("헤더를 찾을 수 없음");

  const header = lines[headerIndex].split(",").map((h) => h.trim());
  const dataLines = lines.slice(headerIndex + 1).filter((l) => l.length > 0);

  return dataLines.map((line) => {
    // 쉼표 포함 필드 처리 (따옴표로 감싸진 경우)
    const cols: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    cols.push(current.trim());

    const obj: Record<string, string> = {};
    header.forEach((key, idx) => {
      obj[key] = (cols[idx] ?? "").trim();
    });
    return obj;
  });
}

export async function POST() {
  try {
    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) return NextResponse.json({ error: "시트 fetch 실패" }, { status: 500 });

    const text = await res.text();
    const rows = parseCsv(text);

    // 앨범 데이터 변환
    const albums = rows
      .filter((row) => row["id"] && row["title"])
      .map((row) => ({
        id: row["id"],
        title: row["title"],
        artist: row["artist"] || "",
        year: row["year"] || null,
        genre: row["genre"] || null,
        tracklist: row["tracklist"] || null,
      }));

    // 기존 평점 데이터 변환 (시트의 평점 컬럼에서)
    const ratingUsers = [
      { key: "arkyteccc_rating", userId: "arkyteccc" },
      { key: "mangopatbbang_rating", userId: "mangopatbbang" },
      { key: "SJH_rating", userId: "SJH" },
      { key: "wugibugi_rating", userId: "wugibugi" },
    ];

    const ratings: { album_id: string; user_id: string; score: number }[] = [];
    for (const row of rows) {
      if (!row["id"]) continue;
      for (const { key, userId } of ratingUsers) {
        const val = row[key];
        if (!val) continue;
        const score = Number(val);
        if (!Number.isNaN(score) && score >= 1 && score <= 8) {
          ratings.push({ album_id: row["id"], user_id: userId, score });
        }
      }
    }

    // Supabase에 upsert (배치 100개씩)
    let albumsInserted = 0;
    for (let i = 0; i < albums.length; i += 100) {
      const batch = albums.slice(i, i + 100);
      const { error } = await supabaseServer
        .from("albums")
        .upsert(batch, { onConflict: "id" });
      if (error) throw new Error(`앨범 삽입 오류: ${error.message}`);
      albumsInserted += batch.length;
    }

    let ratingsInserted = 0;
    for (let i = 0; i < ratings.length; i += 100) {
      const batch = ratings.slice(i, i + 100);
      const { error } = await supabaseServer
        .from("ratings")
        .upsert(batch, { onConflict: "album_id,user_id" });
      if (error) throw new Error(`평점 삽입 오류: ${error.message}`);
      ratingsInserted += batch.length;
    }

    return NextResponse.json({
      ok: true,
      albumsInserted,
      ratingsInserted,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
