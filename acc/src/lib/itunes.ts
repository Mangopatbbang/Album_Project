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
};

export async function searchItunesAlbum(
  title: string,
  artist: string
): Promise<ItunesAlbumResult | null> {
  const queries = [
    `${title} ${artist}`,
    `${title}`,
  ];

  for (const q of queries) {
    await sleep(DELAY_MS);
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=5`;

    const res = await fetch(url);
    if (!res.ok) continue;

    const data = await res.json();
    const results = data.results ?? [];
    if (results.length === 0) continue;

    // 아티스트 이름 앞 3글자로 매칭 시도, 없으면 첫 번째 결과
    const matched =
      results.find((r: { artistName: string }) =>
        r.artistName?.toLowerCase().includes(artist.toLowerCase().slice(0, 3))
      ) ?? results[0];

    if (!matched) continue;

    // artworkUrl100 → 600x600으로 교체
    const cover = (matched.artworkUrl100 as string)?.replace("100x100", "600x600") ?? "";

    // releaseDate: "2024-01-01T08:00:00Z" → "2024-01-01"
    const release_date = matched.releaseDate
      ? (matched.releaseDate as string).slice(0, 10)
      : null;

    return {
      collection_id: matched.collectionId,
      cover_url: cover,
      name: matched.collectionName,
      artist: matched.artistName,
      release_date,
    };
  }

  return null;
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
