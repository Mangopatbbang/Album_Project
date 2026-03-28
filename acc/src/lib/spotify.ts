let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify 토큰 발급 실패: ${err}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.token;
}

export type SpotifyAlbumResult = {
  spotify_id: string;
  cover_url: string;
  name: string;
  artist: string;
  release_date: string | null;
  genres: string[];
  tracklist: string | null;
};

export async function searchAndFetchAlbum(
  title: string,
  artist: string
): Promise<SpotifyAlbumResult | null> {
  const token = await getAccessToken();

  // 1. 검색
  const queries = [
    `album:${title} artist:${artist}`,
    `${title} ${artist}`,
    title,
  ];

  let albumId: string | null = null;
  let albumData: {
    id: string;
    name: string;
    artists: { name: string }[];
    images: { url: string }[];
    release_date: string;
    genres?: string[];
  } | null = null;

  for (const q of queries) {
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) continue;

    const data = await res.json();
    const items = data.albums?.items ?? [];
    if (items.length === 0) continue;

    // 아티스트 이름 앞 3글자로 매칭 시도
    const matched = items.find((a: { artists: { name: string }[] }) =>
      a.artists?.[0]?.name?.toLowerCase().includes(artist.toLowerCase().slice(0, 3))
    ) ?? items[0];

    albumId = matched.id;
    albumData = matched;
    break;
  }

  if (!albumId || !albumData) return null;

  // 2. 앨범 상세 (genre + tracklist)
  const detailRes = await fetch(
    `https://api.spotify.com/v1/albums/${albumId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  let genres: string[] = albumData.genres ?? [];
  let tracklist: string | null = null;

  if (detailRes.ok) {
    const detail = await detailRes.json();
    genres = detail.genres ?? [];
    const tracks = detail.tracks?.items ?? [];
    if (tracks.length > 0) {
      tracklist = tracks
        .map((t: { track_number: number; name: string }) => t.name)
        .join("; ");
    }
  }

  return {
    spotify_id: albumId,
    cover_url: albumData.images?.[0]?.url ?? "",
    name: albumData.name,
    artist: albumData.artists?.[0]?.name ?? artist,
    release_date: albumData.release_date ?? null,
    genres,
    tracklist,
  };
}
