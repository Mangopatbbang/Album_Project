// src/lib/albums.ts

// 구글시트 CSV 주소
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1Je8OwNdTSMNDxIE37wvZmkAGkNAHqwClTbLDR8aoWsk/export?format=csv&gid=0";

export type Album = {
  id: string;
  title: string;
  artist: string;
  // year를 숫자 말고 그냥 시트에 적은 그대로 문자열로 사용 (NaN 방지)
  year?: string;
  genre?: string;

  arkyteccc_rating?: number;
  mangopatbbang_rating?: number;
  SJH_rating?: number;
  wugibugi_rating?: number;

  comment?: string;
  link?: string;
};

/**
 * CSV 텍스트를 간단히 파싱해서
 * [{ 헤더이름: 값, ... }, ...] 형태로 변환
 * 시트 위쪽 설명줄(## ...)은 무시하고,
 * 'id,' 로 시작하는 줄을 헤더로 사용.
 */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  // 'id,' 로 시작하는 줄을 헤더로 사용
  const headerIndex = lines.findIndex((line) => line.startsWith("id,"));
  if (headerIndex === -1) {
    throw new Error("CSV 헤더(id, ...) 를 찾을 수 없어요.");
  }

  const header = lines[headerIndex].split(",").map((h) => h.trim());
  const dataLines = lines.slice(headerIndex + 1).filter((l) => l.length > 0);

  return dataLines.map((line) => {
    const cols = line.split(",");
    const obj: Record<string, string> = {};
    header.forEach((key, idx) => {
      obj[key] = (cols[idx] ?? "").trim();
    });
    return obj;
  });
}

/**
 * 숫자 변환을 안전하게 하는 헬퍼
 * - 빈 문자열 / undefined / NaN → undefined
 * - 정상적인 숫자 문자열 → number
 */
function safeNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (Number.isNaN(n)) return undefined;
  return n;
}

export async function fetchAlbums(): Promise<Album[]> {
  const res = await fetch(SHEET_CSV_URL, {
    next: { revalidate: 60 }, // 60초마다 서버에서 새로 가져오기
  });

  if (!res.ok) {
    console.error("Failed to fetch sheet", res.statusText);
    return [];
  }

  const text = await res.text();
  const rows = parseCsv(text);

  const albums: Album[] = rows.map((row) => ({
    id: row["id"],
    title: row["title"],
    artist: row["artist"],
    // year 그대로 문자열로 사용 (예: "2025. 11. 5")
    year: row["year"] || undefined,
    genre: row["genre"] || undefined,

    arkyteccc_rating: safeNumber(row["arkyteccc_rating"]),
    mangopatbbang_rating: safeNumber(row["mangopatbbang_rating"]),
    SJH_rating: safeNumber(row["SJH_rating"]),
    wugibugi_rating: safeNumber(row["wugibugi_rating"]),

    comment: row["comment"] || undefined,
    link: row["link"] || undefined,
  }));

  return albums;
}
