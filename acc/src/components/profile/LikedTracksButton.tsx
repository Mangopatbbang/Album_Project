"use client";

import { useState } from "react";
import type { LikedTrackItem } from "@/app/api/liked-tracks/route";

export default function LikedTracksButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<LikedTrackItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    setOpen(true);
    if (items !== null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/liked-tracks?userId=${encodeURIComponent(userId)}`);
      setItems(res.ok ? await res.json() : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // 앨범별로 그룹핑
  const grouped: { albumId: string; albumTitle: string; artistDisplay: string; coverUrl: string | null; tracks: { index: number; name: string }[] }[] = [];
  if (items) {
    const map = new Map<string, typeof grouped[0]>();
    for (const it of items) {
      if (!map.has(it.albumId)) {
        map.set(it.albumId, {
          albumId: it.albumId, albumTitle: it.albumTitle,
          artistDisplay: it.artistDisplay, coverUrl: it.coverUrl, tracks: [],
        });
        grouped.push(map.get(it.albumId)!);
      }
      map.get(it.albumId)!.tracks.push({ index: it.trackIndex, name: it.trackName });
    }
  }

  const totalCount = items?.length ?? 0;

  return (
    <>
      <button
        onClick={handleOpen}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 0,
          color: "var(--text-muted)", fontSize: 12,
        }}
        className="hover:opacity-70 transition-opacity"
      >
        ♥ <span style={{ color: "var(--text-sub)", fontWeight: 500 }}>좋아하는 곡</span>
      </button>

      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            width: "min(560px, 100%)",
            maxHeight: "85dvh",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}>
            {/* 헤더 */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0,
            }}>
              <div>
                <p style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 2px 0" }}>
                  LIKED TRACKS
                </p>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
                  좋아하는 곡
                  {items && <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>{totalCount}곡</span>}
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, padding: 4, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* 본문 */}
            <div style={{ overflowY: "auto", flex: 1, padding: "12px 0" }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: 13 }}>
                  불러오는 중…
                </div>
              ) : !items || items.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: 13 }}>
                  아직 좋아요 누른 곡이 없습니다
                </div>
              ) : (
                grouped.map((group) => (
                  <div key={group.albumId} style={{ marginBottom: 4 }}>
                    {/* 앨범 헤더 */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 20px", backgroundColor: "var(--bg-elevated)",
                    }}>
                      {group.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={group.coverUrl}
                          alt={group.albumTitle}
                          style={{ width: 36, height: 36, borderRadius: 5, objectFit: "cover", flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: 36, height: 36, borderRadius: 5, flexShrink: 0,
                          backgroundColor: "var(--bg-card)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 14, color: "var(--text-muted)",
                        }}>♪</div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          fontSize: 12, fontWeight: 700, color: "var(--text)",
                          margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {group.albumTitle}
                        </p>
                        <p style={{
                          fontSize: 11, color: "var(--text-muted)", margin: "1px 0 0",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {group.artistDisplay}
                        </p>
                      </div>
                      <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>
                        {group.tracks.length}곡
                      </span>
                    </div>

                    {/* 트랙 목록 */}
                    {group.tracks.map((t) => (
                      <div
                        key={t.index}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "7px 20px 7px 32px",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <span style={{ fontSize: 10, color: "var(--text-muted)", width: 16, textAlign: "right", flexShrink: 0 }}>
                          {t.index}
                        </span>
                        <span style={{ fontSize: 13, color: "var(--text)", flex: 1 }}>
                          {t.name}
                        </span>
                        <span style={{ fontSize: 13, color: "var(--accent)", flexShrink: 0 }}>♥</span>
                      </div>
                    ))}
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
