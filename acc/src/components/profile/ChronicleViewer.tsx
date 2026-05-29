"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePinch } from "@use-gesture/react";
import { scoreColor } from "@/lib/score";
import AlbumModal from "@/components/album/AlbumModal";
import Spinner from "@/components/ui/Spinner";
import type { TimelineEvent } from "@/app/api/profile/[userId]/timeline/route";
import type { AlbumWithRatings } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const MS_DAY   = 86_400_000;
const MS_YEAR  = 365.25 * MS_DAY;
const SCORE_MIN = 1;
const SCORE_MAX = 8;
const HEATMAP_H = 108;
const AXIS_W    = 64;    // wider — fits score label + mini histogram bar

// Band-based spatial layout
const BAND_H      = 120;  // each score band height
const BAND_GAP    =  36;  // gap between bands — no dots here
const GAL_PAD_T   =  60;  // top padding above score-8 band
const UNRATED_GAP =  30;  // gap below score-1 before unrated
const UNRATED_H   =  80;  // unrated band height
const GAL_PAD_B   =  40;  // bottom padding

// GALAXY_H = 60 + 8×120 + 7×36 + 30 + 80 + 40 = 1422px (fixed, vertical scroll allowed)
const GALAXY_H = GAL_PAD_T
  + SCORE_MAX * BAND_H + (SCORE_MAX - SCORE_MIN) * BAND_GAP
  + UNRATED_GAP + UNRATED_H + GAL_PAD_B;

// Fit zoom shows a "comfortable window", not all albums forced on screen
const FIT_YEARS_VISIBLE = 35;   // release mode: 35 years visible at fit zoom
const FIT_DAYS_VISIBLE  = 540;  // listened mode: ~18 months

const MAX_ZOOM = 2e-5;

type ViewMode = "release" | "listened";

// ─── Y coordinate helpers ─────────────────────────────────────────────────────

// Center Y of a score band (score 8 is at the top)
function bandCenterY(score: number): number {
  const idx = SCORE_MAX - score; // 0 for score-8, 7 for score-1
  return GAL_PAD_T + idx * (BAND_H + BAND_GAP) + BAND_H / 2;
}

// Top edge of a score band
function bandTopY(score: number): number {
  return bandCenterY(score) - BAND_H / 2;
}

