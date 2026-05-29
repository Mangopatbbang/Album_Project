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
const AXIS_W    = 64;

// Band-based spatial layout — reference dimensions at yMul=1
const BAND_H      = 120;
const BAND_GAP    =  36;
const GAL_PAD_T   =  60;
const UNRATED_GAP =  30;
const UNRATED_H   =  80;
const GAL_PAD_B   =  40;

// BASE_GALAXY_H: reference height at yMul=1, scaled to viewport at trufit zoom
const BASE_GALAXY_H = GAL_PAD_T
  + SCORE_MAX * BAND_H + (SCORE_MAX - SCORE_MIN) * BAND_GAP
  + UNRATED_GAP + UNRATED_H + GAL_PAD_B;  // = 1422

const MAX_ZOOM = 2e-5;

type ViewMode = "release" | "listened";

// ─── Y coordinate helpers (all scale with yMul) ───────────────────────────────

function bandCenterY(score: number, yMul = 1): number {
  const idx = SCORE_MAX - score;
  return (GAL_PAD_T + idx * (BAND_H + BAND_GAP) + BAND_H / 2) * yMul;
}

function bandTopY(score: number, yMul = 1): number {
  return bandCenterY(score, yMul) - (BAND_H * yMul) / 2;
}

function unratedCenterY(yMul = 1): number {
  return (GAL_PAD_T
    + SCORE_MAX * BAND_H + (SCORE_MAX - SCORE_MIN) * BAND_GAP
    + UNRATED_GAP + UNRATED_H / 2) * yMul;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

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

interface DotPos { ev: TimelineEvent; x: number; y: number; isUnrated: boolean; baseOpacity: number }

function buildDotPositions(
  events: TimelineEvent[], zoom: number, minMs: number, maxMs: number, mode: ViewMode, yMul: number,
): DotPos[] {
  const range = maxMs - minMs;
  return events.map(ev => {
    const ms = eventMs(ev, mode);

    const xJitterMs = mode === "release"
      ? jitter(ev.album.id + "x", 0.5) * MS_YEAR
      : jitter(ev.album.id + "x", 4)   * MS_DAY;
    const x = ms != null ? (ms + xJitterMs - minMs) * zoom : -9999;

    const isUnrated = ev.score == null;
    // Y jitter scales with yMul — dots spread apart as you zoom in
    const y = isUnrated
      ? unratedCenterY(yMul) + jitter(ev.album.id, UNRATED_H * yMul * 0.55)
      : bandCenterY(ev.score!, yMul) + jitter(ev.album.id, BAND_H * yMul * 0.42);

    const t = ms != null && range > 0 ? (ms - minMs) / range : 0.5;
    const baseOpacity = 0.55 + t * 0.33;

    return { ev, x, y, isUnrated, baseOpacity };
  });
}

// ─── Nebula density ──────────────────────────────────────────────────────────

interface NebulaBlob { x: number; y: number; intensity: number }

function computeNebula(dots: DotPos[], cellSize = 110): NebulaBlob[] {
  const map = new Map<string, number>();
  for (const d of dots) {
    if (d.x < 0 || d.isUnrated) continue;
    const gx = Math.round(d.x / cellSize);
    const gy = Math.round(d.y / cellSize);
    map.set(`${gx},${gy}`, (map.get(`${gx},${gy}`) ?? 0) + 1);
  }
  const max = Math.max(...map.values(), 1);
  return Array.from(map.entries())
    .filter(([, c]) => c >= 2)
    .map(([key, count]) => {
      const [gx, gy] = key.split(",").map(Number);
      return { x: gx * cellSize, y: gy * cellSize, intensity: count / max };
    });
}

// ─── Gap detection (release mode) ────────────────────────────────────────────

interface GapMarker { x: number; label: string }

function computeGaps(events: TimelineEvent[], zoom: number, minMs: number): GapMarker[] {
  const years = [...new Set(
    events.map(ev => parseYear(ev.album.release_date)).filter((y): y is number => y != null)
  )].sort((a, b) => a - b);
  if (years.length < 2) return [];
  const gaps: GapMarker[] = [];
  for (let i = 1; i < years.length; i++) {
    const span = years[i] - years[i - 1];
    if (span < 5) continue;
    const midY = (years[i] + years[i - 1]) / 2;
    gaps.push({
      x: (midY * MS_YEAR - minMs) * zoom,
      label: `── ${span}년 공백 ──`,
    });
  }
  return gaps;
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
  animated: boolean; innerW: number;
  onSelect: (ev: TimelineEvent) => void;
  onTipEnter: (pos: DotPos, mx: number, my: number) => void;
  onTipLeave: () => void;
}

function GalaxyDot({ pos, cs, dimmed, animated, innerW, onSelect, onTipEnter, onTipLeave }: DotProps) {
  const [hov, setHov] = useState(false);
  const { ev, x, y, baseOpacity } = pos;
  const score = ev.score;
  const dot   = score != null ? scoreColor(score) : "rgba(255,255,255,0.22)";
  const isDot = cs === 0;
  const r     = dotRadius(score);

  const glowShadow = score == null ? "none"
    : score >= 8
      ? hov ? `0 0 0 2px var(--bg),0 0 14px ${dot}ee,0 0 28px ${dot}77,0 0 50px ${dot}33`
            : `0 0 0 2px var(--bg),0 0 8px ${dot}cc,0 0 20px ${dot}55,0 0 38px ${dot}22`
    : score >= 7
      ? hov ? `0 0 0 2px var(--bg),0 0 12px ${dot}cc,0 0 24px ${dot}55`
            : `0 0 0 2px var(--bg),0 0 6px ${dot}aa,0 0 14px ${dot}33`
    : score >= 6
      ? hov ? `0 0 0 1px var(--bg),0 0 10px ${dot}aa,0 0 20px ${dot}33`
            : `0 0 0 1px var(--bg),0 0 5px ${dot}88`
    : hov ? `0 0 7px ${dot}66` : "none";

  const delay = animated ? 0 : 0.08 + (x / Math.max(innerW, 1)) * 0.85;

  const enter = (e: React.MouseEvent) => { setHov(true);  onTipEnter(pos, e.clientX, e.clientY); };
  const leave = ()                      => { setHov(false); onTipLeave(); };

  return (
    <div style={{
      position: "absolute", left: x, top: y,
      transform: "translate(-50%, -50%)",
      opacity: dimmed ? 0.07 : (hov ? 1 : baseOpacity),
      transition: "opacity 0.22s ease",
      zIndex: hov ? 20 : 1,
      animation: animated ? "none" : `starAppear .38s ${delay.toFixed(3)}s ease-out both`,
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
            boxShadow: glowShadow,
            transform: hov ? "scale(1.55)" : "scale(1)",
            transition: "transform .14s ease, box-shadow .18s ease",
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
            outline: hov ? `2px solid ${dot}` : `1px solid ${dot}18`,
            outlineOffset: 2,
            boxShadow: hov
              ? `0 6px 22px rgba(0,0,0,.65),0 0 0 3px ${dot}30,0 0 12px ${dot}55`
              : "0 2px 8px rgba(0,0,0,.3)",
            transform: hov ? "scale(1.12)" : "scale(1)",
            transition: "transform .13s ease, box-shadow .16s ease, outline .13s ease",
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

  const yearCounts = useMemo(() => {
    if (mode !== "release") return new Map<number, number>();
    const map = new Map<number, number>();
    for (const ev of events) {
      const y = parseYear(ev.album.release_date);
      if (y == null) continue;
      map.set(y, (map.get(y) ?? 0) + 1);
    }
    return map;
  }, [events, mode]);

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
              {(() => {
                const decade = parseInt(cell.key);
                const counts = Array.from({ length: 10 }, (_, i) => yearCounts.get(decade + i) ?? 0);
                const maxC   = Math.max(...counts, 1);
                return (
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 14 }}>
                    {counts.map((c, i) => (
                      <div key={i} style={{
                        width: 4, flexShrink: 0, alignSelf: "flex-end",
                        height: c > 0 ? Math.max(Math.round((c / maxC) * 11), 2) : 0,
                        backgroundColor: bg,
                        opacity: c > 0 ? 0.35 + (c / maxC) * 0.5 : 0,
                        borderRadius: "1px 1px 0 0",
                      }} />
                    ))}
                  </div>
                );
              })()}
              <span style={{ fontSize: 8, color: "var(--text-muted)", opacity: 0.55, lineHeight: 1 }}>{cell.count}개</span>
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

function ScoreAxis({ scoreCounts, maxCount, yMul, scrollY }: {
  scoreCounts: Map<number, number>; maxCount: number; yMul: number; scrollY: number;
}) {
  const scores = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => SCORE_MAX - i);
  return (
    <div style={{ width: AXIS_W, flexShrink: 0, position: "relative", overflow: "hidden", borderRight: "1px solid var(--border)" }}>
      {scores.map(s => {
        const c     = scoreColor(s);
        const count = scoreCounts.get(s) ?? 0;
        const barW  = maxCount > 0 ? Math.round((count / maxCount) * 22) : 0;
        return (
          <div key={s} style={{
            position: "absolute",
            top: bandCenterY(s, yMul) - scrollY,
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
        position: "absolute",
        top: unratedCenterY(yMul) - scrollY,
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
  const [wrapH, setWrapH]           = useState(0);
  const [selected, setSelected]     = useState<AlbumWithRatings | null>(null);
  const [tooltip, setTooltip]       = useState<{ ev: TimelineEvent; mx: number; my: number } | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [hoveredDotPos, setHoveredDotPos]   = useState<DotPos | null>(null);
  const [axisDrawn, setAxisDrawn]   = useState(false);
  const [animated, setAnimated]     = useState(false);
  const [scrollX, setScrollX]       = useState(0);
  const [scrollY, setScrollY]       = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const wrapRef      = useRef<HTMLDivElement>(null);
  const scrollRef    = useRef<HTMLDivElement>(null);
  const zoomRef      = useRef(0);
  const trufitRef    = useRef(0);
  const dragRef      = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const dragMovedRef = useRef(false);
  const velRef       = useRef(0);
  const velYRef      = useRef(0);
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

  // Measure wrapH on mount
  useEffect(() => {
    if (wrapRef.current) setWrapH(wrapRef.current.clientHeight);
  }, []);

  const { minMs, maxMs, totalMs } = useMemo(
    () => computeRange(events ?? [], mode),
    [events, mode]
  );

  // Fit zoom: start at trufit (all content visible, no scroll)
  useEffect(() => {
    if (!events?.length || !wrapRef.current || !totalMs) return;
    const w = wrapRef.current.clientWidth - AXIS_W - 24;
    const h = wrapRef.current.clientHeight;
    setWrapH(h);
    const trufit = w / totalMs;
    trufitRef.current = trufit;
    zoomRef.current   = trufit;
    setZoom(trufit);
    setAxisDrawn(false);
    setAnimated(false);
    setTimeout(() => setAxisDrawn(true), 80);
    setTimeout(() => setAnimated(true), 1600);
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
      scrollRef.current.scrollTop  = 0;
    }
  }, [events, mode, totalMs]);

  // Resize handler
  useEffect(() => {
    const fn = () => {
      if (!wrapRef.current || !totalMs) return;
      const w = wrapRef.current.clientWidth - AXIS_W - 24;
      const h = wrapRef.current.clientHeight;
      setWrapH(h);
      const trufit = w / totalMs;
      trufitRef.current = trufit;
      if (zoomRef.current <= trufit * 1.05) { zoomRef.current = trufit; setZoom(trufit); }
    };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [totalMs]);

  // Wheel: vertical = zoom (anchor to cursor), horizontal = pan X
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
        const rect  = el.getBoundingClientRect();
        const cx    = e.clientX - rect.left + el.scrollLeft;
        const cy    = e.clientY - rect.top  + el.scrollTop;
        const cMs   = cx / zoomRef.current + minMs;
        const prevZ = zoomRef.current;
        const nz    = Math.max(trufitRef.current * 0.85, Math.min(MAX_ZOOM, zoomRef.current * fac));
        zoomRef.current = nz; setZoom(nz);
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollLeft = (cMs - minMs) * nz - (e.clientX - rect.left);
            scrollRef.current.scrollTop  = cy * (nz / prevZ) - (e.clientY - rect.top);
          }
        });
      }
    };
    el.addEventListener("wheel", fn, { passive: false });
    return () => el.removeEventListener("wheel", fn);
  }, [minMs]);

  // Pinch zoom — anchor both X and Y to pinch origin
  const bind = usePinch(
    ({ offset: [scale], origin: [ox, oy], first, memo }) => {
      const el = scrollRef.current; if (!el) return;
      if (first) {
        const rect = el.getBoundingClientRect();
        return {
          initZ: zoomRef.current,
          cMs:   (ox - rect.left + el.scrollLeft) / zoomRef.current + minMs,
          ox:    ox - rect.left,
          cY:    oy - rect.top + el.scrollTop,
          oy:    oy - rect.top,
        };
      }
      if (!memo) return;
      const nz = Math.max(trufitRef.current * 0.85, Math.min(MAX_ZOOM, memo.initZ * scale));
      zoomRef.current = nz; setZoom(nz);
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = (memo.cMs - minMs) * nz - memo.ox;
          scrollRef.current.scrollTop  = memo.cY * (nz / memo.initZ) - memo.oy;
        }
      });
      return memo;
    },
    { from: [1, 0], eventOptions: { passive: false } },
  );

  // Drag-to-pan (X + Y) with inertia
  const onDragStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    cancelAnimationFrame(rafRef.current);
    dragMovedRef.current = false;
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      scrollLeft: scrollRef.current?.scrollLeft ?? 0,
      scrollTop:  scrollRef.current?.scrollTop  ?? 0,
    };
    velRef.current = 0; velYRef.current = 0;
    setIsDragging(true);
  }, []);

  useEffect(() => {
    let lastX = 0, lastY = 0, lastT = 0;
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current || !scrollRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMovedRef.current = true;
      scrollRef.current.scrollLeft = dragRef.current.scrollLeft - dx;
      scrollRef.current.scrollTop  = dragRef.current.scrollTop  - dy;
      const now = performance.now();
      velRef.current  = (lastX - e.clientX) / Math.max(now - lastT, 1) * 16;
      velYRef.current = (lastY - e.clientY) / Math.max(now - lastT, 1) * 16;
      lastX = e.clientX; lastY = e.clientY; lastT = now;
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setIsDragging(false);
      let v = velRef.current, vy = velYRef.current;
      const coast = () => {
        if (!scrollRef.current || (Math.abs(v) < 0.4 && Math.abs(vy) < 0.4)) return;
        scrollRef.current.scrollLeft += v;
        scrollRef.current.scrollTop  += vy;
        v *= 0.93; vy *= 0.93;
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
    const cx    = el.scrollLeft + el.clientWidth  / 2;
    const cy    = el.scrollTop  + el.clientHeight / 2;
    const cMs   = cx / zoomRef.current + minMs;
    const prevZ = zoomRef.current;
    const nz    = Math.max(trufitRef.current * 0.85, Math.min(MAX_ZOOM, zoomRef.current * fac));
    zoomRef.current = nz; setZoom(nz);
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = (cMs - minMs) * nz - scrollRef.current.clientWidth  / 2;
        scrollRef.current.scrollTop  = cy * (nz / prevZ)  - scrollRef.current.clientHeight / 2;
      }
    });
  }, [minMs]);

  const resetZoom = useCallback(() => {
    zoomRef.current = trufitRef.current; setZoom(trufitRef.current);
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
      scrollRef.current.scrollTop  = 0;
    }
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
    if (scrollRef.current) {
      setScrollX(scrollRef.current.scrollLeft);
      setScrollY(scrollRef.current.scrollTop);
    }
  }, []);

  // yMul: at trufit zoom = wrapH/BASE_GALAXY_H (no scroll), scales linearly with zoom
  const yMul = trufitRef.current > 0 && wrapH > 0 && zoom > 0
    ? (wrapH / BASE_GALAXY_H) * (zoom / trufitRef.current)
    : wrapH > 0 ? wrapH / BASE_GALAXY_H : 1;

  const dynamicGalaxyH = BASE_GALAXY_H * yMul;

  const cs     = coverSize(zoom, mode);
  const containerW = (wrapRef.current?.clientWidth ?? 900) - AXIS_W;
  const innerW = zoom > 0 && totalMs > 0 ? Math.max(containerW, totalMs * zoom) : containerW;

  const ticks = useMemo(
    () => mode === "release" ? computeReleaseTicks(zoom, minMs, maxMs) : computeListenedTicks(zoom, minMs, maxMs),
    [zoom, minMs, maxMs, mode]
  );
  const heatCells = useMemo(() => computeHeatmap(events ?? [], mode), [events, mode]);
  const allDots   = useMemo(
    () => buildDotPositions(events ?? [], zoom, minMs, maxMs, mode, yMul),
    [events, zoom, minMs, maxMs, mode, yMul]
  );

  const { scoreCounts, maxScoreCount } = useMemo(() => {
    const counts = new Map<number, number>();
    for (const ev of events ?? []) {
      if (ev.score != null) counts.set(ev.score, (counts.get(ev.score) ?? 0) + 1);
    }
    return { scoreCounts: counts, maxScoreCount: Math.max(...counts.values(), 1) };
  }, [events]);

  // X virtualization — only render dots/nebula in view + buffer
  const visibleDots = useMemo(
    () => allDots.filter(d => d.x >= scrollX - 500 && d.x <= scrollX + containerW + 500),
    [allDots, scrollX, containerW]
  );

  const nebulaBlobs = useMemo(() => computeNebula(allDots), [allDots]);
  const visibleNebula = useMemo(
    () => nebulaBlobs.filter(b => b.x >= scrollX - 400 && b.x <= scrollX + containerW + 400),
    [nebulaBlobs, scrollX, containerW]
  );

  const gapMarkers = useMemo(
    () => mode === "release" ? computeGaps(events ?? [], zoom, minMs) : [],
    [events, mode, zoom, minMs]
  );

  const artistDots = useMemo(
    () => hoveredDotPos
      ? allDots.filter(d =>
          d.ev.album.artist === hoveredDotPos.ev.album.artist &&
          `${d.ev.album.id}-${d.ev.date}` !== `${hoveredDotPos.ev.album.id}-${hoveredDotPos.ev.date}`
        )
      : [],
    [hoveredDotPos, allDots]
  );

  const isZoomed = trufitRef.current > 0 && zoom > trufitRef.current * 1.1;
  const hasMajor = ticks.some(t => t.isMajor);
  const TICK_Y   = 20;

  const baselineY   = bandCenterY(SCORE_MIN, yMul) + (BAND_H * yMul) / 2;
  const unratedSepY = unratedCenterY(yMul) - (UNRATED_H * yMul) / 2 - (UNRATED_GAP * yMul) / 2;

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

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400,
      backgroundColor: "var(--bg)", display: "flex", flexDirection: "column",
      animation: "cvIn .2s ease-out",
    }}>
      <style>{`
        @keyframes cvIn       { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes cvAxis     { from { transform:scaleX(0); } to { transform:scaleX(1); } }
        @keyframes starAppear { from { opacity:0; transform:translate(-50%,-50%) scale(0.25); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
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
            {/* Score axis — labels track scrollY so they stay aligned with bands */}
            <ScoreAxis scoreCounts={scoreCounts} maxCount={maxScoreCount} yMul={yMul} scrollY={scrollY} />

            {/* Scroll container — both X and Y */}
            <div
              ref={scrollRef}
              {...bind()}
              onMouseDown={onDragStart}
              onScroll={handleScroll}
              onClickCapture={e => { if (dragMovedRef.current) e.stopPropagation(); }}
              style={{
                flex: 1, overflowX: "auto", overflowY: "auto",
                cursor: isDragging ? "grabbing" : "grab",
                userSelect: "none", touchAction: "none",
              }}
            >
              {/* Inner canvas — scales in both X and Y with zoom */}
              <div style={{ width: innerW, height: dynamicGalaxyH, position: "relative" }}>

                {/* ── Score band backgrounds ── */}
                {Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => SCORE_MAX - i).map(s => (
                  <div key={`band-bg-${s}`} style={{
                    position: "absolute", left: 0,
                    top: bandTopY(s, yMul), height: BAND_H * yMul, width: "100%",
                    backgroundColor: `${scoreColor(s)}${s % 2 === 0 ? "07" : "04"}`,
                    pointerEvents: "none",
                  }} />
                ))}

                {/* ── Band separator lines ── */}
                {Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => SCORE_MAX - i).map(s => (
                  <div key={`band-line-${s}`} style={{
                    position: "absolute", left: 0,
                    top: bandTopY(s, yMul), height: 1, width: "100%",
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

                {/* ── Baseline ── */}
                <div style={{
                  position: "absolute", left: 0, top: baselineY,
                  width: "100%", height: 1,
                  background: "linear-gradient(to right, transparent, var(--border-light) 2%, var(--border-light) 98%, transparent)",
                  transformOrigin: "left center",
                  transform: "scaleX(0)",
                  animation: axisDrawn ? "cvAxis .65s cubic-bezier(0.22,1,0.36,1) forwards" : "none",
                  pointerEvents: "none",
                }} />

                {/* ── Nebula ── */}
                {visibleNebula.map((blob, i) => (
                  <div key={`neb-${i}`} style={{
                    position: "absolute",
                    left: blob.x - 110, top: blob.y - 110,
                    width: 220, height: 220,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, rgba(255,255,255,${(blob.intensity * 0.052).toFixed(4)}) 0%, transparent 68%)`,
                    filter: "blur(18px)",
                    pointerEvents: "none", zIndex: 0,
                    willChange: "transform",
                  }} />
                ))}

                {/* ── Gap labels ── */}
                {gapMarkers.map((g, i) => (
                  <div key={`gap-${i}`} style={{
                    position: "absolute",
                    left: g.x, top: bandCenterY(4, yMul),
                    transform: "translateX(-50%)",
                    fontSize: 8, color: "var(--text-muted)", opacity: 0.16,
                    pointerEvents: "none", whiteSpace: "nowrap",
                    letterSpacing: "0.1em", fontStyle: "italic",
                  }}>
                    {g.label}
                  </div>
                ))}

                {/* ── Constellation lines ── */}
                {hoveredDotPos && artistDots.length > 0 && (
                  <svg style={{
                    position: "absolute", inset: 0,
                    width: "100%", height: dynamicGalaxyH,
                    pointerEvents: "none", zIndex: 14, overflow: "visible",
                  }}>
                    {artistDots.map((d, i) => (
                      <g key={i}>
                        <line
                          x1={hoveredDotPos.x} y1={hoveredDotPos.y}
                          x2={d.x} y2={d.y}
                          stroke="rgba(255,255,255,0.14)"
                          strokeWidth={0.7}
                          strokeDasharray="4 5"
                        />
                        <circle
                          cx={d.x} cy={d.y} r={dotRadius(d.ev.score) + 3}
                          fill="none"
                          stroke={d.ev.score != null ? scoreColor(d.ev.score) : "rgba(255,255,255,0.3)"}
                          strokeWidth={1}
                          opacity={0.4}
                        />
                      </g>
                    ))}
                  </svg>
                )}

                {/* ── Band watermark numbers ── */}
                {Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => SCORE_MAX - i).map(s => (
                  <div key={`wm-${s}`} style={{
                    position: "absolute",
                    right: 28, top: bandCenterY(s, yMul),
                    transform: "translateY(-50%)",
                    fontSize: Math.max(24, 80 * yMul), fontWeight: 900, lineHeight: 1,
                    color: scoreColor(s), opacity: 0.028,
                    pointerEvents: "none", userSelect: "none",
                  }}>
                    {s}
                  </div>
                ))}

                {/* ── Galaxy dots ── */}
                {visibleDots.map(pos => (
                  <GalaxyDot
                    key={`${pos.ev.album.id}-${pos.ev.date}`}
                    pos={pos} cs={cs}
                    dimmed={selectedPeriod != null && !isPeriodMatch(pos.ev, selectedPeriod)}
                    animated={animated} innerW={innerW}
                    onSelect={handleSelect}
                    onTipEnter={(p, mx, my) => { setTooltip({ ev: p.ev, mx, my }); setHoveredDotPos(p); }}
                    onTipLeave={() => { setTooltip(null); setHoveredDotPos(null); }}
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
                드래그·핀치 이동 · 휠 확대 · +/- 키
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
