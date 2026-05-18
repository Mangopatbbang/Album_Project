function post(body: object) {
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

function getDevice(): "mobile" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  return window.innerWidth < 640 ? "mobile" : "desktop";
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

export function trackPageView(path: string) {
  post({ type: "page_view", path, device: getDevice() });
}

export function trackTabClick(tab: string) {
  post({ type: "tab_click", tab, device: getDevice() });
}

export function trackFeatureClick(feature: string, context?: string) {
  post({ type: "feature_click", feature, context: context ?? null, device: getDevice() });
}
