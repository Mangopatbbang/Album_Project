"use client";

import { useEffect, useRef, useState } from "react";

const GENRES = [
  "Rap & Hiphop", "R&B", "K-pop", "Rock", "외힙", "Pop", "인디",
  "Ballad", "Electronica", "컴필레이션", "Folk", "Alternative",
  "Alternative Rock", "Country", "국외영화", "국내드라마", "국내예능", "기타",
];

type ItunesCandidate = {
  collection_id: number;
  cover_url: string;
  name: string;
  artist: string;
  release_date: string | null;
  collection_type: string;
  genre: string | null;
};

type ItunesResult = {
  found: boolean;
  candidates?: ItunesCandidate[];
};

type DuplicateAlbum = {
  id: string;
  title: string;
  artist: string;
};

type Props = {
  onClose: () => void;
  onAdded: () => void;
};

function CandidateItem({ c, selected, onSelect }: { c: ItunesCandidate; selected: ItunesCandidate | null; onSelect: (c: ItunesCandidate) => void }) {
  const isSelected = selected?.collection_id === c.collection_id;
  return (
    <div
      onClick={() => onSelect(c)}
      style={{
        flexShrink: 0, width: 80, cursor: "pointer",
        opacity: selected && !isSelected ? 0.4 : 1,
        transition: "opacity 0.15s",
      }}
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

export default function AlbumAddModal({ onClose, onAdded }: Props) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [genre, setGenre] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [tracklist, setTracklist] = useState("");

  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [candidates, setCandidates] = useState<ItunesCandidate[]>([]);
  const [showCandidatePopup, setShowCandidatePopup] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<ItunesCandidate | null>(null);
  const [loadingTracklist, setLoadingTracklist] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateAlbum[]>([]);
  const [spotifyId, setSpotifyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const backdropRef = useRef<HTMLDivElement>(null);
  const dupCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // 제목+아티스트 입력 시 중복 체크 (debounce 500ms)
  const checkDuplicates = (titleVal: string, artistVal: string) => {
    if (dupCheckRef.current) clearTimeout(dupCheckRef.current);
    setDuplicates([]);
    if (titleVal.trim().length < 2) return;
    dupCheckRef.current = setTimeout(async () => {
      const q = new URLSearchParams({ search: titleVal.trim() });
      const res = await fetch(`/api/albums?${q}&limit=10`);
      const data = await res.json();
      const titleLower = titleVal.trim().toLowerCase();
      const artistLower = artistVal.trim().toLowerCase();
      const matches = (data.items ?? []).filter((a: DuplicateAlbum) => {
        const titleMatch = a.title.toLowerCase().includes(titleLower);
        const artistMatch = artistLower.length < 2 || a.artist.toLowerCase().includes(artistLower);
        return titleMatch && artistMatch;
      });
      setDuplicates(matches.slice(0, 3));
    }, 500);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSearchDone(false);
    setCandidates([]);
    setSelectedCandidate(null);
    checkDuplicates(val, artist);
  };

  const handleItunesSearch = async () => {
    if (!title.trim() && !artist.trim()) return;
    setSearching(true);
    setSearchDone(false);
    setNotFound(false);
    setCandidates([]);
    setShowCandidatePopup(false);
    setSelectedCandidate(null);
    setError("");

    const q = new URLSearchParams({ title: title.trim(), artist: artist.trim() });
    const res = await fetch(`/api/itunes/search?${q.toString()}`);
    const data: ItunesResult = await res.json();

    setSearching(false);
    setSearchDone(true);

    if (!data.found || !data.candidates?.length) {
      setNotFound(true);
      return;
    }

    setCandidates(data.candidates);
  };

  const handleSelectCandidate = async (c: ItunesCandidate) => {
    setSelectedCandidate(c);
    setTitle(c.name);
    setArtist(c.artist);
    setCoverUrl(c.cover_url);
    if (c.release_date) setReleaseDate(c.release_date);
    if (c.genre && GENRES.includes(c.genre)) setGenre(c.genre);
    setLoadingTracklist(true);
    setSpotifyId(null);
    // iTunes 트랙리스트 + Spotify ID 동시 fetch
    const [itunesRes, spotifyRes] = await Promise.all([
      fetch(`/api/itunes/search?title=${encodeURIComponent(c.name)}&artist=${encodeURIComponent(c.artist)}&collectionId=${c.collection_id}`),
      fetch(`/api/migrate/spotify/search?title=${encodeURIComponent(c.name)}&artist=${encodeURIComponent(c.artist)}`),
    ]);
    const itunesData = await itunesRes.json();
    setTracklist(itunesData.tracklist ?? "");
    const spotifyData = await spotifyRes.json();
    const matched = spotifyData.results?.[0];
    if (matched) {
      setSpotifyId(matched.spotify_id);
      if (!c.cover_url && matched.cover_url) setCoverUrl(matched.cover_url);
    }
    setLoadingTracklist(false);
  };

  const trackCount = tracklist.trim()
    ? tracklist.split(";").map((t) => t.trim()).filter(Boolean).length
    : null;
  const isSingle = trackCount !== null && trackCount <= 2;

  const handleSubmit = async () => {
    if (!title.trim() || !artist.trim()) {
      setError("제목과 아티스트는 필수입니다.");
      return;
    }
    if (isSingle) {
      setError("싱글 앨범은 등록할 수 없습니다. (수록곡 3개 이상)");
      return;
    }
    setSaving(true);
    setError("");

    const res = await fetch("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        artist: artist.trim(),
        year: releaseDate ? releaseDate.slice(0, 4) : null,
        release_date: releaseDate || null,
        genre: genre || null,
        cover_url: coverUrl || null,
        tracklist: tracklist || null,
        spotify_id: spotifyId || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "저장 실패");
      setSaving(false);
      return;
    }

    setSaving(false);
    onAdded();
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
  };

  const labelStyle = {
    color: "var(--text-muted)",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    marginBottom: 6,
    display: "block" as const,
  };

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)",
        zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div style={{
        backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 14, width: "100%", maxWidth: 560, maxHeight: "90vh",
        overflowY: "auto", padding: 32, display: "flex", flexDirection: "column", gap: 20,
      }}>
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 18 }}>음반 입고</p>
          <button onClick={onClose} style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>

        {/* 제목 + 아티스트 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>TITLE *</label>
            <input
              style={inputStyle}
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleItunesSearch(); }}
              placeholder="음반 제목"
            />
            {/* 중복 경고 */}
            {duplicates.length > 0 && (
              <div style={{
                marginTop: 8, padding: "10px 12px", borderRadius: 6,
                backgroundColor: "rgba(224,80,80,0.08)", border: "1px solid rgba(224,80,80,0.3)",
              }}>
                <p style={{ color: "#e05050", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
                  이미 입고된 음반입니다
                </p>
                {duplicates.map((d) => (
                  <p key={d.id} style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    · {d.title} — {d.artist}
                  </p>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>ARTIST *</label>
            <input
              style={inputStyle}
              value={artist}
              onChange={(e) => { setArtist(e.target.value); setSearchDone(false); checkDuplicates(title, e.target.value); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleItunesSearch(); }}
              placeholder="아티스트"
            />
          </div>

          <button
            onClick={handleItunesSearch}
            disabled={searching || (!title.trim() && !artist.trim())}
            style={{
              backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-light)",
              color: "var(--text-sub)", borderRadius: 6, padding: "8px 16px", fontSize: 13,
              cursor: searching || (!title.trim() && !artist.trim()) ? "not-allowed" : "pointer",
              opacity: searching || (!title.trim() && !artist.trim()) ? 0.5 : 1,
              alignSelf: "flex-start",
            }}
          >
            {searching ? "검색 중..." : "Spotify에서 검색"}
          </button>

          {searchDone && notFound && (
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
              Spotify에서 찾지 못했습니다. 직접 입력하거나 그냥 저장하세요.
            </p>
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
                {candidates.slice(0, 5).map((c) => <CandidateItem key={c.collection_id} c={c} selected={selectedCandidate} onSelect={handleSelectCandidate} />)}
              </div>
              {loadingTracklist && (
                <p style={{ color: "var(--text-muted)", fontSize: 11 }}>수록곡 불러오는 중...</p>
              )}
            </div>
          )}

          {/* 전체 후보 팝업 */}
          {showCandidatePopup && (
            <div
              onClick={() => setShowCandidatePopup(false)}
              style={{
                position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)",
                zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: 14, width: "100%", maxWidth: 600, maxHeight: "80vh",
                  overflowY: "auto", padding: 28, display: "flex", flexDirection: "column", gap: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 15 }}>검색 결과 전체 ({candidates.length}개)</p>
                  <button onClick={() => setShowCandidatePopup(false)} style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>×</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 12 }}>
                  {candidates.map((c) => (
                    <CandidateItem
                      key={c.collection_id}
                      c={c}
                      selected={selectedCandidate}
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
              ? <img src={coverUrl} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />  // eslint-disable-line @next/next/no-img-element
              : <span style={{ color: "var(--text-muted)", fontSize: 28 }}>♪</span>
            }
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>COVER URL</label>
            <input
              style={inputStyle}
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="자동 입력 또는 직접 붙여넣기"
            />
          </div>
        </div>

        {/* 발매일 + 장르 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>RELEASE DATE</label>
            <input
              style={inputStyle}
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div>
            <label style={labelStyle}>GENRE</label>
            <select style={{ ...inputStyle, cursor: "pointer" }} value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option value="">선택 안함</option>
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        {/* 트랙리스트 */}
        <div>
          <label style={labelStyle}>수록곡</label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: "vertical", fontFamily: "inherit" }}
            value={tracklist}
            onChange={(e) => setTracklist(e.target.value)}
            placeholder="자동 입력 또는 직접 입력 (트랙은 ; 로 구분)"
          />
        </div>

        {error && <p style={{ color: "#e05050", fontSize: 12 }}>{error}</p>}

        {/* 버튼 */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            backgroundColor: "transparent", border: "1px solid var(--border)",
            color: "var(--text-muted)", borderRadius: 6, padding: "8px 20px", fontSize: 13, cursor: "pointer",
          }}>취소</button>
          <button onClick={handleSubmit} disabled={saving || duplicates.length > 0} style={{
            backgroundColor: "var(--accent)", border: "none", color: "var(--bg)",
            borderRadius: 6, padding: "8px 20px", fontSize: 13, fontWeight: 600,
            cursor: saving || duplicates.length > 0 ? "not-allowed" : "pointer",
            opacity: saving || duplicates.length > 0 ? 0.4 : 1,
          }}>
            {saving ? "입고 중..." : "입고"}
          </button>
        </div>
      </div>
    </div>
  );
}
