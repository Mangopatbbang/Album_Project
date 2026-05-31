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
const STEM_MIN = 12;
const LEVEL_H  = 72;
const MAX_LVLS = 5;
const MAX_ZOOM = 2.5e-6;

const Y_MAJ_LABEL = 10;
const Y_MIN_LABEL = 36;
const Y_MAJ_TICK  = 64;
const Y_MIN_TICK  = 70;
const AXIS_MIN    = 90;

// Max possible infoH (score + diary + date + gaps + margin) for axisY calculation
const INFO_H_MAX  = 40;
const MAX_BAR_H   = 32;  // max density bar height (px)

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pxPerDay = (z: number) => z * MS_DAY;

function coverSize(z: number): number {
  const d = pxPerDay(z);
  if (d < 1.5)  return 0;
  if (d < 6)    return 20;
  if (d < 18)   return 34;
  if (d < 55)   return 48;
  return 60;
}

function dotRadius(score: number | undefined): number {
  if (score == null) return 3.5;
  if (score >= 8)    return 5.5;
  if (score >= 7)    return 4.5;
  if (score >= 6)    return 4;
  return 3.5;
}

// Stem fades from cover downward toward axis
function stemAlpha(score: number | undefined): [string, string] {
  if (score == null) return ["30", "08"];
  if (score >= 8)    return ["88", "20"];
  if (score >= 7)    return ["66", "16"];
  if (score >= 6)    return ["50", "12"];
  return              ["40", "0c"];
}

// Stem width — high-score albums get a slightly thicker stem
const stemWidth = (score: number | undefined) =>
  score != null && score >= 8 ? 2 : 1.5;

const showInfo = (z: number) => pxPerDay(z) >= 24;

// ─── Tick computation ─────────────────────────────────────────────────────────

interface Tick { x: number; label: string; isMajor: boolean }

function computeTicks(z: number, minMs: number, maxMs: number): Tick[] {
  if (!z || !maxMs) return [];
  const d = pxPerDay(z);
  type Cfg = { step: (dt: Date) => void; minor: (dt: Date) => string; major: (dt: Date) => string; isMaj: (dt: Date) => boolean };
  const cfg: Cfg =
    d < 2.5  ? { step: dt => dt.setFullYear(dt.getFullYear() + 1), minor: dt => `${dt.getFullYear()}`,                   major: dt => `${dt.getFullYear()}`,                      isMaj: () => false } :
    d < 9    ? { step: dt => dt.setMonth(dt.getMonth() + 1),       minor: dt => `${dt.getMonth() + 1}월`,                major: dt => `${dt.getFullYear()}`,                      isMaj: dt => dt.getMonth() === 0 } :
    d < 35   ? { step: dt => dt.setDate(dt.getDate() + 7),         minor: dt => `${dt.getMonth() + 1}/${dt.getDate()}`,  major: dt => `${dt.getFullYear()}.${dt.getMonth() + 1}`, isMaj: dt => dt.getDate() <= 7 } :
               { step: dt => dt.setDate(dt.getDate() + 1),         minor: dt => `${dt.getDate()}일`,                     major: dt => `${dt.getFullYear()}.${dt.getMonth() + 1}`, isMaj: dt => dt.getDate() === 1 };

  const cur = new Date(minMs);
  if (d < 2.5)     { cur.setMonth(0, 1); cur.setHours(0, 0, 0, 0); }
  else if (d < 9)  { cur.setDate(1);     cur.setHours(0, 0, 0, 0); }
  else if (d < 35) { cur.setDate(cur.getDate() - cur.getDay()); cur.setHours(0, 0, 0, 0); }
  else               cur.setHours(0, 0, 0, 0);

  const ticks: Tick[] = [];
  while (cur.getTime() <= maxMs + MS_DAY * 2) {
    const x = (cur.getTime() - minMs) * z;
    ticks.push({ x, label: cfg.isMaj(cur) ? cfg.major(cur) : cfg.minor(cur), isMajor: cfg.isMaj(cur) });
    cfg.step(cur);
    if (ticks.length > 600) break;
  }
  return ticks;
}