// Center Y of the unrated band
function unratedCenterY(): number {
  return GAL_PAD_T
    + SCORE_MAX * BAND_H + (SCORE_MAX - SCORE_MIN) * BAND_GAP
    + UNRATED_GAP + UNRATED_H / 2;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Deterministic per-album jitter — consistent across renders, no flickering
function jitter(id: string, range: number): number {
  const h = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * range;
}

function parseYear(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const y = parseInt(dateStr.substring(0, 4), 10);
  return y >= 1900 && y <= 2100 ? y : null;
}

function eventMs(ev: TimelineEvent, mode: ViewMode): number | null {
  if (mode === "release") {
    const y = parseYear(ev.album.release_date);
    return y != null ? y * MS_YEAR : null;
  }
  return new Date(ev.date).getTime();
}

function computeRange(events: TimelineEvent[], mode: ViewMode) {
  const times = events.map(ev => eventMs(ev, mode)).filter((t): t is number => t != null);
  if (!times.length) return { minMs: 0, maxMs: 0, totalMs: 0 };
  const lo = Math.min(...times), hi = Math.max(...times);
  const pad = mode === "release"
    ? MS_YEAR * 3
    : Math.max((hi - lo) * 0.04, MS_DAY * 25);
  return { minMs: lo - pad, maxMs: hi + pad, totalMs: hi + pad - (lo - pad) };
}

function coverSize(z: number, mode: ViewMode): number {
  const d = mode === "release" ? z * MS_YEAR : z * MS_DAY;
  if (mode === "release") {
    if (d < 5)   return 0;
    if (d < 12)  return 20;
    if (d < 30)  return 32;
    if (d < 80)  return 44;
    return 56;
  }
  if (d < 1.5)  return 0;
  if (d < 6)    return 20;
  if (d < 18)   return 34;
  if (d < 55)   return 48;
  return 60;
}

// 7-level dot radius — high-score albums are noticeably larger
function dotRadius(score: number | undefined): number {
  if (score == null) return 2;
  if (score >= 8)    return 7;
  if (score >= 7)    return 5.5;
  if (score >= 6)    return 4.5;
  if (score >= 5)    return 3.5;
  if (score >= 4)    return 3;
  return 2.5;
}

// ─── Tick computation ─────────────────────────────────────────────────────────

interface Tick { x: number; label: string; isMajor: boolean }

function computeReleaseTicks(zoom: number, minMs: number, maxMs: number): Tick[] {
  const ppy  = zoom * MS_YEAR;
  const step = ppy < 12 ? 10 : ppy < 40 ? 5 : 1;
  const minY = Math.floor(minMs / MS_YEAR / step) * step;
  const maxY = Math.ceil(maxMs / MS_YEAR) + step;
  const ticks: Tick[] = [];
  for (let y = minY; y <= maxY; y += step) {
    ticks.push({ x: (y * MS_YEAR - minMs) * zoom, label: String(y), isMajor: y % 10 === 0 });
    if (ticks.length > 300) break;
  }
  return ticks;
}

function computeListenedTicks(zoom: number, minMs: number, maxMs: number): Tick[] {
  const d = zoom * MS_DAY;
  type Cfg = { step: (dt: Date) => void; label: (dt: Date) => string; isMaj: (dt: Date) => boolean };
  const cfg: Cfg =
    d < 2.5 ? { step: dt => dt.setFullYear(dt.getFullYear() + 1), label: dt => `${dt.getFullYear()}`, isMaj: () => true } :
    d < 9   ? { step: dt => dt.setMonth(dt.getMonth() + 1), label: dt => dt.getMonth() === 0 ? `${dt.getFullYear()}` : `${dt.getMonth() + 1}월`, isMaj: dt => dt.getMonth() === 0 } :
    d < 35  ? { step: dt => dt.setDate(dt.getDate() + 7), label: dt => `${dt.getMonth() + 1}/${dt.getDate()}`, isMaj: dt => dt.getDate() <= 7 } :
              { step: dt => dt.setDate(dt.getDate() + 1), label: dt => `${dt.getDate()}일`, isMaj: dt => dt.getDate() === 1 };
  const cur = new Date(minMs);
  if (d < 2.5)     { cur.setMonth(0, 1); cur.setHours(0, 0, 0, 0); }
  else if (d < 9)  { cur.setDate(1);     cur.setHours(0, 0, 0, 0); }
  else if (d < 35) { cur.setDate(cur.getDate() - cur.getDay()); cur.setHours(0, 0, 0, 0); }
  else               cur.setHours(0, 0, 0, 0);
  const ticks: Tick[] = [];
  while (cur.getTime() <= maxMs + MS_DAY * 2) {
    ticks.push({ x: (cur.getTime() - minMs) * zoom, label: cfg.label(cur), isMajor: cfg.isMaj(cur) });
    cfg.step(cur);
    if (ticks.length > 600) break;
  }
  return ticks;
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

interface HeatCell { key: string; label: string; count: number; avgScore: number | null; intensity: number }

function computeHeatmap(events: TimelineEvent[], mode: ViewMode): HeatCell[] {
  const map = new Map<string, { count: number; scoreSum: number; scoreCount: number; label: string }>();
  for (const ev of events) {
    let key: string, label: string;
    if (mode === "release") {
      const y = parseYear(ev.album.release_date);
      if (y == null) continue;
      const decade = Math.floor(y / 10) * 10;
      key = String(decade); label = `${decade}s`;
    } else {
      key = ev.date.substring(0, 7);
      const mo = parseInt(key.split("-")[1], 10);
      const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      label = MONTHS[mo - 1];
    }
    const e = map.get(key) ?? { count: 0, scoreSum: 0, scoreCount: 0, label };
    e.count++;
    if (ev.score != null) { e.scoreSum += ev.score; e.scoreCount++; }
    map.set(key, e);
  }
  const cells = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, d]) => ({
      key, label: d.label, count: d.count,
      avgScore: d.scoreCount > 0 ? d.scoreSum / d.scoreCount : null,
      intensity: 0,
    }));
  const max = Math.max(...cells.map(c => c.count), 1);
  cells.forEach(c => { c.intensity = c.count / max; });
  return cells;
}

// ─── Dot positions ────────────────────────────────────────────────────────────

interface DotPos { ev: TimelineEvent; x: number; y: number; isUnrated: boolean }

