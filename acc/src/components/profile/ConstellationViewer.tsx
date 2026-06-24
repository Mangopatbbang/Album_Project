"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { scoreColor } from "@/lib/score";
import { GENRE_COLOR } from "@/lib/bio";
import AlbumModal from "@/components/album/AlbumModal";
import Spinner from "@/components/ui/Spinner";
import type { TimelineEvent } from "@/app/api/profile/[userId]/timeline/route";
import type { AlbumWithRatings } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS = 3000;
const CX = CANVAS / 2;
const CY = CANVAS / 2;
const MAX_ZOOM = 22;
const INNER_R = 80;    // most recent albums — closest to center
const OUTER_R = 1400;  // oldest albums — furthest out

// Sector ordering by musical similarity (keeps related genres adjacent)
const GENRE_ORDER = [
  "Hip-Hop", "R&B", "Electronic", "Pop", "Alternative",
  "Rock", "Folk", "Country", "Jazz", "OST", "Compilation", "Other",
];

// ─── Layout types ─────────────────────────────────────────────────────────────

interface StarPos {
  albumId: string;
  ev: TimelineEvent;
  x: number;
  y: number;
  genre: string;
}

interface GenreCloud {
  genre: string;
  cx: number;
  cy: number;
  count: number;
  color: string;
  radius: number;
  midAngle: number;
  sectorSpan: number;
}

// ─── Layout computation ───────────────────────────────────────────────────────

function jitter(seed: string, range: number): number {
  const h = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * range;
}

