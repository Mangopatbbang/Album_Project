"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { scoreColor } from "@/lib/score";
import AlbumModal from "@/components/album/AlbumModal";
import Spinner from "@/components/ui/Spinner";
import type { TimelineEvent } from "@/app/api/profile/[userId]/timeline/route";
import type { AlbumWithRatings } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const MS_DAY  = 86_400_000;
const MS_YEAR = 365.25 * MS_DAY;
const SCORE_MIN = 1;
const SCORE_MAX = 8;
const HEATMAP_H = 108;
const AXIS_W    = 56; // narrower — now a legend, not a positional axis

// Canvas: X = time, Y = free (density-based). Dots stack around vertical center.
const CANVAS_W      = 2000;
const CANVAS_H      = 1400;
const CANVAS_CY     = CANVAS_H / 2; // 700 — vertical center where dots cluster
const ROW_BASE      = 22;           // base row height (canvas units) per album in a stack
const MAX_CSS_ZOOM  = 20;

type ViewMode = "release" | "listened";

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function jitter(id: string, range: number): number {
  const h = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * range;
}
function parseYear(d: string | null | undefined): number | null {
  if (!d) return null;
  const y = parseInt(d.substring(0, 4), 10);
  return y >= 1900 && y <= 2100 ? y : null;
}
function eventMs(ev: TimelineEvent, mode: ViewMode): number | null {
  if (mode === "release") { const y = parseYear(ev.album.release_date); return y != null ? y * MS_YEAR : null; }
  return new Date(ev.date).getTime();
}
function computeRange(events: TimelineEvent[], mode: ViewMode) {
  const times = events.map(ev => eventMs(ev, mode)).filter((t): t is number => t != null);
  if (!times.length) return { minMs: 0, maxMs: 0, totalMs: 0 };
  const lo = Math.min(...times), hi = Math.max(...times);
  const pad = mode === "release" ? MS_YEAR * 3 : Math.max((hi - lo) * 0.04, MS_DAY * 25);
  return { minMs: lo - pad, maxMs: hi + pad, totalMs: hi + pad - (lo - pad) };
}

// Score-aware cover size: higher-scored albums emerge as thumbnails earlier on zoom
function coverSize(ez: number, mode: ViewMode, score: number | null = null): number {
  const d = mode === "release" ? ez * MS_YEAR : ez * MS_DAY;
  // Higher score → threshold is effectively lower (album shows cover at lower zoom)
  const boost = score != null ? (score / SCORE_MAX) * 2.5 : 0;
  const ed = d * (1 + boost);
  if (mode === "release") {
    if (ed < 5)  return 0; if (ed < 14) return 20; if (ed < 35) return 32;
    if (ed < 90) return 44; return 56;
  }
  if (ed < 1.5) return 0; if (ed < 6)  return 20; if (ed < 18) return 34;
  if (ed < 55)  return 48; return 60;
}
function dotRadius(score: number | undefined): number {
  if (score == null) return 2;
  if (score >= 8) return 7; if (score >= 7) return 5.5; if (score >= 6) return 4.5;
  if (score >= 5) return 3.5; if (score >= 4) return 3; return 2.5;
}

// ─── Ticks ───────────────────────────────────────────────────────────────────

interface Tick { x: number; label: string; isMajor: boolean }

function computeReleaseTicks(ez: number, minMs: number, maxMs: number, totalMs: number): Tick[] {
  const ppy = ez * MS_YEAR;
  const step = ppy < 12 ? 10 : ppy < 40 ? 5 : 1;
  const minY = Math.floor(minMs / MS_YEAR / step) * step;
  const maxY = Math.ceil(maxMs / MS_YEAR) + step;
  const ticks: Tick[] = [];
  for (let y = minY; y <= maxY; y += step) {
    ticks.push({ x: (y * MS_YEAR - minMs) / totalMs * CANVAS_W, label: String(y), isMajor: y % 10 === 0 });
    if (ticks.length > 300) break;
  }
  return ticks;
}

function computeListenedTicks(ez: number, minMs: number, maxMs: number, totalMs: number): Tick[] {
  const d = ez * MS_DAY;
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
    ticks.push({ x: (cur.getTime() - minMs) / totalMs * CANVAS_W, label: cfg.label(cur), isMajor: cfg.isMaj(cur) });
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
      const y = parseYear(ev.album.release_date); if (y == null) continue;
      const decade = Math.floor(y / 10) * 10; key = String(decade); label = `${decade}s`;
    } else {
      key = ev.date.substring(0, 7);
      const mo = parseInt(key.split("-")[1], 10);
      label = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][mo - 1];
    }
    const e = map.get(key) ?? { count: 0, scoreSum: 0, scoreCount: 0, label };
    e.count++; if (ev.score != null) { e.scoreSum += ev.score; e.scoreCount++; }
    map.set(key, e);
  }
  const cells = Array.from(map.entries()).sort(([a],[b]) => a.localeCompare(b))
    .map(([key, d]) => ({ key, label: d.label, count: d.count, avgScore: d.scoreCount > 0 ? d.scoreSum / d.scoreCount : null, intensity: 0 }));
  const max = Math.max(...cells.map(c => c.count), 1);
  cells.forEach(c => { c.intensity = c.count / max; });
  return cells;
}

