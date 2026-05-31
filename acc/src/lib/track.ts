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

// 탭 단위 세션 ID — sessionStorage 기반, 탭 닫으면 초기화
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("_sid");
  if (!sid) {
    sid = Date.now().toString(36) + Math.random().toString(36).slice(2);
    sessionStorage.setItem("_sid", sid);
  }
  return sid;
}

// 최근 5분 이내 검색어 — 검색 직후 앨범 클릭 시 연결
function getRecentSearch(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("_last_search");
    if (!raw) return null;
    const { query, at } = JSON.parse(raw) as { query: string; at: number };
    return Date.now() - at < 5 * 60 * 1000 ? query : null;
  } catch { return null; }
}

export function trackAlbumVisit(albumId: string, source: string) {
  const sid = getSessionId();
  const fromSearch = getRecentSearch();
  post({ type: "album_visit", album_id: albumId, source, session_id: sid, from_search_query: fromSearch });
}

export function trackArtistVisit(artistName: string, source: string) {
  post({ type: "artist_visit", artist_name: artistName, source });
}

export function trackSearch(query: string, resultsCount: number) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("_last_search", JSON.stringify({ query, at: Date.now() }));
  }
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
