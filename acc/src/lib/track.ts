function post(body: object) {
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export function trackAlbumVisit(albumId: string, source: string) {
  post({ type: "album_visit", album_id: albumId, source });
}

export function trackArtistVisit(artistName: string, source: string) {
  post({ type: "artist_visit", artist_name: artistName, source });
}

export function trackSearch(query: string, resultsCount: number) {
  post({ type: "search", query, results_count: resultsCount });
}
