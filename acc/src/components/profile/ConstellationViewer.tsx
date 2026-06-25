"use client";

import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
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

  // Repulsion: push overlapping stars apart so covers don't collide at artist-focus zoom
  const MIN_D = 74, REPEL_ITER = 45;
  for (let it = 0; it < REPEL_ITER; it++) {
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const dx = stars[j].x - stars[i].x, dy = stars[j].y - stars[i].y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.01 && d2 < MIN_D * MIN_D) {
          const d = Math.sqrt(d2), push = (MIN_D - d) / d * 0.28;
          stars[i].x -= dx * push; stars[i].y -= dy * push;
          stars[j].x += dx * push; stars[j].y += dy * push;
        }
      }
    }
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

// 음반고 디스코그래피와 동일 기준: main artist OR extra_artists 토큰 일치
function artistMatch(star: StarPos, name: string): boolean {
  if (star.ev.album.artist === name) return true;
  const extra = star.ev.album.extra_artists;
  if (!extra) return false;
  return extra.split(";").some(t => t.trim() === name);
}

function dotRadius(score: number | undefined): number {
  if (score == null) return 3;
  if (score >= 8) return 8.5;
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

const Star = memo(function Star({ star, cs, cssZoom, dimmed, focused, onSelect, onTipEnter, onTipLeave }: {
  star: StarPos; cs: number; cssZoom: number;
  dimmed: boolean; focused: boolean;
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
  const twinkleDuration = score != null && score >= 8
    ? 2.2 + ((ev.album.id.charCodeAt(0) * 37 + (ev.album.id.charCodeAt(1) || 0)) % 23) / 10
    : 0;
  const twinkleDelay = score != null && score >= 8
    ? -((ev.album.id.charCodeAt(2) || 0) % 18) / 10
    : 0;

  const glow = score == null ? "none"
    : score >= 8
      ? `0 0 0 ${iz}px rgba(0,0,0,0.5), 0 0 ${4*iz}px white, 0 0 ${11*iz}px ${color}, 0 0 ${24*iz}px ${color}cc, 0 0 ${48*iz}px ${color}66, 0 0 ${80*iz}px ${color}28`
    : score >= 7 ? `0 0 0 ${iz}px var(--bg), 0 0 ${7*iz}px ${color}aa, 0 0 ${16*iz}px ${color}33`
    : score >= 6 ? `0 0 ${5*iz}px ${color}77`
    : "none";

  const focusedGlow = score != null && score >= 8
    ? `0 0 0 ${iz}px rgba(0,0,0,0.5), 0 0 ${5*iz}px white, 0 0 ${14*iz}px ${color}, 0 0 ${30*iz}px ${color}ee, 0 0 ${58*iz}px ${color}88`
    : `0 0 0 ${2*iz}px var(--bg), 0 0 ${14*iz}px ${color}ee, 0 0 ${32*iz}px ${color}88`;

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
        // 투명 래퍼로 호버/클릭 판정 영역을 시각 크기보다 크게 확보
        <button
          onClick={() => onSelect(ev)} onMouseEnter={enter} onMouseLeave={leave}
          style={{
            width: Math.max(r * 2, 18 * iz), height: Math.max(r * 2, 18 * iz),
            borderRadius: "50%", backgroundColor: "transparent",
            border: "none", padding: 0, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {/* 십자 스파이크 — score 8 전용 */}
          {score != null && score >= 8 && (
            <>
              <div style={{
                position: "absolute", pointerEvents: "none",
                width: 32 * iz, height: 1.2 * iz,
                left: "50%", top: "50%",
                transform: "translate(-50%,-50%)",
                background: `linear-gradient(to right, transparent, ${color}55, white, ${color}55, transparent)`,
                animation: twinkleDuration > 0
                  ? `csTwinkle ${twinkleDuration}s ${twinkleDelay}s ease-in-out infinite` : undefined,
              }} />
              <div style={{
                position: "absolute", pointerEvents: "none",
                width: 1.2 * iz, height: 32 * iz,
                left: "50%", top: "50%",
                transform: "translate(-50%,-50%)",
                background: `linear-gradient(to bottom, transparent, ${color}55, white, ${color}55, transparent)`,
                animation: twinkleDuration > 0
                  ? `csTwinkle ${twinkleDuration}s ${twinkleDelay}s ease-in-out infinite` : undefined,
              }} />
            </>
          )}
          <div style={{
            width: r * 2, height: r * 2, borderRadius: "50%",
            backgroundColor: score != null && score >= 8 ? "white" : color,
            border: score != null && score < 8 ? `${1.5 * iz}px solid var(--bg)` : "none",
            flexShrink: 0,
            boxShadow: hov
              ? `0 0 0 ${iz}px rgba(0,0,0,0.4), 0 0 ${5*iz}px white, 0 0 ${18*iz}px ${color}ee, 0 0 ${36*iz}px ${color}88`
              : focused ? focusedGlow : glow,
            transform: hov ? "scale(1.7)" : focused ? "scale(1.35)" : "scale(1)",
            transition: "transform .13s ease, box-shadow .15s ease",
            animation: twinkleDuration > 0 && !hov && !focused
              ? `csTwinkle ${twinkleDuration}s ${twinkleDelay}s ease-in-out infinite`
              : undefined,
          }} />
        </button>
      ) : (
        <motion.button
          initial={{ scale: 0.65, opacity: 0 }}
          animate={{ scale: hov ? 1.12 : focused ? 1.1 : 1, opacity: 1 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => onSelect(ev)} onMouseEnter={enter} onMouseLeave={leave}
          style={{
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
            transition: "box-shadow .14s ease, outline .14s ease",
          }}
        >
          {ev.album.cover_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img loading="lazy" src={ev.album.cover_url} alt={ev.album.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: Math.floor(cs * 0.38) }}>♪</div>
          }
        </motion.button>
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
});

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
  const [focusedGenre, setFocusedGenre] = useState<string | null>(null);
  const [scoreFilter, setScoreFilter] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [tourIdx, setTourIdx] = useState<number | null>(null);

  const vpRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevFocusedArtistRef = useRef<string | null>(null);
  const animDuration = useRef(0.44);
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

  // Direct DOM transform — bypasses React setState during drag/wheel for 60fps
  // dur=0: instant, dur>0: smooth transition with that duration (seconds)
  const applyTransform = useCallback((x: number, y: number, z: number, dur = 0) => {
    const el = innerRef.current; if (!el) return;
    el.style.transition = dur > 0
      ? `transform ${dur}s cubic-bezier(0.25,0.46,0.45,0.94)`
      : "none";
    el.style.transform = `translate(${x}px,${y}px) scale(${z})`;
  }, []);

  // Sync refs → React state once (for culling, cover sizes, zoom indicator)
  const syncState = useCallback(() => {
    setCssZoom(cssZoomRef.current);
    setPanX(panXRef.current);
    setPanY(panYRef.current);
  }, []);

  const initView = useCallback((intro = false) => {
    const vp = vpRef.current; if (!vp) return;
    const vpW = vp.clientWidth, vpH = vp.clientHeight;
    vpWRef.current = vpW; vpHRef.current = vpH;
    const fz = Math.min(vpW, vpH) / CANVAS * 0.9;
    fitZoomRef.current = fz;
    setFitZoom(fz);
    const px = (vpW - CANVAS * fz) / 2;
    const py = (vpH - CANVAS * fz) / 2;
    if (intro) {
      const startFz = fz * 0.14;
      const spx = (vpW - CANVAS * startFz) / 2;
      const spy = (vpH - CANVAS * startFz) / 2;
      cssZoomRef.current = startFz; panXRef.current = spx; panYRef.current = spy;
      applyTransform(spx, spy, startFz);
      animDuration.current = 0.92;
      requestAnimationFrame(() => {
        cssZoomRef.current = fz; panXRef.current = px; panYRef.current = py;
        applyTransform(px, py, fz, animDuration.current);
        syncState();
        const t = setTimeout(() => {
          animDuration.current = 0.44;
          if (innerRef.current) innerRef.current.style.transition = "none";
        }, 970);
        return () => clearTimeout(t);
      });
    } else {
      cssZoomRef.current = fz; panXRef.current = px; panYRef.current = py;
      applyTransform(px, py, fz);
      syncState();
    }
  }, [applyTransform, syncState]);

  useEffect(() => { if (events?.length) initView(true); }, [events, initView]);
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
        const fac = e.deltaMode === 0 ? Math.exp(-e.deltaY * 0.003) : e.deltaY > 0 ? 1 / 1.15 : 1.15;
        const rect = el.getBoundingClientRect();
        const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
        const pz = cssZoomRef.current;
        const nz = Math.max(fitZoomRef.current * 0.75, Math.min(MAX_ZOOM, pz * fac));
        cssZoomRef.current = nz;
        panXRef.current = cx - (cx - panXRef.current) * nz / pz;
        panYRef.current = cy - (cy - panYRef.current) * nz / pz;
      } else {
        panXRef.current -= e.deltaX; panYRef.current -= e.deltaY;
      }
      applyTransform(panXRef.current, panYRef.current, cssZoomRef.current, 0.09);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(syncState, 200);
    };
    el.addEventListener("wheel", fn, { passive: false });
    return () => el.removeEventListener("wheel", fn);
  }, [events, applyTransform, syncState]);

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
      applyTransform(panXRef.current, panYRef.current, cssZoomRef.current);
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
        if (Math.abs(vx) < 0.4 && Math.abs(vy) < 0.4) { syncState(); return; }
        panXRef.current -= vx; panYRef.current -= vy;
        applyTransform(panXRef.current, panYRef.current, cssZoomRef.current);
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
        applyTransform(panXRef.current, panYRef.current, cssZoomRef.current);
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
          applyTransform(panXRef.current, panYRef.current, nz);
        }
      }
      touchRef.current.prev = curr;
    };
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        touchRef.current = null; setIsDragging(false);
        let vx = velX.current, vy = velY.current;
        const coast = () => {
          if (Math.abs(vx) < 0.4 && Math.abs(vy) < 0.4) { syncState(); return; }
          panXRef.current -= vx; panYRef.current -= vy;
          applyTransform(panXRef.current, panYRef.current, cssZoomRef.current);
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
    applyTransform(panXRef.current, panYRef.current, nz, 0.15);
    syncState();
  }, [applyTransform, syncState]);

  const resetZoom = useCallback(() => {
    const fz = fitZoomRef.current;
    cssZoomRef.current = fz;
    panXRef.current = (vpWRef.current - CANVAS * fz) / 2;
    panYRef.current = (vpHRef.current - CANVAS * fz) / 2;
    applyTransform(panXRef.current, panYRef.current, fz, 0.25);
    syncState();
  }, [applyTransform, syncState]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (focusedArtist) { setFocusedArtist(null); return; }
        if (focusedGenre) { setFocusedGenre(null); return; }
        if (scoreFilter !== null) { setScoreFilter(null); return; }
        onClose(); return;
      }
      if (e.key === "=" || e.key === "+") { e.preventDefault(); zoomStep(1.2); }
      if (e.key === "-" || e.key === "_") { e.preventDefault(); zoomStep(1 / 1.2); }
      if (e.key === "0") { e.preventDefault(); resetZoom(); }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [zoomStep, resetZoom, focusedArtist, focusedGenre, scoreFilter, onClose]);

  const { stars, clouds } = useMemo(
    () => events?.length ? computeLayout(events) : { stars: [], clouds: [] },
    [events],
  );

  // Auto-pan+zoom to fit the focused artist's constellation
  useEffect(() => {
    if (!focusedArtist) return;
    const artistStars = stars.filter(s => artistMatch(s, focusedArtist));
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
    applyTransform(px, py, nz, animDuration.current);
    syncState();
    const t = setTimeout(() => { if (innerRef.current) innerRef.current.style.transition = "none"; }, 480);
    return () => clearTimeout(t);
  }, [focusedArtist, stars, applyTransform, syncState]);

  // Auto-return to fit view when artist focus is cleared
  useEffect(() => {
    if (prevFocusedArtistRef.current !== null && focusedArtist === null) {
      const fz = fitZoomRef.current;
      const px = (vpWRef.current - CANVAS * fz) / 2;
      const py = (vpHRef.current - CANVAS * fz) / 2;
      cssZoomRef.current = fz; panXRef.current = px; panYRef.current = py;
      applyTransform(px, py, fz, animDuration.current);
      syncState();
      const t = setTimeout(() => { if (innerRef.current) innerRef.current.style.transition = "none"; }, 480);
      prevFocusedArtistRef.current = null;
      return () => clearTimeout(t);
    }
    prevFocusedArtistRef.current = focusedArtist;
  }, [focusedArtist, applyTransform, syncState]);

  // Genre focus → auto-zoom to fit all genre stars
  useEffect(() => {
    if (!focusedGenre) return;
    const genreStars = stars.filter(s => s.genre === focusedGenre);
    if (genreStars.length === 0) return;
    const vpW = vpWRef.current, vpH = vpHRef.current;
    if (!vpW || !vpH) return;
    const xs = genreStars.map(s => s.x), ys = genreStars.map(s => s.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const PAD = 160;
    const bw = (maxX - minX) + PAD * 2, bh = (maxY - minY) + PAD * 2;
    const nz = Math.max(fitZoomRef.current * 2.2, Math.min(6, Math.min(vpW / bw, vpH / bh) * 0.9));
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const px = vpW / 2 - cx * nz, py = vpH / 2 - cy * nz;
    cssZoomRef.current = nz; panXRef.current = px; panYRef.current = py;
    applyTransform(px, py, nz, animDuration.current);
    syncState();
    const t = setTimeout(() => { if (innerRef.current) innerRef.current.style.transition = "none"; }, 480);
    return () => clearTimeout(t);
  }, [focusedGenre, stars, applyTransform, syncState]);

  // Constellation lines — grouped by artist matching 음반고 discography logic:
  // main artist OR any token in extra_artists (semicolon-separated)
  const lines = useMemo(() => {
    const byArtist = new Map<string, StarPos[]>();
    const addTo = (artistKey: string, star: StarPos) => {
      const arr = byArtist.get(artistKey) ?? [];
      arr.push(star);
      byArtist.set(artistKey, arr);
    };
    for (const s of stars) {
      addTo(s.ev.album.artist, s);
      const extra = s.ev.album.extra_artists;
      if (extra) {
        for (const token of extra.split(";")) {
          const name = token.trim();
          if (name) addTo(name, s);
        }
      }
    }
    const result: { x1: number; y1: number; x2: number; y2: number; color: string; artist: string }[] = [];
    for (const [artist, group] of byArtist) {
      if (group.length < 2) continue;
      // dedup (same star can appear multiple times via extra_artists)
      const seen = new Set<string>();
      const unique = group.filter(s => seen.has(s.albumId) ? false : (seen.add(s.albumId), true));
      if (unique.length < 2) continue;
      const sorted = [...unique].sort((a, b) =>
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

  // Background starfield — deterministic 700 tiny dots, no deps
  const bgStars = useMemo(() => {
    let s = 0x12345678;
    const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0x100000000; };
    return Array.from({ length: 700 }, () => ({
      x: rng() * CANVAS, y: rng() * CANVAS,
      r: 0.4 + rng() * 1.3,
      op: 0.06 + rng() * 0.32,
    }));
  }, []);

  // Year range for header
  const yearRange = useMemo(() => {
    if (!events?.length) return null;
    const ys = events.map(e => parseInt(e.album.release_date?.slice(0, 4) ?? "")).filter(y => !isNaN(y) && y > 1900);
    return ys.length ? { min: Math.min(...ys), max: Math.max(...ys) } : null;
  }, [events]);

  // Tour artists — sorted by album count desc
  const tourArtists = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stars) map.set(s.ev.album.artist, (map.get(s.ev.album.artist) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([a]) => a);
  }, [stars]);

  // Stats for overlay
  const stats = useMemo(() => {
    if (!stars.length) return null;
    const genreMap = new Map<string, number>();
    const scoreMap = new Map<number, number>();
    const yearMap = new Map<number, number>();
    const artistSet = new Set<string>();
    for (const s of stars) {
      genreMap.set(s.genre, (genreMap.get(s.genre) ?? 0) + 1);
      artistSet.add(s.ev.album.artist);
      if (s.ev.score != null) scoreMap.set(s.ev.score, (scoreMap.get(s.ev.score) ?? 0) + 1);
      const y = parseInt(s.ev.album.release_date?.slice(0, 4) ?? "");
      if (y > 1900) yearMap.set(y, (yearMap.get(y) ?? 0) + 1);
    }
    const scored = stars.filter(s => s.ev.score != null);
    const avgScore = scored.length ? (scored.reduce((a, s) => a + (s.ev.score ?? 0), 0) / scored.length).toFixed(1) : null;
    const genres = [...genreMap.entries()].sort((a, b) => b[1] - a[1]);
    const yearEntries = [...yearMap.entries()].sort((a, b) => a[0] - b[0]);
    const maxYearCount = Math.max(...yearEntries.map(([, c]) => c), 1);
    return { total: stars.length, artists: artistSet.size, genres, scoreMap, yearEntries, maxYearCount, avgScore };
  }, [stars]);

  // Tour mode — auto-advance every 3.8s
  useEffect(() => {
    if (!tourActive || tourArtists.length === 0) return;
    const t = setTimeout(() => {
      setTourIdx(prev => {
        const next = ((prev ?? -1) + 1) % tourArtists.length;
        setFocusedArtist(tourArtists[next]);
        setFocusedGenre(null); setScoreFilter(null);
        return next;
      });
    }, 3800);
    return () => clearTimeout(t);
  }, [tourActive, tourIdx, tourArtists]);

  const startTour = useCallback(() => {
    if (!tourArtists.length) return;
    setTourActive(true); setTourIdx(0);
    setFocusedArtist(tourArtists[0]);
    setFocusedGenre(null); setScoreFilter(null);
  }, [tourArtists]);

  const stopTour = useCallback(() => {
    setTourActive(false); setTourIdx(null);
  }, []);

  // Canvas export (PNG)
  const handleExport = useCallback(() => {
    if (!stars.length) return;
    const SIZE = 1080;
    const cv = document.createElement("canvas");
    cv.width = SIZE; cv.height = SIZE;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#080710"; ctx.fillRect(0, 0, SIZE, SIZE);
    const xs = stars.map(s => s.x), ys = stars.map(s => s.y);
    const mnX = Math.min(...xs), mxX = Math.max(...xs);
    const mnY = Math.min(...ys), mxY = Math.max(...ys);
    const pad = 80;
    const sc = Math.min((SIZE - pad * 2) / (mxX - mnX), (SIZE - pad * 2) / (mxY - mnY));
    const ox = (SIZE - (mxX - mnX) * sc) / 2 - mnX * sc;
    const oy = (SIZE - (mxY - mnY) * sc) / 2 - mnY * sc;
    const tx2 = (x: number) => x * sc + ox, ty2 = (y: number) => y * sc + oy;
    for (const b of bgStars) {
      ctx.globalAlpha = b.op * 0.7;
      ctx.fillStyle = "white";
      ctx.beginPath(); ctx.arc(tx2(b.x), ty2(b.y), b.r * sc, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineWidth = 0.7; ctx.lineCap = "round";
    for (const l of lines) {
      const dxl = l.x2 - l.x1, dyl = l.y2 - l.y1;
      const side = (l.artist.charCodeAt(0) % 2 === 0) ? 1 : -1;
      const cpx = tx2((l.x1 + l.x2) / 2 - dyl * 0.12 * side);
      const cpy = ty2((l.y1 + l.y2) / 2 + dxl * 0.12 * side);
      ctx.globalAlpha = 0.15; ctx.strokeStyle = l.color;
      ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(tx2(l.x1), ty2(l.y1));
      ctx.quadraticCurveTo(cpx, cpy, tx2(l.x2), ty2(l.y2)); ctx.stroke();
    }
    ctx.setLineDash([]);
    for (const s of stars) {
      const r = dotRadius(s.ev.score) * sc;
      const c = s.ev.score != null ? scoreColor(s.ev.score) : "rgba(255,255,255,0.4)";
      if (s.ev.score != null && s.ev.score >= 8) {
        const grd = ctx.createRadialGradient(tx2(s.x), ty2(s.y), 0, tx2(s.x), ty2(s.y), r * 7);
        grd.addColorStop(0, "white"); grd.addColorStop(0.25, c); grd.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.75; ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(tx2(s.x), ty2(s.y), r * 7, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = "white";
      } else {
        ctx.globalAlpha = 1; ctx.fillStyle = c;
      }
      ctx.beginPath(); ctx.arc(tx2(s.x), ty2(s.y), Math.max(r, 1), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 0.65; ctx.fillStyle = "white";
    ctx.font = `bold ${Math.round(SIZE * 0.022)}px -apple-system,sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText("나의 청음 별자리", pad, SIZE - pad - 22);
    ctx.font = `${Math.round(SIZE * 0.016)}px -apple-system,sans-serif`;
    ctx.globalAlpha = 0.38;
    ctx.fillText(`${stars.length}장${yearRange ? ` · ${yearRange.min}–${yearRange.max}` : ""}`, pad, SIZE - pad + 4);
    cv.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `내별자리_${new Date().toISOString().slice(0, 10)}.png`;
      a.click(); URL.revokeObjectURL(url);
    });
  }, [stars, lines, bgStars, yearRange]);

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

  // focusedArtistRef: stable ref to avoid recreating handleStarClick on every artist focus change
  const focusedArtistRef = useRef(focusedArtist);
  useEffect(() => { focusedArtistRef.current = focusedArtist; }, [focusedArtist]);

  const handleTipEnter = useCallback((ev: TimelineEvent, mx: number, my: number) => {
    if (dragRef.current) return;
    setTooltip({ ev, mx, my });
  }, []);

  const handleTipLeave = useCallback(() => setTooltip(null), []);

  const handleStarClick = useCallback((ev: TimelineEvent) => {
    setTooltip(null);
    if (focusedArtistRef.current === ev.album.artist) {
      setSelected({
        id: ev.album.id, title: ev.album.title,
        artist: ev.album.artist_display ?? ev.album.artist,
        cover_url: ev.album.cover_url ?? undefined,
        genre: ev.album.genre ?? undefined,
        ratings: [],
      } as AlbumWithRatings);
    } else {
      setFocusedArtist(ev.album.artist);
      setFocusedGenre(null);
      setScoreFilter(null);
    }
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, backgroundColor: "var(--bg)", display: "flex", flexDirection: "column", animation: "csIn .2s ease-out" }}>
      <style>{`
        @keyframes csIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes csTwinkle { 0%,100% { opacity:1; } 50% { opacity:0.42; } }
        @keyframes csCoverIn { from { opacity:0; transform:scale(0.62); } to { opacity:1; transform:scale(1); } }
        @keyframes csLineIn { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes csGlowIn { from { opacity: 0; } to { opacity: 0.22; } }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em" }}>청음 별자리</p>
          <p style={{ color: "var(--text-sub)", fontSize: 12 }}>
            {events
              ? `${stars.length}장의 앨범${yearRange ? ` · ${yearRange.min}–${yearRange.max}` : ""}`
              : "불러오는 중…"}
          </p>
        </div>

        {/* Genre legend — clickable for genre focus */}
        <div className="hidden sm:flex" style={{ gap: 8, alignItems: "center", flexWrap: "wrap", maxWidth: 380 }}>
          {cloudsSorted.map(c => {
            const isActive = focusedGenre === c.genre;
            return (
              <button
                key={c.genre}
                onClick={() => setFocusedGenre(isActive ? null : c.genre)}
                style={{
                  display: "flex", alignItems: "center", gap: 3,
                  background: "none", border: "none", cursor: "pointer",
                  padding: "2px 5px", borderRadius: 4,
                  backgroundColor: isActive ? `${c.color}22` : "transparent",
                  outline: isActive ? `1px solid ${c.color}55` : "none",
                  transition: "background-color .15s, outline .15s",
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: c.color, opacity: isActive ? 1 : 0.7, flexShrink: 0 }} />
                <span style={{ fontSize: 9, color: isActive ? c.color : "var(--text-muted)", opacity: isActive ? 1 : 0.55, whiteSpace: "nowrap", fontFamily: "inherit", fontWeight: isActive ? 700 : 400 }}>{c.genre}</span>
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        {events && events.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <button
              onClick={() => { setShowStats(v => !v); }}
              title="통계"
              style={{
                height: 24, padding: "0 8px", borderRadius: 5, fontSize: 9, fontWeight: 700,
                backgroundColor: showStats ? "var(--accent)" : "var(--bg-elevated)",
                border: "1px solid var(--border)", color: showStats ? "var(--bg)" : "var(--text-muted)",
                cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.02em",
                transition: "all 0.15s",
              }}
            >통계</button>
            <button
              onClick={() => tourActive ? stopTour() : startTour()}
              title="아티스트 투어"
              style={{
                height: 24, padding: "0 8px", borderRadius: 5, fontSize: 9, fontWeight: 700,
                backgroundColor: tourActive ? "#7c3aed" : "var(--bg-elevated)",
                border: `1px solid ${tourActive ? "#7c3aed" : "var(--border)"}`,
                color: tourActive ? "white" : "var(--text-muted)",
                cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >{tourActive ? "■ 투어" : "▶ 투어"}</button>
            <button
              onClick={handleExport}
              title="PNG 저장"
              style={{
                height: 24, padding: "0 8px", borderRadius: 5, fontSize: 9, fontWeight: 700,
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border)", color: "var(--text-muted)",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >↓ 저장</button>
          </div>
        )}

        {cssZoom > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            {isZoomed && (
              <button onClick={resetZoom} style={{ fontSize: 9, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit" }}>
                전체보기
              </button>
            )}
            <button onClick={() => zoomStep(1 / 1.3)} style={{ width: 24, height: 24, borderRadius: 5, fontSize: 16, backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
            <span style={{ fontSize: 9, color: "var(--text-muted)", opacity: 0.55, minWidth: 28, textAlign: "center" }}>
              {fitZoom > 0 ? `${Math.round(cssZoom / fitZoom * 100)}%` : ""}
            </span>
            <button onClick={() => zoomStep(1.3)} style={{ width: 24, height: 24, borderRadius: 5, fontSize: 16, backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
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
            ref={innerRef}
            style={{
              position: "absolute", left: 0, top: 0,
              width: CANVAS, height: CANVAS,
              transformOrigin: "0 0",
              willChange: "transform",
            }}
            onClick={(e) => { if (!dragMoved.current && e.target === e.currentTarget) setFocusedArtist(null); }}
          >
            {/* Background starfield */}
            <svg style={{ position: "absolute", inset: 0, width: CANVAS, height: CANVAS, pointerEvents: "none", overflow: "visible" }}>
              {bgStars.map((bs, i) => (
                <circle key={i} cx={bs.x} cy={bs.y} r={bs.r} fill="white" opacity={bs.op} />
              ))}
            </svg>

            {/* Milky Way — subtle diagonal gradient blobs */}
            {[
              { x: 400, y: 2600, rx: 900, ry: 320, rot: -38 },
              { x: 1100, y: 1900, rx: 700, ry: 260, rot: -36 },
              { x: 1700, y: 1300, rx: 800, ry: 280, rot: -34 },
              { x: 2300, y: 700,  rx: 650, ry: 220, rot: -32 },
              { x: 2800, y: 300,  rx: 500, ry: 180, rot: -30 },
            ].map((b, i) => (
              <div key={`mw-${i}`} style={{
                position: "absolute",
                left: b.x - b.rx, top: b.y - b.ry,
                width: b.rx * 2, height: b.ry * 2,
                borderRadius: "50%",
                background: "radial-gradient(ellipse, rgba(200,210,255,0.035) 0%, rgba(180,195,255,0.018) 45%, transparent 75%)",
                filter: "blur(48px)",
                transform: `rotate(${b.rot}deg)`,
                transformOrigin: "center",
                pointerEvents: "none",
              }} />
            ))}

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
                  filter: "blur(36px)",
                  pointerEvents: "none",
                }} />
              );
            }))}

            {/* Genre labels — clickable for auto-zoom */}
            {clouds.map(c => {
              const labelR = INNER_R + (OUTER_R - INNER_R) * 0.7;
              const lx = CX + Math.cos(c.midAngle) * labelR;
              const ly = CY + Math.sin(c.midAngle) * labelR;
              const isActive = focusedGenre === c.genre;
              return (
                <div
                  key={`lbl-${c.genre}`}
                  onClick={e => { e.stopPropagation(); setFocusedGenre(isActive ? null : c.genre); setFocusedArtist(null); setScoreFilter(null); }}
                  style={{
                    position: "absolute",
                    left: lx, top: ly,
                    transform: "translate(-50%,-50%)",
                    fontSize: 11 / cssZoom,
                    fontWeight: 700,
                    color: c.color,
                    opacity: isActive ? 0.85 : 0.28,
                    pointerEvents: "auto",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "opacity 0.2s",
                    userSelect: "none",
                  }}
                >
                  {c.genre}
                </div>
              );
            })}

            {/* Constellation lines — curved bezier, stagger draw-in on artist focus */}
            <svg style={{ position: "absolute", inset: 0, width: CANVAS, height: CANVAS, pointerEvents: "none", overflow: "visible" }}>
              {(() => {
                const artistLineIdx = new Map<string, number>();
                return lines.map((l, i) => {
                  const isFocused = focusedArtist === l.artist;
                  const inFocusMode = focusedArtist !== null;
                  const dx = l.x2 - l.x1, dy = l.y2 - l.y1;
                  const curveSide = (l.artist.charCodeAt(0) % 2 === 0) ? 1 : -1;
                  const cpx = (l.x1 + l.x2) / 2 - dy * 0.12 * curveSide;
                  const cpy = (l.y1 + l.y2) / 2 + dx * 0.12 * curveSide;
                  const pathD = `M${l.x1},${l.y1} Q${cpx},${cpy} ${l.x2},${l.y2}`;
                  const lineIdx = isFocused ? (() => {
                    const cur = artistLineIdx.get(l.artist) ?? 0;
                    artistLineIdx.set(l.artist, cur + 1);
                    return cur;
                  })() : 0;
                  const staggerDelay = lineIdx * 0.18;
                  const drawDur = 0.85;
                  return (
                    <g key={i}>
                      {/* 글로우 헤일로 — 그려진 이후 페이드인 (선 완성 후 등장) */}
                      {isFocused && (
                        <path
                          d={pathD} fill="none"
                          stroke={l.color}
                          strokeWidth={8 / cssZoom}
                          strokeLinecap="round"
                          pathLength={1}
                          strokeDasharray={1}
                          style={{
                            strokeDashoffset: 1,
                            animation: `csLineIn ${drawDur}s ${staggerDelay}s linear forwards`,
                            opacity: 0.22,
                          } as React.CSSProperties}
                        />
                      )}
                      {/* 메인 선 — 포커스 시 처음부터 그려짐, 평소엔 거의 안 보임 */}
                      <path
                        d={pathD} fill="none"
                        stroke={l.color}
                        strokeWidth={isFocused ? 1.4 / cssZoom : 0.6 / cssZoom}
                        strokeLinecap="round"
                        strokeDasharray={isFocused ? 1 : `${3.5 / cssZoom} ${7 / cssZoom}`}
                        strokeOpacity={inFocusMode ? (isFocused ? 0 : 0.01) : 0.04}
                        pathLength={isFocused ? 1 : undefined}
                        style={isFocused ? {
                          strokeDashoffset: 1,
                          animation: `csLineIn ${drawDur}s ${staggerDelay}s linear forwards`,
                          strokeOpacity: 0.78,
                        } as React.CSSProperties : undefined}
                      />
                    </g>
                  );
                });
              })()}
            </svg>

            {/* Stars */}
            {visStars.map(star => {
              const isFocused = focusedArtist !== null && artistMatch(star, focusedArtist);
              const isDimmed = focusedArtist !== null
                ? !isFocused
                : focusedGenre !== null
                  ? star.genre !== focusedGenre
                  : scoreFilter !== null
                    ? star.ev.score !== scoreFilter
                    : false;
              const starCs = isFocused ? Math.max(cs, 46 / cssZoom) : cs;
              return (
                <Star
                  key={star.albumId}
                  star={star} cs={starCs} cssZoom={cssZoom}
                  dimmed={isDimmed}
                  focused={isFocused}
                  onSelect={handleStarClick}
                  onTipEnter={handleTipEnter}
                  onTipLeave={handleTipLeave}
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

        {/* Score filter — 1~8 pill row */}
        {events && events.length > 0 && (
          <div style={{ position: "absolute", bottom: 16, left: 16, display: "flex", gap: 4, zIndex: 30 }}>
            {([1,2,3,4,5,6,7,8] as const).map(s => {
              const c = scoreColor(s);
              const active = scoreFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => { setScoreFilter(active ? null : s); setFocusedArtist(null); setFocusedGenre(null); }}
                  style={{
                    width: 22, height: 22, borderRadius: "50%", padding: 0,
                    backgroundColor: active ? c : "rgba(0,0,0,0.45)",
                    border: `1.5px solid ${c}`,
                    color: active ? "var(--bg)" : c,
                    fontSize: 9, fontWeight: 800, cursor: "pointer",
                    fontFamily: "inherit",
                    opacity: scoreFilter !== null && !active ? 0.35 : 1,
                    transition: "all 0.15s",
                    boxShadow: active ? `0 0 8px ${c}88` : "none",
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        )}

        {/* Mini-map */}
        {events && events.length > 0 && isZoomed && (
          <div style={{
            position: "absolute", bottom: 16, right: 16,
            width: 108, height: 108,
            backgroundColor: "rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 8, overflow: "hidden",
            pointerEvents: "none", zIndex: 30,
          }}>
            <svg width={108} height={108} style={{ display: "block" }}>
              {stars.map(s => (
                <circle key={s.albumId}
                  cx={s.x / CANVAS * 108} cy={s.y / CANVAS * 108}
                  r={1.3}
                  fill={GENRE_COLOR[s.genre] ?? "white"}
                  opacity={0.5}
                />
              ))}
              <rect
                x={Math.max(0, (-panX / cssZoom) / CANVAS * 108)}
                y={Math.max(0, (-panY / cssZoom) / CANVAS * 108)}
                width={Math.min(108, (vpWRef.current / cssZoom) / CANVAS * 108)}
                height={Math.min(108, (vpHRef.current / cssZoom) / CANVAS * 108)}
                fill="rgba(255,255,255,0.05)"
                stroke="rgba(255,255,255,0.28)"
                strokeWidth={0.8}
                rx={1}
              />
            </svg>
          </div>
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
                position: "absolute", bottom: isZoomed ? 140 : 24, right: 16,
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "10px 16px",
                display: "flex", alignItems: "center", gap: 14,
                zIndex: 50, pointerEvents: "auto",
                boxShadow: "0 8px 28px rgba(0,0,0,0.55)",
                whiteSpace: "nowrap",
                maxWidth: 260,
              }}
            >
              {(() => {
                const artistStars = stars.filter(s => artistMatch(s, focusedArtist!));
                const scored = artistStars.filter(s => s.ev.score != null);
                const avgScore = scored.length
                  ? (scored.reduce((sum, s) => sum + (s.ev.score ?? 0), 0) / scored.length).toFixed(1)
                  : null;
                const ys = artistStars.map(s => parseInt(s.ev.album.release_date?.slice(0, 4) ?? "")).filter(y => y > 1900);
                const yMin = ys.length ? Math.min(...ys) : null;
                const yMax = ys.length ? Math.max(...ys) : null;
                const genres = [...new Set(artistStars.map(s => s.genre))];
                const genreColor = GENRE_COLOR[genres[0]] ?? "var(--text-muted)";
                return (
                  <div>
                    <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 700 }}>{focusedArtist}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{artistStars.length}장</span>
                      {yMin && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{yMin === yMax ? yMin : `${yMin}–${yMax}`}</span>}
                      {avgScore && <span style={{ fontSize: 10, color: scoreColor(parseFloat(avgScore)), fontWeight: 700 }}>avg {avgScore}</span>}
                      {genres.slice(0, 2).map(g => (
                        <span key={g} style={{ fontSize: 9, color: genreColor, fontWeight: 600 }}>{g}</span>
                      ))}
                    </div>
                    <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 2, opacity: 0.6 }}>앨범을 클릭하면 열려요</p>
                  </div>
                );
              })()}
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

        {/* Tour control bar */}
        <AnimatePresence>
          {tourActive && tourIdx !== null && (
            <motion.div
              key="tour-bar"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              style={{
                position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
                backgroundColor: "rgba(0,0,0,0.72)",
                border: "1px solid #7c3aed55",
                borderRadius: 20, padding: "5px 12px",
                display: "flex", alignItems: "center", gap: 8,
                zIndex: 60, pointerEvents: "auto",
                backdropFilter: "blur(8px)",
                boxShadow: "0 4px 16px rgba(124,58,237,0.25)",
              }}
            >
              <button
                onClick={() => {
                  const prev = ((tourIdx - 1) + tourArtists.length) % tourArtists.length;
                  setTourIdx(prev); setFocusedArtist(tourArtists[prev]);
                }}
                style={{ background: "none", border: "none", color: "#a78bfa", cursor: "pointer", fontSize: 12, padding: "0 2px", fontFamily: "inherit" }}
              >◀</button>
              <span style={{ fontSize: 10, color: "#e9d5ff", fontWeight: 600, minWidth: 120, textAlign: "center" }}>
                {focusedArtist} <span style={{ opacity: 0.5 }}>· {tourIdx + 1}/{tourArtists.length}</span>
              </span>
              <button
                onClick={() => {
                  const next = (tourIdx + 1) % tourArtists.length;
                  setTourIdx(next); setFocusedArtist(tourArtists[next]);
                }}
                style={{ background: "none", border: "none", color: "#a78bfa", cursor: "pointer", fontSize: 12, padding: "0 2px", fontFamily: "inherit" }}
              >▶</button>
              <button
                onClick={stopTour}
                style={{ background: "none", border: "none", color: "#a78bfa", cursor: "pointer", fontSize: 12, padding: "0 2px", fontFamily: "inherit" }}
              >■</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats overlay */}
        <AnimatePresence>
          {showStats && stats && (
            <motion.div
              key="stats-overlay"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              style={{
                position: "absolute", top: 12, left: 12,
                backgroundColor: "rgba(8,7,16,0.88)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14, padding: "14px 16px",
                zIndex: 55, pointerEvents: "auto",
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 28px rgba(0,0,0,0.6)",
                minWidth: 200, maxWidth: 220,
              }}
            >
              {/* Summary row */}
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                {[
                  { label: "앨범", value: stats.total },
                  { label: "아티스트", value: stats.artists },
                  { label: "장르", value: stats.genres.length },
                ].map(({ label, value }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <p style={{ color: "var(--text)", fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{value}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 9, marginTop: 2 }}>{label}</p>
                  </div>
                ))}
                {stats.avgScore && (
                  <div style={{ textAlign: "center" }}>
                    <p style={{ color: scoreColor(parseFloat(stats.avgScore)), fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{stats.avgScore}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 9, marginTop: 2 }}>평균점수</p>
                  </div>
                )}
              </div>

              {/* Genre bar chart */}
              <p style={{ color: "var(--text-muted)", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 5 }}>장르</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {stats.genres.slice(0, 6).map(([genre, count]) => {
                  const pct = count / stats.total;
                  const c = GENRE_COLOR[genre] ?? "rgba(255,255,255,0.4)";
                  return (
                    <div key={genre} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 8, color: c, minWidth: 56, opacity: 0.85, fontWeight: 600 }}>{genre}</span>
                      <div style={{ flex: 1, height: 4, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: c, borderRadius: 2, opacity: 0.75 }} />
                      </div>
                      <span style={{ fontSize: 8, color: "var(--text-muted)", minWidth: 14, textAlign: "right" }}>{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Score distribution */}
              <p style={{ color: "var(--text-muted)", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", marginTop: 10, marginBottom: 5 }}>점수 분포</p>
              <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 28 }}>
                {[1,2,3,4,5,6,7,8].map(s => {
                  const cnt = stats.scoreMap.get(s) ?? 0;
                  const maxCnt = Math.max(...[1,2,3,4,5,6,7,8].map(x => stats.scoreMap.get(x) ?? 0), 1);
                  const h = cnt > 0 ? Math.max(4, cnt / maxCnt * 28) : 0;
                  const c = scoreColor(s);
                  return (
                    <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                      <div style={{ width: "100%", height: h, backgroundColor: c, opacity: 0.75, borderRadius: 2, transition: "height 0.3s" }} />
                      <span style={{ fontSize: 7, color: "var(--text-muted)", opacity: 0.5 }}>{s}</span>
                    </div>
                  );
                })}
              </div>

              {/* Year histogram */}
              {stats.yearEntries.length > 1 && (
                <>
                  <p style={{ color: "var(--text-muted)", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", marginTop: 10, marginBottom: 5 }}>연도 분포</p>
                  <div style={{ display: "flex", gap: 1, alignItems: "flex-end", height: 24 }}>
                    {stats.yearEntries.map(([year, cnt]) => {
                      const h = Math.max(2, cnt / stats.maxYearCount * 24);
                      return (
                        <div key={year} style={{ flex: 1, height: h, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 1 }}
                          title={`${year}: ${cnt}장`} />
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                    <span style={{ fontSize: 7, color: "var(--text-muted)", opacity: 0.45 }}>{stats.yearEntries[0]?.[0]}</span>
                    <span style={{ fontSize: 7, color: "var(--text-muted)", opacity: 0.45 }}>{stats.yearEntries[stats.yearEntries.length - 1]?.[0]}</span>
                  </div>
                </>
              )}

              <button
                onClick={() => setShowStats(false)}
                style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", color: "var(--text-muted)", fontSize: 16, cursor: "pointer", lineHeight: 1, fontFamily: "inherit" }}
              >×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Genre focus panel */}
        <AnimatePresence>
          {!focusedArtist && focusedGenre && (
            <motion.div
              key="genre-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.18 }}
              style={{
                position: "absolute", bottom: isZoomed ? 140 : 24, right: 16,
                backgroundColor: "var(--bg-card)",
                border: `1px solid ${GENRE_COLOR[focusedGenre] ?? "var(--border)"}55`,
                borderRadius: 14, padding: "10px 16px",
                display: "flex", alignItems: "center", gap: 14,
                zIndex: 50, pointerEvents: "auto",
                boxShadow: "0 8px 28px rgba(0,0,0,0.55)",
                whiteSpace: "nowrap",
                maxWidth: 240,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: GENRE_COLOR[focusedGenre] ?? "white", flexShrink: 0 }} />
                <div>
                  <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 700 }}>{focusedGenre}</p>
                  <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 1 }}>
                    {stars.filter(s => s.genre === focusedGenre).length}장 · 아티스트를 클릭해 포커스
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFocusedGenre(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", padding: "2px 6px", lineHeight: 1, flexShrink: 0, fontFamily: "inherit" }}
                className="hover:opacity-70 transition-opacity"
              >×</button>
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
