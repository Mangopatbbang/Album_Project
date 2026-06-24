"use client";

import { useEffect, useRef, useState } from "react";
import type { LikedTrackItem } from "@/app/api/liked-tracks/route";
import Spinner from "@/components/ui/Spinner";
import AlbumModal from "@/components/album/AlbumModal";
import type { AlbumWithRatings } from "@/types";
import { apiFetch } from "@/lib/apiFetch";

type SortKey = "album" | "artist";

function normalize(s: string) { return s.toLowerCase(); }

function sortGroups(
  groups: { albumId: string; albumTitle: string; artistDisplay: string; coverUrl: string | null; tracks: { index: number; name: string }[] }[],
  sort: SortKey
) {
  return [...groups].sort((a, b) => {
    if (sort === "artist") return a.artistDisplay.localeCompare(b.artistDisplay, "ko");
    return a.albumTitle.localeCompare(b.albumTitle, "ko");
  });
}

export default function LikedTracksButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [items, setItems] = useState<LikedTrackItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [sort, setSort] = useState<SortKey>("album");
  const [query, setQuery] = useState("");
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithRatings | null>(null);
  const [removingTrack, setRemovingTrack] = useState<string | null>(null); // "albumId-trackIndex"
  const backdropRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);
  const doClose = () => { setClosing(true); setTimeout(() => { setClosing(false); setOpen(false); }, 160); };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") doClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleOpen = async () => {
    setOpen(true);
    if (items !== null) return;
    setLoading(true);
    setFetchError(false);
    try {
      const res = await fetch(`/api/liked-tracks?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) { setFetchError(true); setItems([]); return; }
      setItems(await res.json());
    } catch {
      setFetchError(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTrack = async (albumId: string, trackIndex: number) => {
    const key = `${albumId}-${trackIndex}`;
    if (removingTrack === key) return;
    setRemovingTrack(key);
    const snapshot = items;
    // 낙관적 제거
    setItems((prev) => (prev ?? []).filter((it) => !(it.albumId === albumId && it.trackIndex === trackIndex)));
    const remaining = (snapshot ?? [])
      .filter((it) => it.albumId === albumId && it.trackIndex !== trackIndex)
      .map((it) => it.trackIndex)
      .sort((a, b) => a - b);
    const liked_tracks = remaining.length > 0 ? remaining.join(",") : null;
    const res = await apiFetch("/api/ratings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId, liked_tracks }),
    });
    if (!res.ok) {
      setItems(snapshot);
    }
    setRemovingTrack(null);
  };

  // 앨범별 그룹핑
  const rawGrouped: { albumId: string; albumTitle: string; artistDisplay: string; coverUrl: string | null; tracks: { index: number; name: string }[] }[] = [];
  if (items) {
    const map = new Map<string, typeof rawGrouped[0]>();
    for (const it of items) {
      if (!map.has(it.albumId)) {
        map.set(it.albumId, {
          albumId: it.albumId, albumTitle: it.albumTitle,
          artistDisplay: it.artistDisplay, coverUrl: it.coverUrl, tracks: [],
        });
        rawGrouped.push(map.get(it.albumId)!);
      }
      map.get(it.albumId)!.tracks.push({ index: it.trackIndex, name: it.trackName });
    }
  }
  const q = normalize(query.trim());
  const grouped = sortGroups(
    q
      ? rawGrouped.filter((g) =>
          normalize(g.albumTitle).includes(q) ||
          normalize(g.artistDisplay).includes(q) ||
          g.tracks.some((t) => normalize(t.name).includes(q))
        )
      : rawGrouped,
    sort
  );
  const totalCount = items?.length ?? 0;

  const SORTS: { key: SortKey; label: string }[] = [
    { key: "album", label: "앨범명순" },
    { key: "artist", label: "아티스트순" },
  ];

  return (
    <>
      {selectedAlbum && (
        <AlbumModal
          album={selectedAlbum}
          onClose={() => setSelectedAlbum(null)}
          source="liked_tracks"
          zIndex={300}
        />
      )}
      <button
        onClick={handleOpen}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--text-muted)", fontSize: 12 }}
        className="hover:opacity-70 transition-opacity"
      >
        ♥ <span style={{ color: "var(--text-sub)", fontWeight: 500 }}>좋아하는 곡</span>
      </button>

      {open && (
        <div
          ref={backdropRef}
          onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === backdropRef.current; }}
          onMouseUp={(e) => { if (mouseDownOnBackdrop.current && e.target === backdropRef.current) doClose(); mouseDownOnBackdrop.current = false; }}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
            animation: closing ? "backdropOut 0.16s ease-in forwards" : "backdropIn 0.18s ease-out",
          }}
        >
          <div style={{
            backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 14, width: "min(720px, 100%)", maxHeight: "85vh",
            display: "flex", flexDirection: "column", overflow: "hidden",
            animation: closing ? "modalOut 0.16s ease-in forwards" : "modalIn 0.18s ease-out",
          }}>
            {/* 헤더 */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0, gap: 12,
            }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.08em", margin: "0 0 2px 0" }}>
                  좋아하는 곡
                </p>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
                  {items && !fetchError
                    ? <><span style={{ color: "var(--accent)" }}>{totalCount}</span><span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)", marginLeft: 6 }}>곡 · {grouped.length}장</span></>
                    : "–"}
                </h2>
              </div>

              {/* 정렬 + 닫기 */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {SORTS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSort(s.key)}
                    style={{
                      background: "none", border: "1px solid",
                      borderColor: sort === s.key ? "var(--accent)" : "var(--border)",
                      color: sort === s.key ? "var(--accent)" : "var(--text-muted)",
                      backgroundColor: sort === s.key ? "rgba(var(--accent-rgb), 0.08)" : "transparent",
                      borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600,
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
                <button
                  onClick={doClose}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, padding: 10, margin: -6, lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 검색 */}
            <div style={{ padding: "10px 20px 0", flexShrink: 0 }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="제목·아티스트·트랙 검색"
                style={{
                  width: "100%", boxSizing: "border-box",
                  backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "8px 12px", fontSize: 13,
                  color: "var(--text)", outline: "none",
                }}
              />
            </div>

            {/* 본문 */}
            <div style={{ overflowY: "auto", flex: 1, padding: "12px 0" }}>
              {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
                  <Spinner size={20} />
                </div>
              ) : fetchError ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: 13 }}>
                  불러오지 못했어요. 잠시 후 다시 시도해주세요.
                </div>
              ) : !items || items.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <p style={{ fontSize: 24, marginBottom: 8 }}>♡</p>
                  <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>아직 좋아요 누른 곡이 없어요</p>
                  <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6 }}>앨범 모달에서 수록곡에<br />하트를 눌러보세요</p>
                </div>
              ) : grouped.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <p style={{ fontSize: 24, marginBottom: 8 }}>♪</p>
                  <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 600 }}>검색 결과가 없어요</p>
                </div>
              ) : (
                grouped.map((group) => (
                  <div key={group.albumId} style={{ marginBottom: 4 }}>
                    {/* 앨범 헤더 — 클릭 시 앨범 모달 */}
                    <button
                      onClick={() => setSelectedAlbum({
                        id: group.albumId,
                        title: group.albumTitle,
                        artist: group.artistDisplay,
                        artist_display: group.artistDisplay,
                        cover_url: group.coverUrl ?? undefined,
                        ratings: [],
                      } as unknown as AlbumWithRatings)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 20px", backgroundColor: "var(--bg-elevated)", width: "100%", border: "none", cursor: "pointer", textAlign: "left", transition: "opacity 0.12s" }}
                      className="hover:opacity-75 active:opacity-60"
                    >
                      {group.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img loading="lazy" src={group.coverUrl} alt={group.albumTitle} style={{ width: 36, height: 36, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: 5, flexShrink: 0, backgroundColor: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--text-muted)" }}>♪</div>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {group.albumTitle}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {group.artistDisplay}
                        </p>
                      </div>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>{group.tracks.length}곡</span>
                    </button>

                    {/* 트랙 목록 */}
                    {group.tracks.map((t) => {
                      const rkey = `${group.albumId}-${t.index}`;
                      const isRemoving = removingTrack === rkey;
                      return (
                        <div key={t.index} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 20px 7px 32px", borderBottom: "1px solid var(--border)" }}>
                          <span style={{ fontSize: 10, color: "var(--text-muted)", width: 16, textAlign: "right", flexShrink: 0 }}>{t.index}</span>
                          <span style={{ fontSize: 13, color: "var(--text)", flex: 1 }}>{t.name}</span>
                          <button
                            onClick={() => handleRemoveTrack(group.albumId, t.index)}
                            disabled={isRemoving}
                            title="좋아요 취소"
                            style={{
                              background: "none", border: "none", cursor: isRemoving ? "default" : "pointer",
                              color: "var(--error)", fontSize: 13, padding: "2px 4px", flexShrink: 0,
                              opacity: isRemoving ? 0.4 : 1,
                              transition: "opacity 0.15s",
                            }}
                            className="hover:opacity-60"
                          >
                            ♥
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
