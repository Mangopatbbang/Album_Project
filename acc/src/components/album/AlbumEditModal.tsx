"use client";

import { useEffect, useRef, useState } from "react";

const GENRES = [
  "Rock", "Pop", "Jazz", "R&B", "Hip-Hop", "Electronic", "Classical",
  "Folk", "Country", "Metal", "Indie", "Soul", "Funk", "Blues",
  "Reggae", "Latin", "World", "Ambient", "Punk", "Alternative", "기타",
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

type Props = {
  album: {
    id: string;
    title: string;
    artist: string;
    year?: string | null;
    genre?: string | null;
    cover_url?: string | null;
    tracklist?: string | null;
  };
  onClose: () => void;
  onSaved: () => void;
};

function CandidateItem({ c, selected, onSelect }: { c: ItunesCandidate; selected: ItunesCandidate | null; onSelect: (c: ItunesCandidate) => void }) {
  const isSelected = selected?.collection_id === c.collection_id;
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
  const [title, setTitle] = useState(album.title);
  const [artist, setArtist] = useState(album.artist);
  const [year, setYear] = useState(album.year ?? "");
  const [genre, setGenre] = useState(album.genre ?? "");
  const [coverUrl, setCoverUrl] = useState(album.cover_url ?? "");
  const [tracklist, setTracklist] = useState(album.tracklist ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<ItunesCandidate[]>([]);
  const [showCandidatePopup, setShowCandidatePopup] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<ItunesCandidate | null>(null);
  const [loadingTracklist, setLoadingTracklist] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const backdropRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);

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
    if (!title.trim() && !artist.trim()) return;
    setSearching(true);
    setNotFound(false);
    setCandidates([]);
    setSelectedCandidate(null);
    setError("");

    const q = new URLSearchParams({ title: title.trim(), artist: artist.trim() });
    const res = await fetch(`/api/itunes/search?${q.toString()}`);
    const data = await res.json();
    setSearching(false);

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
    if (c.release_date) setYear(c.release_date.slice(0, 4));
    if (c.genre && GENRES.includes(c.genre)) setGenre(c.genre);
    setLoadingTracklist(true);
    // state 업데이트는 비동기이므로 c에서 직접 최신값 사용
    const q = new URLSearchParams({ title: c.name.trim(), artist: c.artist.trim(), collectionId: String(c.collection_id) });
    try {
      const res = await fetch(`/api/itunes/search?${q.toString()}`);
      const data = await res.json();
      setTracklist(data.tracklist ?? "");
    } catch {
      // 트랙리스트 fetch 실패 시 빈 값 유지
    } finally {
      setLoadingTracklist(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !artist.trim()) {
      setError("제목과 아티스트는 필수입니다.");
      return;
    }
    setSaving(true);
    setError("");

    const res = await fetch(`/api/albums/${album.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        artist: artist.trim(),
        year: year ? year.slice(0, 4) : null,
        genre: genre || null,
        cover_url: coverUrl || null,
        tracklist: tracklist || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "저장 실패");
      setSaving(false);
      return;
    }

    setSaving(false);
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
        zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div style={{
        backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 14, width: "100%", maxWidth: 560, maxHeight: "90vh",
        overflowY: "auto", padding: 32, display: "flex", flexDirection: "column", gap: 20,
      }}>
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 18 }}>앨범 수정</p>
          <button onClick={onClose} style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>

        {/* 제목 + 아티스트 + 검색 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>TITLE *</label>
            <input
              style={inputStyle} value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            />
          </div>
          <div>
            <label style={labelStyle}>ARTIST *</label>
            <input
              style={inputStyle} value={artist}
              onChange={(e) => setArtist(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            />
          </div>
          <button
            onClick={handleSearch}
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

          {notFound && (
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>찾지 못했습니다. 직접 입력하세요.</p>
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
                  <CandidateItem key={c.collection_id} c={c} selected={selectedCandidate} onSelect={handleSelectCandidate} />
                ))}
              </div>
              {loadingTracklist && <p style={{ color: "var(--text-muted)", fontSize: 11 }}>수록곡 불러오는 중...</p>}
            </div>
          )}

          {/* 전체 후보 팝업 */}
          {showCandidatePopup && (
            <div
              onClick={() => setShowCandidatePopup(false)}
              style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, width: "100%", maxWidth: 600, maxHeight: "80vh", overflowY: "auto", padding: 28, display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 15 }}>검색 결과 전체 ({candidates.length}개)</p>
                  <button onClick={() => setShowCandidatePopup(false)} style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>×</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 12 }}>
                  {candidates.map((c) => (
                    <CandidateItem
                      key={c.collection_id} c={c} selected={selectedCandidate}
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
            <label style={labelStyle}>COVER URL</label>
            <input style={inputStyle} value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
          </div>
        </div>

        {/* 발매일 + 장르 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>YEAR</label>
            <input style={inputStyle} value={year} onChange={(e) => setYear(e.target.value)} placeholder="YYYY" maxLength={4} />
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
            placeholder="트랙은 ; 로 구분"
          />
        </div>

        {error && <p style={{ color: "#e05050", fontSize: 12 }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            backgroundColor: "transparent", border: "1px solid var(--border)",
            color: "var(--text-muted)", borderRadius: 6, padding: "8px 20px", fontSize: 13, cursor: "pointer",
          }}>취소</button>
          <button onClick={handleSave} disabled={saving} style={{
            backgroundColor: "var(--accent)", border: "none", color: "var(--bg)",
            borderRadius: 6, padding: "8px 20px", fontSize: 13, fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
          }}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
