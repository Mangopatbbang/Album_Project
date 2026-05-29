"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePinch } from "@use-gesture/react";
import { scoreColor } from "@/lib/score";
import AlbumModal from "@/components/album/AlbumModal";
import Spinner from "@/components/ui/Spinner";
import type { TimelineEvent } from "@/app/api/profile/[userId]/timeline/route";
import type { AlbumWithRatings } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Zoom = "sm" | "md" | "lg";
type Filter =
  | { type: "score"; min: number }
  | { type: "genre"; value: string };

const COVER: Record<Zoom, number> = { sm: 32, md: 48, lg: 64 };
const GAP:   Record<Zoom, number> = { sm: 4,  md: 10, lg: 18 };
const MM_W = 46; // minimap width

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matches(ev: TimelineEvent, f: Filter | null): boolean {
  if (!f) return true;
  if (f.type === "score")  return (ev.score ?? 0) >= f.min;
  if (f.type === "genre")  return ev.album.genre === f.value;
  return true;
}

// ─── TimelineViewer ───────────────────────────────────────────────────────────

export default function TimelineViewer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [events, setEvents]       = useState<TimelineEvent[] | null>(null);
  const [err, setErr]             = useState(false);
  const [zoom, setZoom]           = useState<Zoom>("md");
  const [filter, setFilter]       = useState<Filter | null>(null);
  const [period, setPeriod]       = useState("");          // ① sticky label
  const [vp, setVp]               = useState({ top: 0, size: 1 }); // minimap viewport
  const [selected, setSelected]   = useState<AlbumWithRatings | null>(null);

  const scrollRef  = useRef<HTMLDivElement>(null);
  const yearRefMap = useRef<Map<string, HTMLDivElement>>(new Map());

  /* fetch */
  useEffect(() => {
    fetch(`/api/profile/${userId}/timeline`)
      .then(r => r.json())
      .then(d => setEvents(d.events ?? []))
      .catch(() => setErr(true));
  }, [userId]);

  /* ESC + body lock */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", fn); document.body.style.overflow = ""; };
  }, [onClose]);

  /* scroll → ① sticky period + minimap vp */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !events?.length) return;
    const fn = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const ratio = scrollTop / (scrollHeight - clientHeight || 1);
      const idx   = Math.min(Math.floor(ratio * events.length), events.length - 1);
      const ev    = events[idx];
      setPeriod(`${ev.date.slice(0, 4)} · ${parseInt(ev.date.slice(5, 7))}월`);
      setVp({ top: scrollTop / scrollHeight, size: clientHeight / scrollHeight });
    };
    el.addEventListener("scroll", fn, { passive: true });
    fn();
    return () => el.removeEventListener("scroll", fn);
  }, [events]);

  /* computed */
  const topGenres = useMemo(() => {
    if (!events) return [];
    const gc = new Map<string, number>();
    for (const e of events) if (e.album.genre) gc.set(e.album.genre, (gc.get(e.album.genre) ?? 0) + 1);
    return [...gc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g]) => g);
  }, [events]);

  const yearPositions = useMemo(() => {
    if (!events?.length) return [] as { year: string; index: number }[];
    const result: { year: string; index: number }[] = [];
    let last = "";
    events.forEach((ev, i) => { const y = ev.date.slice(0, 4); if (y !== last) { result.push({ year: y, index: i }); last = y; } });
    return result;
  }, [events]);

  /* actions */
  const zoomIn  = useCallback(() => setZoom(z => z === "sm" ? "md" : "lg"), []);
  const zoomOut = useCallback(() => setZoom(z => z === "lg" ? "md" : "sm"), []);

  /* ③ jump to year */
  const jumpYear = useCallback((year: string) => {
    const el = yearRefMap.current.get(year);
    if (el && scrollRef.current) scrollRef.current.scrollTo({ top: el.offsetTop - 52, behavior: "smooth" });
  }, []);

  /* ④ minimap click */
  const jumpRatio = useCallback((r: number) => {
    if (scrollRef.current) scrollRef.current.scrollTop = r * scrollRef.current.scrollHeight;
  }, []);

  /* pinch → zoom level */
  const bind = usePinch(
    ({ offset: [s], last }) => {
      if (!last) return;
      if (s > 1.35) setZoom("lg");
      else if (s < 0.65) setZoom("sm");
      else setZoom("md");
    },
    { from: [1, 0], eventOptions: { passive: false } },
  );

  const handleSelect = useCallback((ev: TimelineEvent) => {
    setSelected({
      id: ev.album.id, title: ev.album.title,
      artist: ev.album.artist_display ?? ev.album.artist,
      cover_url: ev.album.cover_url ?? undefined,
      genre: ev.album.genre ?? undefined, ratings: [],
    } as AlbumWithRatings);
  }, []);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, backgroundColor:"var(--bg)", display:"flex", flexDirection:"column",
      animation:"tvIn 0.24s cubic-bezier(0.25,0.46,0.45,0.94)" }}>
      <style>{`
        @keyframes tvIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .tvc{transition:transform .12s ease,box-shadow .12s ease}
        .tvc:hover{transform:scale(1.08);box-shadow:0 4px 18px rgba(0,0,0,.45)}
        .tvc:active{transform:scale(0.96)}
        .tvfb{transition:background-color .14s,color .14s,border-color .14s}
        .tvfb:hover{border-color:var(--border-light)!important;color:var(--text)!important}
      `}</style>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 20px",
        borderBottom:"1px solid var(--border)", flexShrink:0, paddingRight: MM_W + 20 }}>
        <div style={{ flex:1 }}>
          <p style={{ color:"var(--text-muted)", fontSize:10, fontWeight:600, letterSpacing:"0.08em" }}>청음 연대기</p>
          <p style={{ color:"var(--text-sub)", fontSize:12 }}>
            {events ? `총 ${events.length}개의 기록` : "불러오는 중…"}
          </p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          {(["−","·","·","·","+"] as const).map((_, i) => i === 0 ? (
            <button key="zm" onClick={zoomOut} disabled={zoom==="sm"}
              style={{ width:28, height:28, borderRadius:6, backgroundColor:"var(--bg-elevated)", border:"1px solid var(--border)",
                color:zoom==="sm"?"var(--border-light)":"var(--text-muted)", cursor:zoom==="sm"?"default":"pointer",
                fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" }}>−</button>
          ) : i === 4 ? (
            <button key="zp" onClick={zoomIn} disabled={zoom==="lg"}
              style={{ width:28, height:28, borderRadius:6, backgroundColor:"var(--bg-elevated)", border:"1px solid var(--border)",
                color:zoom==="lg"?"var(--border-light)":"var(--text-muted)", cursor:zoom==="lg"?"default":"pointer",
                fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" }}>+</button>
          ) : (
            <div key={i} style={{ width:i===2?8:5, height:i===2?8:5, borderRadius:"50%",
              backgroundColor:(i===1&&zoom==="sm")||(i===2&&zoom==="md")||(i===3&&zoom==="lg")?"var(--accent)":"var(--border-light)",
              transition:"all 0.2s" }} />
          ))}
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:22, lineHeight:1, padding:"0 2px" }}>×</button>
      </div>

      {/* ── ⑤ Filter bar ── */}
      {events && <FilterBar filter={filter} topGenres={topGenres} onChange={setFilter} />}

      {/* ── Content ── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", position:"relative" }}>

        {/* Scroll area */}
        <div ref={scrollRef} {...bind()}
          style={{ flex:1, overflowY:"auto", touchAction:"pan-y", overscrollBehavior:"contain", paddingRight: MM_W }}>

          {!events && !err && <div style={{ display:"flex", justifyContent:"center", paddingTop:80 }}><Spinner /></div>}
          {err && <div style={{ display:"flex", justifyContent:"center", paddingTop:80 }}><p style={{ color:"var(--text-muted)", fontSize:13 }}>불러오지 못했어요</p></div>}

          {events && (
            <>
              {/* ① sticky period pill */}
              <div style={{ position:"sticky", top:0, zIndex:20, height:0, textAlign:"center", pointerEvents:"none" }}>
                <AnimatePresence mode="wait">
                  {period && (
                    <motion.span key={period}
                      initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}
                      transition={{ duration:0.18 }}
                      style={{ display:"inline-block", marginTop:10,
                        backgroundColor:"var(--bg-elevated)", border:"1px solid var(--border)",
                        borderRadius:20, padding:"4px 12px",
                        fontSize:11, fontWeight:700, color:"var(--text-sub)", letterSpacing:"0.03em" }}>
                      {period}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Timeline list */}
              <div style={{ padding:"20px 20px 60px", position:"relative" }}>
                {/* spine */}
                <div style={{ position:"absolute", left:43, top:20, bottom:60, width:1,
                  background:"linear-gradient(to bottom,transparent,var(--border) 30px,var(--border) calc(100% - 30px),transparent)" }} />

                <div style={{ display:"flex", flexDirection:"column", gap: GAP[zoom] }}>
                  {events.map((ev, i) => {
                    const yr = ev.date.slice(0, 4);
                    const isYearStart = i === 0 || yr !== events[i-1].date.slice(0, 4);
                    const dimmed = !matches(ev, filter);
                    return (
                      <div key={`${ev.type}-${ev.album.id}-${ev.date}-${i}`}>
                        {/* ② year tick */}
                        {isYearStart && (
                          <YearTick year={yr}
                            refCb={el => { if (el) yearRefMap.current.set(yr, el); }} />
                        )}
                        <Item ev={ev} zoom={zoom} dimmed={dimmed} onSelect={handleSelect} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ③④ Minimap */}
        {events && events.length > 0 && (
          <Minimap events={events} yearPositions={yearPositions} vp={vp}
            filter={filter} onJump={jumpRatio} onYearClick={jumpYear} />
        )}
      </div>

      {selected && <AlbumModal album={selected} onClose={() => setSelected(null)} source="timeline" />}
    </div>
  );
}

// ─── ② YearTick ───────────────────────────────────────────────────────────────

function YearTick({ year, refCb }: { year: string; refCb: (el: HTMLDivElement | null) => void }) {
  return (
    <div ref={refCb} style={{ display:"flex", alignItems:"center", margin:"10px 0 4px", position:"relative" }}>
      <div style={{ width:48, flexShrink:0, display:"flex", justifyContent:"flex-end", paddingRight:1 }}>
        <div style={{ width:13, height:13, borderRadius:"50%", backgroundColor:"var(--bg-card)",
          border:"1px solid var(--border-light)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ width:5, height:5, borderRadius:"50%", backgroundColor:"var(--text-muted)" }} />
        </div>
      </div>
      <span style={{ fontSize:14, fontWeight:800, color:"var(--text-sub)",
        fontFamily:"var(--font-playfair, Georgia, serif)", letterSpacing:"-0.02em", marginLeft:14 }}>
        {year}
      </span>
    </div>
  );
}

// ─── Item ─────────────────────────────────────────────────────────────────────

function Item({ ev, zoom, dimmed, onSelect }:
  { ev: TimelineEvent; zoom: Zoom; dimmed: boolean; onSelect: (e: TimelineEvent) => void }) {
  const size = COVER[zoom];
  const dot  = ev.score != null ? scoreColor(ev.score) : "var(--border)";

  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative",
      opacity: dimmed ? 0.15 : 1, filter: dimmed ? "saturate(0)" : "none", transition:"opacity .2s,filter .2s" }}>

      {/* spine dot */}
      <div style={{ width:48, flexShrink:0, display:"flex", justifyContent:"flex-end", alignItems:"center", paddingRight:3 }}>
        <div style={{ width:9, height:9, borderRadius:"50%", backgroundColor:dot,
          border:"2px solid var(--bg)", boxShadow:`0 0 0 1px ${dot}55`, flexShrink:0 }} />
      </div>

      {/* cover */}
      <button onClick={() => onSelect(ev)} className="tvc"
        style={{ flexShrink:0, width:size, height:size, borderRadius:zoom==="lg"?8:5,
          overflow:"hidden", backgroundColor:"var(--bg-elevated)", border:"1px solid var(--border)", padding:0, cursor:"pointer" }}>
        {ev.album.cover_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={ev.album.cover_url} alt={ev.album.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center",
              color:"var(--text-muted)", fontSize:Math.floor(size*.38) }}>♪</div>
        }
      </button>

      {/* info (md/lg) */}
      {zoom !== "sm" && (
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ color:"var(--text)", fontSize:zoom==="lg"?14:12, fontWeight:600,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", lineHeight:1.3 }}>{ev.album.title}</p>
          <p style={{ color:"var(--text-muted)", fontSize:11, marginTop:2,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {ev.album.artist_display ?? ev.album.artist}
          </p>
          {zoom === "lg" && ev.review && (
            <p style={{ color:"var(--text-sub)", fontSize:11, marginTop:5, fontStyle:"italic", lineHeight:1.5,
              overflow:"hidden", textOverflow:"ellipsis",
              display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
              "{ev.review}"
            </p>
          )}
        </div>
      )}

      {/* score + date */}
      <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2, minWidth:zoom==="sm"?28:40 }}>
        {ev.score != null && (
          <span style={{ fontSize:zoom==="sm"?11:15, fontWeight:800, color:scoreColor(ev.score), lineHeight:1 }}>{ev.score}</span>
        )}
        {ev.type === "diary" && <span style={{ fontSize:11, color:"var(--text-muted)", lineHeight:1 }}>✎</span>}
        <span style={{ fontSize:zoom==="sm"?9:10, color:"var(--text-muted)", opacity:.55,
          fontFamily:"var(--font-mono, ui-monospace, monospace)", lineHeight:1 }}>
          {ev.date.slice(5).replace("-","/")}
        </span>
      </div>
    </div>
  );
}

// ─── ③④ Minimap ───────────────────────────────────────────────────────────────

function Minimap({ events, yearPositions, vp, filter, onJump, onYearClick }:
  { events: TimelineEvent[]; yearPositions: { year:string; index:number }[];
    vp: { top:number; size:number }; filter: Filter | null;
    onJump: (r:number)=>void; onYearClick: (y:string)=>void }) {

  const mmRef = useRef<HTMLDivElement>(null);
  const n = events.length;

  const handleClick = (e: React.MouseEvent) => {
    const r = mmRef.current!;
    onJump((e.clientY - r.getBoundingClientRect().top) / r.clientHeight);
  };

  return (
    <div ref={mmRef} onClick={handleClick}
      style={{ width:MM_W, flexShrink:0, borderLeft:"1px solid var(--border)",
        backgroundColor:"var(--bg)", position:"relative", cursor:"pointer", overflow:"hidden" }}>

      {/* event dots */}
      {events.map((ev, i) => {
        const top = (i / n) * 100;
        const ok  = matches(ev, filter);
        const c   = ev.score != null ? scoreColor(ev.score) : "var(--border-light)";
        return (
          <div key={i} style={{ position:"absolute", top:`${top}%`, left:"50%",
            transform:"translate(-50%,-50%)", width:3, height:3, borderRadius:"50%",
            backgroundColor: ok ? c : "var(--border)", opacity: ok ? 0.75 : 0.1 }} />
        );
      })}

      {/* year labels */}
      {yearPositions.map(({ year, index }) => (
        <div key={year}
          onClick={e => { e.stopPropagation(); onYearClick(year); }}
          style={{ position:"absolute", top:`${(index/n)*100}%`, left:0, right:0,
            display:"flex", justifyContent:"center", pointerEvents:"auto", zIndex:2 }}>
          <span style={{ fontSize:8, fontWeight:800, color:"var(--text-muted)",
            backgroundColor:"var(--bg)", padding:"1px 2px", lineHeight:1.4, letterSpacing:"0.01em" }}>
            {year}
          </span>
        </div>
      ))}

      {/* viewport indicator */}
      <div style={{ position:"absolute", top:`${vp.top*100}%`, left:0, right:0,
        height:`${Math.max(vp.size*100, 2)}%`,
        backgroundColor:"rgba(255,255,255,0.07)",
        borderTop:"1px solid var(--border-light)", borderBottom:"1px solid var(--border-light)",
        pointerEvents:"none", transition:"top .08s linear,height .08s linear" }} />
    </div>
  );
}

// ─── ⑤ FilterBar ──────────────────────────────────────────────────────────────

const SCORE_FILTERS = [
  { label:"8점",   f: { type:"score", min:8 } as Filter },
  { label:"7점+",  f: { type:"score", min:7 } as Filter },
  { label:"6점+",  f: { type:"score", min:6 } as Filter },
];

function FilterBar({ filter, topGenres, onChange }:
  { filter:Filter|null; topGenres:string[]; onChange:(f:Filter|null)=>void }) {

  const isActive = (f: Filter): boolean => {
    if (!filter) return false;
    if (filter.type === "score" && f.type === "score") return filter.min === f.min;
    if (filter.type === "genre" && f.type === "genre") return filter.value === f.value;
    return false;
  };

  const toggle = (f: Filter) => onChange(isActive(f) ? null : f);

  const btn = (label: string, f: Filter | null, active: boolean) => (
    <button key={label} className="tvfb" onClick={() => f ? toggle(f) : onChange(null)}
      style={{ background: active?"var(--accent)":"none",
        color: active?"var(--bg)":"var(--text-muted)",
        border:`1px solid ${active?"var(--accent)":"var(--border)"}`,
        borderRadius:20, padding:"4px 10px", fontSize:11, fontWeight:600,
        cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", flexShrink:0 }}>
      {label}
    </button>
  );

  return (
    <div style={{ display:"flex", gap:6, alignItems:"center", padding:"8px 20px",
      paddingRight: MM_W + 20, borderBottom:"1px solid var(--border)",
      overflowX:"auto", scrollbarWidth:"none", flexShrink:0 }}>
      {btn("전체", null, !filter)}
      {SCORE_FILTERS.map(({ label, f }) => btn(label, f, isActive(f)))}
      {topGenres.length > 0 && <div style={{ width:1, height:14, backgroundColor:"var(--border)", flexShrink:0 }} />}
      {topGenres.map(g => btn(g, { type:"genre", value:g }, isActive({ type:"genre", value:g })))}
    </div>
  );
}
