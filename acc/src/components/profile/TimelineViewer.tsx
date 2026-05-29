"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePinch } from "@use-gesture/react";
import { scoreColor } from "@/lib/score";
import AlbumModal from "@/components/album/AlbumModal";
import Spinner from "@/components/ui/Spinner";
import type { TimelineEvent } from "@/app/api/profile/[userId]/timeline/route";
import type { AlbumWithRatings } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const MS_DAY    = 86_400_000;
const AXIS_Y    = 90;   // Y of axis line from top of scroll content (leaves room for labels + tooltip)
const STEM_MIN  = 12;   // minimum stem height
const LEVEL_GAP = 72;   // Y step per stagger level
const MAX_LVLS  = 5;
const MAX_ZOOM  = 2.5e-6;  // ~216px/day

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ppd(pxPerMs: number) { return pxPerMs * MS_DAY; }

function getCoverSize(pxPerMs: number): number {
  const d = ppd(pxPerMs);
  if (d < 1.2)  return 0;   // dot only
  if (d < 5)    return 18;
  if (d < 16)   return 32;
  if (d < 50)   return 46;
  return 58;
}

function showLabelBelow(pxPerMs: number) { return ppd(pxPerMs) >= 22; }

// Dual-level tick computation (major + minor)
interface Tick { x: number; label: string; isMajor: boolean }

function computeTicks(pxPerMs: number, minMs: number, maxMs: number): Tick[] {
  const d = ppd(pxPerMs);
  type Cfg = { stepFn: (dt: Date) => void; fmtMinor: (dt: Date) => string; fmtMajor: (dt: Date) => string; isMajor: (dt: Date) => boolean };

  const cfg: Cfg = d < 2
    ? { stepFn: dt => dt.setFullYear(dt.getFullYear() + 1), fmtMinor: dt => `${dt.getFullYear()}`, fmtMajor: dt => `${dt.getFullYear()}`, isMajor: () => false }
    : d < 8
    ? { stepFn: dt => dt.setMonth(dt.getMonth() + 1), fmtMinor: dt => `${dt.getMonth() + 1}월`, fmtMajor: dt => `${dt.getFullYear()}`, isMajor: dt => dt.getMonth() === 0 }
    : d < 30
    ? { stepFn: dt => dt.setDate(dt.getDate() + 7), fmtMinor: dt => `${dt.getMonth() + 1}/${dt.getDate()}`, fmtMajor: dt => `${dt.getFullYear()}.${dt.getMonth() + 1}`, isMajor: dt => dt.getDate() <= 7 }
    : { stepFn: dt => dt.setDate(dt.getDate() + 1), fmtMinor: dt => `${dt.getDate()}`, fmtMajor: dt => `${dt.getFullYear()}.${dt.getMonth() + 1}`, isMajor: dt => dt.getDate() === 1 };

  // Snap start to clean boundary
  const start = new Date(minMs);
  if (d < 2) { start.setMonth(0, 1); start.setHours(0, 0, 0, 0); }
  else if (d < 8) { start.setDate(1); start.setHours(0, 0, 0, 0); }
  else if (d < 30) { start.setDate(start.getDate() - start.getDay()); start.setHours(0, 0, 0, 0); }
  else start.setHours(0, 0, 0, 0);

  const ticks: Tick[] = [];
  const cur = new Date(start);
  while (cur.getTime() <= maxMs) {
    const x = (cur.getTime() - minMs) * pxPerMs;
    if (x >= -120) {
      ticks.push({ x, label: cfg.isMajor(cur) ? cfg.fmtMajor(cur) : cfg.fmtMinor(cur), isMajor: cfg.isMajor(cur) });
    }
    cfg.stepFn(cur);
    if (ticks.length > 800) break; // safety
  }
  return ticks;
}

type MarkerDatum = { ev: TimelineEvent; x: number; level: number };

