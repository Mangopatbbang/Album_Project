"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePinch } from "@use-gesture/react";
import { scoreColor } from "@/lib/score";
import AlbumModal from "@/components/album/AlbumModal";
import Spinner from "@/components/ui/Spinner";
import type { TimelineEvent } from "@/app/api/profile/[userId]/timeline/route";
import type { AlbumWithRatings } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewLevel = "year" | "month" | "detail";

type YearStat = {
  year: string;
  count: number;
  avgScore: number | null;
  topGenres: string[];
};

type MonthStat = {
  month: string;        // "2025-03"
  label: string;        // "3월"
  count: number;
  events: TimelineEvent[];
  previewCovers: (string | null)[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GENRE_COLORS: Record<string, string> = {
  "Hip-Hop": "#f59e0b", "R&B": "#a78bfa", "Rock": "#f87171",
  "Jazz": "#60a5fa", "Pop": "#f472b6", "Electronic": "#22d3ee",
  "Soul": "#fb923c", "Classical": "#94a3b8", "Folk": "#a3e635",
  "K-Pop": "#e879f9", "Indie": "#4ade80", "Metal": "#9ca3af",
  "Alternative": "#34d399", "Country": "#fbbf24", "Reggae": "#86efac",
};
const genreColor = (g: string) => GENRE_COLORS[g] ?? "#6b7280";

function aggregateByYear(events: TimelineEvent[]): YearStat[] {
  const map = new Map<string, TimelineEvent[]>();
  for (const e of events) {
    const y = e.date.slice(0, 4);
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(e);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, evs]) => {
      const scores = evs.filter(e => e.score != null).map(e => e.score!);
      const avgScore = scores.length > 0
        ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
        : null;
      const gc = new Map<string, number>();
      for (const e of evs) {
        const g = e.album.genre ?? "기타";
        gc.set(g, (gc.get(g) ?? 0) + 1);
      }
      const topGenres = [...gc.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([g]) => g);
      return { year, count: evs.length, avgScore, topGenres };
    });
}

function aggregateByMonth(events: TimelineEvent[], year: string): MonthStat[] {
  const filtered = events.filter(e => e.date.startsWith(year));
  const map = new Map<string, TimelineEvent[]>();
  for (const e of filtered) {
    const m = e.date.slice(0, 7);
    if (!map.has(m)) map.set(m, []);
    map.get(m)!.push(e);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, evs]) => ({
      month,
      label: `${parseInt(month.slice(5, 7))}월`,
      count: evs.length,
      events: evs,
      previewCovers: evs.slice(0, 7).map(e => e.album.cover_url),
    }));
}

// ─── Animation variants ───────────────────────────────────────────────────────

const TRANSITION = { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] as const };

const drillIn = {
  initial: { opacity: 0, scale: 0.96, y: 24 },
  animate: { opacity: 1, scale: 1, y: 0, transition: TRANSITION },
  exit:    { opacity: 0, scale: 1.02, y: -16, transition: { duration: 0.16 } },
};

const drillOut = {
  initial: { opacity: 0, scale: 1.02, y: -16 },
  animate: { opacity: 1, scale: 1, y: 0, transition: TRANSITION },
  exit:    { opacity: 0, scale: 0.96, y: 24, transition: { duration: 0.16 } },
};

// ─── Sub-views ────────────────────────────────────────────────────────────────

