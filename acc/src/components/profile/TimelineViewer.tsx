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
const AXIS_Y   = 88;    // px from top of inner div to axis line
const STEM_MIN = 14;    // min stem height below axis
const LEVEL_H  = 76;    // Y step per overlap level
const MAX_LVLS = 5;
const MAX_ZOOM = 2.5e-6; // ~216 px/day (max)

// ─── Size helpers ─────────────────────────────────────────────────────────────

function pxPerDay(z: number) { return z * MS_DAY; }

function coverSize(z: number): number {
  const d = pxPerDay(z);
  if (d < 1.5) return 0;   // dot
  if (d < 6)   return 20;
  if (d < 18)  return 34;
  if (d < 55)  return 48;
  return 60;
}

function showInfo(z: number)  { return pxPerDay(z) >= 24; }
function showTooltip(z: number) { return coverSize(z) < 34; } // show tooltip when cover is too small for text

// ─── Tick computation ─────────────────────────────────────────────────────────

interface Tick { x: number; label: string; isMajor: boolean }

function computeTicks(z: number, minMs: number, maxMs: number): Tick[] {
  if (!z || !maxMs) return [];
  const d = pxPerDay(z);

  // Step size and formatters depending on zoom level
  type Cfg = { step: (dt: Date) => void; minor: (dt: Date) => string; major: (dt: Date) => string; isMaj: (dt: Date) => boolean };
  const cfg: Cfg =
    d < 2.5 ? {
      step: dt => dt.setFullYear(dt.getFullYear() + 1),
      minor: dt => `${dt.getFullYear()}`, major: dt => `${dt.getFullYear()}`, isMaj: () => false,
    } : d < 9 ? {
      step: dt => dt.setMonth(dt.getMonth() + 1),
      minor: dt => `${dt.getMonth() + 1}월`, major: dt => `${dt.getFullYear()}`, isMaj: dt => dt.getMonth() === 0,
    } : d < 35 ? {
      step: dt => dt.setDate(dt.getDate() + 7),
      minor: dt => `${dt.getMonth() + 1}/${dt.getDate()}`, major: dt => `${dt.getFullYear()}.${dt.getMonth() + 1}`, isMaj: dt => dt.getDate() <= 7,
    } : {
      step: dt => dt.setDate(dt.getDate() + 1),
      minor: dt => `${dt.getDate()}일`, major: dt => `${dt.getFullYear()}.${dt.getMonth() + 1}`, isMaj: dt => dt.getDate() === 1,
    };

  // Snap start to clean boundary
  const cur = new Date(minMs);
  if (d < 2.5)     { cur.setMonth(0, 1); cur.setHours(0, 0, 0, 0); }
  else if (d < 9)  { cur.setDate(1); cur.setHours(0, 0, 0, 0); }
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

// ─── Marker layout ────────────────────────────────────────────────────────────

interface MarkerDatum { ev: TimelineEvent; x: number; level: number }

function buildMarkers(events: TimelineEvent[], z: number, minMs: number, innerW: number): MarkerDatum[] {
  if (!events.length || !z || !innerW) return [];
  const cs = coverSize(z);
  const slot = Math.max(cs + 8, 10);
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const placed: MarkerDatum[] = [];

  for (const ev of sorted) {
    const x = (new Date(ev.date).getTime() - minMs) * z;
    let level = 0;
    for (let attempt = 0; attempt < MAX_LVLS; attempt++) {
      const clash = placed.slice(-30).some(p => p.level === attempt && Math.abs(p.x - x) < slot);
      if (!clash) { level = attempt; break; }
      level = attempt + 1;
    }
    placed.push({ ev, x, level });
  }
  return placed;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ ev, mx, my }: { ev: TimelineEvent; mx: number; my: number }) {
  const c = ev.score != null ? scoreColor(ev.score) : "var(--text-muted)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.14 }}
      style={{
        position: "fixed", left: mx, top: my - 82,
        transform: "translateX(-50%)",
        zIndex: 600, pointerEvents: "none",
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 10, padding: "9px 12px",
        display: "flex", alignItems: "center", gap: 9,
        maxWidth: 220, minWidth: 120,
        boxShadow: "0 12px 32px rgba(0,0,0,0.55)",
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
      </div>
      {ev.score != null && (
        <span style={{ fontSize: 15, fontWeight: 800, color: c, flexShrink: 0 }}>{ev.score}</span>
      )}
      {/* caret */}
      <div style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)",
        width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
        borderTop: "5px solid var(--border)" }} />
    </motion.div>
  );
}

