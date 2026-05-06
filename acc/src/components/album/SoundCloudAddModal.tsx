"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";

const GENRES = [
  "Hip-Hop", "R&B", "Pop", "Rock",
  "Electronic", "Folk", "Alternative", "Jazz", "Country", "OST", "Compilation", "Other",
];

type Props = {
  onClose: () => void;
  onAdded: () => void;
};

type OEmbedResult = {
  title: string;
  author: string;
  thumbnail: string | null;
};

export default function SoundCloudAddModal({ onClose, onAdded }: Props) {
  const { showToast } = useToast();
  const { profile } = useAuth();

  const [scUrl, setScUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [preview, setPreview] = useState<OEmbedResult | null>(null);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [genre, setGenre] = useState("");
  const [tracklist, setTracklist] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const backdropRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleFetch = async () => {
    if (!scUrl.trim()) return;
    setFetching(true);
    setFetchError("");
    setPreview(null);

    try {
      const res = await fetch(`/api/soundcloud/oembed?url=${encodeURIComponent(scUrl.trim())}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setFetchError(data.error ?? "가져오기 실패");
        setFetching(false);
        return;
      }
      setPreview(data);
      setTitle(data.title ?? "");
      setArtist(data.author ?? "");
      setCoverUrl(data.thumbnail ?? "");
    } catch {
      setFetchError("네트워크 오류");
    }
    setFetching(false);
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
        extra_artists: null,
        year: releaseDate ? releaseDate.slice(0, 4) : null,
        release_date: releaseDate || null,
        genre: genre || null,
        cover_url: coverUrl || null,
        tracklist: tracklist || null,
        spotify_id: null,
        soundcloud_url: scUrl.trim() || null,
        added_by: profile?.id ?? null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "저장 실패");
      setSaving(false);
      return;
    }

    setSaving(false);
    showToast(`${title} 입고 완료`);
    onAdded();
    onClose();
  };

  const inputStyle = {
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: 6,
    padding: "10px 14px",
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
      onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === backdropRef.current; }}
      onMouseUp={(e) => { if (mouseDownOnBackdrop.current && e.target === backdropRef.current) onClose(); mouseDownOnBackdrop.current = false; }}
      style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)",
        zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center",
      }}
      className="p-3 sm:p-6"
    >
      <div
        style={{
          backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 14, width: "100%", maxWidth: 540, maxHeight: "90vh",
          overflowY: "auto", display: "flex", flexDirection: "column", gap: 28,
          opacity: 0.9,
        }}
        className="p-7 sm:p-10"
      >
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 17 }}>SoundCloud 음반 입고</p>
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
              SoundCloud 앨범 URL을 붙여넣으면 정보를 가져옵니다
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 20 }}
            className="touch-target"
          >×</button>
        </div>

        {/* URL 입력 */}
        <div>
          <label style={labelStyle}>SOUNDCLOUD URL</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={scUrl}
              onChange={(e) => { setScUrl(e.target.value); setFetchError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleFetch(); }}
              placeholder="https://soundcloud.com/artist/album"
            />
            <button
              onClick={handleFetch}
              disabled={fetching || !scUrl.trim()}
              style={{
                backgroundColor: "#f50", border: "none",
                color: "#fff", borderRadius: 6, padding: "8px 14px",
                fontSize: 12, fontWeight: 600, cursor: fetching || !scUrl.trim() ? "not-allowed" : "pointer",
                opacity: fetching || !scUrl.trim() ? 0.5 : 1, flexShrink: 0,
              }}
            >
              {fetching ? "가져오는 중..." : "가져오기"}
            </button>
          </div>
          {fetchError && (
            <p style={{ color: "#e05050", fontSize: 12, marginTop: 6 }}>⚠ {fetchError}</p>
          )}
        </div>

        {/* oEmbed 프리뷰 */}
        {preview && (
          <div style={{
            display: "flex", gap: 12, alignItems: "center",
            padding: "12px", borderRadius: 8,
            backgroundColor: "rgba(255,85,0,0.06)", border: "1px solid rgba(255,85,0,0.2)",
          }}>
            {preview.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.thumbnail}
                alt="cover"
                style={{ width: 56, height: 56, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
              />
            )}
            <div>
              <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 600 }}>{preview.title}</p>
              <p style={{ color: "var(--text-muted)", fontSize: 12 }}>{preview.author}</p>
            </div>
          </div>
        )}

        {/* 커버 미리보기 + URL — 항상 표시 */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{
            width: 80, height: 80, flexShrink: 0, borderRadius: 8, overflow: "hidden",
            backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {coverUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={coverUrl} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ color: "var(--text-muted)", fontSize: 24 }}>♪</span>
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

        {/* 제목 + 아티스트 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>TITLE *</label>
            <input
              style={inputStyle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="음반 제목"
            />
          </div>
          <div>
            <label style={labelStyle}>ARTIST *</label>
            <input
              style={inputStyle}
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="아티스트"
            />
          </div>
        </div>

        {/* 발매일 + 장르 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <label style={labelStyle}>장르</label>
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
            placeholder="직접 입력 (트랙은 ; 로 구분)"
          />
        </div>

        {error && <p style={{ color: "#e05050", fontSize: 12 }}>{error}</p>}

        {/* 버튼 */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            backgroundColor: "transparent", border: "1px solid var(--border)",
            color: "var(--text)", borderRadius: 6, padding: "8px 20px", fontSize: 13, cursor: "pointer",
          }}>취소</button>
          <button onClick={handleSubmit} disabled={saving} style={{
            backgroundColor: "#f50", border: "none", color: "#fff",
            borderRadius: 6, padding: "8px 20px", fontSize: 13, fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.5 : 1,
          }}>
            {saving ? "입고 중..." : "입고"}
          </button>
        </div>
      </div>
    </div>
  );
}
