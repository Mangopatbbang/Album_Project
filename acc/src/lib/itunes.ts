const DELAY_MS = 300;

export async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export type ItunesAlbumResult = {
  collection_id: number;
  cover_url: string;
  name: string;
  artist: string;
  release_date: string | null;
  collection_type: string;
  genre: string | null;
};

// iTunes 장르 → 내부 장르 매핑
const GENRE_MAP: Record<string, string> = {
  "Hip-Hop/Rap": "Hip-Hop",
  "R&B/Soul": "R&B",
  "Dance": "Electronic",
  "Electronica": "Electronic",
  "Singer/Songwriter": "Folk",
  "New Age": "Ambient",
  "Soundtrack": "기타",
  "Christian & Gospel": "기타",
  "Vocal": "Pop",
};

export function mapItunesGenre(raw: string): string | null {
  if (!raw || raw === "Music") return null;
  return GENRE_MAP[raw] ?? raw;
}

function parseResults(results: Record<string, unknown>[]): ItunesAlbumResult[] {
  return results
    .map((r) => ({
      collection_id: r.collectionId as number,
      cover_url: ((r.artworkUrl100 as string) ?? "").replace("100x100", "600x600"),
      name: r.collectionName as string,
      artist: r.artistName as string,
      release_date: r.releaseDate ? (r.releaseDate as string).slice(0, 10) : null,
      collection_type: (r.collectionType as string) ?? "Album",
      genre: mapItunesGenre((r.primaryGenreName as string) ?? ""),
    }))
    .filter((r) => r.collection_type !== "Single");
}

async function itunesSearch(term: string, country: string): Promise<ItunesAlbumResult[]> {
  await sleep(DELAY_MS);
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=200&country=${country}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return parseResults(data.results ?? []);
}

export async function searchItunesAlbumCandidates(
  title: string,
  artist: string
): Promise<ItunesAlbumResult[]> {
  const combined = [title, artist].filter(Boolean).join(" ");

  // KR + US 각각, combined + title단독 + artist단독 쿼리 병렬 실행
  const queries = Array.from(new Set([combined, title, artist].filter(Boolean)));
  const countries = ["kr", "us"];

  const allResults = await Promise.all(
    countries.flatMap((country) => queries.map((q) => itunesSearch(q, country)))
  );

  // 중복 제거 (collection_id 기준)
  const seen = new Set<number>();
  const merged: ItunesAlbumResult[] = [];
  for (const batch of allResults) {
    for (const item of batch) {
      if (!seen.has(item.collection_id)) {
        seen.add(item.collection_id);
        merged.push(item);
      }
    }
  }

  return merged;
}

export async function searchItunesAlbum(
  title: string,
  artist: string
): Promise<ItunesAlbumResult | null> {
  const candidates = await searchItunesAlbumCandidates(title, artist);
  if (candidates.length === 0) return null;
  return (
    candidates.find((c) =>
      c.artist?.toLowerCase().includes(artist.toLowerCase().slice(0, 3))
    ) ?? candidates[0]
  );
}

export async function fetchItunesTracklist(collectionId: number): Promise<string | null> {
  await sleep(DELAY_MS);
  const url = `https://itunes.apple.com/lookup?id=${collectionId}&entity=song`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const tracks = (data.results ?? []).filter(
    (r: { wrapperType: string }) => r.wrapperType === "track"
  ) as { trackNumber: number; trackName: string }[];

  if (tracks.length === 0) return null;

  return tracks
    .sort((a, b) => a.trackNumber - b.trackNumber)
    .map((t) => t.trackName)
    .join("; ");
}