function buildMarkers(events: TimelineEvent[], pxPerMs: number, minMs: number): MarkerDatum[] {
  if (!events.length || !pxPerMs) return [];
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const cs = getCoverSize(pxPerMs);
  const slotW = Math.max(cs + 10, 8);
  const placed: MarkerDatum[] = [];

  for (const ev of sorted) {
    const x = (new Date(ev.date).getTime() - minMs) * pxPerMs;
    let level = 0;
    for (let attempt = 0; attempt < MAX_LVLS; attempt++) {
      const ok = !placed.slice(-40).some(p => p.level === attempt && Math.abs(p.x - x) < slotW);
      if (ok) { level = attempt; break; }
      level = attempt + 1;
    }
    placed.push({ ev, x, level });
  }
  return placed;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ ev, mx, my }: { ev: TimelineEvent; mx: number; my: number }) {
  const dot = ev.score != null ? scoreColor(ev.score) : "var(--text-muted)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.96 }}
      transition={{ duration: 0.12 }}
      style={{
        position: "fixed", left: mx, top: my - 78,
        transform: "translateX(-50%)",
        zIndex: 600, pointerEvents: "none",
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 9, padding: "8px 10px",
        display: "flex", alignItems: "center", gap: 8,
        maxWidth: 210,
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      }}
    >
      {ev.album.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ev.album.cover_url} alt="" style={{ width: 30, height: 30, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ color: "var(--text)", fontSize: 11, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>
          {ev.album.title}
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {ev.album.artist_display ?? ev.album.artist}
        </p>
      </div>
      {ev.score != null && (
        <span style={{ fontSize: 14, fontWeight: 800, color: dot, flexShrink: 0, lineHeight: 1 }}>{ev.score}</span>
      )}
      {/* arrow */}
      <div style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid var(--border)" }} />
    </motion.div>
  );
}

// ─── AlbumMarker ──────────────────────────────────────────────────────────────

function AlbumMarker({ m, coverSize, stemBase, showLabel, isAnimated,
  onSelect, onEnter, onLeave }:
  { m: MarkerDatum; coverSize: number; stemBase: number; showLabel: boolean; isAnimated: boolean;
    onSelect: (ev: TimelineEvent) => void; onEnter: (ev: TimelineEvent, mx: number, my: number) => void; onLeave: () => void; }) {
  const { ev, x, level } = m;
  const dot = ev.score != null ? scoreColor(ev.score) : "var(--border-light)";
  const isDot = coverSize === 0;
  const stemH = STEM_MIN + level * LEVEL_GAP;
  const delay = isAnimated ? 0 : 0.45 + Math.min((x / 3000) * 0.55, 0.55); // wave L→R, max 1s

  const handleEnter = (e: React.MouseEvent) => onEnter(ev, e.clientX, e.clientY);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.22 }}
      style={{
        position: "absolute", left: x, top: stemBase,
        transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", alignItems: "center",
        willChange: "transform",
        zIndex: 1,
      }}
    >
      {/* Stem — score-color gradient */}
      <div style={{
        width: 1.5,
        height: stemH + (isDot ? 3 : 0),
        background: `linear-gradient(to bottom, ${dot}cc 0%, ${dot}33 100%)`,
        flexShrink: 0,
      }} />

      {isDot ? (
        /* Dot mode */
        <button
          onClick={() => onSelect(ev)}
          onMouseEnter={handleEnter}
          onMouseLeave={onLeave}
          style={{
            width: 6, height: 6, borderRadius: "50%",
            backgroundColor: dot, border: "1.5px solid var(--bg)",
            padding: 0, cursor: "pointer",
            boxShadow: `0 0 0 2px ${dot}22`,
          }}
          className="tv-dot"
        />
      ) : (
        /* Cover mode */
        <>
          <button
            onClick={() => onSelect(ev)}
            onMouseEnter={handleEnter}
            onMouseLeave={onLeave}
            style={{
              width: coverSize, height: coverSize, padding: 0,
              borderRadius: coverSize > 42 ? 8 : 5,
              overflow: "hidden", border: "none", cursor: "pointer",
              backgroundColor: "var(--bg-elevated)",
              outline: `2px solid ${dot}50`, outlineOffset: 1,
              boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
            }}
            className="tv-cover"
          >
            {ev.album.cover_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={ev.album.cover_url} alt={ev.album.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
                  justifyContent: "center", color: "var(--text-muted)", fontSize: Math.floor(coverSize * 0.38) }}>♪</div>
            }
          </button>
          {showLabel && (
            <div style={{ marginTop: 5, display: "flex", flexDirection: "column", alignItems: "center", gap: 1, pointerEvents: "none" }}>
              {ev.score != null && (
                <span style={{ fontSize: 11, fontWeight: 800, color: dot, lineHeight: 1 }}>{ev.score}</span>
              )}
              {ev.type === "diary" && (
                <span style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1 }}>✎</span>
              )}
              <span style={{ fontSize: 9, color: "var(--text-muted)", opacity: 0.55, lineHeight: 1, whiteSpace: "nowrap",
                fontFamily: "var(--font-mono, ui-monospace, monospace)" }}>
                {ev.date.slice(5).replace("-", "/")}
              </span>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TimelineViewer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [events, setEvents]     = useState<TimelineEvent[] | null>(null);
  const [fetchErr, setFetchErr] = useState(false);
  const [zoom, setZoom]         = useState(0);
  const [selected, setSelected] = useState<AlbumWithRatings | null>(null);
  const [tooltip, setTooltip]   = useState<{ ev: TimelineEvent; mx: number; my: number } | null>(null);
  const [axisReady, setAxisReady] = useState(false);  // triggers axis animation
  const isAnimatedRef = useRef(false);                // after initial animation, skip delays

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef   = useRef<HTMLDivElement>(null);
  const zoomRef      = useRef(0);
  const fitZoomRef   = useRef(0);

  /* fetch */
  useEffect(() => {
    fetch(`/api/profile/${userId}/timeline`)
      .then(r => r.json())
      .then(d => setEvents(d.events ?? []))
      .catch(() => setFetchErr(true));
  }, [userId]);

  /* ESC + body lock */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", fn); document.body.style.overflow = ""; };
  }, [onClose]);

  /* date range */
  const { minMs, maxMs, totalMs } = useMemo(() => {
    if (!events?.length) return { minMs: 0, maxMs: 0, totalMs: 0 };
    const ts = events.map(e => new Date(e.date).getTime());
    const lo = Math.min(...ts), hi = Math.max(...ts);
    const pad = Math.max((hi - lo) * 0.04, MS_DAY * 20);
    return { minMs: lo - pad, maxMs: hi + pad, totalMs: hi + pad - (lo - pad) };
  }, [events]);

  /* calc fit zoom once wrapper is rendered */
  useEffect(() => {
    if (!events?.length || !wrapperRef.current || !totalMs) return;
    const w = wrapperRef.current.clientWidth - 40;
    const fit = w / totalMs;
    fitZoomRef.current = fit;
    zoomRef.current    = fit;
    setZoom(fit);
    // stagger: axis animation fires, then mark as animated after 1.2s
    setTimeout(() => setAxisReady(true), 80);
    setTimeout(() => { isAnimatedRef.current = true; }, 1400);
  }, [events, totalMs]);

  /* window resize → re-fit */
  useEffect(() => {
    const fn = () => {
      if (!wrapperRef.current || !totalMs) return;
      const w = wrapperRef.current.clientWidth - 40;
      const fit = w / totalMs;
      fitZoomRef.current = fit;
      if (zoomRef.current <= fit * 1.05) { zoomRef.current = fit; setZoom(fit); }
    };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [totalMs]);

  /* wheel → zoom to cursor */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !minMs) return;
    const fn = (e: WheelEvent) => {
      e.preventDefault();
      const rect  = el.getBoundingClientRect();
      const cx    = e.clientX - rect.left + el.scrollLeft;
      const cMs   = cx / zoomRef.current + minMs;
      const factor = e.deltaY > 0 ? 0.84 : 1.19;
      const nz    = Math.max(fitZoomRef.current * 0.9, Math.min(MAX_ZOOM, zoomRef.current * factor));
      zoomRef.current = nz;
      setZoom(nz);
      const ox = e.clientX - rect.left;
      requestAnimationFrame(() => { if (containerRef.current) containerRef.current.scrollLeft = (cMs - minMs) * nz - ox; });
    };
    el.addEventListener("wheel", fn, { passive: false });
    return () => el.removeEventListener("wheel", fn);
  }, [minMs]);

  /* pinch → zoom to pinch center */
  const bind = usePinch(
    ({ offset: [scale], origin: [ox], first, memo }) => {
      const el = containerRef.current; if (!el) return;
      if (first) {
        const rect = el.getBoundingClientRect();
        const cx   = ox - rect.left + el.scrollLeft;
        return { initZ: zoomRef.current, cMs: cx / zoomRef.current + minMs, ox: ox - rect.left };
      }
      if (!memo) return;
      const nz = Math.max(fitZoomRef.current * 0.9, Math.min(MAX_ZOOM, memo.initZ * scale));
      zoomRef.current = nz; setZoom(nz);
      requestAnimationFrame(() => { if (containerRef.current) containerRef.current.scrollLeft = (memo.cMs - minMs) * nz - memo.ox; });
      return memo;
    },
    { from: [1, 0], eventOptions: { passive: false } },
  );

  /* reset to fit */
  const resetZoom = useCallback(() => {
    const fit = fitZoomRef.current;
    zoomRef.current = fit; setZoom(fit);
    if (containerRef.current) containerRef.current.scrollLeft = 0;
  }, []);

  const handleSelect = useCallback((ev: TimelineEvent) => {
    setTooltip(null);
    setSelected({ id: ev.album.id, title: ev.album.title,
      artist: ev.album.artist_display ?? ev.album.artist,
      cover_url: ev.album.cover_url ?? undefined,
      genre: ev.album.genre ?? undefined, ratings: [] } as AlbumWithRatings);
  }, []);

  const handleHover = useCallback((ev: TimelineEvent, mx: number, my: number) => {
    if (getCoverSize(zoomRef.current) >= 34) return; // enough info visible, skip tooltip
    setTooltip({ ev, mx, my });
  }, []);

  /* computed */
  const coverSize = getCoverSize(zoom);
  const innerWidth = totalMs > 0 && zoom > 0 ? Math.max(800, totalMs * zoom) : 800;
  const markers    = useMemo(() => buildMarkers(events ?? [], zoom, minMs), [events, zoom, minMs]);
  const ticks      = useMemo(() => computeTicks(zoom, minMs, maxMs), [zoom, minMs, maxMs]);
  const maxLevel   = markers.length ? Math.max(...markers.map(m => m.level)) : 0;
  const timelineH  = AXIS_Y + STEM_MIN + (maxLevel + 1) * LEVEL_GAP + coverSize + 60;
  const showLabel  = showLabelBelow(zoom);
  const isZoomed   = zoom > fitZoomRef.current * 1.08;
  const todayX     = minMs && zoom ? (Date.now() - minMs) * zoom : -1;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, backgroundColor:"var(--bg)",
      display:"flex", flexDirection:"column", animation:"tvIn .22s ease-out" }}>
      <style>{`
        @keyframes tvIn  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes tvAxis{ from{transform:scaleX(0)} to{transform:scaleX(1)} }
        .tv-dot:hover  { transform:scale(2)!important; box-shadow:0 0 0 4px currentColor; }
        .tv-cover      { transition:transform .13s ease,box-shadow .13s ease,outline .13s ease; }
        .tv-cover:hover{ transform:scale(1.11) translateY(-3px)!important; box-shadow:0 6px 20px rgba(0,0,0,.55)!important; }
        .tv-cover:active{ transform:scale(.97)!important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 20px 13px",
        borderBottom:"1px solid var(--border)", flexShrink:0 }}>
        <div style={{ flex:1 }}>
          <p style={{ color:"var(--text-muted)", fontSize:10, fontWeight:600, letterSpacing:"0.08em" }}>청음 연대기</p>
          <p style={{ color:"var(--text-sub)", fontSize:12 }}>
            {events ? `${events.length}개의 기록 · 휠 또는 핀치로 확대` : "불러오는 중…"}
          </p>
        </div>

        {/* Zoom indicator + reset */}
        {zoom > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ display:"flex", gap:3, alignItems:"center" }}>
              {[0.9, 1, 1.08, 1.5, 3].map((thr, i) => (
                <div key={i} style={{ width:4, height:4, borderRadius:"50%",
                  backgroundColor: zoom >= fitZoomRef.current * thr ? "var(--accent)" : "var(--border-light)",
                  transition:"background-color .2s" }} />
              ))}
            </div>
            {isZoomed && (
              <button onClick={resetZoom}
                style={{ fontSize:10, color:"var(--text-muted)", background:"none",
                  border:"1px solid var(--border)", borderRadius:5, padding:"3px 8px",
                  cursor:"pointer", fontFamily:"inherit" }}
                className="hover:border-[var(--border-light)] hover:text-[var(--text)] transition-all">
                전체보기
              </button>
            )}
          </div>
        )}

        <button onClick={onClose}
          style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:22, lineHeight:1, padding:"0 2px" }}>×</button>
      </div>

      {/* ── Timeline area ── */}
      <div ref={wrapperRef} style={{ flex:1, overflow:"hidden" }}>

        {(!events && !fetchErr) && <div style={{ display:"flex", justifyContent:"center", paddingTop:80 }}><Spinner /></div>}
        {fetchErr && <div style={{ display:"flex", justifyContent:"center", paddingTop:80 }}><p style={{ color:"var(--text-muted)", fontSize:13 }}>불러오지 못했어요</p></div>}
        {events?.length === 0 && <div style={{ display:"flex", justifyContent:"center", paddingTop:80 }}><p style={{ color:"var(--text-muted)", fontSize:13 }}>아직 기록이 없어요</p></div>}

        {events && events.length > 0 && zoom > 0 && (
          <div ref={containerRef} {...bind()}
            style={{ width:"100%", height:"100%", overflowX:"auto", overflowY:"auto",
              touchAction:"pan-x", cursor:"grab" }}
            onMouseDown={e => { if (e.currentTarget === e.target) e.currentTarget.style.cursor = "grabbing"; }}
            onMouseUp={e => { e.currentTarget.style.cursor = "grab"; }}>

            <div style={{ width:innerWidth, height:Math.max(timelineH, 260),
              position:"relative", paddingLeft:20, paddingRight:20 }}>

              {/* ── Tick marks (below label) ── */}
              {ticks.map((tk, i) => (
                <div key={i} style={{ position:"absolute", left:tk.x, top: tk.isMajor ? 54 : 60,
                  width:1, height: tk.isMajor ? 18 : 10,
                  backgroundColor: tk.isMajor ? "var(--border-light)" : "var(--border)",
                  opacity: tk.isMajor ? 0.8 : 0.45, pointerEvents:"none" }} />
              ))}

              {/* ── Time labels (minor) ── */}
              {ticks.filter(t => !t.isMajor).map((tk, i) => (
                <div key={i} style={{ position:"absolute", left:tk.x, top:40,
                  transform:"translateX(-50%)", color:"var(--text-muted)", fontSize:9,
                  fontWeight:500, whiteSpace:"nowrap", pointerEvents:"none", opacity:0.6 }}>
                  {tk.label}
                </div>
              ))}

              {/* ── Major labels (year / month) ── */}
              {ticks.filter(t => t.isMajor).map((tk, i) => (
                <div key={i} style={{ position:"absolute", left:tk.x, top:18,
                  transform:"translateX(-50%)", color:"var(--text-sub)", fontSize:11,
                  fontWeight:700, whiteSpace:"nowrap", pointerEvents:"none", letterSpacing:"0.02em" }}>
                  {tk.label}
                </div>
              ))}

              {/* ── Axis line ── */}
              <div style={{
                position:"absolute", left:0, top:AXIS_Y, width:"100%", height:1.5,
                background:"linear-gradient(to right, transparent, var(--border-light) 3%, var(--border-light) 97%, transparent)",
                transformOrigin:"left center",
                animation: axisReady ? "tvAxis .65s cubic-bezier(0.22,1,0.36,1) forwards" : "none",
                transform: axisReady ? undefined : "scaleX(0)",
                pointerEvents:"none",
              }} />

              {/* ── Today line ── */}
              {todayX >= 0 && todayX <= innerWidth && (
                <div style={{ position:"absolute", left:todayX, top:0, width:1,
                  height:AXIS_Y + 20, pointerEvents:"none",
                  background:`linear-gradient(to bottom, transparent, var(--accent) 40%, var(--accent) 60%, transparent)`,
                  opacity:0.4 }} />
              )}

              {/* ── Album markers ── */}
              {markers.map((m, i) => (
                <AlbumMarker
                  key={`${m.ev.album.id}-${m.ev.date}`}
                  m={m}
                  coverSize={coverSize}
                  stemBase={AXIS_Y}
                  showLabel={showLabel}
                  isAnimated={isAnimatedRef.current}
                  onSelect={handleSelect}
                  onEnter={handleHover}
                  onLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Tooltip (fixed, desktop only) ── */}
      <AnimatePresence>
        {tooltip && <Tooltip key={`${tooltip.ev.album.id}-${tooltip.ev.date}`} ev={tooltip.ev} mx={tooltip.mx} my={tooltip.my} />}
      </AnimatePresence>

      {selected && <AlbumModal album={selected} onClose={() => setSelected(null)} source="timeline" />}
    </div>
  );
}