// ─── Year bands ───────────────────────────────────────────────────────────────

interface YearBand { x1: number; x2: number; isEven: boolean; year: number }

function computeYearBands(z: number, minMs: number, maxMs: number): YearBand[] {
  if (!z || !maxMs) return [];
  const startY = new Date(minMs).getFullYear();
  const endY   = new Date(maxMs).getFullYear();
  const bands: YearBand[] = [];
  for (let y = startY; y <= endY; y++) {
    const yStart = Math.max(new Date(y, 0, 1).getTime(), minMs);
    const yEnd   = Math.min(new Date(y + 1, 0, 1).getTime(), maxMs);
    bands.push({ x1: (yStart - minMs) * z, x2: (yEnd - minMs) * z, isEven: y % 2 === 0, year: y });
  }
  return bands;
}

// ─── Marker layout ────────────────────────────────────────────────────────────

interface MarkerDatum    { ev: TimelineEvent; x: number; level: number }
interface OverflowBadge { x: number; count: number }

function buildMarkers(
  events: TimelineEvent[], z: number, minMs: number, innerW: number
): { markers: MarkerDatum[]; overflows: OverflowBadge[] } {
  if (!events.length || !z || !innerW) return { markers: [], overflows: [] };
  const cs   = coverSize(z);
  const slot = Math.max(cs + 8, 8);
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const placed: MarkerDatum[] = [];
  const overflowMap = new Map<number, { x: number; count: number }>();

  for (const ev of sorted) {
    const x = (new Date(ev.date).getTime() - minMs) * z;
    let placedLevel = -1;
    for (let att = 0; att < MAX_LVLS; att++) {
      if (!placed.slice(-30).some(p => p.level === att && Math.abs(p.x - x) < slot)) {
        placedLevel = att; break;
      }
    }
    if (placedLevel >= 0) {
      placed.push({ ev, x, level: placedLevel });
    } else {
      // Attach overflow to the nearest visible marker in this slot
      const anchor = placed.slice().reverse().find(p => Math.abs(p.x - x) < slot);
      const key    = Math.round((anchor?.x ?? x) * 10);
      const entry  = overflowMap.get(key);
      if (entry) entry.count++;
      else overflowMap.set(key, { x: anchor?.x ?? x, count: 1 });
    }
  }

  return { markers: placed, overflows: Array.from(overflowMap.values()) };
}

// ─── Density bars ─────────────────────────────────────────────────────────────

interface DensityBar { x: number; w: number; h: number; opacity: number }