function buildDotPositions(
  events: TimelineEvent[], zoom: number, minMs: number, mode: ViewMode,
): DotPos[] {
  return events.map(ev => {
    const ms = eventMs(ev, mode);

    // X jitter — spreads same-year albums horizontally
    const xJitterMs = mode === "release"
      ? jitter(ev.album.id + "x", 0.5) * MS_YEAR   // ±0.25 years
      : jitter(ev.album.id + "x", 4)   * MS_DAY;   // ±2 days
    const x = ms != null ? (ms + xJitterMs - minMs) * zoom : -9999;

    // Y: band center ± jitter within band
    const isUnrated = ev.score == null;
    const y = isUnrated
      ? unratedCenterY() + jitter(ev.album.id, UNRATED_H * 0.55)
      : bandCenterY(ev.score!) + jitter(ev.album.id, BAND_H * 0.42); // ±50px

    return { ev, x, y, isUnrated };
  });
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ ev, mx, my }: { ev: TimelineEvent; mx: number; my: number }) {
  const c = ev.score != null ? scoreColor(ev.score) : "var(--text-muted)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.12 }}
      style={{
        position: "fixed", left: mx, top: my - 82,
        transform: "translateX(-50%)",
        zIndex: 600, pointerEvents: "none",
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 10, padding: "8px 11px",
        display: "flex", alignItems: "center", gap: 8,
        maxWidth: 220, minWidth: 110,
        boxShadow: "0 12px 28px rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
      }}
    >
      {ev.album.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ev.album.cover_url} alt="" style={{ width: 32, height: 32, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ color: "var(--text)", fontSize: 11, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {ev.album.title}
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {ev.album.artist_display ?? ev.album.artist}
        </p>
        {ev.album.release_date && (
          <p style={{ color: "var(--text-muted)", fontSize: 9, marginTop: 2, opacity: 0.5 }}>
            {ev.album.release_date.substring(0, 4)}
          </p>
        )}
      </div>
      {ev.score != null && (
        <span style={{ fontSize: 14, fontWeight: 800, color: c, flexShrink: 0 }}>{ev.score}</span>
      )}
    </motion.div>
  );
}

// ─── GalaxyDot ────────────────────────────────────────────────────────────────

interface DotProps {
  pos: DotPos; cs: number; dimmed: boolean;
  onSelect: (ev: TimelineEvent) => void;
  onTipEnter: (ev: TimelineEvent, mx: number, my: number) => void;
  onTipLeave: () => void;
}

function GalaxyDot({ pos, cs, dimmed, onSelect, onTipEnter, onTipLeave }: DotProps) {
  const [hov, setHov] = useState(false);
  const { ev, x, y } = pos;
  const score  = ev.score;
  const dot    = score != null ? scoreColor(score) : "rgba(255,255,255,0.22)";
  const isDot  = cs === 0;
  const r      = dotRadius(score);

  const enter = (e: React.MouseEvent) => { setHov(true);  onTipEnter(ev, e.clientX, e.clientY); };
  const leave = ()                      => { setHov(false); onTipLeave(); };

  return (
    <div style={{
      position: "absolute", left: x, top: y,
      transform: "translate(-50%, -50%)",
      opacity: dimmed ? 0.08 : (hov ? 1 : 0.88),
      transition: "opacity 0.22s ease",
      zIndex: hov ? 20 : 1,
    }}>
      {isDot ? (
        <button
          onClick={() => onSelect(ev)}
          onMouseEnter={enter} onMouseLeave={leave}
          style={{
            width: r * 2, height: r * 2, borderRadius: "50%",
            backgroundColor: dot,
            border: score != null ? "1.5px solid var(--bg)" : "none",
            padding: 0, cursor: "pointer",
            transform: hov ? "scale(1.55)" : "scale(1)",
            transition: "transform .14s ease, box-shadow .14s ease",
          }}
        />
      ) : (
        <button
          onClick={() => onSelect(ev)}
          onMouseEnter={enter} onMouseLeave={leave}
          style={{
            width: cs, height: cs, padding: 0,
            borderRadius: cs > 40 ? 8 : 5,
            overflow: "hidden", border: "none", cursor: "pointer",
            backgroundColor: "var(--bg-elevated)",
            outline: hov ? `2px solid ${dot}` : `1px solid ${dot}15`,
            outlineOffset: 2,
            boxShadow: hov ? `0 6px 20px rgba(0,0,0,.6), 0 0 0 3px ${dot}30` : "0 2px 8px rgba(0,0,0,.3)",
            transform: hov ? "scale(1.12)" : "scale(1)",
            transition: "transform .13s ease, box-shadow .13s ease, outline .13s ease",
          }}
        >
          {ev.album.cover_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={ev.album.cover_url} alt={ev.album.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
                justifyContent: "center", color: "var(--text-muted)", fontSize: Math.floor(cs * 0.36) }}>♪</div>
          }
        </button>
      )}
    </div>
  );
}

// ─── HeatmapStrip ─────────────────────────────────────────────────────────────

