"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePinch } from "@use-gesture/react";
import { scoreColor } from "@/lib/score";
import AlbumModal from "@/components/album/AlbumModal";
import Spinner from "@/components/ui/Spinner";
import type { TimelineEvent } from "@/app/api/profile/[userId]/timeline/route";
import type { AlbumWithRatings } from "@/types";

// ─── Zoom config ─────────────────────────────────────────────────────────────

type Zoom = "sm" | "md" | "lg";

const COVER: Record<Zoom, number> = { sm: 34, md: 50, lg: 66 };
const GAP:   Record<Zoom, number> = { sm: 6,  md: 12, lg: 20 };

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TimelineViewer({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [events, setEvents]       = useState<TimelineEvent[] | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [zoom, setZoom]           = useState<Zoom>("md");
  const [selected, setSelected]   = useState<AlbumWithRatings | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* fetch */
  useEffect(() => {
    fetch(`/api/profile/${userId}/timeline`)
      .then(r => r.json())
      .then(d => setEvents(d.events ?? []))
      .catch(() => setFetchError(true));
  }, [userId]);

  /* ESC + body lock */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fn);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const zoomIn  = () => setZoom(z => z === "sm" ? "md" : "lg");
  const zoomOut = () => setZoom(z => z === "lg" ? "md" : "sm");

  /* pinch: 퍼지면 확대, 모이면 축소 */
  const bind = usePinch(
    ({ offset: [scale], last }) => {
      if (!last) return;
      if (scale > 1.35) setZoom("lg");
      else if (scale < 0.7) setZoom("sm");
      else setZoom("md");
    },
    { from: [1, 0], eventOptions: { passive: false } },
  );

  const handleSelect = (ev: TimelineEvent) =>
    setSelected({
      id:        ev.album.id,
      title:     ev.album.title,
      artist:    ev.album.artist_display ?? ev.album.artist,
      cover_url: ev.album.cover_url ?? undefined,
      genre:     ev.album.genre ?? undefined,
      ratings:   [],
    } as AlbumWithRatings);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        backgroundColor: "var(--bg)",
        display: "flex", flexDirection: "column",
        animation: "tvIn 0.24s cubic-bezier(0.25,0.46,0.45,0.94)",
      }}
    >
      <style>{`
        @keyframes tvIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tv-cover:hover { transform: scale(1.06); box-shadow: 0 4px 16px rgba(0,0,0,0.4); }
        .tv-cover:active { transform: scale(0.97); }
        .tv-cover { transition: transform 0.13s ease, box-shadow 0.13s ease; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "13px 20px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        backgroundColor: "var(--bg)",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em" }}>
            청음 연대기
          </p>
          <p style={{ color: "var(--text-sub)", fontSize: 12 }}>
            {events ? `총 ${events.length}개의 기록` : "불러오는 중…"}
          </p>
        </div>

        {/* zoom controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={zoomOut}
            disabled={zoom === "sm"}
            style={{
              width: 28, height: 28, borderRadius: 6,
              backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
              color: zoom === "sm" ? "var(--border-light)" : "var(--text-muted)",
              cursor: zoom === "sm" ? "default" : "pointer",
              fontSize: 18, lineHeight: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "inherit",
            }}
          >−</button>

          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {(["sm", "md", "lg"] as Zoom[]).map(z => (
              <div
                key={z}
                style={{
                  width:  zoom === z ? 8 : 5,
                  height: zoom === z ? 8 : 5,
                  borderRadius: "50%",
                  backgroundColor: zoom === z ? "var(--accent)" : "var(--border-light)",
                  transition: "all 0.2s",
                }}
              />
            ))}
          </div>

          <button
            onClick={zoomIn}
            disabled={zoom === "lg"}
            style={{
              width: 28, height: 28, borderRadius: 6,
              backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
              color: zoom === "lg" ? "var(--border-light)" : "var(--text-muted)",
              cursor: zoom === "lg" ? "default" : "pointer",
              fontSize: 18, lineHeight: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "inherit",
            }}
          >+</button>
        </div>

        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-muted)", fontSize: 22, lineHeight: 1,
            padding: "0 2px", display: "flex", alignItems: "center",
          }}
        >×</button>
      </div>

      {/* ── Timeline body ──────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        {...bind()}
        style={{
          flex: 1, overflowY: "auto",
          touchAction: "pan-y",
          overscrollBehavior: "contain",
          position: "relative",
        }}
      >
        {/* loading */}
        {!events && !fetchError && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
            <Spinner />
          </div>
        )}
        {fetchError && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>불러오지 못했어요</p>
          </div>
        )}

        {events && (
          <AnimatePresence mode="wait">
            <motion.div
              key={zoom}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ padding: "24px 20px 60px", position: "relative" }}
            >
              {/* spine line */}
              <div style={{
                position: "absolute",
                left: 43, top: 24, bottom: 60,
                width: 1,
                background: "linear-gradient(to bottom, transparent, var(--border) 40px, var(--border) calc(100% - 40px), transparent)",
              }} />

              <div style={{ display: "flex", flexDirection: "column", gap: GAP[zoom] }}>
                {events.map((ev, i) => (
                  <Item
                    key={`${ev.type}-${ev.album.id}-${ev.date}-${i}`}
                    ev={ev}
                    zoom={zoom}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {selected && (
        <AlbumModal album={selected} onClose={() => setSelected(null)} source="timeline" />
      )}
    </div>
  );
}

// ─── Item ─────────────────────────────────────────────────────────────────────

function Item({
  ev,
  zoom,
  onSelect,
}: {
  ev: TimelineEvent;
  zoom: Zoom;
  onSelect: (e: TimelineEvent) => void;
}) {
  const size     = COVER[zoom];
  const dotColor = ev.score != null ? scoreColor(ev.score) : "var(--border)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>

      {/* dot on spine */}
      <div style={{
        width: 48, flexShrink: 0,
        display: "flex", justifyContent: "flex-end", alignItems: "center", paddingRight: 3,
      }}>
        <div style={{
          width: 9, height: 9, borderRadius: "50%",
          backgroundColor: dotColor,
          border: "2px solid var(--bg)",
          boxShadow: `0 0 0 1px ${dotColor}55`,
          flexShrink: 0,
        }} />
      </div>

      {/* cover */}
      <button
        onClick={() => onSelect(ev)}
        className="tv-cover"
        style={{
          flexShrink: 0, width: size, height: size,
          borderRadius: zoom === "lg" ? 8 : 5,
          overflow: "hidden",
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          cursor: "pointer", padding: 0,
        }}
      >
        {ev.album.cover_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img
              src={ev.album.cover_url}
              alt={ev.album.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          : <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-muted)", fontSize: Math.floor(size * 0.38),
            }}>♪</div>
        }
      </button>

      {/* title + artist + review (md, lg only) */}
      {zoom !== "sm" && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            color: "var(--text)",
            fontSize: zoom === "lg" ? 14 : 12,
            fontWeight: 600,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}>
            {ev.album.title}
          </p>
          <p style={{
            color: "var(--text-muted)", fontSize: 11, marginTop: 2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {ev.album.artist_display ?? ev.album.artist}
          </p>
          {zoom === "lg" && ev.review && (
            <p style={{
              color: "var(--text-sub)", fontSize: 11, marginTop: 5,
              fontStyle: "italic", lineHeight: 1.5,
              overflow: "hidden", textOverflow: "ellipsis",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            }}>
              "{ev.review}"
            </p>
          )}
        </div>
      )}

      {/* score + date (right side) */}
      <div style={{
        flexShrink: 0,
        display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2,
        minWidth: zoom === "sm" ? 28 : 40,
      }}>
        {ev.score != null && (
          <span style={{
            fontSize: zoom === "sm" ? 11 : 15,
            fontWeight: 800,
            color: scoreColor(ev.score),
            lineHeight: 1,
          }}>
            {ev.score}
          </span>
        )}
        {ev.type === "diary" && (
          <span style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1 }}>✎</span>
        )}
        <span style={{
          fontSize: zoom === "sm" ? 9 : 10,
          color: "var(--text-muted)", opacity: 0.55,
          fontFamily: "var(--font-mono, ui-monospace, monospace)",
          lineHeight: 1,
        }}>
          {ev.date.slice(5).replace("-", "/")}
        </span>
      </div>
    </div>
  );
}