function computeDensity(events: TimelineEvent[], z: number, minMs: number): DensityBar[] {
  if (!z || !events.length) return [];
  const d          = pxPerDay(z);
  const bucketDays = d < 2.5 ? 30 : d < 9 ? 7 : 1;
  const bucketMs   = bucketDays * MS_DAY;
  const bucketW    = bucketMs * z;

  const counts = new Map<number, number>();
  for (const ev of events) {
    const key = Math.floor((new Date(ev.date).getTime() - minMs) / bucketMs);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (!counts.size) return [];

  const maxCount = Math.max(...counts.values());
  return Array.from(counts.entries()).map(([key, count]) => {
    const ratio = count / maxCount;
    return {
      x:       Math.max(key * bucketMs * z, 0),
      w:       Math.max(bucketW - 1, 1),
      h:       Math.max(Math.round(ratio * MAX_BAR_H), 2),
      opacity: 0.05 + ratio * 0.11,
    };
  });
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ ev, mx, my }: { ev: TimelineEvent; mx: number; my: number }) {
  const c = ev.score != null ? scoreColor(ev.score) : "var(--text-muted)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.96 }}
      transition={{ duration: 0.13 }}
      style={{
        position: "fixed", left: mx, top: my - 86,
        transform: "translateX(-50%)",
        zIndex: 600, pointerEvents: "none",
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 10, padding: "9px 12px",
        display: "flex", alignItems: "center", gap: 9,
        maxWidth: 220, minWidth: 110,
        boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
    >
      {ev.album.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img loading="lazy" src={ev.album.cover_url} alt="" style={{ width: 32, height: 32, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ color: "var(--text)", fontSize: 11, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {ev.album.title}
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {ev.album.artist_display ?? ev.album.artist}
        </p>
      </div>
      {ev.score != null && (
        <span style={{ fontSize: 14, fontWeight: 800, color: c, flexShrink: 0 }}>{ev.score}</span>
      )}
      <div style={{
        position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)",
        width: 0, height: 0,
        borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
        borderTop: "5px solid var(--border)",
      }} />
    </motion.div>
  );
}

// ─── AlbumMarker ──────────────────────────────────────────────────────────────
// Markers float ABOVE the axis. Layout (top→bottom): infoLabel → cover/dot → stem → axis-dot
// stem's bottom lands on axisY; the tiny axis-dot straddles the axis line.

interface MarkerProps {
  m: MarkerDatum; cs: number; innerW: number; axisY: number;
  showInfoFlag: boolean; animated: boolean;
  onSelect: (ev: TimelineEvent) => void;
  onTipEnter: (ev: TimelineEvent, mx: number, my: number) => void;
  onTipLeave: () => void;
}

function AlbumMarker({ m, cs, innerW, axisY, showInfoFlag, animated, onSelect, onTipEnter, onTipLeave }: MarkerProps) {
  const [hov, setHov] = useState(false);
  const { ev, x, level } = m;
  const dot    = ev.score != null ? scoreColor(ev.score) : "var(--border)";
  const isDot  = cs === 0;
  const stemH  = STEM_MIN + level * LEVEL_H;
  const sw     = stemWidth(ev.score);
  const delay  = animated ? 0 : 0.38 + Math.min((x / Math.max(innerW, 1)) * 0.52, 0.52);
  const [hi, lo] = stemAlpha(ev.score);

  // Actual info-label height (varies per marker — prevents phantom gap above cover)
  const infoH = (() => {
    if (!showInfoFlag || isDot) return 0;
    let h = 4; // marginBottom
    h += 11;   // date line
    if (ev.score != null)    h += 13; // score + gap
    if (ev.type === "diary") h += 11; // icon + gap
    return h;
  })();

  const dotSz   = isDot ? dotRadius(ev.score) * 2 : 0;
  const markerH = isDot ? dotSz : cs;
  // stem bottom = axisY; axis-dot straddles axis so subtract 2px for it
  const topPos  = axisY - stemH - markerH - infoH - 2;

  const enter = (e: React.MouseEvent) => { setHov(true);  onTipEnter(ev, e.clientX, e.clientY); };
  const leave = ()                      => { setHov(false); onTipLeave(); };

  return (
    <div style={{
      position: "absolute",
      left: x, top: topPos,
      transform: "translateX(-50%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      animation: animated ? "none" : `tvFade .22s ${delay.toFixed(3)}s ease-out both`,
      zIndex: hov ? 50 : MAX_LVLS - level + 2,
      willChange: "auto",
    }}>

      {/* ── Info label (above cover) ── */}
      {!isDot && showInfoFlag && (
        <div style={{
          marginBottom: 4,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          pointerEvents: "none",
        }}>
          {ev.score != null && (
            <span style={{ fontSize: 11, fontWeight: 800, color: dot, lineHeight: 1 }}>{ev.score}</span>
          )}
          {ev.type === "diary" && (
            <span style={{ fontSize: 9, color: "var(--text-muted)", lineHeight: 1, opacity: 0.55 }}>✎</span>
          )}
          <span style={{
            fontSize: 9, color: "var(--text-muted)", opacity: 0.4, lineHeight: 1,
            whiteSpace: "nowrap", fontFamily: "var(--font-mono, ui-monospace, monospace)",
          }}>
            {ev.date.slice(5).replace("-", "/")}
          </span>
        </div>
      )}

      {isDot ? (
        /* ── Dot mode — score label beside high-rated dots ── */
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <button onClick={() => onSelect(ev)} onMouseEnter={enter} onMouseLeave={leave} style={{
            width: dotSz, height: dotSz,
            borderRadius: "50%",
            backgroundColor: dot,
            border: "2px solid var(--bg)",
            padding: 0, cursor: "pointer",
            boxShadow: ev.score != null && ev.score >= 7
              ? `0 0 0 2px var(--bg), 0 0 ${hov ? 9 : 5}px ${dot}${hov ? "cc" : "88"}`
              : hov ? `0 0 0 3px ${dot}33` : "none",
            transform: hov ? "scale(1.5)" : "scale(1)",
            transition: "transform .15s ease, box-shadow .15s ease",
          }} />
          {ev.score != null && ev.score >= 8 && (
            <span style={{
              position: "absolute",
              left: dotSz + 4,
              top: "50%", transform: "translateY(-50%)",
              fontSize: 9, fontWeight: 800, color: dot,
              opacity: hov ? 1 : 0.6,
              whiteSpace: "nowrap", lineHeight: 1,
              pointerEvents: "none",
              transition: "opacity .15s ease",
            }}>
              {ev.score}
            </span>
          )}
        </div>
      ) : (
        /* ── Cover mode ── */
        <button onClick={() => onSelect(ev)} onMouseEnter={enter} onMouseLeave={leave} style={{
          width: cs, height: cs, padding: 0,
          borderRadius: cs > 44 ? 9 : 6,
          overflow: "hidden", border: "none", cursor: "pointer",
          backgroundColor: "var(--bg-elevated)",
          outline: hov ? `2px solid ${dot}` : `1px solid ${dot}15`,
          outlineOffset: 2,
          boxShadow: hov
            ? `0 8px 24px rgba(0,0,0,.65), 0 0 0 4px ${dot}28`
            : "0 2px 8px rgba(0,0,0,.28)",
          transform: hov ? "scale(1.1) translateY(-3px)" : "scale(1)",
          transition: "transform .14s ease, box-shadow .14s ease, outline .14s ease",
        }}>
          {ev.album.cover_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img loading="lazy" src={ev.album.cover_url} alt={ev.album.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
                justifyContent: "center", color: "var(--text-muted)", fontSize: Math.floor(cs * 0.38) }}>♪</div>
          }
        </button>
      )}

      {/* ── Stem ── */}
      <div style={{
        width: sw, height: stemH, flexShrink: 0,
        background: `linear-gradient(to bottom, ${dot}${hi} 0%, ${dot}${lo} 100%)`,
        pointerEvents: "none",
        marginTop: 2,
      }} />

      {/* ── Axis connection dot — straddles the axis line ── */}
      <div style={{
        width: isDot ? 3 : 4, height: isDot ? 3 : 4,
        borderRadius: "50%",
        backgroundColor: dot,
        opacity: hov ? 0.7 : 0.28,
        flexShrink: 0,
        marginTop: -2,
        transition: "opacity .15s ease",
        pointerEvents: "none",
      }} />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TimelineViewer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [events, setEvents]       = useState<TimelineEvent[] | null>(null);
  const [fetchErr, setFetchErr]   = useState(false);
  const [zoom, setZoom]           = useState(0);
  const [selected, setSelected]   = useState<AlbumWithRatings | null>(null);
  const [tooltip, setTooltip]     = useState<{ ev: TimelineEvent; mx: number; my: number } | null>(null);
  const [axisDrawn, setAxisDrawn] = useState(false);
  const [animated, setAnimated]   = useState(false);
  const [wrapH, setWrapH]         = useState(400);
  const [isDragging, setIsDragging] = useState(false);

  const wrapRef    = useRef<HTMLDivElement>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);
  const zoomRef    = useRef(0);
  const fitRef     = useRef(0);
  const dragRef    = useRef<{ startX: number; scrollLeft: number } | null>(null);
  const dragMovedRef = useRef(false);

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

  useEffect(() => {
    const update = () => { if (wrapRef.current) setWrapH(wrapRef.current.clientHeight); };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const { minMs, maxMs, totalMs } = useMemo(() => {
    if (!events?.length) return { minMs: 0, maxMs: 0, totalMs: 0 };
    const ts = events.map(e => new Date(e.date).getTime());
    const lo = Math.min(...ts), hi = Math.max(...ts);
    const pad = Math.max((hi - lo) * 0.04, MS_DAY * 25);
    return { minMs: lo - pad, maxMs: hi + pad, totalMs: (hi + pad) - (lo - pad) };
  }, [events]);

  useEffect(() => {
    if (!events?.length || !wrapRef.current || !totalMs) return;
    const w   = wrapRef.current.clientWidth - 32;
    const fit = w / totalMs;
    fitRef.current  = fit;
    zoomRef.current = fit;
    setZoom(fit);
    setTimeout(() => setAxisDrawn(true), 60);
    setTimeout(() => setAnimated(true), 1300);
  }, [events, totalMs]);

  useEffect(() => {
    const fn = () => {
      if (!wrapRef.current || !totalMs) return;
      const w   = wrapRef.current.clientWidth - 32;
      const fit = w / totalMs;
      fitRef.current = fit;
      if (zoomRef.current <= fit * 1.05) { zoomRef.current = fit; setZoom(fit); }
    };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [totalMs]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !minMs) return;
    const fn = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.6) {
        // Horizontal scroll → pan
        el.scrollLeft += e.deltaX;
      } else {
        // Vertical scroll → zoom anchored at cursor
        // deltaMode 0 = pixel (smooth trackpad) → proportional; 1/2 = line/page (mouse wheel) → step
        const fac = e.deltaMode === 0
          ? Math.pow(1.003, -e.deltaY)
          : e.deltaY > 0 ? 0.83 : 1.20;
        const rect = el.getBoundingClientRect();
        const cx   = e.clientX - rect.left + el.scrollLeft;
        const cMs  = cx / zoomRef.current + minMs;
        const nz   = Math.max(fitRef.current * 0.85, Math.min(MAX_ZOOM, zoomRef.current * fac));
        zoomRef.current = nz; setZoom(nz);
        const ox = e.clientX - rect.left;
        requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollLeft = (cMs - minMs) * nz - ox; });
      }
    };
    el.addEventListener("wheel", fn, { passive: false });
    return () => el.removeEventListener("wheel", fn);
  }, [minMs]);

  const bind = usePinch(
    ({ offset: [scale], origin: [ox], first, memo }) => {
      const el = scrollRef.current; if (!el) return;
      if (first) {
        const rect = el.getBoundingClientRect();
        const cx   = ox - rect.left + el.scrollLeft;
        return { initZ: zoomRef.current, cMs: cx / zoomRef.current + minMs, ox: ox - rect.left };
      }
      if (!memo) return;
      const nz = Math.max(fitRef.current * 0.85, Math.min(MAX_ZOOM, memo.initZ * scale));
      zoomRef.current = nz; setZoom(nz);
      requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollLeft = (memo.cMs - minMs) * nz - memo.ox; });
      return memo;
    },
    { from: [1, 0], eventOptions: { passive: false } },
  );

  /* drag-to-pan — global move/up so drag survives leaving the element */
  const onDragStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragMovedRef.current = false;
    dragRef.current = { startX: e.clientX, scrollLeft: scrollRef.current?.scrollLeft ?? 0 };
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current || !scrollRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      if (Math.abs(dx) > 4) dragMovedRef.current = true;
      scrollRef.current.scrollLeft = dragRef.current.scrollLeft - dx;
    };
    const onUp = () => { dragRef.current = null; setIsDragging(false); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, []);

  const zoomStep = useCallback((fac: number) => {
    const el = scrollRef.current; if (!el) return;
    const cx  = el.scrollLeft + el.clientWidth / 2;
    const cMs = cx / zoomRef.current + minMs;
    const nz  = Math.max(fitRef.current * 0.85, Math.min(MAX_ZOOM, zoomRef.current * fac));
    zoomRef.current = nz; setZoom(nz);
    requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollLeft = (cMs - minMs) * nz - scrollRef.current.clientWidth / 2; });
  }, [minMs]);

  const resetZoom = useCallback(() => {
    zoomRef.current = fitRef.current; setZoom(fitRef.current);
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, []);

  /* keyboard zoom — +/= zoom in, - zoom out, 0 reset */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "=" || e.key === "+") { e.preventDefault(); zoomStep(1.4); }
      if (e.key === "-" || e.key === "_") { e.preventDefault(); zoomStep(1 / 1.4); }
      if (e.key === "0")                  { e.preventDefault(); resetZoom(); }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [zoomStep, resetZoom]);

  const cs        = coverSize(zoom);
  const innerW    = zoom > 0 && totalMs > 0 ? Math.max(600, totalMs * zoom) : 600;
  const ticks     = useMemo(() => computeTicks(zoom, minMs, maxMs), [zoom, minMs, maxMs]);
  const yearBands = useMemo(() => computeYearBands(zoom, minMs, maxMs), [zoom, minMs, maxMs]);
  const { markers, overflows } = useMemo(() => buildMarkers(events ?? [], zoom, minMs, innerW), [events, zoom, minMs, innerW]);
  const densityBars = useMemo(() => computeDensity(events ?? [], zoom, minMs), [events, zoom, minMs]);
  const maxLvl    = markers.length ? Math.max(...markers.map(m => m.level)) : 0;
  const needInfo  = showInfo(zoom);
  // Use worst-case infoH for axisY so no marker ever overflows the top
  const infoH     = needInfo && cs > 0 ? INFO_H_MAX : 0;
  const axisY     = Math.max(STEM_MIN + maxLvl * LEVEL_H + cs + infoH + 22, AXIS_MIN);
  const contentH  = axisY + MAX_BAR_H + 24;  // axis + bars + badge + margin
  const totalH    = Math.max(contentH, wrapH - 2);
  const isZoomed  = fitRef.current > 0 && zoom > fitRef.current * 1.1;
  const todayX    = zoom > 0 && minMs ? (Date.now() - minMs) * zoom : -1;
  const hasMajor  = ticks.some(t => t.isMajor);

  const handleSelect = useCallback((ev: TimelineEvent) => {
    setTooltip(null);
    setSelected({ id: ev.album.id, title: ev.album.title,
      artist: ev.album.artist_display ?? ev.album.artist,
      cover_url: ev.album.cover_url ?? undefined,
      genre: ev.album.genre ?? undefined, ratings: [] } as AlbumWithRatings);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400,
      backgroundColor: "var(--bg)", display: "flex", flexDirection: "column",
      animation: "tvIn .22s ease-out",
    }}>
      <style>{`
        @keyframes tvIn   { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes tvAxis { from { transform:scaleX(0); } to { transform:scaleX(1); } }
        @keyframes tvFade { from { opacity:0; } to { opacity:1; } }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "13px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0,
      }}>
        <div style={{ flex: 1 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em" }}>청음 연대기</p>
          <p style={{ color: "var(--text-sub)", fontSize: 12 }}>
            {events ? `${events.length}개의 기록` : "불러오는 중…"}
          </p>
        </div>

        {zoom > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {isZoomed && (
              <button onClick={resetZoom}
                style={{ fontSize: 10, color: "var(--text-muted)", background: "none",
                  border: "1px solid var(--border)", borderRadius: 5, padding: "3px 9px",
                  cursor: "pointer", fontFamily: "inherit" }}
                className="hover:text-[var(--text)] hover:border-[var(--border-light)] transition-all">
                전체보기
              </button>
            )}
            <button onClick={() => zoomStep(1 / 1.6)} style={{
              width: 26, height: 26, borderRadius: 5, fontSize: 17, lineHeight: 1,
              backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
              color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>−</button>
            <button onClick={() => zoomStep(1.6)} style={{
              width: 26, height: 26, borderRadius: 5, fontSize: 17, lineHeight: 1,
              backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
              color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>+</button>
          </div>
        )}

        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-muted)", fontSize: 22, lineHeight: 1, padding: "0 2px",
        }}>×</button>
      </div>

      {/* ── Timeline wrapper ── */}
      <div ref={wrapRef} style={{ flex: 1, overflow: "hidden", position: "relative" }}>

        {!events && !fetchErr && <div style={{ display:"flex", justifyContent:"center", paddingTop:80 }}><Spinner /></div>}
        {fetchErr && <div style={{ display:"flex", justifyContent:"center", paddingTop:80 }}><p style={{ color:"var(--text-muted)", fontSize:13 }}>불러오지 못했어요</p></div>}
        {events?.length === 0 && <div style={{ display:"flex", justifyContent:"center", paddingTop:80 }}><p style={{ color:"var(--text-muted)", fontSize:13 }}>아직 기록이 없어요</p></div>}

        {events && events.length > 0 && zoom > 0 && (
          <>
            <div ref={scrollRef} {...bind()}
              onMouseDown={onDragStart}
              onClickCapture={e => { if (dragMovedRef.current) e.stopPropagation(); }}
              style={{
                width: "100%", height: "100%",
                overflowX: "auto", overflowY: "auto",
                touchAction: "pan-x",
                cursor: isDragging ? "grabbing" : "grab",
                userSelect: "none",
              }}>
              <div style={{ width: innerW, height: totalH, position: "relative" }}>

                {/* ── Year bands ── */}
                {yearBands.map(b => (
                  <div key={b.year} style={{
                    position: "absolute", left: b.x1, top: 0,
                    width: Math.max(b.x2 - b.x1, 0), height: "100%",
                    backgroundColor: b.isEven ? "rgba(255,255,255,0.045)" : "transparent",
                    pointerEvents: "none",
                  }} />
                ))}

                {/* ── Year boundary lines ── */}
                {yearBands.slice(1).map(b => (
                  <div key={`yl-${b.year}`} style={{
                    position: "absolute", left: b.x1, top: 52,
                    width: 1, height: `calc(100% - 52px)`,
                    backgroundColor: "var(--border)",
                    opacity: 0.14, pointerEvents: "none",
                  }} />
                ))}

                {/* ── Major labels ── */}
                {ticks.filter(t => t.isMajor).map((tk, i) => (
                  <div key={`maj-${i}`} style={{
                    position: "absolute", left: tk.x, top: Y_MAJ_LABEL,
                    transform: "translateX(-50%)",
                    color: "var(--text-sub)", fontSize: 11, fontWeight: 700,
                    whiteSpace: "nowrap", pointerEvents: "none", letterSpacing: "0.02em",
                  }}>
                    {tk.label}
                  </div>
                ))}

                {/* ── Minor labels ── */}
                {ticks.filter(t => !t.isMajor).map((tk, i) => (
                  <div key={`min-${i}`} style={{
                    position: "absolute", left: tk.x, top: hasMajor ? Y_MIN_LABEL : Y_MAJ_LABEL,
                    transform: "translateX(-50%)",
                    color: "var(--text-muted)", fontSize: 9, fontWeight: 500,
                    whiteSpace: "nowrap", pointerEvents: "none", opacity: 0.48,
                  }}>
                    {tk.label}
                  </div>
                ))}

                {/* ── Tick marks ── */}
                {ticks.map((tk, i) => (
                  <div key={`tick-${i}`} style={{
                    position: "absolute",
                    left: tk.x, top: tk.isMajor ? Y_MAJ_TICK : Y_MIN_TICK,
                    width: 1, height: tk.isMajor ? 22 : 10,
                    backgroundColor: "var(--border)",
                    opacity: tk.isMajor ? 0.55 : 0.22,
                    pointerEvents: "none",
                  }} />
                ))}

                {/* ── Today line + label ── */}
                {todayX >= 0 && todayX <= innerW && (
                  <>
                    <div style={{
                      position: "absolute", left: todayX, top: Y_MAJ_LABEL + 14,
                      width: 1, height: axisY - Y_MAJ_LABEL - 14 + 10, pointerEvents: "none",
                      background: `linear-gradient(to bottom, transparent 0%, var(--accent) 20%, var(--accent) 88%, transparent 100%)`,
                      opacity: 0.38,
                    }} />
                    <div style={{
                      position: "absolute",
                      left: todayX + 5, top: Y_MAJ_LABEL + 14,
                      fontSize: 8, fontWeight: 700,
                      color: "var(--accent)", opacity: 0.55,
                      pointerEvents: "none", whiteSpace: "nowrap",
                      letterSpacing: "0.06em",
                    }}>
                      오늘
                    </div>
                  </>
                )}

                {/* ── Density bars (below axis) ── */}
                {densityBars.map((bar, i) => (
                  <div key={`db-${i}`} style={{
                    position: "absolute",
                    left: bar.x, top: axisY + 2,
                    width: bar.w, height: bar.h,
                    background: `linear-gradient(to top,
                      rgba(255,255,255,${(bar.opacity * 0.45).toFixed(3)}),
                      rgba(255,255,255,${bar.opacity.toFixed(3)}))`,
                    borderRadius: "2px 2px 0 0",
                    pointerEvents: "none",
                  }} />
                ))}

                {/* ── Overflow badges (below axis) ── */}
                {overflows.map((b, i) => (
                  <div key={`ovf-${i}`} style={{
                    position: "absolute",
                    left: b.x, top: axisY + MAX_BAR_H + 6,
                    transform: "translateX(-50%)",
                    fontSize: 8, fontWeight: 700, lineHeight: 1,
                    color: "var(--text-muted)", opacity: 0.5,
                    whiteSpace: "nowrap", pointerEvents: "none",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: 3, padding: "2px 4px",
                  }}>
                    +{b.count}
                  </div>
                ))}

                {/* ── Axis line ── */}
                <div style={{
                  position: "absolute", left: 0, top: axisY,
                  width: "100%", height: 1.5,
                  background: "linear-gradient(to right, transparent, var(--border-light) 2%, var(--border-light) 98%, transparent)",
                  transformOrigin: "left center",
                  transform: "scaleX(0)",
                  animation: axisDrawn ? "tvAxis .7s cubic-bezier(0.22,1,0.36,1) forwards" : "none",
                  pointerEvents: "none",
                }} />

                {/* ── Markers ── */}
                {markers.map((m) => (
                  <AlbumMarker
                    key={`${m.ev.album.id}-${m.ev.date}`}
                    m={m} cs={cs} innerW={innerW} axisY={axisY}
                    showInfoFlag={needInfo} animated={animated}
                    onSelect={handleSelect}
                    onTipEnter={(ev, mx, my) => setTooltip({ ev, mx, my })}
                    onTipLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            </div>

            {/* ── Edge fades ── */}
            <div style={{ position:"absolute", top:0, bottom:0, left:0, width:52,
              background:"linear-gradient(to right, var(--bg), transparent)",
              pointerEvents:"none", zIndex:8 }} />
            <div style={{ position:"absolute", top:0, bottom:0, right:0, width:52,
              background:"linear-gradient(to left, var(--bg), transparent)",
              pointerEvents:"none", zIndex:8 }} />

            {!isZoomed && (
              <p style={{
                position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
                fontSize: 10, color: "var(--text-muted)", opacity: 0.3,
                pointerEvents: "none", zIndex: 5, whiteSpace: "nowrap",
              }}>
                드래그·가로스크롤로 이동 · 세로스크롤·핀치로 확대 · +/- 키
              </p>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {tooltip && (
          <Tooltip
            key={`${tooltip.ev.album.id}-${tooltip.ev.date}`}
            ev={tooltip.ev} mx={tooltip.mx} my={tooltip.my}
          />
        )}
      </AnimatePresence>

      {selected && <AlbumModal album={selected} onClose={() => setSelected(null)} source="timeline" />}
    </div>
  );
}