function computeLayout(events: TimelineEvent[]): { stars: StarPos[]; clouds: GenreCloud[] } {
  const albumMap = new Map<string, TimelineEvent>();
  for (const ev of events) {
    if (!albumMap.has(ev.album.id)) albumMap.set(ev.album.id, ev);
  }
  const unique = [...albumMap.values()];
  if (unique.length === 0) return { stars: [], clouds: [] };
  const totalAlbums = unique.length;

  // Radial: year-band allocation — each year gets a band proportional to its
  // album count, so same-year albums spread within their band (no fixed-radius rings).
  const byYear = new Map<number, TimelineEvent[]>();
  for (const ev of unique) {
    const y = parseInt(ev.album.release_date?.slice(0, 4) ?? "2000");
    const arr = byYear.get(y) ?? [];
    arr.push(ev);
    byYear.set(y, arr);
  }
  const yearsDesc = [...byYear.keys()].sort((a, b) => b - a); // newest first → inner
  let curR = INNER_R;
  const yearBands = new Map<number, { mid: number; half: number }>();
  for (const year of yearsDesc) {
    const count = byYear.get(year)!.length;
    const bandSize = (count / totalAlbums) * (OUTER_R - INNER_R);
    yearBands.set(year, { mid: curR + bandSize / 2, half: bandSize / 2 });
    curR += bandSize;
  }

  // Count per genre
  const genreCounts = new Map<string, number>();
  for (const ev of unique) {
    const g = ev.album.genre ?? "Other";
    genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
  }

  // Musical-similarity ordering (adjacent genres are sonically related)
  const genreOrder: string[] = [];
  for (const g of GENRE_ORDER) { if (genreCounts.has(g)) genreOrder.push(g); }
  for (const g of genreCounts.keys()) { if (!genreOrder.includes(g)) genreOrder.push(g); }

  // Assign pie sectors proportional to album count (popular genre = wider slice)
  let curAngle = -Math.PI / 2; // start at 12 o'clock
  const sectors = new Map<string, { start: number; end: number; mid: number; span: number }>();
  for (const g of genreOrder) {
    const count = genreCounts.get(g) ?? 0;
    if (!count) continue;
    const span = (count / totalAlbums) * Math.PI * 2;
    const start = curAngle;
    const end = curAngle + span;
    sectors.set(g, { start, end, mid: start + span / 2, span });
    curAngle = end;
  }

  // Place each album: year-band → radius, sector → angle
  const stars: StarPos[] = [];
  for (const ev of unique) {
    const g = ev.album.genre ?? "Other";
    const sector = sectors.get(g);
    if (!sector) continue;

    const year = parseInt(ev.album.release_date?.slice(0, 4) ?? "2000");
    const band = yearBands.get(year);
    if (!band) continue;

    // Radius: center of year's band ± jitter (fills the full band width)
    const rNoise = jitter(ev.album.id + "r", band.half * 1.8);
    const r = Math.max(INNER_R * 0.8, Math.min(OUTER_R * 1.05, band.mid + rNoise));

    // Angle: within genre sector with jitter
    const aNoise = jitter(ev.album.id + "a", sector.span * 0.88);
    const a = sector.mid + aNoise;

    stars.push({
      albumId: ev.album.id, ev,
      x: CX + Math.cos(a) * r,
      y: CY + Math.sin(a) * r,
      genre: g,
    });
  }

  // Build clouds: two nebula circles per genre (inner + outer radial coverage)
  const clouds: GenreCloud[] = [];
  for (const [genre, sector] of sectors) {
    const count = genreCounts.get(genre) ?? 0;
    const color = GENRE_COLOR[genre] ?? "#888888";
    const midR = INNER_R + (OUTER_R - INNER_R) * 0.42;
    const cx = CX + Math.cos(sector.mid) * midR;
    const cy = CY + Math.sin(sector.mid) * midR;
    const arcWidth = sector.span * midR;
    const radialDepth = (OUTER_R - INNER_R) * 0.5;
    const radius = Math.max(55, Math.min(arcWidth, radialDepth) * 0.72 + Math.sqrt(count) * 12);
    clouds.push({ genre, cx, cy, count, color, radius, midAngle: sector.mid, sectorSpan: sector.span });
  }

  return { stars, clouds };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dotRadius(score: number | undefined): number {
  if (score == null) return 3;
  if (score >= 8) return 7;
  if (score >= 7) return 5.5;
  if (score >= 6) return 4.5;
  return 3.5;
}

// cs === 0 means dot mode; positive value is canvas-unit cover size
function coverSize(cssZoom: number, fitZoom: number): number {
  if (fitZoom <= 0) return 0;
  const spread = cssZoom / fitZoom;
  if (spread < 2.8) return 0;
  if (spread < 4)   return 30 / cssZoom;
  return 48 / cssZoom;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ ev, mx, my }: { ev: TimelineEvent; mx: number; my: number }) {
  const c = ev.score != null ? scoreColor(ev.score) : "var(--text-muted)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      style={{
        position: "fixed", left: mx, top: my - 88,
        transform: "translateX(-50%)",
        zIndex: 600, pointerEvents: "none",
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 10, padding: "8px 11px",
        display: "flex", alignItems: "center", gap: 8,
        maxWidth: 220, minWidth: 110,
        boxShadow: "0 12px 28px rgba(0,0,0,0.65)",
      }}
    >
      {ev.album.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img loading="lazy" src={ev.album.cover_url} alt={ev.album.title}
          style={{ width: 32, height: 32, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ color: "var(--text)", fontSize: 11, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {ev.album.title}
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {ev.album.artist_display ?? ev.album.artist}
        </p>
        {ev.album.genre && (
          <p style={{ fontSize: 9, marginTop: 1, color: GENRE_COLOR[ev.album.genre] ?? "var(--text-muted)", fontWeight: 600 }}>
            {ev.album.genre}
          </p>
        )}
      </div>
      {ev.score != null && (
        <span style={{ fontSize: 15, fontWeight: 800, color: c, flexShrink: 0 }}>{ev.score}</span>
      )}
    </motion.div>
  );
}

// ─── Star ─────────────────────────────────────────────────────────────────────

function Star({ star, cs, cssZoom, focusMode, focused, onSelect, onTipEnter, onTipLeave }: {
  star: StarPos; cs: number; cssZoom: number;
  focusMode: boolean; focused: boolean;
  onSelect: (ev: TimelineEvent) => void;
  onTipEnter: (ev: TimelineEvent, mx: number, my: number) => void;
  onTipLeave: () => void;
}) {
  const [hov, setHov] = useState(false);
  const { ev } = star;
  const score = ev.score;
  const color = score != null ? scoreColor(score) : "rgba(255,255,255,0.22)";
  const r = dotRadius(score);
  const iz = 1 / cssZoom;
  const isDot = cs === 0;
  const dimmed = focusMode && !focused;

  const glow = score == null ? "none"
    : score >= 8 ? `0 0 0 ${2*iz}px var(--bg), 0 0 ${10*iz}px ${color}cc, 0 0 ${26*iz}px ${color}55`
    : score >= 7 ? `0 0 0 ${iz}px var(--bg), 0 0 ${7*iz}px ${color}aa, 0 0 ${16*iz}px ${color}33`
    : score >= 6 ? `0 0 ${5*iz}px ${color}77`
    : "none";

  const focusedGlow = `0 0 0 ${2*iz}px var(--bg), 0 0 ${14*iz}px ${color}ee, 0 0 ${32*iz}px ${color}88`;

  const enter = (e: React.MouseEvent) => { if (!dimmed) { setHov(true); onTipEnter(ev, e.clientX, e.clientY); } };
  const leave = () => { setHov(false); onTipLeave(); };

  return (
    <div style={{
      position: "absolute", left: star.x, top: star.y,
      transform: "translate(-50%,-50%)",
      zIndex: hov ? 40 : (score ?? 2),
      opacity: dimmed ? 0.08 : 1,
      transition: "opacity 0.28s ease",
      pointerEvents: dimmed ? "none" : "auto",
    }}>
      {isDot ? (
        <button onClick={() => onSelect(ev)} onMouseEnter={enter} onMouseLeave={leave} style={{
          width: r * 2, height: r * 2, borderRadius: "50%",
          backgroundColor: color,
          border: score != null ? `${1.5 * iz}px solid var(--bg)` : "none",
          padding: 0, cursor: "pointer",
          boxShadow: hov
            ? `0 0 0 ${2*iz}px var(--bg), 0 0 ${16*iz}px ${color}ee, 0 0 ${30*iz}px ${color}66`
            : focused ? focusedGlow : glow,
          transform: hov ? "scale(1.7)" : focused ? "scale(1.35)" : "scale(1)",
          transition: "transform .13s ease, box-shadow .15s ease",
        }} />
      ) : (
        <button onClick={() => onSelect(ev)} onMouseEnter={enter} onMouseLeave={leave} style={{
          width: cs, height: cs, padding: 0,
          overflow: "hidden", border: "none", cursor: "pointer",
          backgroundColor: "var(--bg-elevated)",
          borderRadius: Math.round(cs * 0.15),
          outline: hov
            ? `${2.5 * iz}px solid ${color}`
            : focused ? `${1.5 * iz}px solid ${color}cc`
            : score && score >= 7 ? `${iz}px solid ${color}55` : "none",
          outlineOffset: 2 * iz,
          boxShadow: hov
            ? `0 ${8*iz}px ${28*iz}px rgba(0,0,0,.72), 0 0 ${20*iz}px ${color}bb`
            : focused ? `0 ${6*iz}px ${22*iz}px rgba(0,0,0,.65), 0 0 ${18*iz}px ${color}99`
            : glow,
          transform: hov ? "scale(1.12)" : focused ? "scale(1.1)" : "scale(1)",
          transition: "transform .13s ease, box-shadow .14s ease",
        }}>
          {ev.album.cover_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img loading="lazy" src={ev.album.cover_url} alt={ev.album.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: Math.floor(cs * 0.38) }}>♪</div>
          }
        </button>
      )}

      {/* Always-visible label in focus mode */}
      {focused && (
        <div style={{
          position: "absolute",
          top: isDot ? r * 2 + 3 / cssZoom : cs + 5 / cssZoom,
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none",
          textAlign: "center",
          whiteSpace: "nowrap",
          maxWidth: 120 / cssZoom,
          overflow: "hidden",
        }}>
          <p style={{
            fontSize: 9 / cssZoom,
            color: "var(--text)",
            fontWeight: 600,
            lineHeight: 1.2,
            textShadow: "0 1px 5px rgba(0,0,0,0.98), 0 0 10px rgba(0,0,0,0.85)",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {ev.album.title}
          </p>
          {score != null && (
            <p style={{
              fontSize: 8 / cssZoom,
              color,
              fontWeight: 800,
              marginTop: 1.5 / cssZoom,
              textShadow: `0 0 8px ${color}99`,
            }}>
              {score}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ConstellationViewer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [fetchErr, setFetchErr] = useState(false);
  const [cssZoom, setCssZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [selected, setSelected] = useState<AlbumWithRatings | null>(null);
  const [tooltip, setTooltip] = useState<{ ev: TimelineEvent; mx: number; my: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fitZoom, setFitZoom] = useState(1);
  const [focusedArtist, setFocusedArtist] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const vpRef = useRef<HTMLDivElement>(null);
  const cssZoomRef = useRef(1);
  const panXRef = useRef(0);
  const panYRef = useRef(0);
  const fitZoomRef = useRef(1);
  const vpWRef = useRef(0);
  const vpHRef = useRef(0);
  const dragRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const dragMoved = useRef(false);
  const velX = useRef(0);
  const velY = useRef(0);
  const rafRef = useRef<number>(0);
  const touchRef = useRef<{ prev: { id: number; x: number; y: number }[] } | null>(null);

  useEffect(() => {
    fetch(`/api/profile/${userId}/timeline`)
      .then(r => r.json())
      .then(d => setEvents(d.events ?? []))
      .catch(() => setFetchErr(true));
  }, [userId]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const blockPinch = (e: WheelEvent) => { if (e.ctrlKey || e.metaKey) e.preventDefault(); };
    document.addEventListener("wheel", blockPinch, { passive: false });
    return () => {
      document.removeEventListener("wheel", blockPinch);
      document.body.style.overflow = "";
    };
  }, []);

  const initView = useCallback(() => {
    const vp = vpRef.current; if (!vp) return;
    const vpW = vp.clientWidth, vpH = vp.clientHeight;
    vpWRef.current = vpW; vpHRef.current = vpH;
    const fz = Math.min(vpW, vpH) / CANVAS * 0.9;
    fitZoomRef.current = fz;
    setFitZoom(fz);
    const px = (vpW - CANVAS * fz) / 2;
    const py = (vpH - CANVAS * fz) / 2;
    cssZoomRef.current = fz; panXRef.current = px; panYRef.current = py;
    setCssZoom(fz); setPanX(px); setPanY(py);
  }, []);

  useEffect(() => { if (events?.length) initView(); }, [events, initView]);
  useEffect(() => {
    const fn = () => { if (events?.length) initView(); };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [events, initView]);

  // Wheel zoom / scroll pan
  useEffect(() => {
    const el = vpRef.current; if (!el) return;
    const fn = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const fac = e.deltaMode === 0 ? Math.exp(-e.deltaY * 0.008) : e.deltaY > 0 ? 1 / 1.25 : 1.25;
        const rect = el.getBoundingClientRect();
        const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
        const pz = cssZoomRef.current;
        const nz = Math.max(fitZoomRef.current * 0.75, Math.min(MAX_ZOOM, pz * fac));
        cssZoomRef.current = nz;
        panXRef.current = cx - (cx - panXRef.current) * nz / pz;
        panYRef.current = cy - (cy - panYRef.current) * nz / pz;
        setCssZoom(nz); setPanX(panXRef.current); setPanY(panYRef.current);
      } else {
        panXRef.current -= e.deltaX; panYRef.current -= e.deltaY;
        setPanX(panXRef.current); setPanY(panYRef.current);
      }
    };
    el.addEventListener("wheel", fn, { passive: false });
    return () => el.removeEventListener("wheel", fn);
  }, [events]);

  // Mouse drag + inertia
  const onDragStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    cancelAnimationFrame(rafRef.current);
    dragMoved.current = false;
    dragRef.current = { sx: e.clientX, sy: e.clientY, px: panXRef.current, py: panYRef.current };
    velX.current = 0; velY.current = 0;
    setIsDragging(true);
  }, []);

  useEffect(() => {
    let lx = 0, ly = 0, lt = 0;
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.sx, dy = e.clientY - dragRef.current.sy;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved.current = true;
      panXRef.current = dragRef.current.px + dx; panYRef.current = dragRef.current.py + dy;
      setPanX(panXRef.current); setPanY(panYRef.current);
      const now = performance.now();
      velX.current = (lx - e.clientX) / Math.max(now - lt, 1) * 16;
      velY.current = (ly - e.clientY) / Math.max(now - lt, 1) * 16;
      lx = e.clientX; ly = e.clientY; lt = now;
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null; setIsDragging(false);
      let vx = velX.current, vy = velY.current;
      const coast = () => {
        if (Math.abs(vx) < 0.4 && Math.abs(vy) < 0.4) return;
        panXRef.current -= vx; panYRef.current -= vy;
        setPanX(panXRef.current); setPanY(panYRef.current);
        vx *= 0.93; vy *= 0.93;
        rafRef.current = requestAnimationFrame(coast);
      };
      coast();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // Touch pan + pinch zoom
  useEffect(() => {
    const el = vpRef.current; if (!el) return;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
      cancelAnimationFrame(rafRef.current);
      dragMoved.current = false; velX.current = 0; velY.current = 0;
      touchRef.current = { prev: Array.from(e.touches).map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY })) };
      setIsDragging(true);
    };
    const onMove = (e: TouchEvent) => {
      e.preventDefault(); if (!touchRef.current) return;
      const curr = Array.from(e.touches).map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
      const prev = touchRef.current.prev;
      if (curr.length === 1) {
        const p = prev.find(p => p.id === curr[0].id) ?? prev[0]; if (!p) { touchRef.current.prev = curr; return; }
        const dx = curr[0].x - p.x, dy = curr[0].y - p.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved.current = true;
        panXRef.current += dx; panYRef.current += dy;
        setPanX(panXRef.current); setPanY(panYRef.current);
        velX.current = -dx; velY.current = -dy;
      } else if (curr.length === 2 && prev.length >= 2) {
        const p0 = prev.find(p => p.id === curr[0].id) ?? prev[0];
        const p1 = prev.find(p => p.id === curr[1].id) ?? prev[1];
        const pd = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        const cd = Math.hypot(curr[1].x - curr[0].x, curr[1].y - curr[0].y);
        if (pd > 10) {
          const fac = cd / pd;
          const rect = el.getBoundingClientRect();
          const lcx = (curr[0].x + curr[1].x) / 2 - rect.left;
          const lcy = (curr[0].y + curr[1].y) / 2 - rect.top;
          const pz = cssZoomRef.current;
          const nz = Math.max(fitZoomRef.current * 0.75, Math.min(MAX_ZOOM, pz * fac));
          cssZoomRef.current = nz;
          panXRef.current = lcx - (lcx - panXRef.current) * nz / pz;
          panYRef.current = lcy - (lcy - panYRef.current) * nz / pz;
          setCssZoom(nz); setPanX(panXRef.current); setPanY(panYRef.current);
        }
      }
      touchRef.current.prev = curr;
    };
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        touchRef.current = null; setIsDragging(false);
        let vx = velX.current, vy = velY.current;
        const coast = () => {
          if (Math.abs(vx) < 0.4 && Math.abs(vy) < 0.4) return;
          panXRef.current -= vx; panYRef.current -= vy;
          setPanX(panXRef.current); setPanY(panYRef.current);
          vx *= 0.93; vy *= 0.93;
          rafRef.current = requestAnimationFrame(coast);
        };
        coast();
      } else if (touchRef.current) {
        touchRef.current.prev = Array.from(e.touches).map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
      }
    };
    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [events]);

  const zoomStep = useCallback((fac: number) => {
    const pz = cssZoomRef.current;
    const nz = Math.max(fitZoomRef.current * 0.75, Math.min(MAX_ZOOM, pz * fac));
    const cx = vpWRef.current / 2, cy = vpHRef.current / 2;
    cssZoomRef.current = nz;
    panXRef.current = cx - (cx - panXRef.current) * nz / pz;
    panYRef.current = cy - (cy - panYRef.current) * nz / pz;
    setCssZoom(nz); setPanX(panXRef.current); setPanY(panYRef.current);
  }, []);

  const resetZoom = useCallback(() => {
    const fz = fitZoomRef.current;
    cssZoomRef.current = fz;
    panXRef.current = (vpWRef.current - CANVAS * fz) / 2;
    panYRef.current = (vpHRef.current - CANVAS * fz) / 2;
    setCssZoom(fz); setPanX(panXRef.current); setPanY(panYRef.current);
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (focusedArtist) setFocusedArtist(null); else onClose(); return; }
      if (e.key === "=" || e.key === "+") { e.preventDefault(); zoomStep(1.4); }
      if (e.key === "-" || e.key === "_") { e.preventDefault(); zoomStep(1 / 1.4); }
      if (e.key === "0") { e.preventDefault(); resetZoom(); }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [zoomStep, resetZoom, focusedArtist, onClose]);

  const { stars, clouds } = useMemo(
    () => events?.length ? computeLayout(events) : { stars: [], clouds: [] },
    [events],
  );

  // Auto-pan+zoom to fit the focused artist's constellation
  useEffect(() => {
    if (!focusedArtist) return;
    const artistStars = stars.filter(s => s.ev.album.artist === focusedArtist);
    if (artistStars.length === 0) return;
    const vpW = vpWRef.current, vpH = vpHRef.current;
    if (!vpW || !vpH) return;

    const xs = artistStars.map(s => s.x);
    const ys = artistStars.map(s => s.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const PAD = 240;
    const bw = (maxX - minX) + PAD * 2;
    const bh = (maxY - minY) + PAD * 2;
    const nz = Math.max(fitZoomRef.current * 1.4, Math.min(8, Math.min(vpW / bw, vpH / bh) * 0.85));
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const px = vpW / 2 - cx * nz;
    const py = vpH / 2 - cy * nz;

    cssZoomRef.current = nz; panXRef.current = px; panYRef.current = py;
    setIsAnimating(true);
    setCssZoom(nz); setPanX(px); setPanY(py);
    const t = setTimeout(() => setIsAnimating(false), 480);
    return () => clearTimeout(t);
  }, [focusedArtist, stars]);

  // Constellation lines (same artist, sorted by release year)
  const lines = useMemo(() => {
    const byArtist = new Map<string, StarPos[]>();
    for (const s of stars) {
      const arr = byArtist.get(s.ev.album.artist) ?? [];
      arr.push(s);
      byArtist.set(s.ev.album.artist, arr);
    }
    const result: { x1: number; y1: number; x2: number; y2: number; color: string; artist: string }[] = [];
    for (const [artist, group] of byArtist) {
      if (group.length < 2) continue;
      const sorted = [...group].sort((a, b) =>
        parseInt(a.ev.album.release_date?.slice(0, 4) ?? "2000") -
        parseInt(b.ev.album.release_date?.slice(0, 4) ?? "2000")
      );
      const color = GENRE_COLOR[sorted[0].genre] ?? "rgba(255,255,255,0.2)";
      for (let i = 0; i < sorted.length - 1; i++) {
        result.push({ x1: sorted[i].x, y1: sorted[i].y, x2: sorted[i+1].x, y2: sorted[i+1].y, color, artist });
      }
    }
    return result;
  }, [stars]);

  // Visibility culling
  const margin = 80 / cssZoom;
  const vl = -panX / cssZoom - margin;
  const vr = (-panX + vpWRef.current) / cssZoom + margin;
  const vt = -panY / cssZoom - margin;
  const vb = (-panY + vpHRef.current) / cssZoom + margin;
  const visStars = useMemo(
    () => stars.filter(s => s.x >= vl && s.x <= vr && s.y >= vt && s.y <= vb),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stars, vl, vr, vt, vb],
  );

  const cs = coverSize(cssZoom, fitZoom);
  const isZoomed = cssZoom > fitZoom * 1.1;
  const cloudsSorted = useMemo(() => [...clouds].sort((a, b) => b.count - a.count), [clouds]);

  const handleStarClick = useCallback((ev: TimelineEvent) => {
    setTooltip(null);
    if (focusedArtist === ev.album.artist) {
      // 이미 이 아티스트에 포커스된 상태 → 모달 오픈
      setSelected({
        id: ev.album.id, title: ev.album.title,
        artist: ev.album.artist_display ?? ev.album.artist,
        cover_url: ev.album.cover_url ?? undefined,
        genre: ev.album.genre ?? undefined,
        ratings: [],
      } as AlbumWithRatings);
    } else {
      // 첫 클릭 → 아티스트 포커스
      setFocusedArtist(ev.album.artist);
    }
  }, [focusedArtist]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, backgroundColor: "var(--bg)", display: "flex", flexDirection: "column", animation: "csIn .2s ease-out" }}>
      <style>{`@keyframes csIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em" }}>청음 별자리</p>
          <p style={{ color: "var(--text-sub)", fontSize: 12 }}>
            {events ? `${stars.length}장의 앨범` : "불러오는 중…"}
          </p>
        </div>

        {/* Genre legend (compact) */}
        <div className="hidden sm:flex" style={{ gap: 8, alignItems: "center", flexWrap: "wrap", maxWidth: 380 }}>
          {cloudsSorted.map(c => (
            <div key={c.genre} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: c.color, opacity: 0.7, flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: "var(--text-muted)", opacity: 0.55, whiteSpace: "nowrap" }}>{c.genre}</span>
            </div>
          ))}
        </div>

        {cssZoom > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            {isZoomed && (
              <button onClick={resetZoom} style={{ fontSize: 9, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit" }}>
                전체보기
              </button>
            )}
            <button onClick={() => zoomStep(1 / 1.6)} style={{ width: 24, height: 24, borderRadius: 5, fontSize: 16, backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
            <button onClick={() => zoomStep(1.6)} style={{ width: 24, height: 24, borderRadius: 5, fontSize: 16, backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          </div>
        )}

        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, lineHeight: 1, flexShrink: 0 }} className="touch-target">×</button>
      </div>

      {/* ── Canvas ── */}
      <div
        ref={vpRef}
        onMouseDown={onDragStart}
        onClickCapture={e => { if (dragMoved.current) e.stopPropagation(); }}
        style={{ flex: 1, overflow: "hidden", position: "relative", cursor: isDragging ? "grabbing" : "grab", userSelect: "none", touchAction: "none" }}
      >
        {!events && !fetchErr && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <Spinner />
          </div>
        )}
        {fetchErr && (
          <p style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "var(--text-muted)", fontSize: 13 }}>
            불러오지 못했어요
          </p>
        )}
        {events?.length === 0 && (
          <p style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "var(--text-muted)", fontSize: 13 }}>
            아직 청음 기록이 없어요
          </p>
        )}

        {events && events.length > 0 && (
          <div
            style={{
              position: "absolute", left: 0, top: 0,
              width: CANVAS, height: CANVAS,
              transformOrigin: "0 0",
              transform: `translate(${panX}px,${panY}px) scale(${cssZoom})`,
              transition: isAnimating ? "transform 0.44s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
            }}
            onClick={(e) => { if (!dragMoved.current && e.target === e.currentTarget) setFocusedArtist(null); }}
          >
            {/* Nebula clouds — two circles per genre for inner+outer sector coverage */}
            {clouds.flatMap(c => [0.22, 0.62].map((frac, i) => {
              const nr = INNER_R + (OUTER_R - INNER_R) * frac;
              const nx = CX + Math.cos(c.midAngle) * nr;
              const ny = CY + Math.sin(c.midAngle) * nr;
              const cr = Math.max(45, c.sectorSpan * nr * 0.6 + Math.sqrt(c.count) * 10);
              return (
                <div key={`neb-${c.genre}-${i}`} style={{
                  position: "absolute",
                  left: nx - cr, top: ny - cr,
                  width: cr * 2, height: cr * 2,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${c.color}16 0%, ${c.color}08 52%, transparent 74%)`,
                  filter: `blur(${18 / cssZoom}px)`,
                  pointerEvents: "none",
                }} />
              );
            }))}

            {/* Genre labels */}
            {clouds.map(c => {
              const labelR = INNER_R + (OUTER_R - INNER_R) * 0.7;
              const lx = CX + Math.cos(c.midAngle) * labelR;
              const ly = CY + Math.sin(c.midAngle) * labelR;
              return (
                <div key={`lbl-${c.genre}`} style={{
                  position: "absolute",
                  left: lx, top: ly,
                  transform: "translate(-50%,-50%)",
                  fontSize: 11 / cssZoom,
                  fontWeight: 700,
                  color: c.color,
                  opacity: 0.28,
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}>
                  {c.genre}
                </div>
              );
            })}

            {/* Constellation lines — glow halo + crisp main line */}
            <svg style={{ position: "absolute", inset: 0, width: CANVAS, height: CANVAS, pointerEvents: "none", overflow: "visible" }}>
              {lines.map((l, i) => {
                const isFocused = focusedArtist === l.artist;
                const inFocusMode = focusedArtist !== null;
                return (
                  <g key={i}>
                    {/* Glow halo — only for focused artist */}
                    {isFocused && (
                      <line
                        x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                        stroke={l.color}
                        strokeWidth={5 / cssZoom}
                        strokeOpacity={0.14}
                        strokeLinecap="round"
                      />
                    )}
                    {/* Main line */}
                    <line
                      x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                      stroke={l.color}
                      strokeWidth={isFocused ? 1.1 / cssZoom : 0.8 / cssZoom}
                      strokeOpacity={inFocusMode ? (isFocused ? 0.62 : 0.02) : 0.12}
                      strokeLinecap="round"
                      strokeDasharray={inFocusMode ? undefined : `${4 / cssZoom} ${5.5 / cssZoom}`}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Stars */}
            {visStars.map(star => {
              const isFocused = focusedArtist !== null && focusedArtist === star.ev.album.artist;
              // Focused stars always show as covers regardless of zoom level
              const starCs = isFocused ? Math.max(cs, 46 / cssZoom) : cs;
              return (
                <Star
                  key={star.albumId}
                  star={star} cs={starCs} cssZoom={cssZoom}
                  focusMode={focusedArtist !== null}
                  focused={isFocused}
                  onSelect={handleStarClick}
                  onTipEnter={(ev, mx, my) => setTooltip({ ev, mx, my })}
                  onTipLeave={() => setTooltip(null)}
                />
              );
            })}
          </div>
        )}

        {!isZoomed && !focusedArtist && events && events.length > 0 && (
          <p style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: "var(--text-muted)", opacity: 0.25, pointerEvents: "none", whiteSpace: "nowrap" }}>
            스크롤·핀치·Ctrl+휠 확대 · 드래그 패닝
          </p>
        )}

        {/* Artist focus panel */}
        <AnimatePresence>
          {focusedArtist && (
            <motion.div
              key="artist-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.18 }}
              style={{
                position: "absolute", bottom: 28, left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "10px 16px",
                display: "flex", alignItems: "center", gap: 14,
                zIndex: 50, pointerEvents: "auto",
                boxShadow: "0 8px 28px rgba(0,0,0,0.55)",
                whiteSpace: "nowrap",
              }}
            >
              <div>
                <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 700 }}>
                  {focusedArtist}
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
                  {stars.filter(s => s.ev.album.artist === focusedArtist).length}장 · 앨범을 클릭하면 열려요
                </p>
              </div>
              <button
                onClick={() => setFocusedArtist(null)}
                style={{
                  background: "none", border: "none",
                  color: "var(--text-muted)", fontSize: 20,
                  cursor: "pointer", padding: "2px 6px",
                  lineHeight: 1, flexShrink: 0, fontFamily: "inherit",
                }}
                className="hover:opacity-70 transition-opacity"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {tooltip && <Tooltip key={tooltip.ev.album.id} ev={tooltip.ev} mx={tooltip.mx} my={tooltip.my} />}
      </AnimatePresence>
      {selected && <AlbumModal album={selected} onClose={() => setSelected(null)} source="timeline" />}
    </div>
  );
}