function YearView({
  yearStats,
  maxCount,
  onSelect,
}: {
  yearStats: YearStat[];
  maxCount: number;
  onSelect: (year: string) => void;
}) {
  const total = yearStats.reduce((s, y) => s + y.count, 0);

  return (
    <div style={{ padding: "28px 24px" }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ marginBottom: 36 }}
      >
        <p style={{
          color: "var(--text)", fontSize: 32, fontWeight: 800,
          fontFamily: "var(--font-playfair, Georgia, serif)",
          letterSpacing: "-0.03em", lineHeight: 1.1,
        }}>
          {total}
          <span style={{ fontSize: 15, color: "var(--text-muted)", fontWeight: 400, marginLeft: 10 }}>
            장의 기록
          </span>
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>
          연도를 클릭하면 그 해 기록을 볼 수 있어요
        </p>
      </motion.div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {yearStats.map((stat, i) => (
          <motion.button
            key={stat.year}
            onClick={() => onSelect(stat.year)}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            whileHover={{ x: 6, transition: { duration: 0.15 } }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: "flex", alignItems: "center", gap: 16,
              background: "none", border: "none", cursor: "pointer",
              padding: "16px 0", borderBottom: "1px solid var(--border)",
              textAlign: "left", width: "100%",
            }}
          >
            <span style={{
              color: "var(--text)", fontSize: 24, fontWeight: 800,
              fontFamily: "var(--font-playfair, Georgia, serif)",
              letterSpacing: "-0.03em", width: 56, flexShrink: 0,
            }}>
              {stat.year}
            </span>

            <div style={{ flex: 1, height: 5, backgroundColor: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(stat.count / maxCount) * 100}%` }}
                transition={{ duration: 0.7, delay: i * 0.06 + 0.1, ease: "easeOut" }}
                style={{ height: "100%", backgroundColor: "var(--accent)", borderRadius: 3 }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ color: "var(--text-sub)", fontSize: 12, fontWeight: 700 }}>
                {stat.count}장
              </span>
              {stat.avgScore != null && (
                <span style={{ color: scoreColor(Math.round(stat.avgScore)), fontSize: 11 }}>
                  avg {stat.avgScore}
                </span>
              )}
              {stat.topGenres.map(g => (
                <span
                  key={g}
                  style={{
                    fontSize: 10, padding: "2px 7px", borderRadius: 10, fontWeight: 600,
                    backgroundColor: `${genreColor(g)}1a`,
                    color: genreColor(g),
                    border: `1px solid ${genreColor(g)}44`,
                  }}
                >
                  {g}
                </span>
              ))}
            </div>

            <span style={{ color: "var(--text-muted)", fontSize: 12, opacity: 0.5 }}>›</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function MonthView({
  monthStats,
  year,
  onSelect,
}: {
  monthStats: MonthStat[];
  year: string;
  onSelect: (month: string) => void;
}) {
  return (
    <div style={{ padding: "28px 24px" }}>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 24 }}
      >
        월을 클릭하면 그 달 기록을 볼 수 있어요
      </motion.p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {monthStats.map((stat, i) => (
          <motion.button
            key={stat.month}
            onClick={() => onSelect(stat.month)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ scale: 1.01, transition: { duration: 0.12 } }}
            whileTap={{ scale: 0.99 }}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 12, padding: "12px 16px",
              cursor: "pointer", textAlign: "left", width: "100%",
            }}
          >
            <span style={{
              color: "var(--text-muted)", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.06em", width: 28, flexShrink: 0,
            }}>
              {stat.label}
            </span>

            <div style={{ display: "flex", gap: 3, flex: 1, alignItems: "center" }}>
              {stat.previewCovers.map((url, j) => (
                <div
                  key={j}
                  style={{
                    width: 34, height: 34, borderRadius: 5, overflow: "hidden",
                    flexShrink: 0, backgroundColor: "var(--bg-elevated)",
                  }}
                >
                  {url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--text-muted)" }}>♪</div>
                  }
                </div>
              ))}
              {stat.count > 7 && (
                <div style={{
                  width: 34, height: 34, borderRadius: 5,
                  backgroundColor: "var(--bg-elevated)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700 }}>
                    +{stat.count - 7}
                  </span>
                </div>
              )}
            </div>

            <span style={{ color: "var(--text-muted)", fontSize: 11, flexShrink: 0 }}>
              {stat.count}장 ›
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function DetailView({
  events,
  month,
  onAlbumClick,
}: {
  events: TimelineEvent[];
  month: string;
  onAlbumClick: (a: AlbumWithRatings) => void;
}) {
  return (
    <div style={{ padding: "28px 24px" }}>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 20 }}
      >
        {events.length}개의 기록
      </motion.p>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {events.map((event, i) => (
          <motion.button
            key={`${event.type}-${event.album.id}-${event.date}-${i}`}
            onClick={() => onAlbumClick({
              id: event.album.id,
              title: event.album.title,
              artist: event.album.artist_display ?? event.album.artist,
              cover_url: event.album.cover_url ?? undefined,
              genre: event.album.genre ?? undefined,
              ratings: [],
            })}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.025, 0.4) }}
            whileHover={{ backgroundColor: "rgba(255,255,255,0.03)", transition: { duration: 0.1 } }}
            whileTap={{ scale: 0.99 }}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 0", borderBottom: "1px solid var(--border)",
              textAlign: "left", borderRadius: 4, width: "100%",
            }}
          >
            <span style={{
              color: "var(--text-muted)", fontSize: 10,
              width: 34, flexShrink: 0, fontWeight: 600,
              fontFamily: "var(--font-mono, monospace)",
            }}>
              {event.date.slice(5).replace("-", "/")}
            </span>

            <div style={{
              width: 42, height: 42, borderRadius: 7, overflow: "hidden",
              flexShrink: 0, backgroundColor: "var(--bg-elevated)",
            }}>
              {event.album.cover_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={event.album.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>♪</div>
              }
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                color: "var(--text)", fontSize: 13, fontWeight: 600,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {event.album.title}
              </p>
              <p style={{
                color: "var(--text-muted)", fontSize: 11, marginTop: 2,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {event.album.artist_display ?? event.album.artist}
                {event.review && (
                  <span style={{ fontStyle: "italic", opacity: 0.8 }}> · "{event.review}"</span>
                )}
              </p>
            </div>

            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
              {event.type === "rating" && event.score != null && (
                <span style={{ fontSize: 15, fontWeight: 800, color: scoreColor(event.score) }}>
                  {event.score}
                </span>
              )}
              {event.type === "diary" && (
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>✎</span>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = { userId: string; onClose: () => void };

export default function TimelineViewer({ userId, onClose }: Props) {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [view, setView] = useState<ViewLevel>("year");
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithRatings | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch timeline data
  useEffect(() => {
    fetch(`/api/profile/${userId}/timeline`)
      .then(r => r.json())
      .then(d => setEvents(d.events ?? []))
      .catch(() => setFetchError(true));
  }, [userId]);

  // Lock body scroll + ESC handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const resetScroll = () => scrollRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });

  const drillTo = useCallback((
    newView: ViewLevel,
    year?: string,
    month?: string,
  ) => {
    setDirection("in");
    if (year !== undefined) setSelectedYear(year);
    if (month !== undefined) setSelectedMonth(month);
    setView(newView);
    resetScroll();
  }, []);

  const goBack = useCallback(() => {
    setDirection("out");
    if (view === "detail") {
      setView("month");
      setSelectedMonth(null);
    } else if (view === "month") {
      setView("year");
      setSelectedYear(null);
    }
    resetScroll();
  }, [view]);

  // Pinch gesture — zoom out to go back, zoom in to drill
  const bind = usePinch(({ offset: [scale], last }) => {
    if (!last) return;
    if (scale < 0.75 && view !== "year") goBack();
  }, { eventOptions: { passive: false } });

  // Ctrl+Wheel navigation (desktop)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let last = 0;
    const fn = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const now = Date.now();
      if (now - last < 400) return;
      last = now;
      if (e.deltaY > 0 && view !== "year") goBack();
    };
    el.addEventListener("wheel", fn, { passive: false });
    return () => el.removeEventListener("wheel", fn);
  }, [view, goBack]);

  // Aggregated data
  const yearStats = events ? aggregateByYear(events) : [];
  const maxCount = Math.max(...yearStats.map(y => y.count), 1);
  const monthStats = (events && selectedYear) ? aggregateByMonth(events, selectedYear) : [];
  const detailEvents = (events && selectedMonth)
    ? events.filter(e => e.date.startsWith(selectedMonth))
    : [];

  // Breadcrumb label
  const breadcrumb = view === "year"
    ? "전체 연대기"
    : view === "month"
    ? selectedYear ?? ""
    : `${selectedYear} · ${selectedMonth ? `${parseInt(selectedMonth.slice(5, 7))}월` : ""}`;

  const anim = direction === "in" ? drillIn : drillOut;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        backgroundColor: "var(--bg)",
        display: "flex", flexDirection: "column",
        animation: "timelineSlideUp 0.28s cubic-bezier(0.25,0.46,0.45,0.94)",
      }}
    >
      <style>{`
        @keyframes timelineSlideUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 20px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        backgroundColor: "var(--bg)",
      }}>
        <AnimatePresence mode="wait">
          {view !== "year" && (
            <motion.button
              key="back"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              onClick={goBack}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", fontSize: 20, padding: 0,
                display: "flex", alignItems: "center", lineHeight: 1,
              }}
            >
              ←
            </motion.button>
          )}
        </AnimatePresence>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em" }}>
            청음 연대기
          </p>
          <motion.p
            key={breadcrumb}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            style={{ color: "var(--text)", fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {breadcrumb}
          </motion.p>
        </div>

        {/* Zoom level dots */}
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {(["year", "month", "detail"] as ViewLevel[]).map(v => (
            <div
              key={v}
              style={{
                width: view === v ? 8 : 5,
                height: view === v ? 8 : 5,
                borderRadius: "50%",
                backgroundColor: view === v ? "var(--accent)" : "var(--border-light)",
                transition: "all 0.2s",
              }}
            />
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-muted)", fontSize: 22, padding: "0 4px",
            lineHeight: 1, marginLeft: 4,
          }}
        >
          ×
        </button>
      </div>

      {/* ── Content ── */}
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
        {/* Loading */}
        {!events && !fetchError && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
            <Spinner />
          </div>
        )}
        {fetchError && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>불러오지 못했어요</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {events && view === "year" && (
            <motion.div key="year" {...anim}>
              <YearView
                yearStats={yearStats}
                maxCount={maxCount}
                onSelect={year => drillTo("month", year)}
              />
            </motion.div>
          )}

          {events && view === "month" && selectedYear && (
            <motion.div key={`month-${selectedYear}`} {...anim}>
              <MonthView
                monthStats={monthStats}
                year={selectedYear}
                onSelect={month => drillTo("detail", undefined, month)}
              />
            </motion.div>
          )}

          {events && view === "detail" && selectedMonth && (
            <motion.div key={`detail-${selectedMonth}`} {...anim}>
              <DetailView
                events={detailEvents}
                month={selectedMonth}
                onAlbumClick={a => setSelectedAlbum(a)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {selectedAlbum && (
        <AlbumModal
          album={selectedAlbum}
          onClose={() => setSelectedAlbum(null)}
          source="timeline"
        />
      )}
    </div>
  );
}
