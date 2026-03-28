"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

type Album = {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
};

type Entry = {
  album: Album;
  comment: string;
};

type Props = {
  onClose: () => void;
  onSaved: () => void;
};

export default function PlaylistEditor({ onClose, onSaved }: Props) {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Album[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
  const title = `${dateStr} 플레이리스트`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/albums?search=${encodeURIComponent(val)}&limit=8`);
      const data = await res.json();
      setSearchResults(data.items ?? []);
      setSearching(false);
    }, 300);
  };

  const addAlbum = (album: Album) => {
    if (entries.find((e) => e.album.id === album.id)) return;
    setEntries((prev) => [...prev, { album, comment: "" }]);
    setSearch("");
    setSearchResults([]);
  };

  const removeEntry = (id: string) => setEntries((prev) => prev.filter((e) => e.album.id !== id));

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setEntries((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (idx: number) => {
    if (idx === entries.length - 1) return;
    setEntries((prev) => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const updateComment = (id: string, comment: string) => {
    setEntries((prev) => prev.map((e) => e.album.id === id ? { ...e, comment } : e));
  };

  const handleSave = async () => {
    if (!profile) { setError("로그인이 필요합니다."); return; }
    if (entries.length === 0) { setError("앨범을 최소 1개 추가해주세요."); return; }
    setSaving(true);
    setError("");

    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: profile.id,
        title,
        entries: entries.map((e, i) => ({
          album_id: e.album.id,
          comment: e.comment,
          sort_order: i,
        })),
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
  };

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)",
        zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div style={{
        backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 14, width: "100%", maxWidth: 640, maxHeight: "92vh",
        overflowY: "auto", padding: 32, display: "flex", flexDirection: "column", gap: 24,
      }}>
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 4 }}>NEW PLAYLIST</p>
            <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 20 }}>{title}</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>

        {/* 앨범 검색 */}
        <div>
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>ALBUM 추가</p>
          <div style={{ position: "relative" }}>
            <input
              style={inputStyle}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="제목 또는 아티스트 검색..."
            />
            {(searchResults.length > 0 || searching) && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
                borderRadius: 8, marginTop: 4, overflow: "hidden",
              }}>
                {searching && (
                  <p style={{ color: "var(--text-muted)", fontSize: 12, padding: "10px 14px" }}>검색 중...</p>
                )}
                {searchResults.map((album) => {
                  const already = entries.find((e) => e.album.id === album.id);
                  return (
                    <button
                      key={album.id}
                      onClick={() => addAlbum(album)}
                      disabled={!!already}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 14px", background: "none", border: "none",
                        cursor: already ? "default" : "pointer", opacity: already ? 0.4 : 1,
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 4, overflow: "hidden", flexShrink: 0,
                        backgroundColor: "var(--bg-card)",
                      }}>
                        {album.cover_url
                          ? <img src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> // eslint-disable-line @next/next/no-img-element
                          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 14 }}>♪</span></div>
                        }
                      </div>
                      <div style={{ textAlign: "left", minWidth: 0 }}>
                        <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{album.title}</p>
                        <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{album.artist}</p>
                      </div>
                      {already && <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: "auto" }}>추가됨</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 앨범 엔트리 목록 */}
        {entries.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em" }}>
              TRACKLIST ({entries.length})
            </p>
            {entries.map((entry, idx) => (
              <div key={entry.album.id} style={{
                backgroundColor: "var(--bg-elevated)", borderRadius: 10,
                border: "1px solid var(--border)", overflow: "hidden",
              }}>
                {/* 앨범 헤더 */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
                  {/* 순서 버튼 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      style={{
                        background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer",
                        color: idx === 0 ? "var(--border)" : "var(--text-muted)", fontSize: 10, padding: "1px 4px", lineHeight: 1,
                      }}
                    >▲</button>
                    <span style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "center" }}>{idx + 1}</span>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === entries.length - 1}
                      style={{
                        background: "none", border: "none", cursor: idx === entries.length - 1 ? "default" : "pointer",
                        color: idx === entries.length - 1 ? "var(--border)" : "var(--text-muted)", fontSize: 10, padding: "1px 4px", lineHeight: 1,
                      }}
                    >▼</button>
                  </div>

                  {/* 커버 */}
                  <div style={{ width: 44, height: 44, borderRadius: 6, overflow: "hidden", flexShrink: 0, backgroundColor: "var(--bg-card)" }}>
                    {entry.album.cover_url
                      ? <img src={entry.album.cover_url} alt={entry.album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> // eslint-disable-line @next/next/no-img-element
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 18 }}>♪</span></div>
                    }
                  </div>

                  {/* 앨범 정보 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.album.title}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{entry.album.artist}</p>
                  </div>

                  {/* 삭제 */}
                  <button
                    onClick={() => removeEntry(entry.album.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16, flexShrink: 0 }}
                  >×</button>
                </div>

                {/* 감상 텍스트 */}
                <div style={{ padding: "0 14px 12px" }}>
                  <textarea
                    value={entry.comment}
                    onChange={(e) => updateComment(entry.album.id, e.target.value)}
                    placeholder="이 앨범에 대한 감상을 자유롭게..."
                    style={{
                      width: "100%", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
                      color: "var(--text)", borderRadius: 6, padding: "8px 10px", fontSize: 13,
                      outline: "none", resize: "vertical", minHeight: 60, fontFamily: "inherit",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {entries.length === 0 && (
          <div style={{
            border: "1px dashed var(--border)", borderRadius: 10, padding: 32,
            textAlign: "center", color: "var(--text-muted)", fontSize: 13,
          }}>
            위에서 앨범을 검색해서 추가하세요
          </div>
        )}

        {error && <p style={{ color: "#e05050", fontSize: 12 }}>{error}</p>}

        {/* 버튼 */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            backgroundColor: "transparent", border: "1px solid var(--border)",
            color: "var(--text-muted)", borderRadius: 6, padding: "8px 20px", fontSize: 13, cursor: "pointer",
          }}>취소</button>
          <button onClick={handleSave} disabled={saving || entries.length === 0} style={{
            backgroundColor: "var(--accent)", border: "none", color: "var(--bg)",
            borderRadius: 6, padding: "8px 20px", fontSize: 13, fontWeight: 600,
            cursor: saving || entries.length === 0 ? "not-allowed" : "pointer",
            opacity: saving || entries.length === 0 ? 0.6 : 1,
          }}>
            {saving ? "저장 중..." : "게시하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
