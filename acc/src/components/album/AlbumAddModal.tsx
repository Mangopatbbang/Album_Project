"use client";

import { useEffect, useRef, useState } from "react";

const GENRES = [
  "Rock", "Pop", "Jazz", "R&B", "Hip-Hop", "Electronic", "Classical",
  "Folk", "Country", "Metal", "Indie", "Soul", "Funk", "Blues",
  "Reggae", "Latin", "World", "Ambient", "Punk", "Alternative", "기타",
];

type ItunesResult = {
  found: boolean;
  cover_url?: string;
  name?: string;
  artist?: string;
  release_date?: string | null;
  tracklist?: string | null;
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
  const [duplicates, setDuplicates] = useState<DuplicateAlbum[]>([]);
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
    checkDuplicates(val, artist);
  };

  const handleItunesSearch = async () => {
    if (!title.trim() || !artist.trim()) return;
    setSearching(true);
    setSearchDone(false);
    setNotFound(false);
    setError("");

    const q = new URLSearchParams({ title: title.trim(), artist: artist.trim() });
    const res = await fetch(`/api/itunes/search?${q.toString()}`);
    const data: ItunesResult = await res.json();

    setSearching(false);
    setSearchDone(true);

    if (!data.found) {
      setNotFound(true);
      return;
    }

    setCoverUrl(data.cover_url ?? "");
    setTracklist(data.tracklist ?? "");
    if (data.release_date) setReleaseDate(data.release_date);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !artist.trim()) {
      setError("제목과 아티스트는 필수입니다.");
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
              placeholder="아티스트"
            />
          </div>

          <button
            onClick={handleItunesSearch}
            disabled={searching || !title.trim() || !artist.trim()}
            style={{
              backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-light)",
              color: "var(--text-sub)", borderRadius: 6, padding: "8px 16px", fontSize: 13,
              cursor: searching || !title.trim() || !artist.trim() ? "not-allowed" : "pointer",
              opacity: searching || !title.trim() || !artist.trim() ? 0.5 : 1,
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
          <button onClick={handleSubmit} disabled={saving} style={{
            backgroundColor: "var(--accent)", border: "none", color: "var(--bg)",
            borderRadius: 6, padding: "8px 20px", fontSize: 13, fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "입고 중..." : "입고"}
          </button>
        </div>
      </div>
    </div>
  );
}