// ─── Dot positions ────────────────────────────────────────────────────────────
//
// Layout narrative: "나는 언제, 어떤 음악을, 얼마나 사랑했나"
//   X = 시간 (정확한 좌표, 최소 jitter)
//   Y = 밀도 기반 스택, 점수 높은 것이 중앙
//   크기/밝기 = 점수 (사랑의 강도)
//
// spreadK = cssZoom / fitZoom. 줌인할수록 스택이 Y 방향으로 벌어짐.

interface DotPos {
  ev: TimelineEvent;
  x: number; y: number;
  isUnrated: boolean;
  baseOpacity: number;
}

function buildDotPositions(
  events: TimelineEvent[], minMs: number, maxMs: number, totalMs: number,
  mode: ViewMode, spreadK = 1,
): DotPos[] {
  if (!totalMs) return [];
  const range = maxMs - minMs;

  // Bucket key: year (release) or ISO-week (listened)
  const bucketKey = (ev: TimelineEvent): string => {
    if (mode === "release") return String(parseYear(ev.album.release_date) ?? "?");
    const d = new Date(ev.date);
    // ISO week approximation: year + week-of-year
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - jan1.getTime()) / MS_DAY + jan1.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${week}`;
  };

  // Group events into buckets
  const buckets = new Map<string, TimelineEvent[]>();
  for (const ev of events) {
    const k = bucketKey(ev);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(ev);
  }

  // Row height grows with zoom so albums spread apart as user zooms in
  const rowH = ROW_BASE * Math.pow(Math.max(1, spreadK), 0.8);

  const result: DotPos[] = [];

  for (const items of buckets.values()) {
    // Sort: highest score → center row (index 0 → top of center, etc.)
    const sorted = [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const N = sorted.length;

    sorted.forEach((ev, i) => {
      const ms = eventMs(ev, mode);

      // X: accurate time position + very small jitter (±0.15yr or ±2days)
      const xBase = ms != null ? (ms - minMs) / totalMs * CANVAS_W : -9999;
      const xJ = mode === "release"
        ? jitter(ev.album.id + "x", 0.15) * MS_YEAR / totalMs * CANVAS_W
        : jitter(ev.album.id + "x", 2)    * MS_DAY  / totalMs * CANVAS_W;
      const x = xBase + xJ;

      // Y: centered stack. Row 0 = center, alternates above/below.
      // Pattern: 0 → center, 1 → above, 2 → below, 3 → further above, …
      const slot = i % 2 === 0 ? i / 2 : -(i + 1) / 2;
      const yJ = jitter(ev.album.id + "y", rowH * 0.18); // slight randomness within row
      const y = CANVAS_CY + slot * rowH + yJ;

      // Opacity: score is primary driver (love intensity), time is secondary
      const t = ms != null && range > 0 ? (ms - minMs) / range : 0.5;
      const scoreNorm = (ev.score ?? 0) / SCORE_MAX;
      const baseOpacity = 0.2 + scoreNorm * 0.55 + t * 0.25;

      result.push({ ev, x, y, isUnrated: ev.score == null, baseOpacity });
    });
  }

  return result;
}

// ─── Nebula ───────────────────────────────────────────────────────────────────

interface NebulaBlob { x: number; y: number; intensity: number }
function computeNebula(dots: DotPos[], cellSize = 55): NebulaBlob[] {
  const map = new Map<string, number>();
  for (const d of dots) {
    if (d.x < 0) continue;
    const gx = Math.round(d.x / cellSize), gy = Math.round(d.y / cellSize);
    map.set(`${gx},${gy}`, (map.get(`${gx},${gy}`) ?? 0) + 1);
  }
  const max = Math.max(...map.values(), 1);
  return Array.from(map.entries()).filter(([, c]) => c >= 2).map(([key, count]) => {
    const [gx, gy] = key.split(",").map(Number);
    return { x: gx * cellSize, y: gy * cellSize, intensity: count / max };
  });
}

// ─── Gaps ─────────────────────────────────────────────────────────────────────

interface GapMarker { x: number; label: string }
function computeGaps(events: TimelineEvent[], totalMs: number, minMs: number): GapMarker[] {
  const years = [...new Set(events.map(ev => parseYear(ev.album.release_date)).filter((y): y is number => y != null))].sort((a,b) => a-b);
  if (years.length < 2) return [];
  const gaps: GapMarker[] = [];
  for (let i = 1; i < years.length; i++) {
    const span = years[i] - years[i-1]; if (span < 5) continue;
    gaps.push({ x: ((years[i]+years[i-1])/2 * MS_YEAR - minMs) / totalMs * CANVAS_W, label: `── ${span}년 공백 ──` });
  }
  return gaps;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ ev, mx, my }: { ev: TimelineEvent; mx: number; my: number }) {
  const c = ev.score != null ? scoreColor(ev.score) : "var(--text-muted)";
  return (
    <motion.div initial={{ opacity:0, y:6, scale:.94 }} animate={{ opacity:1, y:0, scale:1 }}
      exit={{ opacity:0, y:4 }} transition={{ duration:.12 }}
      style={{ position:"fixed", left:mx, top:my-82, transform:"translateX(-50%)", zIndex:600,
        pointerEvents:"none", backgroundColor:"var(--bg-card)", border:"1px solid var(--border)",
        borderRadius:10, padding:"8px 11px", display:"flex", alignItems:"center", gap:8,
        maxWidth:220, minWidth:110, boxShadow:"0 12px 28px rgba(0,0,0,0.65)", backdropFilter:"blur(4px)" }}>
      {ev.album.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ev.album.cover_url} alt="" style={{ width:32, height:32, borderRadius:5, objectFit:"cover", flexShrink:0 }} />
      )}
      <div style={{ minWidth:0, flex:1 }}>
        <p style={{ color:"var(--text)", fontSize:11, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ev.album.title}</p>
        <p style={{ color:"var(--text-muted)", fontSize:10, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ev.album.artist_display ?? ev.album.artist}</p>
        {ev.album.release_date && <p style={{ color:"var(--text-muted)", fontSize:9, marginTop:2, opacity:.5 }}>{ev.album.release_date.substring(0,4)}</p>}
      </div>
      {ev.score != null && <span style={{ fontSize:14, fontWeight:800, color:c, flexShrink:0 }}>{ev.score}</span>}
    </motion.div>
  );
}

// ─── GalaxyDot ────────────────────────────────────────────────────────────────

interface DotProps {
  pos: DotPos; cs: number; dimmed: boolean; animated: boolean;
  onSelect: (ev: TimelineEvent) => void;
  onTipEnter: (pos: DotPos, mx: number, my: number) => void;
  onTipLeave: () => void;
}
function GalaxyDot({ pos, cs, dimmed, animated, onSelect, onTipEnter, onTipLeave }: DotProps) {
  const [hov, setHov] = useState(false);
  const { ev, x, y, baseOpacity } = pos;
  const score = ev.score;
  const dot  = score != null ? scoreColor(score) : "rgba(255,255,255,0.22)";
  const isDot = cs === 0;
  const r    = dotRadius(score);
  const glowShadow = score == null ? "none"
    : score >= 8 ? (hov ? `0 0 0 2px var(--bg),0 0 14px ${dot}ee,0 0 28px ${dot}77,0 0 50px ${dot}33` : `0 0 0 2px var(--bg),0 0 8px ${dot}cc,0 0 20px ${dot}55,0 0 38px ${dot}22`)
    : score >= 7 ? (hov ? `0 0 0 2px var(--bg),0 0 12px ${dot}cc,0 0 24px ${dot}55` : `0 0 0 2px var(--bg),0 0 6px ${dot}aa,0 0 14px ${dot}33`)
    : score >= 6 ? (hov ? `0 0 0 1px var(--bg),0 0 10px ${dot}aa,0 0 20px ${dot}33` : `0 0 0 1px var(--bg),0 0 5px ${dot}88`)
    : hov ? `0 0 7px ${dot}66` : "none";
  const delay = animated ? 0 : 0.08 + (x / CANVAS_W) * 0.85;
  const enter = (e: React.MouseEvent) => { setHov(true);  onTipEnter(pos, e.clientX, e.clientY); };
  const leave = ()                     => { setHov(false); onTipLeave(); };
  return (
    <div style={{ position:"absolute", left:x, top:y, transform:"translate(-50%,-50%)",
      opacity: dimmed ? 0.07 : (hov ? 1 : baseOpacity), transition:"opacity 0.22s ease",
      zIndex: hov ? 20 : 1,
      animation: animated ? "none" : `starAppear .38s ${delay.toFixed(3)}s ease-out both` }}>
      {isDot ? (
        <button onClick={() => onSelect(ev)} onMouseEnter={enter} onMouseLeave={leave}
          style={{ width:r*2, height:r*2, borderRadius:"50%", backgroundColor:dot,
            border: score != null ? "1.5px solid var(--bg)" : "none", padding:0, cursor:"pointer",
            boxShadow:glowShadow, transform: hov ? "scale(1.55)" : "scale(1)",
            transition:"transform .14s ease, box-shadow .18s ease" }} />
      ) : (
        <button onClick={() => onSelect(ev)} onMouseEnter={enter} onMouseLeave={leave}
          style={{ width:cs, height:cs, padding:0, borderRadius: cs > 40 ? 8 : 5,
            overflow:"hidden", border:"none", cursor:"pointer", backgroundColor:"var(--bg-elevated)",
            outline: hov ? `2px solid ${dot}` : `1px solid ${dot}18`, outlineOffset:2,
            boxShadow: hov ? `0 6px 22px rgba(0,0,0,.65),0 0 0 3px ${dot}30,0 0 12px ${dot}55` : "0 2px 8px rgba(0,0,0,.3)",
            transform: hov ? "scale(1.12)" : "scale(1)", transition:"transform .13s ease, box-shadow .16s ease, outline .13s ease" }}>
          {ev.album.cover_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={ev.album.cover_url} alt={ev.album.title} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
            : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-muted)", fontSize:Math.floor(cs*0.36) }}>♪</div>}
        </button>
      )}
    </div>
  );
}

// ─── HeatmapStrip ─────────────────────────────────────────────────────────────

function HeatmapStrip({ events, mode, cells, selected, onSelect }: {
  events: TimelineEvent[]; mode: ViewMode; cells: HeatCell[]; selected: string | null; onSelect: (k: string | null) => void;
}) {
  const [, setHovered] = useState<string | null>(null);
  const yearCounts = useMemo(() => {
    if (mode !== "release") return new Map<number, number>();
    const map = new Map<number, number>();
    for (const ev of events) { const y = parseYear(ev.album.release_date); if (y == null) continue; map.set(y, (map.get(y) ?? 0) + 1); }
    return map;
  }, [events, mode]);

  if (mode === "release") return (
    <div style={{ height:HEATMAP_H, padding:"10px 14px", display:"flex", alignItems:"center", gap:5, borderBottom:"1px solid var(--border)", overflowX:"auto" }}>
      <span style={{ fontSize:8, color:"var(--text-muted)", opacity:.4, marginRight:4, whiteSpace:"nowrap", letterSpacing:"0.06em" }}>발매연대</span>
      {cells.map(cell => {
        const bg = cell.avgScore != null ? scoreColor(Math.round(cell.avgScore)) : "rgba(255,255,255,0.15)";
        const op = 0.1 + cell.intensity * 0.55; const isSel = selected === cell.key;
        return (
          <button key={cell.key} onClick={() => onSelect(isSel ? null : cell.key)}
            onMouseEnter={() => setHovered(cell.key)} onMouseLeave={() => setHovered(null)}
            style={{ flexShrink:0, width:76, height:"calc(100% - 4px)", borderRadius:8,
              border: isSel ? `1.5px solid ${bg}` : "1.5px solid transparent",
              backgroundColor:`${bg}${Math.round(op*255).toString(16).padStart(2,"0")}`,
              cursor:"pointer", padding:"7px 5px", display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center", gap:3, outline:"none",
              boxShadow: isSel ? `0 0 0 2px ${bg}44` : "none",
              opacity: selected && !isSel ? 0.38 : 1, transition:"opacity 0.2s ease, border-color 0.15s ease" }}>
            <span style={{ fontSize:12, fontWeight:700, color:"var(--text)", lineHeight:1 }}>{cell.label}</span>
            {(() => {
              const decade = parseInt(cell.key);
              const counts = Array.from({ length:10 }, (_, i) => yearCounts.get(decade+i) ?? 0);
              const maxC = Math.max(...counts, 1);
              return (
                <div style={{ display:"flex", alignItems:"flex-end", gap:1, height:14 }}>
                  {counts.map((c,i) => <div key={i} style={{ width:4, flexShrink:0, alignSelf:"flex-end", height: c > 0 ? Math.max(Math.round((c/maxC)*11),2) : 0, backgroundColor:bg, opacity: c > 0 ? 0.35+(c/maxC)*0.5 : 0, borderRadius:"1px 1px 0 0" }} />)}
                </div>
              );
            })()}
            <span style={{ fontSize:8, color:"var(--text-muted)", opacity:.55, lineHeight:1 }}>{cell.count}개</span>
            {cell.avgScore != null && <span style={{ fontSize:9, fontWeight:700, color:bg, lineHeight:1, filter:"brightness(1.3)" }}>avg {cell.avgScore.toFixed(1)}</span>}
          </button>
        );
      })}
    </div>
  );

  const years = Array.from(new Set(events.map(ev => ev.date.substring(0,4)))).sort();
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const cellMap = new Map(cells.map(c => [c.key, c]));
  const rowH = Math.max(14, Math.floor((HEATMAP_H - 30) / Math.max(years.length, 1)));
  return (
    <div style={{ height:HEATMAP_H, padding:"8px 12px", borderBottom:"1px solid var(--border)", overflowY:"hidden" }}>
      <div style={{ display:"grid", gridTemplateColumns:`28px repeat(12, 1fr)`, gap:"2px", fontSize:8, color:"var(--text-muted)", opacity:.42 }}>
        <div />{MONTHS.map(m => <div key={m} style={{ textAlign:"center" }}>{m}</div>)}
        {years.map(yr => (<>
          <div key={`yr-${yr}`} style={{ lineHeight:`${rowH}px`, opacity:.55, fontWeight:600 }}>{yr}</div>
          {MONTHS.map((_, i) => {
            const key = `${yr}-${String(i+1).padStart(2,"0")}`; const cell = cellMap.get(key);
            const bg = cell?.avgScore != null ? scoreColor(Math.round(cell.avgScore)) : "rgba(255,255,255,0.18)";
            const op = cell ? 0.1 + cell.intensity * 0.55 : 0.04; const isSel = selected === key;
            return <button key={key} onClick={() => cell && onSelect(isSel ? null : key)} style={{ height:rowH, borderRadius:3, backgroundColor:`${bg}${Math.round(op*255).toString(16).padStart(2,"0")}`, border: isSel ? `1px solid ${bg}` : "1px solid transparent", cursor: cell ? "pointer" : "default", padding:0, outline:"none", opacity: selected && !isSel ? 0.38 : 1, transition:"opacity 0.2s ease" }} />;
          })}
        </>))}
      </div>
    </div>
  );
}

// ─── ScoreLegend — replaces positional axis, now a fixed legend ───────────────

function ScoreLegend({ scoreCounts, maxCount }: { scoreCounts: Map<number, number>; maxCount: number }) {
  const scores = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => SCORE_MAX - i);
  return (
    <div style={{ width:AXIS_W, flexShrink:0, borderRight:"1px solid var(--border)",
                  display:"flex", flexDirection:"column", justifyContent:"center",
                  gap:5, padding:"0 0 0 4px" }}>
      <p style={{ fontSize:7, color:"var(--text-muted)", opacity:.35, letterSpacing:"0.06em",
                  textAlign:"center", paddingBottom:4, borderBottom:"1px solid var(--border)" }}>점수</p>
      {scores.map(s => {
        const c = scoreColor(s);
        const count = scoreCounts.get(s) ?? 0;
        const barW = maxCount > 0 ? Math.round((count / maxCount) * 24) : 0;
        return (
          <div key={s} style={{ display:"flex", alignItems:"center", gap:4, paddingRight:6, justifyContent:"flex-end" }}>
            {barW > 0 && <div style={{ width:barW, height:3, borderRadius:2, backgroundColor:c, opacity:.35, flexShrink:0 }} />}
            <div style={{ width: dotRadius(s)*2, height: dotRadius(s)*2, borderRadius:"50%", backgroundColor:c,
                          boxShadow: s >= 7 ? `0 0 6px ${c}99` : "none", flexShrink:0 }} />
            <span style={{ fontSize:9, fontWeight:800, color:c, opacity:.8, minWidth:8, textAlign:"right" }}>{s}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ChronicleViewer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [events, setEvents]       = useState<TimelineEvent[] | null>(null);
  const [fetchErr, setFetchErr]   = useState(false);
  const [mode, setMode]           = useState<ViewMode>("release");
  const [cssZoom, setCssZoom]     = useState(1);
  const [panX, setPanX]           = useState(0);
  const [panY, setPanY]           = useState(0);
  const [selected, setSelected]   = useState<AlbumWithRatings | null>(null);
  const [tooltip, setTooltip]     = useState<{ ev: TimelineEvent; mx: number; my: number } | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [hoveredDotPos, setHoveredDotPos]   = useState<DotPos | null>(null);
  const [axisDrawn, setAxisDrawn] = useState(false);
  const [animated, setAnimated]   = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const wrapRef    = useRef<HTMLDivElement>(null);
  const vpRef      = useRef<HTMLDivElement>(null);
  const cssZoomRef = useRef(1);
  const panXRef    = useRef(0);
  const panYRef    = useRef(0);
  const fitZoomRef = useRef(1);
  const vpWRef     = useRef(836);
  const vpHRef     = useRef(600);
  const dragRef    = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const dragMoved  = useRef(false);
  const velX       = useRef(0);
  const velY       = useRef(0);
  const rafRef     = useRef<number>(0);

  useEffect(() => {
    fetch(`/api/profile/${userId}/timeline`).then(r => r.json()).then(d => setEvents(d.events ?? [])).catch(() => setFetchErr(true));
  }, [userId]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    const blockPinch = (e: WheelEvent) => { if (e.ctrlKey || e.metaKey) e.preventDefault(); };
    document.addEventListener("wheel", blockPinch, { passive: false });
    return () => {
      document.removeEventListener("keydown", fn);
      document.removeEventListener("wheel", blockPinch);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const { minMs, maxMs, totalMs } = useMemo(() => computeRange(events ?? [], mode), [events, mode]);

  const initView = useCallback(() => {
    if (!vpRef.current) return;
    const vpW = vpRef.current.clientWidth;
    const vpH = vpRef.current.clientHeight;
    vpWRef.current = vpW; vpHRef.current = vpH;
    const fitZ = Math.min(vpW / CANVAS_W, vpH / CANVAS_H);
    fitZoomRef.current = fitZ;
    const px = (vpW - CANVAS_W * fitZ) / 2;
    const py = (vpH - CANVAS_H * fitZ) / 2;
    cssZoomRef.current = fitZ; panXRef.current = px; panYRef.current = py;
    setCssZoom(fitZ); setPanX(px); setPanY(py);
  }, []);

  useEffect(() => {
    if (!events?.length || !totalMs) return;
    initView();
    setAxisDrawn(false); setAnimated(false);
    setTimeout(() => setAxisDrawn(true), 80);
    setTimeout(() => setAnimated(true), 1600);
  }, [events, mode, totalMs, initView]);

  useEffect(() => {
    const fn = () => { if (events?.length && totalMs) initView(); };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [events, totalMs, initView]);

  // Wheel — Figma style: ctrlKey/metaKey = zoom, else = pan
  useEffect(() => {
    const el = vpRef.current; if (!el) return;
    const fn = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const fac = e.deltaMode === 0
          ? Math.exp(-e.deltaY * 0.008)
          : e.deltaY > 0 ? 1 / 1.25 : 1.25;
        const rect = el.getBoundingClientRect();
        const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
        const prevZ = cssZoomRef.current;
        const nz = Math.max(fitZoomRef.current * 0.75, Math.min(MAX_CSS_ZOOM, prevZ * fac));
        const npx = cx - (cx - panXRef.current) * nz / prevZ;
        const npy = cy - (cy - panYRef.current) * nz / prevZ;
        cssZoomRef.current = nz; panXRef.current = npx; panYRef.current = npy;
        setCssZoom(nz); setPanX(npx); setPanY(npy);
      } else {
        panXRef.current -= e.deltaX;
        panYRef.current -= e.deltaY;
        setPanX(panXRef.current); setPanY(panYRef.current);
      }
    };
    el.addEventListener("wheel", fn, { passive: false });
    return () => el.removeEventListener("wheel", fn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    cancelAnimationFrame(rafRef.current);
    dragMoved.current = false;
    dragRef.current = { sx: e.clientX, sy: e.clientY, px: panXRef.current, py: panYRef.current };
    velX.current = 0; velY.current = 0;
    setIsDragging(true);
  }, []);

  useEffect(() => {
    let lastX = 0, lastY = 0, lastT = 0;
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.sx, dy = e.clientY - dragRef.current.sy;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved.current = true;
      panXRef.current = dragRef.current.px + dx; panYRef.current = dragRef.current.py + dy;
      setPanX(panXRef.current); setPanY(panYRef.current);
      const now = performance.now();
      velX.current = (lastX - e.clientX) / Math.max(now - lastT, 1) * 16;
      velY.current = (lastY - e.clientY) / Math.max(now - lastT, 1) * 16;
      lastX = e.clientX; lastY = e.clientY; lastT = now;
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

  const zoomStep = useCallback((fac: number) => {
    const cx = vpWRef.current / 2, cy = vpHRef.current / 2;
    const prevZ = cssZoomRef.current;
    const nz = Math.max(fitZoomRef.current * 0.75, Math.min(MAX_CSS_ZOOM, prevZ * fac));
    const npx = cx - (cx - panXRef.current) * nz / prevZ;
    const npy = cy - (cy - panYRef.current) * nz / prevZ;
    cssZoomRef.current = nz; panXRef.current = npx; panYRef.current = npy;
    setCssZoom(nz); setPanX(npx); setPanY(npy);
  }, []);

  const resetZoom = useCallback(() => {
    const fitZ = fitZoomRef.current;
    const px = (vpWRef.current - CANVAS_W * fitZ) / 2;
    const py = (vpHRef.current - CANVAS_H * fitZ) / 2;
    cssZoomRef.current = fitZ; panXRef.current = px; panYRef.current = py;
    setCssZoom(fitZ); setPanX(px); setPanY(py);
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "=" || e.key === "+") { e.preventDefault(); zoomStep(1.4); }
      if (e.key === "-" || e.key === "_") { e.preventDefault(); zoomStep(1/1.4); }
      if (e.key === "0") { e.preventDefault(); resetZoom(); }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [zoomStep, resetZoom]);

  // Period selection → pan to X region
  useEffect(() => {
    if (!selectedPeriod || !totalMs || !minMs) return;
    let targetMs: number;
    if (mode === "release") { targetMs = (parseInt(selectedPeriod, 10) + 5) * MS_YEAR; }
    else { const [yr, mo] = selectedPeriod.split("-").map(Number); targetMs = new Date(yr, mo-1, 15).getTime(); }
    const targetX = (targetMs - minMs) / totalMs * CANVAS_W;
    panXRef.current = vpWRef.current / 2 - targetX * cssZoomRef.current;
    setPanX(panXRef.current);
  }, [selectedPeriod, mode, totalMs, minMs]);

  // Derived
  const effectiveZoom = totalMs > 0 ? cssZoom * CANVAS_W / totalMs : 0;
  const isZoomed = cssZoom > fitZoomRef.current * 1.1;
  const spreadK  = fitZoomRef.current > 0 ? cssZoom / fitZoomRef.current : 1;

  const heatCells = useMemo(() => computeHeatmap(events ?? [], mode), [events, mode]);

  const allDots = useMemo(
    () => buildDotPositions(events ?? [], minMs, maxMs, totalMs, mode, spreadK),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, minMs, maxMs, totalMs, mode, spreadK],
  );

  const { scoreCounts, maxScoreCount } = useMemo(() => {
    const counts = new Map<number, number>();
    for (const ev of events ?? []) if (ev.score != null) counts.set(ev.score, (counts.get(ev.score) ?? 0) + 1);
    return { scoreCounts: counts, maxScoreCount: Math.max(...counts.values(), 1) };
  }, [events]);

  const containerW = vpWRef.current;
  const visLeft  = (-panX / cssZoom) - 400 / cssZoom;
  const visRight = (-panX + containerW) / cssZoom + 400 / cssZoom;

  const visibleDots   = useMemo(() => allDots.filter(d => d.x >= visLeft && d.x <= visRight), [allDots, visLeft, visRight]);
  const nebulaBlobs   = useMemo(() => computeNebula(allDots), [allDots]);
  const visibleNebula = useMemo(() => nebulaBlobs.filter(b => b.x >= visLeft - 100 && b.x <= visRight + 100), [nebulaBlobs, visLeft, visRight]);
  const gapMarkers    = useMemo(() => mode === "release" ? computeGaps(events ?? [], totalMs, minMs) : [], [events, mode, totalMs, minMs]);
  const ticks         = useMemo(() => {
    if (!totalMs) return [];
    return mode === "release"
      ? computeReleaseTicks(effectiveZoom, minMs, maxMs, totalMs)
      : computeListenedTicks(effectiveZoom, minMs, maxMs, totalMs);
  }, [effectiveZoom, minMs, maxMs, totalMs, mode]);

  const artistDots = useMemo(() => hoveredDotPos
    ? allDots.filter(d => d.ev.album.artist === hoveredDotPos.ev.album.artist && `${d.ev.album.id}-${d.ev.date}` !== `${hoveredDotPos.ev.album.id}-${hoveredDotPos.ev.date}`)
    : [], [hoveredDotPos, allDots]);

  const hasMajor = ticks.some(t => t.isMajor);

  function isPeriodMatch(ev: TimelineEvent, period: string): boolean {
    if (mode === "release") { const y = parseYear(ev.album.release_date); return y != null && String(Math.floor(y/10)*10) === period; }
    return ev.date.startsWith(period);
  }

  const handleSelect = useCallback((ev: TimelineEvent) => {
    setTooltip(null);
    setSelected({ id: ev.album.id, title: ev.album.title, artist: ev.album.artist_display ?? ev.album.artist, cover_url: ev.album.cover_url ?? undefined, genre: ev.album.genre ?? undefined, ratings: [] } as AlbumWithRatings);
  }, []);

  // coverSize is now score-aware — each dot uses its own score
  const getCoverSize = useCallback((score: number | null) => coverSize(effectiveZoom, mode, score), [effectiveZoom, mode]);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, backgroundColor:"var(--bg)", display:"flex", flexDirection:"column", animation:"cvIn .2s ease-out" }}>
      <style>{`
        @keyframes cvIn       { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes cvAxis     { from { transform:scaleX(0); } to { transform:scaleX(1); } }
        @keyframes starAppear { from { opacity:0; transform:translate(-50%,-50%) scale(0.25); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 18px", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
        <div style={{ flex:1 }}>
          <p style={{ color:"var(--text-muted)", fontSize:10, fontWeight:600, letterSpacing:"0.08em" }}>청음 연대기</p>
          <p style={{ color:"var(--text-sub)", fontSize:12 }}>{events ? `${events.length}개의 기록` : "불러오는 중…"}</p>
        </div>
        <div style={{ display:"flex", borderRadius:7, overflow:"hidden", border:"1px solid var(--border)" }}>
          {(["release","listened"] as ViewMode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setSelectedPeriod(null); }} style={{ padding:"4px 10px", fontSize:10, fontWeight:600, background: mode===m ? "var(--bg-elevated)" : "none", color: mode===m ? "var(--text)" : "var(--text-muted)", border:"none", cursor:"pointer", fontFamily:"inherit", borderRight: m==="release" ? "1px solid var(--border)" : "none", transition:"background 0.15s ease, color 0.15s ease" }}>
              {m === "release" ? "발매순" : "청음순"}
            </button>
          ))}
        </div>
        {cssZoom > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            {isZoomed && <button onClick={resetZoom} style={{ fontSize:9, color:"var(--text-muted)", background:"none", border:"1px solid var(--border)", borderRadius:4, padding:"3px 8px", cursor:"pointer", fontFamily:"inherit" }}>전체보기</button>}
            <button onClick={() => zoomStep(1/1.6)} style={{ width:24, height:24, borderRadius:5, fontSize:16, backgroundColor:"var(--bg-elevated)", border:"1px solid var(--border)", color:"var(--text-muted)", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
            <button onClick={() => zoomStep(1.6)} style={{ width:24, height:24, borderRadius:5, fontSize:16, backgroundColor:"var(--bg-elevated)", border:"1px solid var(--border)", color:"var(--text-muted)", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
          </div>
        )}
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:20, lineHeight:1, padding:"0 2px" }}>×</button>
      </div>

      {/* Heatmap */}
      {events && events.length > 0 && (
        <HeatmapStrip events={events} mode={mode} cells={heatCells} selected={selectedPeriod} onSelect={k => setSelectedPeriod(prev => prev===k ? null : k)} />
      )}

      {/* Galaxy */}
      <div ref={wrapRef} style={{ flex:1, overflow:"hidden", position:"relative", display:"flex" }}>
        {!events && !fetchErr && <div style={{ display:"flex", justifyContent:"center", alignItems:"center", flex:1 }}><Spinner /></div>}
        {fetchErr && <p style={{ margin:"auto", color:"var(--text-muted)", fontSize:13 }}>불러오지 못했어요</p>}
        {events?.length === 0 && <p style={{ margin:"auto", color:"var(--text-muted)", fontSize:13 }}>아직 기록이 없어요</p>}

        {events && events.length > 0 && (
          <>
            {/* Score legend — fixed, not positional */}
            <ScoreLegend scoreCounts={scoreCounts} maxCount={maxScoreCount} />

            {/* Canvas viewport */}
            <div ref={vpRef} onMouseDown={onDragStart}
              onClickCapture={e => { if (dragMoved.current) e.stopPropagation(); }}
              style={{ flex:1, overflow:"hidden", position:"relative", cursor: isDragging ? "grabbing" : "grab", userSelect:"none", touchAction:"none" }}>

              {/* CSS transform canvas */}
              <div style={{ position:"absolute", left:0, top:0, width:CANVAS_W, height:CANVAS_H,
                            transformOrigin:"0 0", transform:`translate(${panX}px,${panY}px) scale(${cssZoom})` }}>

                {/* Subtle center-line (horizon) */}
                <div style={{ position:"absolute", left:0, top:CANVAS_CY, width:"100%", height:1,
                              background:"linear-gradient(to right, transparent, var(--border) 5%, var(--border) 95%, transparent)",
                              opacity:.08, pointerEvents:"none",
                              transformOrigin:"left center", transform:"scaleX(0)",
                              animation: axisDrawn ? "cvAxis .65s cubic-bezier(0.22,1,0.36,1) forwards" : "none" }} />

                {/* X ticks */}
                {ticks.map((tk, i) => (
                  <div key={i}>
                    <div style={{ position:"absolute", left:tk.x, top: 20+(tk.isMajor ? 0 : 12), transform:"translateX(-50%)", fontSize: tk.isMajor ? 10 : 8, fontWeight: tk.isMajor ? 700 : 400, color: tk.isMajor ? "var(--text-sub)" : "var(--text-muted)", opacity: tk.isMajor ? 0.7 : 0.38, whiteSpace:"nowrap", pointerEvents:"none" }}>{tk.label}</div>
                    <div style={{ position:"absolute", left:tk.x, top: 20+(hasMajor ? 28 : 16), width:1, height: tk.isMajor ? 14 : 7, backgroundColor:"var(--border)", opacity: tk.isMajor ? 0.45 : 0.18, pointerEvents:"none" }} />
                  </div>
                ))}

                {/* Nebula */}
                {visibleNebula.map((blob,i) => (
                  <div key={`neb-${i}`} style={{ position:"absolute", left:blob.x-55, top:blob.y-55, width:110, height:110, borderRadius:"50%", background:`radial-gradient(circle, rgba(255,255,255,${(blob.intensity*0.07).toFixed(4)}) 0%, transparent 68%)`, filter:"blur(10px)", pointerEvents:"none", zIndex:0 }} />
                ))}

                {/* Time gaps */}
                {gapMarkers.map((g,i) => (
                  <div key={`gap-${i}`} style={{ position:"absolute", left:g.x, top:CANVAS_CY, transform:"translate(-50%, -50%)", fontSize:8, color:"var(--text-muted)", opacity:.14, pointerEvents:"none", whiteSpace:"nowrap", letterSpacing:"0.1em", fontStyle:"italic" }}>{g.label}</div>
                ))}

                {/* Constellation lines */}
                {hoveredDotPos && artistDots.length > 0 && (
                  <svg style={{ position:"absolute", inset:0, width:"100%", height:CANVAS_H, pointerEvents:"none", zIndex:14, overflow:"visible" }}>
                    {artistDots.map((d,i) => (
                      <g key={i}>
                        <line x1={hoveredDotPos.x} y1={hoveredDotPos.y} x2={d.x} y2={d.y} stroke="rgba(255,255,255,0.14)" strokeWidth={0.7} strokeDasharray="4 5" />
                        <circle cx={d.x} cy={d.y} r={dotRadius(d.ev.score)+3} fill="none" stroke={d.ev.score != null ? scoreColor(d.ev.score) : "rgba(255,255,255,0.3)"} strokeWidth={1} opacity={0.4} />
                      </g>
                    ))}
                  </svg>
                )}

                {/* Dots — each uses its own score for cover size threshold */}
                {visibleDots.map(pos => (
                  <GalaxyDot key={`${pos.ev.album.id}-${pos.ev.date}`} pos={pos}
                    cs={getCoverSize(pos.ev.score ?? null)}
                    dimmed={selectedPeriod != null && !isPeriodMatch(pos.ev, selectedPeriod)}
                    animated={animated}
                    onSelect={handleSelect}
                    onTipEnter={(p,mx,my) => { setTooltip({ ev:p.ev, mx, my }); setHoveredDotPos(p); }}
                    onTipLeave={() => { setTooltip(null); setHoveredDotPos(null); }} />
                ))}
              </div>
            </div>

            {/* Edge fades */}
            <div style={{ position:"absolute", top:0, bottom:0, left:AXIS_W, width:32, background:"linear-gradient(to right, var(--bg), transparent)", pointerEvents:"none", zIndex:8 }} />
            <div style={{ position:"absolute", top:0, bottom:0, right:0, width:32, background:"linear-gradient(to left, var(--bg), transparent)", pointerEvents:"none", zIndex:8 }} />

            {!isZoomed && (
              <p style={{ position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)", fontSize:9, color:"var(--text-muted)", opacity:.25, pointerEvents:"none", zIndex:5, whiteSpace:"nowrap" }}>
                스크롤 이동 · 핀치·Ctrl+휠 확대 · 드래그 패닝
              </p>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {tooltip && <Tooltip key={`${tooltip.ev.album.id}-${tooltip.ev.date}`} ev={tooltip.ev} mx={tooltip.mx} my={tooltip.my} />}
      </AnimatePresence>
      {selected && <AlbumModal album={selected} onClose={() => setSelected(null)} source="timeline" />}
    </div>
  );
}