// ─── AlbumMarker ──────────────────────────────────────────────────────────────

interface MarkerProps {
  m: MarkerDatum;
  cs: number;          // cover size
  innerW: number;
  showInfo: boolean;
  animated: boolean;   // true = skip fade-in delay (already loaded)
  onSelect: (ev: TimelineEvent) => void;
  onTooltipEnter: (ev: TimelineEvent, mx: number, my: number) => void;
  onTooltipLeave: () => void;
}

function AlbumMarker({ m, cs, innerW, showInfo, animated, onSelect, onTooltipEnter, onTooltipLeave }: MarkerProps) {
  const [hovered, setHovered] = useState(false);
  const { ev, x, level } = m;
  const dot  = ev.score != null ? scoreColor(ev.score) : "var(--border)";
  const isDot = cs === 0;
  const stemH = STEM_MIN + level * LEVEL_H;
  // Wave delay: spread across 0.5s based on proportional X position
  const delay = animated ? 0 : 0.4 + Math.min((x / innerW) * 0.5, 0.5);

  const enter = (e: React.MouseEvent) => {
    setHovered(true);
    onTooltipEnter(ev, e.clientX, e.clientY);
  };
  const leave = () => { setHovered(false); onTooltipLeave(); };

  return (
    <div
      style={{
        position: "absolute", left: x, top: AXIS_Y,
        transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", alignItems: "center",
        animation: animated ? "none" : `tvFade 0.22s ${delay.toFixed(3)}s ease-out both`,
        zIndex: hovered ? 20 : 1,
      }}
    >
      {/* Stem */}
      <div style={{
        width: 1.5, height: stemH,
        background: `linear-gradient(to bottom, ${dot}bb 0%, ${dot}22 100%)`,
        flexShrink: 0,
      }} />

      {isDot ? (
        <button
          onClick={() => onSelect(ev)}
          onMouseEnter={enter}
          onMouseLeave={leave}
          style={{
            width: 7, height: 7, borderRadius: "50%",
            backgroundColor: dot,
            border: "2px solid var(--bg)",
            padding: 0, cursor: "pointer",
            boxShadow: hovered ? `0 0 0 4px ${dot}33` : `0 0 0 1px ${dot}33`,
            transform: hovered ? "scale(1.8)" : "scale(1)",
            transition: "transform 0.14s ease, box-shadow 0.14s ease",
          }}
        />
      ) : (
        <>
          <button
            onClick={() => onSelect(ev)}
            onMouseEnter={enter}
            onMouseLeave={leave}
            style={{
              width: cs, height: cs, padding: 0,
              borderRadius: cs > 44 ? 8 : 5,
              overflow: "hidden", border: "none", cursor: "pointer",
              backgroundColor: "var(--bg-elevated)",
              outline: hovered ? `2px solid ${dot}` : `2px solid ${dot}44`,
              outlineOffset: 1,
              boxShadow: hovered
                ? `0 6px 20px rgba(0,0,0,0.6), 0 0 0 3px ${dot}33`
                : "0 2px 8px rgba(0,0,0,0.3)",
              transform: hovered ? "scale(1.12) translateY(-4px)" : "scale(1)",
              transition: "transform 0.14s ease, box-shadow 0.14s ease, outline 0.14s ease",
            }}
          >
            {ev.album.cover_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={ev.album.cover_url} alt={ev.album.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
                  justifyContent: "center", color: "var(--text-muted)", fontSize: Math.floor(cs * 0.38) }}>♪</div>
            }
          </button>

          {showInfo && (
            <div style={{ marginTop: 5, display: "flex", flexDirection: "column", alignItems: "center", gap: 1, pointerEvents: "none" }}>
              {ev.score != null && (
                <span style={{ fontSize: 11, fontWeight: 800, color: dot, lineHeight: 1 }}>{ev.score}</span>
              )}
              {ev.type === "diary" && (
                <span style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1 }}>✎</span>
              )}
              <span style={{
                fontSize: 9, color: "var(--text-muted)", opacity: 0.55, lineHeight: 1,
                whiteSpace: "nowrap", fontFamily: "var(--font-mono, ui-monospace, monospace)",
              }}>
                {ev.date.slice(5).replace("-", "/")}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TimelineViewer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [events, setEvents]       = useState<TimelineEvent[] | null>(null);
  const [fetchErr, setFetchErr]   = useState(false);
  const [zoom, setZoom]           = useState(0);
  const [selected, setSelected]   = useState<AlbumWithRatings | null>(null);
  const [tooltip, setTooltip]     = useState<{ ev: TimelineEvent; mx: number; my: number } | null>(null);
  const [axisDrawn, setAxisDrawn] = useState(false);
  const [animated, setAnimated]   = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(0);
  const fitRef  = useRef(0);

  /* fetch */
  useEffect(() => {
    fetch(`/api/profile/${userId}/timeline`)
      .then(r => r.json())
      .then(d => setEvents(d.events ?? []))
      .catch(() => setFetchErr(true));
  }, [userId]);

  /* ESC + body scroll lock */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", fn); document.body.style.overflow = ""; };
  }, [onClose]);

  /* date range with padding */
  const { minMs, maxMs, totalMs } = useMemo(() => {
    if (!events?.length) return { minMs: 0, maxMs: 0, totalMs: 0 };
    const ts = events.map(e => new Date(e.date).getTime());
    const lo = Math.min(...ts), hi = Math.max(...ts);
    const pad = Math.max((hi - lo) * 0.04, MS_DAY * 25);
    return { minMs: lo - pad, maxMs: hi + pad, totalMs: (hi + pad) - (lo - pad) };
  }, [events]);

  /* fit zoom: set once when wrapper & events are ready */
  useEffect(() => {
    if (!events?.length || !wrapRef.current || !totalMs) return;
    const w = wrapRef.current.clientWidth - 32;
    const fit = w / totalMs;
    fitRef.current  = fit;
    zoomRef.current = fit;
    setZoom(fit);
    setTimeout(() => setAxisDrawn(true), 60);
    setTimeout(() => setAnimated(true), 1300);
  }, [events, totalMs]);

  /* resize → re-fit if not zoomed */
  useEffect(() => {
    const fn = () => {
      if (!wrapRef.current || !totalMs) return;
      const w = wrapRef.current.clientWidth - 32;
      const fit = w / totalMs;
      fitRef.current = fit;
      if (zoomRef.current <= fit * 1.05) { zoomRef.current = fit; setZoom(fit); }
    };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [totalMs]);

  /* wheel zoom — only intercept vertical scroll, let horizontal pan pass through */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !minMs) return;
    const fn = (e: WheelEvent) => {
      // horizontal scroll → let native pan happen
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.8) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx   = e.clientX - rect.left + el.scrollLeft;
      const cMs  = cx / zoomRef.current + minMs;
      const fac  = e.deltaY > 0 ? 0.83 : 1.20;
      const nz   = Math.max(fitRef.current * 0.85, Math.min(MAX_ZOOM, zoomRef.current * fac));
      zoomRef.current = nz;
      setZoom(nz);
      const ox = e.clientX - rect.left;
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollLeft = (cMs - minMs) * nz - ox;
      });
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
        const cx   = ox - rect.left + el.scrollLeft;
        return { initZ: zoomRef.current, cMs: cx / zoomRef.current + minMs, ox: ox - rect.left };
      }
      if (!memo) return;
      const nz = Math.max(fitRef.current * 0.85, Math.min(MAX_ZOOM, memo.initZ * scale));
      zoomRef.current = nz; setZoom(nz);
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollLeft = (memo.cMs - minMs) * nz - memo.ox;
      });
      return memo;
    },
    { from: [1, 0], eventOptions: { passive: false } },
  );

  /* zoom buttons */
  const zoomIn  = useCallback(() => {
    const el = scrollRef.current; if (!el) return;
    const cx = el.scrollLeft + el.clientWidth / 2;
    const cMs = cx / zoomRef.current + minMs;
    const nz  = Math.min(MAX_ZOOM, zoomRef.current * 1.6);
    zoomRef.current = nz; setZoom(nz);
    requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollLeft = (cMs - minMs) * nz - scrollRef.current.clientWidth / 2; });
  }, [minMs]);

  const zoomOut = useCallback(() => {
    const el = scrollRef.current; if (!el) return;
    const cx = el.scrollLeft + el.clientWidth / 2;
    const cMs = cx / zoomRef.current + minMs;
    const nz  = Math.max(fitRef.current * 0.85, zoomRef.current / 1.6);
    zoomRef.current = nz; setZoom(nz);
    requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollLeft = (cMs - minMs) * nz - scrollRef.current.clientWidth / 2; });
  }, [minMs]);

  const resetZoom = useCallback(() => {
    zoomRef.current = fitRef.current; setZoom(fitRef.current);
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, []);

  /* derived */
  const cs        = coverSize(zoom);
  const innerW    = zoom > 0 && totalMs > 0 ? Math.max(600, totalMs * zoom) : 600;
  const ticks     = useMemo(() => computeTicks(zoom, minMs, maxMs), [zoom, minMs, maxMs]);
  const markers   = useMemo(() => buildMarkers(events ?? [], zoom, minMs, innerW), [events, zoom, minMs, innerW]);
  const maxLvl    = markers.length ? Math.max(...markers.map(m => m.level)) : 0;
  const totalH    = Math.max(280, AXIS_Y + STEM_MIN + (maxLvl + 1) * LEVEL_H + cs + 56);
  const needInfo  = showInfo(zoom);
  const needTip   = showTooltip(zoom);
  const isZoomed  = fitRef.current > 0 && zoom > fitRef.current * 1.1;
  const todayX    = zoom > 0 && minMs ? (Date.now() - minMs) * zoom : -1;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400,
      backgroundColor: "var(--bg)",
      display: "flex", flexDirection: "column",
      animation: "tvIn 0.22s ease-out",
    }}>
      <style>{`
        @keyframes tvIn   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes tvAxis { from{transform:scaleX(0)} to{transform:scaleX(1)} }
        @keyframes tvFade { from{opacity:0} to{opacity:1} }
      `}</style>

      {/* ── Header ───────────────────────────────────────────────── */}
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

        {/* zoom controls */}
        {zoom > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {isZoomed && (
              <button onClick={resetZoom} style={{
                fontSize: 10, color: "var(--text-muted)", background: "none",
                border: "1px solid var(--border)", borderRadius: 5, padding: "3px 9px",
                cursor: "pointer", fontFamily: "inherit",
              }}
              className="hover:text-[var(--text)] hover:border-[var(--border-light)] transition-all">
                전체보기
              </button>
            )}
            <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
              <button onClick={zoomOut} style={{
                width: 26, height: 26, borderRadius: 5, fontSize: 16, lineHeight: 1,
                backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
                color: "var(--text-muted)", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", fontFamily: "inherit",
              }}>−</button>
              <button onClick={zoomIn} style={{
                width: 26, height: 26, borderRadius: 5, fontSize: 16, lineHeight: 1,
                backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
                color: "var(--text-muted)", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", fontFamily: "inherit",
              }}>+</button>
            </div>
          </div>
        )}

        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-muted)", fontSize: 22, lineHeight: 1, padding: "0 2px",
        }}>×</button>
      </div>

      {/* ── Timeline wrapper ─────────────────────────────────────── */}
      <div ref={wrapRef} style={{ flex: 1, overflow: "hidden", position: "relative" }}>

        {/* loading / error / empty */}
        {!events && !fetchErr && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner /></div>
        )}
        {fetchErr && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>불러오지 못했어요</p>
          </div>
        )}
        {events?.length === 0 && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>아직 기록이 없어요</p>
          </div>
        )}

        {/* hint text when loading is done */}
        {events && events.length > 0 && zoom > 0 && !isZoomed && (
          <p style={{
            position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)",
            fontSize: 10, color: "var(--text-muted)", opacity: 0.45, pointerEvents: "none", zIndex: 5,
            whiteSpace: "nowrap",
          }}>
            스크롤 또는 핀치로 확대
          </p>
        )}

        {/* Scroll container */}
        {events && events.length > 0 && zoom > 0 && (
          <div
            ref={scrollRef}
            {...bind()}
            style={{
              width: "100%", height: "100%",
              overflowX: "auto", overflowY: "auto",
              touchAction: "pan-x",
            }}
          >
            <div style={{ width: innerW, height: totalH, position: "relative" }}>

              {/* ── Major labels (year / month) ── */}
              {ticks.filter(t => t.isMajor).map((tk, i) => (
                <div key={`maj-${i}`} style={{
                  position: "absolute", left: tk.x, top: 12,
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
                  position: "absolute", left: tk.x, top: ticks.some(t => t.isMajor) ? 38 : 22,
                  transform: "translateX(-50%)",
                  color: "var(--text-muted)", fontSize: 9, fontWeight: 500,
                  whiteSpace: "nowrap", pointerEvents: "none", opacity: 0.6,
                }}>
                  {tk.label}
                </div>
              ))}

              {/* ── Tick marks ── */}
              {ticks.map((tk, i) => (
                <div key={`tick-${i}`} style={{
                  position: "absolute",
                  left: tk.x, top: tk.isMajor ? 56 : 62,
                  width: 1, height: tk.isMajor ? 20 : 10,
                  backgroundColor: "var(--border)",
                  opacity: tk.isMajor ? 0.7 : 0.35,
                  pointerEvents: "none",
                }} />
              ))}

              {/* ── Today line ── */}
              {todayX >= 0 && todayX <= innerW && (
                <div style={{
                  position: "absolute", left: todayX, top: 10,
                  width: 1, height: AXIS_Y + 16, pointerEvents: "none",
                  background: `linear-gradient(to bottom, transparent 0%, var(--accent) 30%, var(--accent) 80%, transparent 100%)`,
                  opacity: 0.5,
                }} />
              )}

              {/* ── Axis line (animated draw) ── */}
              <div style={{
                position: "absolute", left: 0, top: AXIS_Y, width: "100%", height: 1.5,
                background: "linear-gradient(to right, transparent, var(--border-light) 2%, var(--border-light) 98%, transparent)",
                transformOrigin: "left center",
                transform: "scaleX(0)", // always start hidden; animation overrides when ready
                animation: axisDrawn ? "tvAxis 0.7s cubic-bezier(0.22,1,0.36,1) forwards" : "none",
                pointerEvents: "none",
              }} />

              {/* ── Markers ── */}
              {markers.map((m, i) => (
                <AlbumMarker
                  key={`${m.ev.album.id}-${m.ev.date}`}
                  m={m}
                  cs={cs}
                  innerW={innerW}
                  showInfo={needInfo}
                  animated={animated}
                  onSelect={ev => { setTooltip(null); setSelected({ id: ev.album.id, title: ev.album.title, artist: ev.album.artist_display ?? ev.album.artist, cover_url: ev.album.cover_url ?? undefined, genre: ev.album.genre ?? undefined, ratings: [] } as AlbumWithRatings); }}
                  onTooltipEnter={(ev, mx, my) => { if (needTip) setTooltip({ ev, mx, my }); }}
                  onTooltipLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Edge fade masks ── */}
        {events && events.length > 0 && zoom > 0 && (
          <>
            <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 48,
              background: "linear-gradient(to right, var(--bg), transparent)", pointerEvents: "none", zIndex: 8 }} />
            <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 48,
              background: "linear-gradient(to left, var(--bg), transparent)", pointerEvents: "none", zIndex: 8 }} />
          </>
        )}
      </div>

      {/* ── Tooltip ── */}
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
