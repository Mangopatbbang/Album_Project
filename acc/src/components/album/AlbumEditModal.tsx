"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { parseExtraArtistNames } from "@/lib/extraArtists";
import { koGenre } from "@/lib/bio";
import { apiFetch } from "@/lib/apiFetch";

const GENRES = [
  "Hip-Hop", "R&B", "Pop", "Rock",
  "Electronic", "Folk", "Alternative", "Jazz", "Country", "OST", "Compilation", "Other",
];

const REGIONS = ["국내", "해외"] as const;

type SpotifyCandidate = {
  spotify_id: string;
  cover_url: string;
  name: string;
  artist: string;
  extra_artists?: string;
  release_date: string | null;
};

type ArtistHint = {
  name: string;
  followers: number;
  image: string | null;
};

type Props = {
  album: {
    id: string;
    title: string;
    artist: string;
    use_artist_variant?: boolean | null;
    extra_artists?: string | null;
    year?: string | null;
    release_date?: string | null;
    genre?: string | null;
    region?: string | null;
    cover_url?: string | null;
    tracklist?: string | null;
  };
  onClose: () => void;
  onSaved: () => void;
};

function CandidateItem({ c, selected, onSelect }: { c: SpotifyCandidate; selected: SpotifyCandidate | null; onSelect: (c: SpotifyCandidate) => void }) {
  const isSelected = selected?.spotify_id === c.spotify_id;
  return (
    <div
      onClick={() => onSelect(c)}
      style={{ flexShrink: 0, width: 80, cursor: "pointer", opacity: selected && !isSelected ? 0.4 : 1, transition: "opacity 0.15s" }}
    >
      <div style={{
        width: 80, height: 80, borderRadius: 6, overflow: "hidden",
        border: `2px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
        backgroundColor: "var(--bg-elevated)", transition: "border-color 0.15s",
      }}>
        {c.cover_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={c.cover_url} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 20 }}>♪</span></div>
        }
      </div>
      <p style={{
        color: isSelected ? "var(--accent)" : "var(--text-muted)",
        fontSize: 10, marginTop: 4, lineHeight: 1.3,
        overflow: "hidden", display: "-webkit-box",
        WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
      }}>{c.name}</p>
      <p style={{ color: "var(--text-muted)", fontSize: 9, marginTop: 2, opacity: 0.7 }}>{c.artist}</p>
    </div>
  );
}

export default function AlbumEditModal({ album, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [title, setTitle] = useState(album.title);
  const [extraArtists, setExtraArtists] = useState(album.extra_artists ?? "");
  const [releaseDate, setReleaseDate] = useState(album.release_date ?? album.year ?? "");
  const [genre, setGenre] = useState(koGenre(album.genre ?? ""));
  const [region, setRegion] = useState(album.region ?? "");
  const [coverUrl, setCoverUrl] = useState(album.cover_url ?? "");
  const [tracklist, setTracklist] = useState(album.tracklist ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [useVariant, setUseVariant] = useState(album.use_artist_variant ?? false);
  const [variantName, setVariantName] = useState<string | null>(null);
  const [spotifyId, setSpotifyId] = useState<string | null>(null);

  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [candidates, setCandidates] = useState<SpotifyCandidate[]>([]);
  const [showCandidatePopup, setShowCandidatePopup] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<SpotifyCandidate | null>(null);
  const [loadingTracklist, setLoadingTracklist] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [artistHints, setArtistHints] = useState<ArtistHint[]>([]);

  const backdropRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);

  // 아티스트 별칭 조회
  useEffect(() => {
    fetch(`/api/admin/artist-aliases?artist=${encodeURIComponent(album.artist)}`)
      .then((r) => r.json())
      .then((d) => { if (d.alias) setVariantName(d.alias.variant_name); })
      .catch(() => {});
  }, [album.artist]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      // 모달 열려있을 때 포커스가 input/textarea 밖에서 Backspace 누르면 브라우저 뒤로가기 방지
      if (e.key === "Backspace") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") e.preventDefault();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleSearch = async () => {
    if (!title.trim() && !album.artist.trim()) return;
    setSearching(true);
    setSearchError("");
    setNotFound(false);
    setCandidates([]);
    setArtistHints([]);
    setSelectedCandidate(null);
    setError("");

    let data: { results?: SpotifyCandidate[]; error?: string; message?: string };
    try {
      const q = new URLSearchParams({ title: title.trim(), artist: album.artist.trim() });
      const res = await fetch(`/api/migrate/spotify/search?${q.toString()}`);
      data = await res.json();
    } catch {
      setSearching(false);
      setSearchError("네트워크 오류: 검색 요청에 실패했습니다.");
      return;
    }

    setSearching(false);

    if (data.error) {
      setSearchError(data.message ?? "Spotify 검색 오류가 발생했습니다.");
      return;
    }

    if (!data.results?.length) {
      setNotFound(true);
      if (album.artist.trim()) {
        fetch(`/api/spotify/artist-hint?artist=${encodeURIComponent(album.artist.trim())}`)
          .then((r) => r.json())
          .then((d) => setArtistHints(d.hints ?? []))
          .catch(() => {});
      }
      return;
    }
    setCandidates(data.results);
  };

  const handleSelectCandidate = async (c: SpotifyCandidate) => {
    setSelectedCandidate(c);
    setTitle(c.name);
    setExtraArtists(c.extra_artists ?? "");
    setCoverUrl(c.cover_url);
    if (c.release_date) setReleaseDate(c.release_date);
    setSpotifyId(c.spotify_id);
    setLoadingTracklist(true);
    try {
      const res = await fetch(`/api/spotify/tracks?id=${c.spotify_id}`);
      const data = await res.json();
      setTracklist(data.tracklist ?? "");
    } catch {
      // 트랙리스트 fetch 실패 시 빈 값 유지
    } finally {
      setLoadingTracklist(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("제목은 필수입니다.");
      return;
    }
    setSaving(true);
    setError("");

    const res = await apiFetch(`/api/albums/${album.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        extra_artists: extraArtists.trim() || null,
        release_date: releaseDate || null,
        year: releaseDate ? releaseDate.slice(0, 4) : null,
        genre: genre || null,
        region: region || null,
        cover_url: coverUrl || null,
        tracklist: tracklist || null,
        use_artist_variant: useVariant,
        ...(spotifyId ? { spotify_id: spotifyId } : {}),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "저장 실패");
      setSaving(false);
      return;
    }

    setSaving(false);
    showToast("앨범 정보를 수정했어요");
    onSaved();
    onClose();
  };

  const inputStyle = {
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 13,
    outline: "none",
    width: "100%",
  } as const;

  const labelStyle = {
    color: "var(--text-muted)",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    marginBottom: 6,
    display: "block",
  } as const;

  return (
    <div
      ref={backdropRef}
      onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === backdropRef.current; }}
      onMouseUp={(e) => { if (mouseDownOnBackdrop.current && e.target === backdropRef.current) onClose(); mouseDownOnBackdrop.current = false; }}
      style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)",
        zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{
        backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 14, width: "100%", maxWidth: 560, maxHeight: "90vh",
        overflowY: "auto", display: "flex", flexDirection: "column", gap: 20,
        padding: 28,
      }}>
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 18 }}>앨범 수정</p>
          <button onClick={onClose} style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 20 }} className="touch-target">×</button>
        </div>

        {/* 제목 + 아티스트 + 검색 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>제목 *</label>
            <input
              style={inputStyle} value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            />
          </div>
          <div>
            <label style={labelStyle}>아티스트 (Spotify 정식명 — 변경 불가)</label>
            <input
              style={{ ...inputStyle, color: "var(--text-muted)", cursor: "default" }}
              value={album.artist}
              readOnly
            />
            {/* 별칭(한글명) 또는 개별 아티스트명 토글 */}
            {(variantName || extraArtists.trim()) && (
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setUseVariant(!useVariant)}
                  style={{
                    width: 36, height: 20, borderRadius: 10, border: "none",
                    backgroundColor: useVariant ? "var(--accent)" : "var(--border-light)",
                    position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s",
                  }}
                >
                  <span style={{
                    position: "absolute", top: 2, left: useVariant ? 18 : 2,
                    width: 16, height: 16, borderRadius: "50%",
                    backgroundColor: "white", transition: "left 0.2s",
                  }} />
                </button>
                {variantName ? (
                  <span style={{ color: "var(--text-sub)", fontSize: 12 }}>
                    한글명으로 표시: <span style={{ color: "var(--text)", fontWeight: 600 }}>{variantName}</span>
                  </span>
                ) : (
                  <span style={{ color: "var(--text-sub)", fontSize: 12 }}>
                    개별 이름으로 표시:{" "}
                    <span style={{ color: "var(--text)", fontWeight: 600 }}>
                      {extraArtists.split(";").map((s) => s.trim()).filter(Boolean).join(", ")}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>참여 아티스트</label>
            <input
              style={inputStyle} value={extraArtists}
              onChange={(e) => setExtraArtists(e.target.value)}
              placeholder="여러 명이면 ; 로 구분"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || (!title.trim() && !album.artist.trim())}
            style={{
              backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-light)",
              color: "var(--text-sub)", borderRadius: 6, padding: "8px 16px", fontSize: 13,
              cursor: searching || (!title.trim() && !album.artist.trim()) ? "not-allowed" : "pointer",
              opacity: searching || (!title.trim() && !album.artist.trim()) ? 0.5 : 1,
              alignSelf: "flex-start",
            }}
          >
            {searching ? "검색 중…" : "Spotify에서 검색"}
          </button>

          {searchError && (
            <p style={{ color: "var(--error)", fontSize: 12, marginTop: 4 }}>
              ⚠ {searchError}
            </p>
          )}

          {notFound && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                찾지 못했습니다. 아티스트 영문명이 다를 수 있어요.
              </p>
              {artistHints.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600 }}>
                    혹시 이 아티스트를 찾으셨나요?
                  </p>
                  {artistHints.map((h) => (
                    <button
                      key={h.name}
                      type="button"
                      onClick={() => { setArtistHints([]); setNotFound(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        background: "var(--bg-elevated)", border: "1px solid var(--border)",
                        borderRadius: 6, padding: "6px 10px", cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {h.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={h.image} alt={h.name} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      )}
                      <div>
                        <p style={{ color: "var(--text)", fontSize: 12, fontWeight: 600 }}>{h.name}</p>
                        <p style={{ color: "var(--text-muted)", fontSize: 10 }}>팔로워 {h.followers.toLocaleString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 후보 목록 */}
          {candidates.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600 }}>
                  검색 결과 — 앨범을 선택하세요
                </p>
                {candidates.length > 5 && (
                  <button
                    onClick={() => setShowCandidatePopup(true)}
                    style={{ color: "var(--text-muted)", fontSize: 11, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                  >
                    더보기 ({candidates.length}개 전체)
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {candidates.slice(0, 5).map((c) => (
                  <CandidateItem key={c.spotify_id} c={c} selected={selectedCandidate} onSelect={handleSelectCandidate} />
                ))}
              </div>
              {loadingTracklist && <p style={{ color: "var(--text-muted)", fontSize: 11 }}>수록곡 불러오는 중…</p>}
            </div>
          )}

          {/* 전체 후보 팝업 */}
          {showCandidatePopup && (
            <div
              onClick={() => setShowCandidatePopup(false)}
              style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, width: "100%", maxWidth: 600, maxHeight: "80vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 15 }}>검색 결과 전체 ({candidates.length}개)</p>
                  <button onClick={() => setShowCandidatePopup(false)} style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>×</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 12 }}>
                  {candidates.map((c) => (
                    <CandidateItem
                      key={c.spotify_id} c={c} selected={selectedCandidate}
                      onSelect={(candidate) => { handleSelectCandidate(candidate); setShowCandidatePopup(false); }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 커버 미리보기 + URL */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{
            width: 96, height: 96, flexShrink: 0, borderRadius: 8, overflow: "hidden",
            backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {coverUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={coverUrl} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ color: "var(--text-muted)", fontSize: 28 }}>♪</span>
            }
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>커버 URL</label>
            <input style={inputStyle} value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
          </div>
        </div>

        {/* 발매일 + 장르 + 국내외 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label style={labelStyle}>발매일</label>
            <input style={inputStyle} value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} placeholder="YYYY-MM-DD" />
          </div>
          <div>
            <label style={labelStyle}>장르</label>
            <select style={{ ...inputStyle, cursor: "pointer" }} value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option value="">선택 안함</option>
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>국내 / 해외</label>
            <div style={{ display: "flex", gap: 6, height: 36 }}>
              {REGIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegion(region === r ? "" : r)}
                  style={{
                    flex: 1, borderRadius: 6, border: "1px solid",
                    borderColor: region === r ? "var(--accent)" : "var(--border)",
                    backgroundColor: region === r ? "rgba(var(--accent-rgb), 0.12)" : "var(--bg-elevated)",
                    color: region === r ? "var(--accent)" : "var(--text-muted)",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 트랙리스트 */}
        <div>
          <label style={labelStyle}>수록곡</label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: "vertical", fontFamily: "inherit" }}
            value={tracklist}
            onChange={(e) => setTracklist(e.target.value)}
            placeholder="트랙은 ; 로 구분"
          />
        </div>

        {error && <p style={{ color: "var(--error)", fontSize: 12 }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            backgroundColor: "transparent", border: "1px solid var(--border)",
            color: "var(--text)", borderRadius: 6, padding: "8px 20px", fontSize: 13, cursor: "pointer",
          }}>취소</button>
          <button onClick={handleSave} disabled={saving} style={{
            backgroundColor: "var(--accent)", border: "none", color: "var(--bg)",
            borderRadius: 6, padding: "8px 20px", fontSize: 13, fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
          }}>
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
