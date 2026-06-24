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
const CX = CANVAS / 2; // 1500
const CY = CANVAS / 2;
const MAX_ZOOM = 22;
const RADIUS_MIN = 150; // most albums genre → nearest center
const RADIUS_MAX = 600; // least albums genre → outer edge

// Musical similarity grouping → base angles (degrees)
const GENRE_ANGLES: Record<string, number> = {
  "Hip-Hop":     0,
  "R&B":         32,
  "Electronic":  68,
  "Pop":         100,
  "Alternative": 152,
  "Rock":        182,
  "Folk":        212,
  "Country":     242,
  "Jazz":        272,
  "OST":         302,
  "Compilation": 325,
  "Other":       348,
};

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
}

// ─── Layout computation ───────────────────────────────────────────────────────

function jitter(seed: string, range: number): number {
  const h = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * range;
}

function computeLayout(events: TimelineEvent[]): { stars: StarPos[]; clouds: GenreCloud[] } {
  // Deduplicate: one entry per album (latest event wins)
  const albumMap = new Map<string, TimelineEvent>();
  for (const ev of events) {
    if (!albumMap.has(ev.album.id)) albumMap.set(ev.album.id, ev);
  }
  const unique = [...albumMap.values()];

  // Count per genre
  const genreCounts = new Map<string, number>();
  for (const ev of unique) {
    const g = ev.album.genre ?? "Other";
    genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
  }

  // Sort genres by count desc → assign radial distance (more = closer to center)
  const sorted = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]);
  const maxC = sorted[0]?.[1] ?? 1;
  const minC = sorted[sorted.length - 1]?.[1] ?? 1;

  const genreCenters = new Map<string, { cx: number; cy: number; count: number }>();
  for (const [genre, count] of sorted) {
    const t = maxC === minC ? 0 : (maxC - count) / (maxC - minC);
    const radius = RADIUS_MIN + t * (RADIUS_MAX - RADIUS_MIN);
    const deg = GENRE_ANGLES[genre] ?? (jitter(genre, 360) + 180);
    const rad = (deg * Math.PI) / 180;
    genreCenters.set(genre, {
      cx: CX + Math.cos(rad) * radius,
      cy: CY + Math.sin(rad) * radius,
      count,
    });
  }

  // Group unique albums by genre → artist
  const byGenre = new Map<string, TimelineEvent[]>();
  for (const ev of unique) {
    const g = ev.album.genre ?? "Other";
    const arr = byGenre.get(g) ?? [];
    arr.push(ev);
    byGenre.set(g, arr);
  }

  const stars: StarPos[] = [];

  for (const [genre, gevents] of byGenre) {
    const center = genreCenters.get(genre);
    if (!center) continue;

    // Sub-group by artist
    const byArtist = new Map<string, TimelineEvent[]>();
    for (const ev of gevents) {
      const arr = byArtist.get(ev.album.artist) ?? [];
      arr.push(ev);
      byArtist.set(ev.album.artist, arr);
    }
    const artistList = [...byArtist.entries()];
    const artistCount = artistList.length;
    // Artist cluster radius grows with number of distinct artists in genre
    const clusterR = 55 + Math.min(artistCount, 10) * 14;

    artistList.forEach(([artist, aevents], ai) => {
      // Spread artists evenly around genre center with small jitter
      const aAngle = (ai / Math.max(artistCount, 1)) * Math.PI * 2 + jitter(artist + genre, 0.4);
      const acx = center.cx + Math.cos(aAngle) * clusterR;
      const acy = center.cy + Math.sin(aAngle) * clusterR;

      aevents.forEach((ev, i) => {
        const albumAngle = (i / Math.max(aevents.length, 1)) * Math.PI * 2 + jitter(ev.album.id + "a", 0.6);
        // Year offset: older albums sit slightly further from artist center
        const year = parseInt(ev.album.release_date?.slice(0, 4) ?? "2000");
        const yearNorm = Math.max(0, Math.min(1, (2025 - year) / 65));
        const albumR = 14 + yearNorm * 24 + Math.abs(jitter(ev.album.id + "r", 16));
        stars.push({
          albumId: ev.album.id,
          ev,
          x: acx + Math.cos(albumAngle) * albumR,
          y: acy + Math.sin(albumAngle) * albumR,
          genre,
        });
      });
    });
  }

  // Clouds sized by album count
  const clouds: GenreCloud[] = [];
  for (const [genre, center] of genreCenters) {
    const color = GENRE_COLOR[genre] ?? "#888888";
    const cloudRadius = 70 + Math.sqrt(center.count) * 30;
    clouds.push({ genre, cx: center.cx, cy: center.cy, count: center.count, color, radius: cloudRadius });
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
  if (spread < 1.6) return 0;
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

function Star({ star, cs, cssZoom, onSelect, onTipEnter, onTipLeave }: {
  star: StarPos; cs: number; cssZoom: number;
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

  const glow = score == null ? "none"
    : score >= 8 ? `0 0 0 ${2*iz}px var(--bg), 0 0 ${10*iz}px ${color}cc, 0 0 ${26*iz}px ${color}55`
    : score >= 7 ? `0 0 0 ${iz}px var(--bg), 0 0 ${7*iz}px ${color}aa, 0 0 ${16*iz}px ${color}33`
    : score >= 6 ? `0 0 ${5*iz}px ${color}77`
    : "none";

  const enter = (e: React.MouseEvent) => { setHov(true); onTipEnter(ev, e.clientX, e.clientY); };
  const leave = () => { setHov(false); onTipLeave(); };

  return (
    <div style={{
      position: "absolute", left: star.x, top: star.y,
      transform: "translate(-50%,-50%)",
      zIndex: hov ? 40 : (score ?? 2),
    }}>
      {isDot ? (
        <button onClick={() => onSelect(ev)} onMouseEnter={enter} onMouseLeave={leave} style={{
          width: r * 2, height: r * 2, borderRadius: "50%",
          backgroundColor: color,
          border: score != null ? `${1.5 * iz}px solid var(--bg)` : "none",
          padding: 0, cursor: "pointer",
          boxShadow: hov ? `0 0 0 ${2*iz}px var(--bg), 0 0 ${16*iz}px ${color}ee, 0 0 ${30*iz}px ${color}66` : glow,
          transform: hov ? "scale(1.7)" : "scale(1)",
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
            : score && score >= 7 ? `${iz}px solid ${color}55` : "none",
          outlineOffset: 2 * iz,
          boxShadow: hov
            ? `0 ${8*iz}px ${28*iz}px rgba(0,0,0,.72), 0 0 ${20*iz}px ${color}bb`
            : glow,
          transform: hov ? "scale(1.12)" : "scale(1)",
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
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    const blockPinch = (e: WheelEvent) => { if (e.ctrlKey || e.metaKey) e.preventDefault(); };
    document.addEventListener("wheel", blockPinch, { passive: false });
    return () => {
      document.removeEventListener("keydown", esc);
      document.removeEventListener("wheel", blockPinch);
      document.body.style.overflow = "";
    };
  }, [onClose]);

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
      if (e.key === "=" || e.key === "+") { e.preventDefault(); zoomStep(1.4); }
      if (e.key === "-" || e.key === "_") { e.preventDefault(); zoomStep(1 / 1.4); }
      if (e.key === "0") { e.preventDefault(); resetZoom(); }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [zoomStep, resetZoom]);

  const { stars, clouds } = useMemo(
    () => events?.length ? computeLayout(events) : { stars: [], clouds: [] },
    [events],
  );

  // Constellation lines (same artist, sorted by release year)
  const lines = useMemo(() => {
    const byArtist = new Map<string, StarPos[]>();
    for (const s of stars) {
      const arr = byArtist.get(s.ev.album.artist) ?? [];
      arr.push(s);
      byArtist.set(s.ev.album.artist, arr);
    }
    const result: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
    for (const group of byArtist.values()) {
      if (group.length < 2) continue;
      const sorted = [...group].sort((a, b) =>
        parseInt(a.ev.album.release_date?.slice(0, 4) ?? "2000") -
        parseInt(b.ev.album.release_date?.slice(0, 4) ?? "2000")
      );
      const color = GENRE_COLOR[sorted[0].genre] ?? "rgba(255,255,255,0.2)";
      for (let i = 0; i < sorted.length - 1; i++) {
        result.push({ x1: sorted[i].x, y1: sorted[i].y, x2: sorted[i+1].x, y2: sorted[i+1].y, color });
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

  const handleSelect = useCallback((ev: TimelineEvent) => {
    setTooltip(null);
    setSelected({
      id: ev.album.id, title: ev.album.title,
      artist: ev.album.artist_display ?? ev.album.artist,
      cover_url: ev.album.cover_url ?? undefined,
      genre: ev.album.genre ?? undefined,
      ratings: [],
    } as AlbumWithRatings);
  }, []);

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
          <div style={{
            position: "absolute", left: 0, top: 0,
            width: CANVAS, height: CANVAS,
            transformOrigin: "0 0",
            transform: `translate(${panX}px,${panY}px) scale(${cssZoom})`,
          }}>
            {/* Nebula clouds */}
            {clouds.map(c => (
              <div key={`neb-${c.genre}`} style={{
                position: "absolute",
                left: c.cx - c.radius, top: c.cy - c.radius,
                width: c.radius * 2, height: c.radius * 2,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${c.color}1a 0%, ${c.color}09 52%, transparent 74%)`,
                filter: `blur(${20 / cssZoom}px)`,
                pointerEvents: "none",
              }} />
            ))}

            {/* Genre labels */}
            {clouds.map(c => (
              <div key={`lbl-${c.genre}`} style={{
                position: "absolute",
                left: c.cx, top: c.cy - c.radius * 0.85,
                transform: "translateX(-50%)",
                fontSize: 11 / cssZoom,
                fontWeight: 700,
                color: c.color,
                opacity: 0.32,
                pointerEvents: "none",
                whiteSpace: "nowrap",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}>
                {c.genre}
              </div>
            ))}

            {/* Constellation lines */}
            <svg style={{ position: "absolute", inset: 0, width: CANVAS, height: CANVAS, pointerEvents: "none", overflow: "visible" }}>
              {lines.map((l, i) => (
                <line key={i}
                  x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                  stroke={l.color}
                  strokeWidth={0.9 / cssZoom}
                  strokeOpacity={0.2}
                  strokeDasharray={`${3.5 / cssZoom} ${4.5 / cssZoom}`}
                />
              ))}
            </svg>

            {/* Stars */}
            {visStars.map(star => (
              <Star
                key={star.albumId}
                star={star} cs={cs} cssZoom={cssZoom}
                onSelect={handleSelect}
                onTipEnter={(ev, mx, my) => setTooltip({ ev, mx, my })}
                onTipLeave={() => setTooltip(null)}
              />
            ))}
          </div>
        )}

        {!isZoomed && events && events.length > 0 && (
          <p style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: "var(--text-muted)", opacity: 0.25, pointerEvents: "none", whiteSpace: "nowrap" }}>
            스크롤·핀치·Ctrl+휠 확대 · 드래그 패닝
          </p>
        )}
      </div>

      <AnimatePresence>
        {tooltip && <Tooltip key={tooltip.ev.album.id} ev={tooltip.ev} mx={tooltip.mx} my={tooltip.my} />}
      </AnimatePresence>
      {selected && <AlbumModal album={selected} onClose={() => setSelected(null)} source="timeline" />}
    </div>
  );
}