function HeatmapStrip({
  events, mode, cells, selected, onSelect,
}: {
  events: TimelineEvent[]; mode: ViewMode;
  cells: HeatCell[]; selected: string | null;
  onSelect: (key: string | null) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (mode === "release") {
    return (
      <div style={{
        height: HEATMAP_H, padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 5,
        borderBottom: "1px solid var(--border)", overflowX: "auto",
      }}>
        <span style={{ fontSize: 8, color: "var(--text-muted)", opacity: 0.4, marginRight: 4, whiteSpace: "nowrap", letterSpacing: "0.06em" }}>
          발매연대
        </span>
        {cells.map(cell => {
          const bg  = cell.avgScore != null ? scoreColor(Math.round(cell.avgScore)) : "rgba(255,255,255,0.15)";
          const op  = 0.1 + cell.intensity * 0.55;
          const isSel = selected === cell.key;
          return (
            <button
              key={cell.key}
              onClick={() => onSelect(isSel ? null : cell.key)}
              onMouseEnter={() => setHovered(cell.key)}
              onMouseLeave={() => setHovered(null)}
              style={{
                flexShrink: 0, width: 76, height: "calc(100% - 4px)",
                borderRadius: 8,
                border: isSel ? `1.5px solid ${bg}` : "1.5px solid transparent",
                backgroundColor: `${bg}${Math.round(op * 255).toString(16).padStart(2, "0")}`,
                cursor: "pointer", padding: "7px 5px",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
                outline: "none",
                boxShadow: isSel ? `0 0 0 2px ${bg}44` : "none",
                opacity: selected && !isSel ? 0.38 : 1,
                transition: "opacity 0.2s ease, border-color 0.15s ease",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{cell.label}</span>
              <span style={{ fontSize: 8, color: "var(--text-muted)", opacity: 0.6, lineHeight: 1 }}>{cell.count}개</span>
              {cell.avgScore != null && (
                <span style={{ fontSize: 9, fontWeight: 700, color: bg, lineHeight: 1, filter: "brightness(1.3)" }}>
                  avg {cell.avgScore.toFixed(1)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Listened mode — year × month grid
  const years = Array.from(new Set(events.map(ev => ev.date.substring(0, 4)))).sort();
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const cellMap = new Map(cells.map(c => [c.key, c]));
  const rowH = Math.max(14, Math.floor((HEATMAP_H - 30) / Math.max(years.length, 1)));

  return (
    <div style={{ height: HEATMAP_H, padding: "8px 12px", borderBottom: "1px solid var(--border)", overflowY: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: `28px repeat(12, 1fr)`, gap: "2px", fontSize: 8, color: "var(--text-muted)", opacity: 0.42 }}>
        <div />
        {MONTHS.map(m => <div key={m} style={{ textAlign: "center" }}>{m}</div>)}
        {years.map(yr => (
          <>
            <div key={`yr-${yr}`} style={{ lineHeight: `${rowH}px`, opacity: 0.55, fontWeight: 600 }}>{yr}</div>
            {MONTHS.map((_, i) => {
              const key  = `${yr}-${String(i + 1).padStart(2, "0")}`;
              const cell = cellMap.get(key);
              const bg   = cell?.avgScore != null ? scoreColor(Math.round(cell.avgScore)) : "rgba(255,255,255,0.18)";
              const op   = cell ? 0.1 + cell.intensity * 0.55 : 0.04;
              const isSel = selected === key;
              return (
                <button key={key} onClick={() => cell && onSelect(isSel ? null : key)} style={{
                  height: rowH, borderRadius: 3,
                  backgroundColor: `${bg}${Math.round(op * 255).toString(16).padStart(2, "0")}`,
                  border: isSel ? `1px solid ${bg}` : "1px solid transparent",
                  cursor: cell ? "pointer" : "default",
                  padding: 0, outline: "none",
                  opacity: selected && !isSel ? 0.38 : 1,
                  transition: "opacity 0.2s ease",
                }} />
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

// ─── ScoreAxis ────────────────────────────────────────────────────────────────

function ScoreAxis({ scoreCounts, maxCount }: { scoreCounts: Map<number, number>; maxCount: number }) {
  const scores = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => SCORE_MAX - i);
  return (
    <div style={{ width: AXIS_W, flexShrink: 0, position: "relative", borderRight: "1px solid var(--border)" }}>
      {scores.map(s => {
        const c     = scoreColor(s);
        const count = scoreCounts.get(s) ?? 0;
        const barW  = maxCount > 0 ? Math.round((count / maxCount) * 22) : 0;
        return (
          <div key={s} style={{
            position: "absolute",
            top: bandCenterY(s),
            right: 0, left: 0,
            transform: "translateY(-50%)",
            display: "flex", alignItems: "center", justifyContent: "flex-end",
            gap: 4, paddingRight: 6,
          }}>
            {barW > 0 && (
              <div style={{ width: barW, height: 6, borderRadius: 2, backgroundColor: c, opacity: 0.45, flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 10, fontWeight: 800, color: c, opacity: 0.75, lineHeight: 1, minWidth: 8, textAlign: "right" }}>{s}</span>
          </div>
        );
      })}
      <div style={{
        position: "absolute", top: unratedCenterY(),
        right: 4, transform: "translateY(-50%)",
        fontSize: 7, color: "var(--text-muted)", opacity: 0.3, textAlign: "right", lineHeight: 1.3,
      }}>
        미평가
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ChronicleViewer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [events, setEvents]         = useState<TimelineEvent[] | null>(null);
  const [fetchErr, setFetchErr]     = useState(false);
  const [mode, setMode]             = useState<ViewMode>("release");
  const [zoom, setZoom]             = useState(0);
  const [selected, setSelected]     = useState<AlbumWithRatings | null>(null);
  const [tooltip, setTooltip]       = useState<{ ev: TimelineEvent; mx: number; my: number } | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [axisDrawn, setAxisDrawn]   = useState(false);
  const [scrollX, setScrollX]       = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const wrapRef      = useRef<HTMLDivElement>(null);
  const scrollRef    = useRef<HTMLDivElement>(null);
  const zoomRef      = useRef(0);
  const fitRef       = useRef(0);
  const trufitRef    = useRef(0); // fit-all (minimum zoom)
  const dragRef      = useRef<{ startX: number; scrollLeft: number } | null>(null);
  const dragMovedRef = useRef(false);
  const velRef       = useRef(0);
  const rafRef       = useRef<number>(0);

  useEffect(() => {
    fetch(`/api/profile/${userId}/timeline`)
      .then(r => r.json())
      .then(d => setEvents(d.events ?? []))
      .catch(() => setFetchErr(true));
  }, [userId]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", fn); document.body.style.overflow = ""; };
  }, [onClose]);

  const { minMs, maxMs, totalMs } = useMemo(
    () => computeRange(events ?? [], mode),
    [events, mode]
  );

  /* fit zoom — target years/days visible, not full range */
  useEffect(() => {
    if (!events?.length || !wrapRef.current || !totalMs) return;
    const w = wrapRef.current.clientWidth - AXIS_W - 24;
    const targetMs = mode === "release"
      ? FIT_YEARS_VISIBLE * MS_YEAR
      : FIT_DAYS_VISIBLE  * MS_DAY;
    const fit   = w / targetMs;
    const trufit = w / totalMs;   // fit-all (allows zooming out to see everything)
    fitRef.current   = fit;
    trufitRef.current = trufit;
    zoomRef.current  = fit;
    setZoom(fit);
    setAxisDrawn(false);
    setTimeout(() => setAxisDrawn(true), 80);
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, [events, mode, totalMs]);

  /* resize */
  useEffect(() => {
    const fn = () => {
      if (!wrapRef.current || !totalMs) return;
      const w = wrapRef.current.clientWidth - AXIS_W - 24;
      const targetMs = mode === "release" ? FIT_YEARS_VISIBLE * MS_YEAR : FIT_DAYS_VISIBLE * MS_DAY;
      const fit    = w / targetMs;
      const trufit = w / totalMs;
      fitRef.current    = fit;
      trufitRef.current = trufit;
      if (zoomRef.current <= fit * 1.05) { zoomRef.current = fit; setZoom(fit); }
    };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [totalMs, mode]);

  /* wheel: vertical = zoom, horizontal = pan */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !minMs) return;
    const fn = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.6) {
        el.scrollLeft += e.deltaX;
      } else {
        const fac = e.deltaMode === 0
          ? Math.pow(1.003, -e.deltaY)
          : e.deltaY > 0 ? 0.83 : 1.20;
        const rect = el.getBoundingClientRect();
        const cx   = e.clientX - rect.left + el.scrollLeft;
        const cMs  = cx / zoomRef.current + minMs;
        // Can zoom out to trufit (see all) or in to MAX_ZOOM
        const nz = Math.max(trufitRef.current * 0.9, Math.min(MAX_ZOOM, zoomRef.current * fac));
        zoomRef.current = nz; setZoom(nz);
        requestAnimationFrame(() => {
          if (scrollRef.current) scrollRef.current.scrollLeft = (cMs - minMs) * nz - (e.clientX - rect.left);
        });
      }
    };
    el.addEventListener("wheel", fn, { passive: false });
    return () => el.removeEventListener("wheel", fn);
  }, [minMs]);

  /* pinch zoom */
  const bind = usePinch(
    ({ offset: [scale], origin: [ox], first, memo }) => {
      const el = scrollRef.current; if (!el) return;
      if (first) {
        const rect = el.getBoundingClientRect();
        return { initZ: zoomRef.current, cMs: (ox - rect.left + el.scrollLeft) / zoomRef.current + minMs, ox: ox - rect.left };
      }
      if (!memo) return;
      const nz = Math.max(trufitRef.current * 0.9, Math.min(MAX_ZOOM, memo.initZ * scale));
      zoomRef.current = nz; setZoom(nz);
      requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollLeft = (memo.cMs - minMs) * nz - memo.ox; });
      return memo;
    },
    { from: [1, 0], eventOptions: { passive: false } },
  );

  /* drag-to-pan with inertia */
  const onDragStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    cancelAnimationFrame(rafRef.current);
    dragMovedRef.current = false;
    dragRef.current = { startX: e.clientX, scrollLeft: scrollRef.current?.scrollLeft ?? 0 };
    velRef.current = 0;
    setIsDragging(true);
  }, []);

  useEffect(() => {
    let lastX = 0, lastT = 0;
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current || !scrollRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      if (Math.abs(dx) > 4) dragMovedRef.current = true;
      scrollRef.current.scrollLeft = dragRef.current.scrollLeft - dx;
      const now = performance.now();
      velRef.current = (lastX - e.clientX) / Math.max(now - lastT, 1) * 16;
      lastX = e.clientX; lastT = now;
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setIsDragging(false);
      // Inertia coast
      let v = velRef.current;
      const coast = () => {
        if (!scrollRef.current || Math.abs(v) < 0.4) return;
        scrollRef.current.scrollLeft += v;
        v *= 0.93;
        rafRef.current = requestAnimationFrame(coast);
      };
      coast();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const zoomStep = useCallback((fac: number) => {
    const el = scrollRef.current; if (!el) return;
    const cx  = el.scrollLeft + el.clientWidth / 2;
    const cMs = cx / zoomRef.current + minMs;
    const nz  = Math.max(trufitRef.current * 0.9, Math.min(MAX_ZOOM, zoomRef.current * fac));
    zoomRef.current = nz; setZoom(nz);
    requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollLeft = (cMs - minMs) * nz - scrollRef.current.clientWidth / 2; });
  }, [minMs]);

  const resetZoom = useCallback(() => {
    zoomRef.current = fitRef.current; setZoom(fitRef.current);
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "=" || e.key === "+") { e.preventDefault(); zoomStep(1.4); }
      if (e.key === "-" || e.key === "_") { e.preventDefault(); zoomStep(1 / 1.4); }
      if (e.key === "0")                  { e.preventDefault(); resetZoom(); }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [zoomStep, resetZoom]);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) setScrollX(scrollRef.current.scrollLeft);
  }, []);

  /* derived */
  const cs        = coverSize(zoom, mode);
  const innerW    = zoom > 0 && totalMs > 0 ? Math.max(1000, totalMs * zoom) : 1000;
  const ticks     = useMemo(
    () => mode === "release" ? computeReleaseTicks(zoom, minMs, maxMs) : computeListenedTicks(zoom, minMs, maxMs),
    [zoom, minMs, maxMs, mode]
  );
  const heatCells = useMemo(() => computeHeatmap(events ?? [], mode), [events, mode]);
  const allDots   = useMemo(
    () => buildDotPositions(events ?? [], zoom, minMs, mode),
    [events, zoom, minMs, mode]
  );

  // Score counts for axis histogram
  const { scoreCounts, maxScoreCount } = useMemo(() => {
    const counts = new Map<number, number>();
    for (const ev of events ?? []) {
      if (ev.score != null) counts.set(ev.score, (counts.get(ev.score) ?? 0) + 1);
    }
    return { scoreCounts: counts, maxScoreCount: Math.max(...counts.values(), 1) };
  }, [events]);

  // X virtualization — only render dots in view + 500px buffer
  const containerW = (wrapRef.current?.clientWidth ?? 900) - AXIS_W;
  const visibleDots = useMemo(
    () => allDots.filter(d => d.x >= scrollX - 500 && d.x <= scrollX + containerW + 500),
    [allDots, scrollX, containerW]
  );

  const isZoomed = fitRef.current > 0 && zoom > fitRef.current * 1.1;
  const hasMajor = ticks.some(t => t.isMajor);
  const TICK_Y   = 20;

  function isPeriodMatch(ev: TimelineEvent, period: string): boolean {
    if (mode === "release") {
      const y = parseYear(ev.album.release_date);
      if (y == null) return false;
      return String(Math.floor(y / 10) * 10) === period;
    }
    return ev.date.startsWith(period);
  }

  const handleSelect = useCallback((ev: TimelineEvent) => {
    setTooltip(null);
    setSelected({
      id: ev.album.id, title: ev.album.title,
      artist: ev.album.artist_display ?? ev.album.artist,
      cover_url: ev.album.cover_url ?? undefined,
      genre: ev.album.genre ?? undefined, ratings: [],
    } as AlbumWithRatings);
  }, []);

  const handlePeriodSelect = useCallback((key: string | null) => {
    setSelectedPeriod(prev => prev === key ? null : key);
  }, []);

  useEffect(() => {
    if (!selectedPeriod || !scrollRef.current || !zoom || !minMs) return;
    let targetMs: number;
    if (mode === "release") {
      targetMs = (parseInt(selectedPeriod, 10) + 5) * MS_YEAR;
    } else {
      const [yr, mo] = selectedPeriod.split("-").map(Number);
      targetMs = new Date(yr, mo - 1, 15).getTime();
    }
    const x = (targetMs - minMs) * zoom;
    scrollRef.current.scrollTo({ left: Math.max(0, x - scrollRef.current.clientWidth / 2), behavior: "smooth" });
  }, [selectedPeriod, mode, zoom, minMs]);

  // Baseline Y = bottom of score-1 band
  const baselineY = bandCenterY(SCORE_MIN) + BAND_H / 2;
  // Unrated separator Y
  const unratedSepY = unratedCenterY() - UNRATED_H / 2 - UNRATED_GAP / 2;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400,
      backgroundColor: "var(--bg)", display: "flex", flexDirection: "column",
      animation: "cvIn .2s ease-out",
    }}>
      <style>{`
        @keyframes cvIn   { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes cvAxis { from { transform:scaleX(0); } to { transform:scaleX(1); } }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0,
      }}>
        <div style={{ flex: 1 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em" }}>청음 연대기</p>
          <p style={{ color: "var(--text-sub)", fontSize: 12 }}>
            {events ? `${events.length}개의 기록` : "불러오는 중…"}
          </p>
        </div>

        <div style={{ display: "flex", borderRadius: 7, overflow: "hidden", border: "1px solid var(--border)" }}>
          {(["release", "listened"] as ViewMode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setSelectedPeriod(null); }} style={{
              padding: "4px 10px", fontSize: 10, fontWeight: 600,
              background: mode === m ? "var(--bg-elevated)" : "none",
              color: mode === m ? "var(--text)" : "var(--text-muted)",
              border: "none", cursor: "pointer", fontFamily: "inherit",
              borderRight: m === "release" ? "1px solid var(--border)" : "none",
              transition: "background 0.15s ease, color 0.15s ease",
            }}>
              {m === "release" ? "발매순" : "청음순"}
            </button>
          ))}
        </div>

        {zoom > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {isZoomed && (
              <button onClick={resetZoom} style={{
                fontSize: 9, color: "var(--text-muted)", background: "none",
                border: "1px solid var(--border)", borderRadius: 4, padding: "3px 8px",
                cursor: "pointer", fontFamily: "inherit",
              }}>전체보기</button>
            )}
            <button onClick={() => zoomStep(1 / 1.6)} style={{
              width: 24, height: 24, borderRadius: 5, fontSize: 16,
              backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
              color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>−</button>
            <button onClick={() => zoomStep(1.6)} style={{
              width: 24, height: 24, borderRadius: 5, fontSize: 16,
              backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
              color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>+</button>
          </div>
        )}

        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-muted)", fontSize: 20, lineHeight: 1, padding: "0 2px",
        }}>×</button>
      </div>

      {/* ── Heatmap ── */}
      {events && events.length > 0 && (
        <HeatmapStrip events={events} mode={mode} cells={heatCells}
          selected={selectedPeriod} onSelect={handlePeriodSelect} />
      )}

      {/* ── Galaxy area ── */}
      <div ref={wrapRef} style={{ flex: 1, overflow: "hidden", position: "relative", display: "flex" }}>

        {!events && !fetchErr && <div style={{ display:"flex", justifyContent:"center", alignItems:"center", flex:1 }}><Spinner /></div>}
        {fetchErr && <p style={{ margin:"auto", color:"var(--text-muted)", fontSize:13 }}>불러오지 못했어요</p>}
        {events?.length === 0 && <p style={{ margin:"auto", color:"var(--text-muted)", fontSize:13 }}>아직 기록이 없어요</p>}

        {events && events.length > 0 && zoom > 0 && (
          <>
            {/* Score axis */}
            <ScoreAxis scoreCounts={scoreCounts} maxCount={maxScoreCount} />

            {/* Scroll container — both X and Y scroll allowed */}
            <div
              ref={scrollRef}
              {...bind()}
              onMouseDown={onDragStart}
              onScroll={handleScroll}
              onClickCapture={e => { if (dragMovedRef.current) e.stopPropagation(); }}
              style={{
                flex: 1, overflowX: "auto", overflowY: "auto",
                cursor: isDragging ? "grabbing" : "grab",
                userSelect: "none", touchAction: "pan-x",
              }}
            >
              {/* Inner div — fixed height = GALAXY_H, allows vertical exploration */}
              <div style={{ width: innerW, height: GALAXY_H, position: "relative" }}>

                {/* ── Score band backgrounds ── */}
                {Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => SCORE_MAX - i).map(s => (
                  <div key={`band-bg-${s}`} style={{
                    position: "absolute", left: 0,
                    top: bandTopY(s), height: BAND_H, width: "100%",
                    backgroundColor: `${scoreColor(s)}${s % 2 === 0 ? "07" : "04"}`,
                    pointerEvents: "none",
                  }} />
                ))}

                {/* ── Band separator lines ── */}
                {Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => SCORE_MAX - i).map(s => (
                  <div key={`band-line-${s}`} style={{
                    position: "absolute", left: 0,
                    top: bandTopY(s), height: 1, width: "100%",
                    backgroundColor: "var(--border)",
                    opacity: s === SCORE_MAX ? 0.3 : 0.1,
                    pointerEvents: "none",
                  }} />
                ))}

                {/* ── Unrated separator ── */}
                <div style={{
                  position: "absolute", left: 0, top: unratedSepY,
                  width: "100%", height: 1,
                  borderTop: "1px dashed var(--border)",
                  opacity: 0.18, pointerEvents: "none",
                }} />

                {/* ── X ticks ── */}
                {ticks.map((tk, i) => (
                  <div key={i}>
                    <div style={{
                      position: "absolute", left: tk.x,
                      top: TICK_Y + (tk.isMajor ? 0 : 12),
                      transform: "translateX(-50%)",
                      fontSize: tk.isMajor ? 10 : 8,
                      fontWeight: tk.isMajor ? 700 : 400,
                      color: tk.isMajor ? "var(--text-sub)" : "var(--text-muted)",
                      opacity: tk.isMajor ? 0.7 : 0.38,
                      whiteSpace: "nowrap", pointerEvents: "none",
                    }}>
                      {tk.label}
                    </div>
                    <div style={{
                      position: "absolute", left: tk.x,
                      top: TICK_Y + (hasMajor ? 28 : 16),
                      width: 1, height: tk.isMajor ? 14 : 7,
                      backgroundColor: "var(--border)",
                      opacity: tk.isMajor ? 0.45 : 0.18,
                      pointerEvents: "none",
                    }} />
                  </div>
                ))}

                {/* ── Baseline (bottom of score-1 band) ── */}
                <div style={{
                  position: "absolute", left: 0, top: baselineY,
                  width: "100%", height: 1,
                  background: "linear-gradient(to right, transparent, var(--border-light) 2%, var(--border-light) 98%, transparent)",
                  transformOrigin: "left center",
                  transform: "scaleX(0)",
                  animation: axisDrawn ? "cvAxis .65s cubic-bezier(0.22,1,0.36,1) forwards" : "none",
                  pointerEvents: "none",
                }} />

                {/* ── Galaxy dots ── */}
                {visibleDots.map(pos => (
                  <GalaxyDot
                    key={`${pos.ev.album.id}-${pos.ev.date}`}
                    pos={pos} cs={cs}
                    dimmed={selectedPeriod != null && !isPeriodMatch(pos.ev, selectedPeriod)}
                    onSelect={handleSelect}
                    onTipEnter={(ev, mx, my) => setTooltip({ ev, mx, my })}
                    onTipLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            </div>

            {/* Edge fades */}
            <div style={{ position:"absolute", top:0, bottom:0, left:AXIS_W, width:36,
              background:"linear-gradient(to right, var(--bg), transparent)",
              pointerEvents:"none", zIndex:8 }} />
            <div style={{ position:"absolute", top:0, bottom:0, right:0, width:36,
              background:"linear-gradient(to left, var(--bg), transparent)",
              pointerEvents:"none", zIndex:8 }} />

            {!isZoomed && (
              <p style={{
                position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)",
                fontSize:9, color:"var(--text-muted)", opacity:0.28,
                pointerEvents:"none", zIndex:5, whiteSpace:"nowrap",
              }}>
                드래그·스크롤 이동 · 세로스크롤 확대 · +/- 키
              </p>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {tooltip && (
          <Tooltip key={`${tooltip.ev.album.id}-${tooltip.ev.date}`}
            ev={tooltip.ev} mx={tooltip.mx} my={tooltip.my} />
        )}
      </AnimatePresence>

      {selected && <AlbumModal album={selected} onClose={() => setSelected(null)} source="timeline" />}
    </div>
  );
}
