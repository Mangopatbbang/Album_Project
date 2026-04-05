"use client";

import { useState, useRef } from "react";

type SpotifyCandidate = {
  spotify_id: string;
  name: string;
  artist: string;
  cover_url: string;
  release_date: string;
};

type MigrateResult = {
  done: boolean;
  processed: number;
  success: number;
  notFound: number;
  remaining: number;
  nextOffset: number;
};

type AlbumRow = {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  spotify_id: string | null;
};

type Stats = {
  total: number;
  hasSpotify: number;
  hasCover: number;
  hasTracklist: number;
};

export default function AdminPage() {
  // --- 통계 ---
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsFilter, setStatsFilter] = useState<"no_spotify" | "no_cover" | "no_tracklist" | null>(null);
  const [statsAlbums, setStatsAlbums] = useState<AlbumRow[]>([]);
  const [statsAlbumsLoading, setStatsAlbumsLoading] = useState(false);

  async function loadStats() {
    setStatsLoading(true);
    const res = await fetch("/api/admin/stats");
    const data = await res.json();
    setStats(data);
    setStatsLoading(false);
    setStatsFilter(null);
    setStatsAlbums([]);
  }

  async function loadStatsAlbums(filter: "no_spotify" | "no_cover" | "no_tracklist") {
    if (statsFilter === filter) { setStatsFilter(null); setStatsAlbums([]); return; }
    setStatsFilter(filter);
    setStatsAlbumsLoading(true);
    const res = await fetch(`/api/admin/albums?filter=${filter}&limit=500`);
    const data = await res.json();
    setStatsAlbums(data.albums ?? []);
    setStatsAlbumsLoading(false);
  }

  // --- 마이그레이션 (Spotify 전체) ---
  const [running, setRunning] = useState(false);
  const [migLog, setMigLog] = useState<string[]>([]);
  const [totalSuccess, setTotalSuccess] = useState(0);
  const [totalNotFound, setTotalNotFound] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const stopRef = useRef(false);

  // --- 트랙리스트 전용 마이그레이션 ---
  const [trackRunning, setTrackRunning] = useState(false);
  const [trackLog, setTrackLog] = useState<string[]>([]);
  const [trackRemaining, setTrackRemaining] = useState<number | null>(null);
  const trackStopRef = useRef(false);

  async function runTracklistMigration() {
    setTrackRunning(true);
    trackStopRef.current = false;
    setTrackLog([]);
    let offset = 0;
    let batchNum = 0;

    while (!trackStopRef.current) {
      batchNum++;
      setTrackLog((prev) => [...prev, `배치 ${batchNum} 처리 중...`]);
      try {
        const res = await fetch("/api/migrate/tracklist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offset }),
        });
        const data = await res.json();

        if (data.retryAfter) {
          const wait = data.retryAfter;
          setTrackLog((prev) => [...prev, `  ⚠️ rate limit — ${wait}초 대기 중...`]);
          await new Promise((r) => setTimeout(r, wait * 1000));
          continue; // offset 그대로 재시도
        }

        if (data.remaining !== null) setTrackRemaining(data.remaining);
        setTrackLog((prev) => [
          ...prev,
          `  ✓ ${data.success}개 성공, ${data.failed}개 실패 | 남은: ${data.remaining ?? "?"}개${data.firstError ? ` | ${data.firstError}` : ""}`,
        ]);

        if (data.done || data.processed === 0) {
          setTrackLog((prev) => [...prev, "✅ 트랙리스트 완료!"]);
          break;
        }

        offset = data.nextOffset;
        await new Promise((r) => setTimeout(r, 1000));
      } catch (e) {
        setTrackLog((prev) => [...prev, `❌ 오류: ${String(e)}`]);
        break;
      }
    }

    setTrackRunning(false);
  }

  async function runMigration() {
    setRunning(true);
    stopRef.current = false;
    setMigLog([]);
    let offset = 0;
    let batchNum = 0;

    while (!stopRef.current) {
      batchNum++;
      setMigLog((prev) => [...prev, `배치 ${batchNum} 요청 중... (offset: ${offset})`]);
      try {
        const res = await fetch("/api/migrate/spotify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offset }),
        });
        const data: MigrateResult = await res.json();

        setTotalSuccess((s) => s + data.success);
        setTotalNotFound((n) => n + data.notFound);
        setRemaining(data.remaining);

        setMigLog((prev) => [
          ...prev,
          `  ✓ ${data.success}개 성공, ${data.notFound}개 미매칭 | 남은 앨범: ${data.remaining}개`,
        ]);

        if (data.done || data.processed === 0) {
          setMigLog((prev) => [...prev, "✅ 마이그레이션 완료!"]);
          break;
        }

        offset = data.nextOffset;
        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        setMigLog((prev) => [...prev, `❌ 오류: ${String(e)}`]);
        break;
      }
    }

    setRunning(false);
  }

  // --- 발매일 일괄 채우기 ---
  const [dateRunning, setDateRunning] = useState(false);
  const [dateLog, setDateLog] = useState<string[]>([]);
  const [dateRemaining, setDateRemaining] = useState<number | null>(null);
  const dateStopRef = useRef(false);

  async function runDateBackfill() {
    setDateRunning(true);
    dateStopRef.current = false;
    setDateLog([]);
    let offset = 0;
    let batchNum = 0;

    while (!dateStopRef.current) {
      batchNum++;
      setDateLog((prev) => [...prev, `배치 ${batchNum} 처리 중...`]);
      try {
        const res = await fetch("/api/admin/backfill-release-dates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offset }),
        });
        const data = await res.json();
        if (data.error) {
          setDateLog((prev) => [...prev, `❌ 오류: ${data.error}`]);
          break;
        }
        if (data.remaining !== undefined) setDateRemaining(data.remaining);
        setDateLog((prev) => [...prev, `  ✓ ${data.success}개 성공, ${data.failed}개 실패 | 남은: ${data.remaining}개`]);
        if (data.done || data.processed === 0) {
          setDateLog((prev) => [...prev, "✅ 완료!"]);
          break;
        }
        offset = data.nextOffset;
        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        setDateLog((prev) => [...prev, `❌ 오류: ${String(e)}`]);
        break;
      }
    }
    setDateRunning(false);
  }

  // --- 커버 교정 ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchArtist, setSearchArtist] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [candidates, setCandidates] = useState<SpotifyCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [fixMsg, setFixMsg] = useState("");

  // --- 미리보기 ---
  const [preview, setPreview] = useState<{ candidate: SpotifyCandidate; tracks: string[]; loading: boolean } | null>(null);
  const [matchedAlbum, setMatchedAlbum] = useState<AlbumRow | null>(null);

  async function selectCandidate(c: SpotifyCandidate) {
    setPreview({ candidate: c, tracks: [], loading: true });
    try {
      const res = await fetch(`/api/spotify/tracklist?spotifyId=${c.spotify_id}`);
      const data = await res.json();
      setPreview({ candidate: c, tracks: data.tracks ?? [], loading: false });
    } catch {
      setPreview({ candidate: c, tracks: [], loading: false });
    }
  }

  // 앨범 목록 (커버 없거나 교정 필요한 것들)
  const [albums, setAlbums] = useState<AlbumRow[]>([]);
  const [albumsLoaded, setAlbumsLoaded] = useState(false);
  const [albumFilter, setAlbumFilter] = useState<"no_cover" | "no_spotify" | "all">("no_cover");

  async function loadAlbums() {
    setAlbumsLoaded(false);
    const res = await fetch(`/api/admin/albums?filter=${albumFilter}&limit=300`);
    const data = await res.json();
    setAlbums(data.albums ?? []);
    setAlbumsLoaded(true);
  }

  function selectAlbum(a: AlbumRow) {
    setAlbumId(a.id);
    setMatchedAlbum(a);
    setSearchQuery(a.title);
    setSearchArtist(a.artist);
    setCandidates([]);
    setFixMsg("");
  }

  async function searchSpotify() {
    setSearching(true);
    setCandidates([]);
    setFixMsg("");

    // DB에서 앨범 자동 검색 + Spotify 후보 동시
    const spotifyParams = new URLSearchParams();
    if (searchQuery) spotifyParams.set("title", searchQuery);
    if (searchArtist) spotifyParams.set("artist", searchArtist);

    const dbParams = new URLSearchParams({ filter: "all", limit: "500" });
    if (searchQuery) dbParams.set("title", searchQuery);

    const [spotifyRes, dbRes] = await Promise.all([
      fetch(`/api/migrate/spotify/search?${spotifyParams}`),
      fetch(`/api/admin/albums?${dbParams}`),
    ]);

    const spotifyData = await spotifyRes.json();
    setCandidates(spotifyData.results ?? []);

    if (dbRes.ok) {
      const dbData = await dbRes.json();
      const normalize = (s: string) => s.toLowerCase().replace(/[-_\s]+/g, " ").trim();
      const q = normalize(searchQuery);
      const a = normalize(searchArtist);
      const albums: AlbumRow[] = dbData.albums ?? [];
      // 제목 없이 아티스트만 검색하면 단일 매칭 불가 → 목록만 표시
      const match = q ? albums.find((album) => {
        const t = normalize(album.title);
        const ar = normalize(album.artist);
        const titleOk = t.length >= 3
          ? (t.includes(q) || (q.length >= 3 && q.includes(t)))
          : t === q;
        const artistOk = !a || ar.includes(a) || a.includes(ar);
        return titleOk && artistOk;
      }) : null;
      if (match) {
        setAlbumId(match.id);
        setMatchedAlbum(match);
        setFixMsg(`DB 앨범 자동 매칭: "${match.title}" (${match.artist}) [ID: ${match.id}]`);
      } else {
        setAlbumId("");
        setMatchedAlbum(null);
        setFixMsg("DB에서 앨범을 찾지 못했습니다. 목록에서 직접 선택하세요.");
      }
    }

    setSearching(false);
  }

  async function applyCandidate(c: SpotifyCandidate, tracks: string[]) {
    if (!albumId) { setFixMsg("앨범 ID를 먼저 입력하세요"); return; }
    setFixMsg("적용 중...");
    setPreview(null);

    const tracklist = tracks.length > 0 ? tracks.join("; ") : undefined;
    const res = await fetch(`/api/albums/${albumId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spotify_id: c.spotify_id, cover_url: c.cover_url, ...(tracklist ? { tracklist } : {}) }),
    });

    if (res.ok) {
      const data = await res.json();
      const savedTracklist = data.updatedRow?.[0]?.tracklist;
      setFixMsg(
        tracklist
          ? `✅ "${c.name}" 적용 완료 (트랙 ${tracks.length}곡) [ID: ${data.id}, DB저장: ${savedTracklist ? savedTracklist.split(";").length + "곡" : "실패"}]`
          : `⚠️ "${c.name}" 적용 완료 — 트랙리스트 없음 [ID: ${data.id}]`
      );
      setAlbums((prev) => prev.filter((a) => a.id !== albumId));
      setAlbumId("");
      setCandidates([]);
    } else {
      const errData = await res.json().catch(() => ({}));
      setFixMsg(`❌ 업데이트 실패: ${JSON.stringify(errData)}`);
    }
  }

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh", padding: "40px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 22, marginBottom: 32, letterSpacing: "-0.03em" }}>
          Admin
        </p>

        {/* ── 통계 ── */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "28px 32px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>DB 현황</p>
            <button
              onClick={loadStats}
              disabled={statsLoading}
              style={{
                padding: "5px 14px", borderRadius: 6, border: "1px solid var(--border)",
                cursor: statsLoading ? "not-allowed" : "pointer",
                backgroundColor: "var(--bg-elevated)", color: "var(--text-sub)", fontSize: 12, fontWeight: 600,
              }}
            >
              {statsLoading ? "로딩 중..." : "새로고침"}
            </button>
          </div>
          {stats ? (
            <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                { label: "전체 앨범", value: stats.total, sub: null, filterKey: null },
                { label: "Spotify 매칭", value: stats.hasSpotify, sub: stats.total - stats.hasSpotify, filterKey: "no_spotify" as const },
                { label: "커버 이미지", value: stats.hasCover, sub: stats.total - stats.hasCover, filterKey: "no_cover" as const },
                { label: "트랙리스트", value: stats.hasTracklist, sub: stats.total - stats.hasTracklist, filterKey: "no_tracklist" as const },
              ].map((s) => (
                <div
                  key={s.label}
                  onClick={() => s.filterKey && s.sub && s.sub > 0 && loadStatsAlbums(s.filterKey)}
                  style={{
                    backgroundColor: statsFilter === s.filterKey ? "var(--bg)" : "var(--bg-elevated)",
                    borderRadius: 8, padding: "14px 16px",
                    border: `1px solid ${statsFilter === s.filterKey ? "var(--accent)" : "var(--border)"}`,
                    cursor: s.filterKey && s.sub && s.sub > 0 ? "pointer" : "default",
                    transition: "border-color 0.15s",
                  }}
                >
                  <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 8 }}>
                    {s.label.toUpperCase()}
                  </p>
                  <p style={{ color: "var(--accent)", fontWeight: 700, fontSize: 22 }}>
                    {s.value}
                    <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 400, marginLeft: 3 }}>/ {stats.total}</span>
                  </p>
                  {s.sub !== null && s.sub > 0 && (
                    <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
                      미완료 <span style={{ color: "#e07070", fontWeight: 600 }}>{s.sub}</span>개
                      <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>↓</span>
                    </p>
                  )}
                  <div style={{ height: 3, backgroundColor: "var(--border)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${(s.value / Math.max(stats.total, 1)) * 100}%`,
                      backgroundColor: s.sub && s.sub > 0 ? "#e07070" : "var(--accent)",
                      borderRadius: 2,
                    }} />
                  </div>
                </div>
              ))}
            </div>
            {/* 미완료 목록 */}
            {statsFilter && (
              <div style={{ marginTop: 16, border: "1px solid var(--border)", borderRadius: 8, maxHeight: 240, overflowY: "auto" }}>
                {statsAlbumsLoading ? (
                  <p style={{ color: "var(--text-muted)", fontSize: 12, padding: "12px 16px" }}>로딩 중...</p>
                ) : statsAlbums.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: 12, padding: "12px 16px" }}>없음</p>
                ) : statsAlbums.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => { selectAlbum(a); setSearchQuery(a.title); setSearchArtist(a.artist); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-elevated)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    {a.cover_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={a.cover_url} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 3, border: "1px solid var(--border)", flexShrink: 0 }} />
                      : <div style={{ width: 32, height: 32, backgroundColor: "var(--bg-elevated)", borderRadius: 3, border: "1px solid var(--border)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 12 }}>♪</span></div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "var(--text)", fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</p>
                      <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{a.artist}</p>
                    </div>
                    <span style={{ color: "var(--text-muted)", fontSize: 10, flexShrink: 0 }}>교정 →</span>
                  </div>
                ))}
              </div>
            )}
            </>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>새로고침을 눌러 확인하세요</p>
          )}
        </div>

        {/* ── 마이그레이션 ── */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "28px 32px", marginBottom: 24 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>
            SPOTIFY 마이그레이션
          </p>

          {remaining !== null && (
            <p style={{ color: "var(--text-sub)", fontSize: 13, marginBottom: 12 }}>
              남은 앨범: <span style={{ color: "var(--accent)", fontWeight: 600 }}>{remaining}</span>개
              &nbsp;·&nbsp; 성공: <span style={{ color: "var(--accent)" }}>{totalSuccess}</span>
              &nbsp;·&nbsp; 미매칭: <span style={{ color: "var(--text-muted)" }}>{totalNotFound}</span>
            </p>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              onClick={runMigration}
              disabled={running}
              style={{
                padding: "8px 20px", borderRadius: 6, border: "none", cursor: running ? "not-allowed" : "pointer",
                backgroundColor: running ? "var(--bg-elevated)" : "var(--accent)",
                color: running ? "var(--text-muted)" : "var(--bg)",
                fontWeight: 600, fontSize: 13,
              }}
            >
              {running ? "실행 중..." : "▶ 시작"}
            </button>
            {running && (
              <button
                onClick={() => { stopRef.current = true; }}
                style={{
                  padding: "8px 20px", borderRadius: 6, border: "1px solid var(--border)",
                  cursor: "pointer", backgroundColor: "var(--bg-elevated)",
                  color: "var(--text-muted)", fontWeight: 600, fontSize: 13,
                }}
              >
                ■ 중지
              </button>
            )}
          </div>

          {migLog.length > 0 && (
            <div style={{
              backgroundColor: "var(--bg-elevated)", borderRadius: 8, padding: "12px 16px",
              maxHeight: 240, overflowY: "auto", fontSize: 12, color: "var(--text-muted)",
              fontFamily: "monospace", display: "flex", flexDirection: "column", gap: 2,
            }}>
              {migLog.map((line, i) => (
                <span key={i}>{line}</span>
              ))}
            </div>
          )}
        </div>

        {/* ── 트랙리스트 마이그레이션 ── */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "28px 32px", marginBottom: 24 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>
            트랙리스트 채우기 (spotify_id 있는 앨범 대상)
          </p>

          {trackRemaining !== null && (
            <p style={{ color: "var(--text-sub)", fontSize: 13, marginBottom: 12 }}>
              남은 앨범: <span style={{ color: "var(--accent)", fontWeight: 600 }}>{trackRemaining}</span>개
            </p>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              onClick={runTracklistMigration}
              disabled={trackRunning}
              style={{
                padding: "8px 20px", borderRadius: 6, border: "none", cursor: trackRunning ? "not-allowed" : "pointer",
                backgroundColor: trackRunning ? "var(--bg-elevated)" : "var(--accent)",
                color: trackRunning ? "var(--text-muted)" : "var(--bg)",
                fontWeight: 600, fontSize: 13,
              }}
            >
              {trackRunning ? "실행 중..." : "▶ 시작"}
            </button>
            {trackRunning && (
              <button
                onClick={() => { trackStopRef.current = true; }}
                style={{
                  padding: "8px 20px", borderRadius: 6, border: "1px solid var(--border)",
                  cursor: "pointer", backgroundColor: "var(--bg-elevated)",
                  color: "var(--text-muted)", fontWeight: 600, fontSize: 13,
                }}
              >
                ■ 중지
              </button>
            )}
          </div>

          {trackLog.length > 0 && (
            <div style={{
              backgroundColor: "var(--bg-elevated)", borderRadius: 8, padding: "12px 16px",
              maxHeight: 200, overflowY: "auto", fontSize: 12, color: "var(--text-muted)",
              fontFamily: "monospace", display: "flex", flexDirection: "column", gap: 2,
            }}>
              {trackLog.map((line, i) => <span key={i}>{line}</span>)}
            </div>
          )}
        </div>

        {/* ── 발매일 일괄 채우기 ── */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "28px 32px", marginBottom: 24 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>
            발매일 채우기 (spotify_id 있는 앨범 전체 대상)
          </p>
          {dateRemaining !== null && (
            <p style={{ color: "var(--text-sub)", fontSize: 13, marginBottom: 12 }}>
              남은 앨범: <span style={{ color: "var(--accent)", fontWeight: 600 }}>{dateRemaining}</span>개
            </p>
          )}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              onClick={runDateBackfill}
              disabled={dateRunning}
              style={{
                padding: "8px 20px", borderRadius: 6, border: "none", cursor: dateRunning ? "not-allowed" : "pointer",
                backgroundColor: dateRunning ? "var(--bg-elevated)" : "var(--accent)",
                color: dateRunning ? "var(--text-muted)" : "var(--bg)",
                fontWeight: 600, fontSize: 13,
              }}
            >
              {dateRunning ? "실행 중..." : "▶ 시작"}
            </button>
            {dateRunning && (
              <button
                onClick={() => { dateStopRef.current = true; }}
                style={{
                  padding: "8px 20px", borderRadius: 6, border: "1px solid var(--border)",
                  cursor: "pointer", backgroundColor: "var(--bg-elevated)",
                  color: "var(--text-muted)", fontWeight: 600, fontSize: 13,
                }}
              >
                ■ 중지
              </button>
            )}
          </div>
          {dateLog.length > 0 && (
            <div style={{
              backgroundColor: "var(--bg-elevated)", borderRadius: 8, padding: "12px 16px",
              maxHeight: 200, overflowY: "auto", fontSize: 12, color: "var(--text-muted)",
              fontFamily: "monospace", display: "flex", flexDirection: "column", gap: 2,
            }}>
              {dateLog.map((line, i) => <span key={i}>{line}</span>)}
            </div>
          )}
        </div>

        {/* ── 커버 교정 ── */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "28px 32px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>
            커버 / 정보 교정
          </p>

          {/* 앨범 목록 로드 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
            <select
              value={albumFilter}
              onChange={(e) => setAlbumFilter(e.target.value as "no_cover" | "no_spotify" | "all")}
              style={{
                padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)",
                backgroundColor: "var(--bg-elevated)", color: "var(--text-sub)", fontSize: 12,
              }}
            >
              <option value="no_cover">커버 없는 앨범</option>
              <option value="no_spotify">Spotify 미매칭</option>
              <option value="all">전체</option>
            </select>
            <button
              onClick={loadAlbums}
              style={{
                padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border)",
                cursor: "pointer", backgroundColor: "var(--bg-elevated)",
                color: "var(--text-sub)", fontSize: 12, fontWeight: 600,
              }}
            >
              목록 불러오기
            </button>
          </div>

          {/* 앨범 목록 */}
          {albumsLoaded && albums.length > 0 && (
            <div style={{
              border: "1px solid var(--border)", borderRadius: 8, marginBottom: 16,
              maxHeight: 200, overflowY: "auto",
            }}>
              {albums.map((a) => (
                <div
                  key={a.id}
                  onClick={() => selectAlbum(a)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 14px",
                    cursor: "pointer", borderBottom: "1px solid var(--border)",
                    backgroundColor: albumId === a.id ? "var(--bg-elevated)" : "transparent",
                  }}
                >
                  {a.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.cover_url} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 3 }} />
                  ) : (
                    <div style={{ width: 32, height: 32, backgroundColor: "var(--bg-elevated)", borderRadius: 3, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 12 }}>♪</span>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "var(--text)", fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{a.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {albumsLoaded && albums.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 16 }}>해당 조건의 앨범 없음</p>
          )}

          {/* 직접 ID 입력 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 8, marginBottom: 12 }}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") searchSpotify(); }}
              placeholder="앨범 제목 (비워도 됨)"
              style={{
                padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)",
                backgroundColor: "var(--bg-elevated)", color: "var(--text)", fontSize: 13,
              }}
            />
            <input
              value={searchArtist}
              onChange={(e) => setSearchArtist(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") searchSpotify(); }}
              placeholder="아티스트"
              style={{
                padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)",
                backgroundColor: "var(--bg-elevated)", color: "var(--text)", fontSize: 13,
              }}
            />
            <button
              onClick={searchSpotify}
              disabled={searching || (!searchQuery && !searchArtist)}
              style={{
                padding: "8px 14px", borderRadius: 6, border: "none",
                cursor: searching || !searchQuery ? "not-allowed" : "pointer",
                backgroundColor: "var(--accent)", color: "var(--bg)", fontWeight: 600, fontSize: 13,
              }}
            >
              {searching ? "검색 중..." : "검색"}
            </button>
          </div>

          <input
            value={albumId}
            onChange={(e) => setAlbumId(e.target.value)}
            placeholder="앨범 ID (목록에서 선택하거나 직접 입력)"
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)",
              backgroundColor: "var(--bg-elevated)", color: "var(--text)", fontSize: 12,
              marginBottom: 16, boxSizing: "border-box",
            }}
          />

          {/* Spotify 검색 결과 */}
          {candidates.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginBottom: 12 }}>
              {candidates.map((c) => (
                <div
                  key={c.spotify_id}
                  onClick={() => selectCandidate(c)}
                  style={{
                    border: `1px solid ${preview?.candidate.spotify_id === c.spotify_id ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 8, overflow: "hidden",
                    cursor: "pointer", backgroundColor: "var(--bg-elevated)",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = preview?.candidate.spotify_id === c.spotify_id ? "var(--accent)" : "var(--border)")}
                >
                  {c.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.cover_url} alt={c.name} style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", aspectRatio: "1", backgroundColor: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span>♪</span>
                    </div>
                  )}
                  <div style={{ padding: "8px" }}>
                    <p style={{ color: "var(--text)", fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.artist}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 2 }}>{c.release_date?.slice(0, 4)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 미리보기 패널 */}
          {preview && (
            <div style={{
              border: `1px solid ${albumId ? "var(--border)" : "#e05050"}`, borderRadius: 10,
              backgroundColor: "var(--bg-elevated)", padding: 16,
              marginBottom: 12, display: "flex", gap: 16,
            }}>
              {!albumId && (
                <div style={{ position: "absolute", background: "#e05050", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 4, marginTop: -28 }}>
                  ⚠️ 앨범 ID가 없습니다 — 목록에서 앨범을 먼저 선택하세요
                </div>
              )}
              {/* 커버 */}
              <div style={{ flexShrink: 0 }}>
                {preview.candidate.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview.candidate.cover_url} alt={preview.candidate.name}
                    style={{ width: 100, height: 100, borderRadius: 6, objectFit: "cover", border: "1px solid var(--border)" }} />
                ) : (
                  <div style={{ width: 100, height: 100, borderRadius: 6, backgroundColor: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: 24 }}>♪</span>
                  </div>
                )}
              </div>
              {/* 정보 + 트랙리스트 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 14 }}>{preview.candidate.name}</p>
                <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>{preview.candidate.artist} · {preview.candidate.release_date?.slice(0, 4)}</p>
                <div style={{ marginTop: 10 }}>
                  {preview.loading ? (
                    <p style={{ color: "var(--text-muted)", fontSize: 11 }}>트랙리스트 불러오는 중...</p>
                  ) : preview.tracks.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px" }}>
                      {preview.tracks.map((t, i) => (
                        <span key={i} style={{ color: "var(--text-sub)", fontSize: 11 }}>
                          <span style={{ color: "var(--text-muted)", marginRight: 4 }}>{i + 1}</span>{t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: 11 }}>트랙리스트 없음</p>
                  )}
                </div>
                {/* 적용 대상 DB 앨범 */}
                <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, border: `1px solid ${albumId ? "var(--border)" : "#e05050"}`, backgroundColor: "var(--bg)" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 6 }}>적용 대상 DB 앨범</p>
                  {matchedAlbum ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {matchedAlbum.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={matchedAlbum.cover_url} alt="" style={{ width: 36, height: 36, borderRadius: 4, objectFit: "cover", border: "1px solid var(--border)" }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: 4, backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 14 }}>♪</span>
                        </div>
                      )}
                      <div>
                        <p style={{ color: "var(--text)", fontSize: 12, fontWeight: 600 }}>{matchedAlbum.title}</p>
                        <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{matchedAlbum.artist} · ID: {matchedAlbum.id}</p>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: "#e05050", fontSize: 11 }}>⚠️ 위 목록에서 앨범을 먼저 선택하세요 (앨범 ID ≠ Spotify ID)</p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button
                    onClick={() => applyCandidate(preview.candidate, preview.tracks)}
                    disabled={preview.loading || !albumId}
                    style={{
                      padding: "6px 16px", borderRadius: 6, border: "none",
                      backgroundColor: "var(--accent)", color: "var(--bg)", fontWeight: 600, fontSize: 13,
                      cursor: (preview.loading || !albumId) ? "not-allowed" : "pointer",
                      opacity: (preview.loading || !albumId) ? 0.4 : 1,
                    }}
                  >
                    적용
                  </button>
                  <button
                    onClick={() => setPreview(null)}
                    style={{
                      padding: "6px 12px", borderRadius: 6,
                      border: "1px solid var(--border)", backgroundColor: "transparent",
                      color: "var(--text-muted)", fontSize: 13, cursor: "pointer",
                    }}
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}

          {fixMsg && (
            <p style={{ color: fixMsg.startsWith("✅") ? "var(--accent)" : fixMsg.startsWith("⚠️") ? "#df9e30" : "var(--text-muted)", fontSize: 13, marginTop: 8 }}>
              {fixMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
