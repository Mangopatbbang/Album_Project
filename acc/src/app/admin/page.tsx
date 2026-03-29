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

export default function AdminPage() {
  // --- 마이그레이션 ---
  const [running, setRunning] = useState(false);
  const [migLog, setMigLog] = useState<string[]>([]);
  const [totalSuccess, setTotalSuccess] = useState(0);
  const [totalNotFound, setTotalNotFound] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const stopRef = useRef(false);

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

  // --- 커버 교정 ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchArtist, setSearchArtist] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [candidates, setCandidates] = useState<SpotifyCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [fixMsg, setFixMsg] = useState("");

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
    setSearchQuery(a.title);
    setSearchArtist(a.artist);
    setCandidates([]);
    setFixMsg("");
  }

  async function searchSpotify() {
    setSearching(true);
    setCandidates([]);
    setFixMsg("");
    const res = await fetch(
      `/api/migrate/spotify/search?title=${encodeURIComponent(searchQuery)}&artist=${encodeURIComponent(searchArtist)}`
    );
    const data = await res.json();
    setCandidates(data.results ?? []);
    setSearching(false);
  }

  async function applyCandidate(c: SpotifyCandidate) {
    if (!albumId) { setFixMsg("앨범 ID를 먼저 입력하세요"); return; }
    setFixMsg("적용 중...");

    // 서버에서 트랙리스트 자동 fetch (PATCH 핸들러가 처리)
    const res = await fetch(`/api/albums/${albumId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spotify_id: c.spotify_id, cover_url: c.cover_url }),
    });

    if (res.ok) {
      setFixMsg(`✅ "${c.name}" (${c.artist}) 적용 완료`);
      setAlbums((prev) => prev.filter((a) => a.id !== albumId));
      setAlbumId("");
      setCandidates([]);
    } else {
      setFixMsg("❌ 업데이트 실패");
    }
  }

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh", padding: "40px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 22, marginBottom: 32, letterSpacing: "-0.03em" }}>
          Admin
        </p>

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
              placeholder="앨범 제목"
              style={{
                padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)",
                backgroundColor: "var(--bg-elevated)", color: "var(--text)", fontSize: 13,
              }}
            />
            <input
              value={searchArtist}
              onChange={(e) => setSearchArtist(e.target.value)}
              placeholder="아티스트"
              style={{
                padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)",
                backgroundColor: "var(--bg-elevated)", color: "var(--text)", fontSize: 13,
              }}
            />
            <button
              onClick={searchSpotify}
              disabled={searching || !searchQuery}
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 12 }}>
              {candidates.map((c) => (
                <div
                  key={c.spotify_id}
                  onClick={() => applyCandidate(c)}
                  style={{
                    border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden",
                    cursor: "pointer", backgroundColor: "var(--bg-elevated)",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
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

          {fixMsg && (
            <p style={{ color: fixMsg.startsWith("✅") ? "var(--accent)" : "var(--text-muted)", fontSize: 13, marginTop: 8 }}>
              {fixMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
