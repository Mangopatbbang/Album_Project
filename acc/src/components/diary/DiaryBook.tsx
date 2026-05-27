"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import { DiaryEntry } from "@/types/diary";
import { useDiaryTheme } from "@/components/diary/DiaryThemeProvider";
import RecordsTab from "./tabs/RecordsTab";
import CalendarTab from "./tabs/CalendarTab";
import AlbumsTab from "./tabs/AlbumsTab";
import StatsTab from "./tabs/StatsTab";

type Tab = "records" | "calendar" | "albums" | "stats";

const TABS: { id: Tab; label: string }[] = [
  { id: "records", label: "기록" },
  { id: "calendar", label: "캘린더" },
  { id: "albums", label: "앨범별" },
  { id: "stats", label: "통계" },
];

const TAB_IDX: Record<Tab, number> = { records: 0, calendar: 1, albums: 2, stats: 3 };

type Props = {
  displayEntries: DiaryEntry[];
  loading: boolean;
  isSample: boolean;
  onEdit: (entry: DiaryEntry) => void;
  onDelete: (id: string) => Promise<void>;
  onNewEntry: () => void;
};

const noise =
  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'140\' height=\'140\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.72\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'140\' height=\'140\' filter=\'url(%23n)\' opacity=\'0.28\'/%3E%3C/svg%3E")';

const INK = "rgba(var(--diary-ink-rgb), 0.3)";
const corners: React.CSSProperties[] = [
  { top: 16, left: 16, borderTop: `1px solid ${INK}`, borderLeft: `1px solid ${INK}` },
  { top: 16, right: 16, borderTop: `1px solid ${INK}`, borderRight: `1px solid ${INK}` },
  { bottom: 16, left: 16, borderBottom: `1px solid ${INK}`, borderLeft: `1px solid ${INK}` },
  { bottom: 16, right: 16, borderBottom: `1px solid ${INK}`, borderRight: `1px solid ${INK}` },
];

const STITCH_POS = [8, 22, 38, 54, 70, 84, 94];

/* 멀티스트립 책 커버 — 각 조각이 다른 각도로 회전해 실제 종이 곡률 재현 */
const STRIP_N = 5;
// 출발: 우측 패널, 바깥(i=4) 선행 → 모두 -90°(엣지온) 정지
const DEPART_KF = Array.from({ length: STRIP_N }, (_, i) => {
  const mid = (-52 - (i / (STRIP_N - 1)) * 14).toFixed(1);
  return `@keyframes csd${i}{0%{transform:rotateY(0deg);}42%{transform:rotateY(${mid}deg);}100%{transform:rotateY(-90deg);}}`;
}).join("");
// 착지: 좌측 패널, 척추(j=0) 선착 → 바깥(j=4) 나중, 바운스 후 페이드아웃
const ARRIVE_KF = Array.from({ length: STRIP_N }, (_, j) => {
  const b = (4.5 + j * 1.6).toFixed(1);
  const sb = (parseFloat(b) * 0.3).toFixed(1);
  return `@keyframes csa${j}{0%{transform:rotateY(90deg);opacity:0;}14%{opacity:1;}56%{transform:rotateY(-${b}deg);opacity:1;}73%{transform:rotateY(${sb}deg);opacity:1;}84%{transform:rotateY(0deg);opacity:1;}100%{transform:rotateY(0deg);opacity:0;}}`;
}).join("");
// 탭 역방향: 새 내용이 왼쪽 엣지에서 오른쪽으로 펼쳐짐 (-90°→0°, 바운스 없음)
const PAGE_BWD_KF = Array.from({ length: STRIP_N }, (_, i) => {
  return `@keyframes pgb${i}{0%{transform:rotateY(-90deg);}100%{transform:rotateY(0deg);}}`;
}).join("");

let _audioCtx: AudioContext | null = null;
function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === "closed") {
    _audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  const ctx = _audioCtx;
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/* 탭 넘기기 — 얇고 바삭한 종이 소리 */
function playPageSound() {
  try {
    const ctx = getAudioCtx();
    const dur = 0.18;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      d[i] = (b0 + b1 + b2 + w * 0.5362) * 0.11;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 2800; bp.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.45, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
    src.start();
  } catch (_) {}
}

/* 표지 착지 — 두껍고 묵직한 충격음 */
function playCoverThud() {
  try {
    const ctx = getAudioCtx();
    const dur = 0.32;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      d[i] = (b0 + b1 + b2 + w * 0.5362) * 0.14;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    /* 저역 강조 필터 — 두꺼운 표지감 */
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 700; lp.Q.value = 0.8;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 320; bp.Q.value = 1.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(lp); lp.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
    src.start();
  } catch (_) {}
}

export default function DiaryBook({ displayEntries, loading, isSample, onEdit, onDelete, onNewEntry }: Props) {
  const { theme } = useDiaryTheme();
  const [activeTab, setActiveTab] = useState<Tab>("records");
  const [flippingFrom, setFlippingFrom] = useState<Tab | null>(null);
  const [flipDir, setFlipDir] = useState<1 | -1>(1);
  const [coverOpen, setCoverOpen] = useState(false);
  const [coverFlipped, setCoverFlipped] = useState(false);
  const [coverDone, setCoverDone] = useState(false);
  const flipQueueRef = useRef<Array<{ from: Tab; to: Tab; dir: 1 | -1 }>>([]);
  const pageContentRef = useRef<HTMLDivElement>(null);
  const [flipSnap, setFlipSnap] = useState<string | null>(null);

  const [cornerHover, setCornerHover] = useState(false);
  const [snapBackPhase, setSnapBackPhase] = useState<"from" | "to" | null>(null);
  const snapBackFromRatioRef = useRef<number>(0);

  const leftTabIdx = TAB_IDX[activeTab] - 1;
  const leftPageTab: Tab | null = leftTabIdx >= 0
    ? ((Object.keys(TAB_IDX) as Tab[]).find((k) => TAB_IDX[k as Tab] === leftTabIdx) ?? null)
    : null;
  const nextTabId: Tab | null = TAB_IDX[activeTab] < TABS.length - 1
    ? TABS[TAB_IDX[activeTab] + 1].id
    : null;
  const prevTabId: Tab | null = TAB_IDX[activeTab] > 0
    ? TABS[TAB_IDX[activeTab] - 1].id
    : null;
  const aheadRatio = (TABS.length - 1 - TAB_IDX[activeTab]) / (TABS.length - 1);
  const toRoman = (n: number) => (["I","II","III","IV","V","VI","VII","VIII"] as const)[n - 1] ?? String(n);

  const hanji = theme === "light"
    ? "linear-gradient(160deg, #fefefe 0%, #fdfcfa 55%, #f9f8f3 100%)"
    : "linear-gradient(160deg, var(--diary-page-from) 0%, var(--diary-page-mid) 55%, var(--diary-page-to) 100%)";

  const noiseOpacity = theme === "light" ? 0.09 : 0.13;

  const frameBg = theme === "light"
    ? "radial-gradient(ellipse 90% 70% at 50% 50%, #f2ede6 0%, #e8e2da 100%)"
    : "radial-gradient(ellipse 90% 70% at 50% 50%, #2c241a 0%, #1c1610 100%)";

  const spineBg = theme === "light"
    ? "linear-gradient(90deg, #8a7a6a 0%, #aa9888 38%, #9a8878 62%, #8a7a6a 100%)"
    : "linear-gradient(90deg, #1a1410 0%, #302618 38%, #281e14 62%, #1a1410 100%)";

  const bookShadow = theme === "light"
    ? "0 20px 48px rgba(0,0,0,0.22), 0 8px 20px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)"
    : "0 40px 80px rgba(0,0,0,0.9), 0 12px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.5)";

  /* 표지 착지 — 출발 완료 시 묵직한 충격음 */
  useEffect(() => {
    if (!coverFlipped) return;
    const t = setTimeout(playCoverThud, 60);
    return () => clearTimeout(t);
  }, [coverFlipped]);

  /* 모바일 스와이프 */
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  /* 드래그 플립 */
  const [dragX, setDragX] = useState<number | null>(null);
  const dragStartX = useRef<number | null>(null);
  const dragPageW = useRef<number>(460);

  /* 플립 완료 후 다음 큐 처리 */
  useEffect(() => {
    if (flippingFrom === null) return;
    const t = setTimeout(() => {
      setFlippingFrom(null);
      setFlipSnap(null);
      const queue = flipQueueRef.current;

      if (queue.length > 0) {
        const [next, ...rest] = queue;
        flipQueueRef.current = rest;
        setTimeout(() => {
          playPageSound();
          setFlipDir(next.dir);
          setFlippingFrom(next.from);
          setActiveTab(next.to);
        }, 50);
      }
    }, 580);
    return () => clearTimeout(t);
  }, [flippingFrom]);

  const monthCount = useMemo(() => {
    if (isSample) return 0;
    const prefix = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 7);
    return displayEntries.filter((e) => e.listened_at.startsWith(prefix)).length;
  }, [displayEntries, isSample]);

  const streak = useMemo(() => {
    if (isSample || displayEntries.length === 0) return 0;
    const dates = [...new Set(displayEntries.map((e) => e.listened_at))].sort().reverse();
    const kst = new Date(Date.now() + 9 * 3600000);
    const today = kst.toISOString().slice(0, 10);
    const yesterday = new Date(kst.getTime() - 86400000).toISOString().slice(0, 10);
    if (dates[0] !== today && dates[0] !== yesterday) return 0;
    let s = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1] + "T00:00:00");
      const curr = new Date(dates[i] + "T00:00:00");
      if (Math.round((prev.getTime() - curr.getTime()) / 86400000) === 1) s++;
      else break;
    }
    return s;
  }, [displayEntries, isSample]);

  const handleTabClick = useCallback(async (tab: Tab, preSnap?: string | null) => {
    if (tab === activeTab || flippingFrom !== null) return;
    const fromIdx = TAB_IDX[activeTab];
    const toIdx = TAB_IDX[tab];
    const dir: 1 | -1 = toIdx > fromIdx ? 1 : -1;
    const steps: Array<{ from: Tab; to: Tab; dir: 1 | -1 }> = [];
    for (let i = fromIdx + dir; dir > 0 ? i <= toIdx : i >= toIdx; i += dir) {
      const prev = steps.length > 0 ? steps[steps.length - 1].to : activeTab;
      const next = (Object.keys(TAB_IDX) as Tab[]).find(k => TAB_IDX[k] === i)!;
      steps.push({ from: prev, to: next, dir });
    }
    const [first, ...rest] = steps;
    flipQueueRef.current = rest;

    /* 앞방향 플립: preSnap 있으면 재사용, 없으면 새로 찍기 */
    let snap: string | null = preSnap ?? null;
    if (!snap && dir === 1 && pageContentRef.current) {
      try {
        const canvas = await html2canvas(pageContentRef.current, {
          useCORS: true,
          scale: window.devicePixelRatio || 1,
          backgroundColor: null, logging: false,
        });
        snap = canvas.toDataURL("image/webp", 0.85);
      } catch (_) {}
    }
    setFlipSnap(snap);
    playPageSound();
    setFlipDir(first.dir);
    setFlippingFrom(first.from);
    setActiveTab(first.to);
  }, [activeTab, flippingFrom]);

  /* 키보드 내비게이션 — 화살표 좌/우로 탭 이동 */
  useEffect(() => {
    if (!coverDone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleTabClick(TABS[Math.min(TAB_IDX[activeTab] + 1, TABS.length - 1)].id);
      if (e.key === "ArrowLeft")  handleTabClick(TABS[Math.max(TAB_IDX[activeTab] - 1, 0)].id);
      if (e.key === "Escape") {
        setCoverDone(false); setCoverFlipped(false); setCoverOpen(false);
        setActiveTab("records");
        flipQueueRef.current = []; setFlippingFrom(null); setFlipSnap(null); setSnapBackPhase(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [coverDone, activeTab, handleTabClick]);

  /* 드래그 중 window 이벤트 — mousemove/mouseup 글로벌 추적 */
  useEffect(() => {
    if (dragX === null) return;
    const onMove = (e: MouseEvent) => setDragX(e.clientX);
    const onUp = (e: MouseEvent) => {
      const fwdRatio = dragStartX.current !== null
        ? Math.max(0, Math.min(1, (dragStartX.current - e.clientX) / dragPageW.current))
        : 0;
      const bwdRatio = dragStartX.current !== null
        ? Math.max(0, Math.min(1, (e.clientX - dragStartX.current) / dragPageW.current))
        : 0;
      const snap = flipSnap;
      dragStartX.current = null;
      setDragX(null);
      if (fwdRatio > 0.38 && nextTabId) {
        handleTabClick(nextTabId, snap);
      } else if (bwdRatio > 0.38 && prevTabId) {
        setFlipSnap(null);
        handleTabClick(prevTabId);
      } else if (fwdRatio > 0.05) {
        snapBackFromRatioRef.current = fwdRatio;
        setSnapBackPhase("from");
        requestAnimationFrame(() => requestAnimationFrame(() => {
          setSnapBackPhase("to");
          setTimeout(() => { setSnapBackPhase(null); setFlipSnap(null); }, 320);
        }));
      } else {
        setFlipSnap(null);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragX, nextTabId, prevTabId, handleTabClick, flipSnap]);

  const renderContent = (tab: Tab) => {
    switch (tab) {
      case "records":
        return <RecordsTab entries={displayEntries} loading={loading} onEdit={onEdit} onDelete={onDelete} onNewEntry={onNewEntry} isSample={isSample} />;
      case "calendar":
        return <CalendarTab entries={displayEntries} onEdit={onEdit} onDelete={onDelete} isSample={isSample} />;
      case "albums":
        return <AlbumsTab entries={displayEntries} onEdit={onEdit} onDelete={onDelete} isSample={isSample} />;
      case "stats":
        return <StatsTab entries={displayEntries} />;
    }
  };

  return (
    <>
      <style>{`
        ${DEPART_KF}${ARRIVE_KF}${PAGE_BWD_KF}
        @keyframes coverHint {
          0%, 100% { opacity: 0.5; transform: translateY(0px); }
          50% { opacity: 0.85; transform: translateY(4px); }
        }
        @keyframes pageSettle {
          0%   { transform: translateX(-4px) scaleX(1.008); opacity: 0.92; }
          55%  { transform: translateX(1.5px) scaleX(0.999); opacity: 1; }
          78%  { transform: translateX(-0.5px) scaleX(1.001); }
          100% { transform: translateX(0) scaleX(1); opacity: 1; }
        }
        @keyframes dogEarIn {
          0%   { opacity: 0; transform: scaleX(0.4) scaleY(0.4); }
          100% { opacity: 1; transform: scaleX(1) scaleY(1); }
        }
        @keyframes leftFadeIn {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div
        className="sm:pr-[54px]"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "calc(100dvh - 52px)",
          background: frameBg,
          padding: "16px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* 래퍼 — 책 + 리본을 감싸되 리본은 clip 밖에 */}
        <div style={{
          position: "relative",
          height: "100%",
          width: "100%",
          maxWidth: coverOpen ? 920 : 460,
          transition: "max-width 0.52s cubic-bezier(0.32,0.72,0,1)",
        }}>
        <div style={{
          display: "flex",
          height: "100%",
          width: "100%",
          position: "relative",
          boxShadow: bookShadow,
          borderRadius: 10,
          clipPath: "inset(0 round 10px)",
          overflow: "hidden",
        }}>

          {/* ── 왼쪽 페이지 ── */}
          <div
            className="hidden sm:block"
            style={{
              flex: 1,
              minWidth: 0,
              maxWidth: coverOpen ? 440 : 0,
              overflow: "hidden",
              transition: "max-width 0.52s cubic-bezier(0.32,0.72,0,1)",
              background: hanji,
              borderRadius: "10px 0 0 10px",
              border: "1px solid rgba(var(--diary-ink-rgb), 0.15)",
              borderRight: "none",
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", inset: 0, backgroundImage: noise, opacity: noiseOpacity, mixBlendMode: "multiply", pointerEvents: "none" }} />

            {/* 거터 그림자 — 척추 쪽 */}
            <div style={{
              position: "absolute", right: 0, top: 0, bottom: 0, width: 36,
              background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.07))",
              zIndex: 4, pointerEvents: "none",
            }} />

            {/* dog-ear — 좌측 상단 귀접기 (표지 착지 후 등장) */}
            {coverDone && (
              <div
                className="hidden sm:block"
                style={{
                  position: "absolute", top: 0, right: 22,
                  width: 0, height: 0, zIndex: 6, pointerEvents: "none",
                  borderLeft: "16px solid rgba(var(--diary-ink-rgb), 0.13)",
                  borderBottom: "16px solid transparent",
                  animation: "dogEarIn 0.35s ease-out forwards",
                  filter: "drop-shadow(-1px 1px 2px rgba(0,0,0,0.12))",
                }}
              />
            )}

            {/* 착지 후 settle 래퍼 — key 고정으로 coverDone 시 딱 한 번 실행 */}
            <div
              key={coverDone ? "settled" : "waiting"}
              style={{
                position: "absolute", inset: 0,
                animation: coverDone ? "pageSettle 0.6s cubic-bezier(0.34,1.08,0.64,1) forwards" : "none",
                transformOrigin: "right center",
              }}
            >

            <div key={leftPageTab ?? "title"} style={{ position: "absolute", inset: 0, animation: coverDone ? "leftFadeIn 0.32s ease-out forwards" : "none" }}>
            {leftPageTab === null ? (
              // ── 속표지: 청음일기 타이틀 페이지 ──
              <>
                {Array.from({ length: 26 }).map((_, i) => (
                  <div key={i} style={{
                    position: "absolute", left: 32, right: 20,
                    top: `${6 + i * 3.6}%`, height: 1,
                    background: "linear-gradient(90deg, transparent, rgba(var(--diary-ink-rgb), 0.13) 12%, rgba(var(--diary-ink-rgb), 0.13) 88%, transparent)",
                  }} />
                ))}
                <div style={{
                  position: "absolute", left: 58, top: "6%", bottom: "6%", width: 1,
                  background: "linear-gradient(180deg, transparent, rgba(var(--accent-rgb), 0.48) 10%, rgba(var(--accent-rgb), 0.48) 90%, transparent)",
                }} />
                {corners.map((s, i) => (
                  <div key={i} style={{ position: "absolute", width: 16, height: 16, ...s }} />
                ))}
                <div style={{
                  position: "absolute", left: "50%", top: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                }}>
                  <div style={{
                    border: "1px solid rgba(var(--diary-ink-rgb), 0.65)",
                    padding: 5,
                    backgroundColor: "var(--diary-label-bg)",
                    boxShadow: "1px 2px 6px rgba(var(--diary-ink-rgb), 0.18)",
                  }}>
                    <div style={{ border: "1px solid rgba(var(--diary-ink-rgb), 0.45)", padding: "14px 8px" }}>
                      <h1 style={{
                        writingMode: "vertical-rl", textOrientation: "upright",
                        fontFamily: "var(--font-song, 'Nanum Myeongjo', serif)",
                        fontSize: 20, color: "var(--diary-label-text)",
                        letterSpacing: "0.22em", lineHeight: 1, margin: 0, fontWeight: 400,
                      }}>
                        청음일기
                      </h1>
                    </div>
                  </div>
                  <span style={{
                    display: "inline-block",
                    border: "2px solid rgba(var(--accent-rgb), 0.72)",
                    padding: "3px 7px",
                    fontFamily: "var(--font-song, serif)",
                    fontSize: 11, color: "rgba(var(--accent-rgb), 0.72)", letterSpacing: "0.12em",
                  }}>
                    私記
                  </span>

                  {/* 목차 */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, marginTop: 8 }}>
                    <div style={{ width: 28, height: 1, background: "linear-gradient(90deg, transparent, rgba(var(--diary-ink-rgb), 0.2), transparent)", marginBottom: 3 }} />
                    {TABS.map((tab, i) => (
                      <div key={tab.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontFamily: "var(--font-song, serif)", fontSize: 8, color: "rgba(var(--diary-ink-rgb), 0.3)", letterSpacing: "0.06em", minWidth: 14, textAlign: "right" }}>
                          {toRoman(i * 2 + 1)}
                        </span>
                        <span style={{ fontFamily: "var(--font-song, serif)", fontSize: 9, color: "rgba(var(--diary-ink-rgb), 0.48)", letterSpacing: "0.12em" }}>
                          {tab.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {!isSample && (monthCount > 0 || streak > 0) && (
                    <div style={{ marginTop: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 32, height: 1, background: "linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.35), transparent)" }} />
                      {monthCount > 0 && (
                        <div style={{ textAlign: "center" }}>
                          <p style={{ fontFamily: "var(--font-song, serif)", fontSize: 15, color: "var(--diary-label-text)", fontWeight: 400, lineHeight: 1 }}>
                            {monthCount}
                          </p>
                          <p style={{ fontSize: 9, color: "rgba(var(--diary-ink-rgb), 0.45)", letterSpacing: "0.08em", marginTop: 3 }}>이달</p>
                        </div>
                      )}
                      {streak > 1 && (
                        <div style={{ textAlign: "center" }}>
                          <p style={{ fontFamily: "var(--font-song, serif)", fontSize: 13, color: "rgba(var(--accent-rgb), 0.8)", fontWeight: 400, lineHeight: 1 }}>
                            {streak}
                          </p>
                          <p style={{ fontSize: 9, color: "rgba(var(--diary-ink-rgb), 0.45)", letterSpacing: "0.08em", marginTop: 3 }}>연속</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={onNewEntry}
                  className="hidden sm:flex"
                  style={{
                    position: "absolute", bottom: "12%", left: "50%",
                    transform: "translateX(-50%)",
                    flexDirection: "column", alignItems: "center", gap: 2,
                    background: "none", border: "1px solid rgba(var(--accent-rgb), 0.4)",
                    padding: "8px 6px", cursor: "pointer", zIndex: 2,
                    opacity: 0.55, transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.55")}
                  aria-label="새 기록"
                >
                  <span style={{
                    writingMode: "vertical-rl", textOrientation: "upright",
                    fontFamily: "var(--font-song, serif)",
                    fontSize: 10, color: "rgba(var(--accent-rgb), 0.85)", letterSpacing: "0.14em",
                  }}>
                    新記
                  </span>
                </button>
              </>
            ) : (
              // ── 이전 탭 내용 — 읽은 페이지처럼 흐리게 ──
              <>
                <div style={{
                  position: "absolute", top: 14, left: 0, right: 0, zIndex: 3,
                  display: "flex", justifyContent: "center", pointerEvents: "none",
                }}>
                  <span style={{
                    fontFamily: "var(--font-song, serif)", fontSize: 9,
                    color: "rgba(var(--diary-ink-rgb), 0.32)", letterSpacing: "0.22em",
                  }}>
                    {TABS.find(t => t.id === leftPageTab)?.label ?? ""}
                  </span>
                </div>
                <div style={{
                  position: "absolute", top: 27, left: 20, right: 20, height: 1,
                  background: "linear-gradient(90deg, transparent, rgba(var(--diary-ink-rgb), 0.1), transparent)",
                  zIndex: 2, pointerEvents: "none",
                }} />
                <div style={{
                  position: "absolute", top: 36, left: 0, right: 0, bottom: 36,
                  overflow: "hidden", zIndex: 1, pointerEvents: "none",
                  opacity: 0.42, filter: "sepia(0.12) contrast(0.88) brightness(1.03)",
                }}>
                  {renderContent(leftPageTab)}
                </div>
                <div style={{
                  position: "absolute", bottom: 27, left: 20, right: 20, height: 1,
                  background: "linear-gradient(90deg, transparent, rgba(var(--diary-ink-rgb), 0.1), transparent)",
                  zIndex: 2, pointerEvents: "none",
                }} />
                <div style={{
                  position: "absolute", bottom: 14, left: 0, right: 0, zIndex: 3,
                  display: "flex", justifyContent: "center", pointerEvents: "none",
                }}>
                  <span style={{
                    fontFamily: "var(--font-song, serif)", fontSize: 9,
                    color: "rgba(var(--diary-ink-rgb), 0.28)", letterSpacing: "0.15em",
                  }}>
                    {toRoman(TAB_IDX[activeTab] * 2)}
                  </span>
                </div>
              </>
            )}
            </div>

            {/* settle 래퍼 닫기 */}
            </div>

            {/* 제본 스티치 — 항상 표시, settle 래퍼 밖 */}
            <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 22, zIndex: 6 }}>
              <div style={{
                position: "absolute", left: "50%", top: "6%", bottom: "6%", width: 1,
                background: "linear-gradient(180deg, transparent, rgba(var(--accent-rgb), 0.5) 8%, rgba(var(--accent-rgb), 0.5) 92%, transparent)",
              }} />
              {STITCH_POS.map((top) => (
                <div key={top} style={{
                  position: "absolute", left: "50%", top: `${top}%`,
                  width: 6, height: 6, borderRadius: "50%",
                  border: "1px solid rgba(var(--diary-ink-rgb), 0.5)",
                  backgroundColor: "rgba(var(--diary-ink-rgb), 0.32)",
                  transform: "translate(-50%, -50%)",
                }} />
              ))}
            </div>

            {/* ── 표지 착지 오버레이 (좌측 패널, 데스크탑 전용) ── */}
            {coverFlipped && !coverDone && (
              <div style={{ position: "absolute", inset: 0, zIndex: 10, perspective: "1400px", pointerEvents: "none" }}>
                {Array.from({ length: STRIP_N }).map((_, j) => {
                  // j=0: 척추 근접(우측), j=4: 바깥쪽(좌측) — 척추부터 착지
                  const lp = ((STRIP_N - 1 - j) / STRIP_N) * 100;
                  const wp = 100 / STRIP_N;
                  const delay = j * 0.028;
                  return (
                    <div
                      key={j}
                      style={{
                        position: "absolute", top: 0, bottom: 0,
                        left: `${lp}%`, width: `${wp}%`,
                        overflow: "hidden",
                        transformOrigin: `${(j + 1) * 100}% 50%`,
                        zIndex: STRIP_N - j,
                        animation: `csa${j} 0.72s cubic-bezier(0.25,0.1,0.25,1) ${delay}s both`,
                      }}
                      onAnimationEnd={j === STRIP_N - 1 ? () => setCoverDone(true) : undefined}
                    >
                      {/* 속표지 전체 너비 콘텐츠 — 올바른 슬라이스만 노출 */}
                      <div style={{
                        position: "absolute", top: 0, bottom: 0,
                        left: `-${(STRIP_N - 1 - j) * 100}%`,
                        width: `${STRIP_N * 100}%`,
                        background: theme === "light"
                          ? "linear-gradient(160deg,#f6f0df 0%,#eee4c6 50%,#e4d8b2 100%)"
                          : "linear-gradient(160deg,#231b0e 0%,#1d1609 50%,#170e04 100%)",
                      }}>
                        <div style={{ position: "absolute", inset: 0, backgroundImage: noise, opacity: noiseOpacity * 1.4, mixBlendMode: "multiply", pointerEvents: "none" }} />
                        {Array.from({ length: 20 }).map((_, li) => (
                          <div key={li} style={{
                            position: "absolute", left: 0, right: 0,
                            top: `${7 + li * 4.5}%`, height: 1,
                            background: "linear-gradient(90deg,transparent,rgba(var(--diary-ink-rgb),0.1) 25%,rgba(var(--diary-ink-rgb),0.1) 75%,transparent)",
                          }} />
                        ))}
                        {/* 바인딩 선 */}
                        <div style={{
                          position: "absolute", right: 0, top: "5%", bottom: "5%", width: 1,
                          background: "linear-gradient(180deg,transparent,rgba(var(--diary-ink-rgb),0.18) 15%,rgba(var(--diary-ink-rgb),0.18) 85%,transparent)",
                        }} />
                        {/* 속표지 장서인 */}
                        <div style={{
                          position: "absolute", left: "50%", top: "50%",
                          transform: "translate(-50%,-50%)",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                          opacity: 0.38,
                        }}>
                          <div style={{
                            width: 58, height: 70, borderRadius: "50%",
                            border: "1px solid rgba(var(--diary-ink-rgb),0.55)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <span style={{
                              fontFamily: "var(--font-song,serif)", fontSize: 13,
                              color: "rgba(var(--diary-ink-rgb),0.75)",
                              writingMode: "vertical-rl", letterSpacing: "0.1em",
                            }}>蔵書</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── 책등 ── */}
          <div
            className="hidden sm:block"
            style={{
              width: coverOpen ? 20 : 0,
              flexShrink: 0,
              overflow: "hidden",
              transition: "width 0.52s cubic-bezier(0.32,0.72,0,1)",
              background: spineBg,
              boxShadow: "inset 2px 0 5px rgba(0,0,0,0.5), inset -2px 0 5px rgba(0,0,0,0.5)",
              position: "relative",
            }}
          >
            {[0.1, 0.25, 0.75, 0.9].map((pos) => (
              <div key={pos} style={{
                position: "absolute", left: 0, right: 0, top: `${pos * 100}%`, height: 4,
                background: theme === "light"
                  ? "linear-gradient(90deg, rgba(0,0,0,0.15) 0%, rgba(160,120,50,0.22) 50%, rgba(0,0,0,0.15) 100%)"
                  : "linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(160,120,50,0.14) 50%, rgba(0,0,0,0.5) 100%)",
              }} />
            ))}
            {/* 척추 진행 게이지 — 현재 탭 위치 표시 */}
            {coverDone && (
              <div style={{
                position: "absolute", left: "50%",
                top: `${10 + (TAB_IDX[activeTab] / (TABS.length - 1)) * 80}%`,
                transform: "translate(-50%, -50%) rotate(45deg)",
                width: 6, height: 6, zIndex: 2,
                background: "rgba(180,140,60,0.75)",
                boxShadow: "0 0 5px rgba(0,0,0,0.45)",
                transition: "top 0.45s cubic-bezier(0.25,0.1,0.25,1)",
              }} />
            )}
          </div>

          {/* ── 오른쪽 패널 ── */}
          <div style={{ flex: 1, minWidth: 0, position: "relative" }}>

            {/* 페이지 스택 두께 — 겹쳐진 종이 엣지 */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                position: "absolute",
                right: -(2 + i * 1.6),
                top: 3 + i * 0.8,
                bottom: 3 + i * 0.8,
                width: 2,
                background: theme === "light"
                  ? `rgba(${190 - i * 10},${165 - i * 8},${110 - i * 6},${((0.32 - i * 0.04) * (0.15 + aheadRatio * 0.85)).toFixed(2)})`
                  : `rgba(${70 - i * 8},${55 - i * 6},${35 - i * 4},${((0.42 - i * 0.06) * (0.15 + aheadRatio * 0.85)).toFixed(2)})`,
                borderRadius: "0 2px 2px 0",
                zIndex: 6 - i,
                transition: "background 0.45s",
              }} />
            ))}

            {/* 페이지 배경/테두리 쉘 */}
            <div style={{
              position: "absolute", inset: 0,
              background: hanji,
              borderRadius: coverOpen ? "0 10px 10px 0" : 10,
              border: "1px solid rgba(var(--diary-ink-rgb), 0.14)",
              borderLeft: coverOpen ? "none" : "1px solid rgba(var(--diary-ink-rgb), 0.14)",
              overflow: "hidden",
              boxShadow: coverOpen
                ? "inset 10px 0 28px rgba(0,0,0,0.1), 0 0 0 1px var(--diary-page-inset) inset"
                : "0 0 0 1px var(--diary-page-inset) inset",
              transition: "border-radius 0.5s, box-shadow 0.5s",
              zIndex: 0,
            }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: noise, opacity: noiseOpacity, mixBlendMode: "multiply", pointerEvents: "none" }} />
            </div>

            {/* 모바일 탭 바 */}
            <div
              className="sm:hidden"
              style={{
                position: "absolute", top: 0, left: 0, right: 0,
                display: "flex",
                borderBottom: "1px solid rgba(var(--diary-ink-rgb), 0.12)",
                backgroundColor: "var(--bg-elevated)",
                zIndex: 10,
              }}
            >
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    style={{
                      flex: 1, padding: "11px 0", border: "none",
                      borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                      backgroundColor: "transparent",
                      color: isActive ? "var(--accent)" : "var(--text-muted)",
                      fontSize: 12, fontWeight: isActive ? 700 : 400,
                      cursor: "pointer",
                      fontFamily: isActive ? "var(--font-song, serif)" : "inherit",
                      transition: "color 0.15s, border-color 0.15s",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                페이지 영역 — perspective 컨텍스트
                base layer (새 내용) + flip layer (이전 내용 3D 카드)
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div
              className="sm:top-0 top-[40px]"
              style={{
                position: "absolute", left: 0, right: 0, bottom: 0,
                perspective: "700px",
                zIndex: 1,
                userSelect: dragX !== null ? "none" : "auto",
                cursor: dragX !== null ? "ew-resize" : "auto",
              }}
              onMouseDown={(e) => {
                if (!coverDone || flippingFrom !== null) return;
                if (!nextTabId && !prevTabId) return;
                dragStartX.current = e.clientX;
                dragPageW.current = e.currentTarget.getBoundingClientRect().width;
                setDragX(e.clientX);
                if (pageContentRef.current) {
                  html2canvas(pageContentRef.current, { scale: 1, logging: false, useCORS: true, backgroundColor: null })
                    .then(c => setFlipSnap(c.toDataURL("image/webp", 0.8)))
                    .catch(() => {});
                }
              }}
              onTouchStart={(e) => {
                touchStartX.current = e.touches[0].clientX;
                touchStartY.current = e.touches[0].clientY;
              }}
              onTouchEnd={(e) => {
                if (touchStartX.current === null || touchStartY.current === null) return;
                const dx = e.changedTouches[0].clientX - touchStartX.current;
                const dy = e.changedTouches[0].clientY - touchStartY.current;
                touchStartX.current = null; touchStartY.current = null;
                if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
                if (dx < 0) handleTabClick(TABS[Math.min(TAB_IDX[activeTab] + 1, TABS.length - 1)].id);
                else        handleTabClick(TABS[Math.max(TAB_IDX[activeTab] - 1, 0)].id);
              }}
            >
              {/* base layer — 앞방향: 새 내용 / 뒷방향: 이전 내용 */}
              <div ref={pageContentRef} style={{ position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden", background: hanji, zIndex: 0, paddingTop: coverDone ? 26 : 0, paddingBottom: coverDone ? 26 : 0, boxSizing: "border-box" }}>
                {isSample && (
                  <div style={{ padding: "12px 20px 0" }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      backgroundColor: "rgba(var(--accent-rgb), 0.05)",
                      border: "1px solid rgba(var(--accent-rgb), 0.2)",
                      borderRadius: 4, padding: "8px 12px",
                    }}>
                      <span style={{ color: "var(--accent)", fontSize: 10, opacity: 0.65, flexShrink: 0 }}>✦</span>
                      <p style={{ color: "var(--text-muted)", fontSize: 11, margin: 0 }}>
                        예시 기록입니다. 앨범 커버는 실제 기록에서 표시돼요.
                      </p>
                    </div>
                  </div>
                )}
                {renderContent(flipDir === -1 && flippingFrom !== null ? flippingFrom : activeTab)}
              </div>

              {/* flip layer — 멀티스트립 페이지 넘기기 (표지와 동일한 파동 곡률) */}
              {flippingFrom !== null && Array.from({ length: STRIP_N }).map((_, i) => {
                const isForward = flipDir === 1;
                const lp = (i / STRIP_N) * 100;
                const wp = 100 / STRIP_N;
                // 앞방향: 바깥(i=4) 먼저 출발 / 뒷방향: 척추(i=0) 먼저 도착
                const delay = isForward
                  ? (STRIP_N - 1 - i) * 0.02
                  : i * 0.02;
                const anim = isForward
                  ? `csd${i} 0.48s cubic-bezier(0.25,0.1,0.2,1) ${delay}s forwards`
                  : `pgb${i} 0.48s cubic-bezier(0.0,0.0,0.2,1) ${delay}s both`;
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute", top: 0, bottom: 0,
                      left: `${lp}%`, width: `${wp}%`,
                      overflow: "hidden",
                      transformOrigin: `${-i * 100}% 50%`,
                      zIndex: isForward ? 5 + STRIP_N - i : 5 + i,
                      animation: anim,
                      pointerEvents: "none",
                    }}
                  >
                    <div style={{
                      position: "absolute", inset: 0,
                      left: `-${i * 100}%`,
                      width: `${STRIP_N * 100}%`,
                      overflowY: "hidden",
                      background: hanji,
                      /* 앞방향 + 스냅샷 있을 때: 이미지로 렌더링 대체 */
                      backgroundImage: isForward && flipSnap ? `url(${flipSnap})` : "none",
                      backgroundSize: "100% 100%",
                      backgroundRepeat: "no-repeat",
                      boxShadow: isForward
                        ? "inset -4px 0 12px rgba(0,0,0,0.08)"
                        : "inset 4px 0 12px rgba(0,0,0,0.08)",
                    }}>
                      {!(isForward && flipSnap) && renderContent(isForward ? flippingFrom : activeTab)}
                    </div>
                  </div>
                );
              })}
              {/* 드래그 플립 — 실시간 커서 당김 */}
              {dragX !== null && dragStartX.current !== null && flippingFrom === null && (
                Array.from({ length: STRIP_N }).map((_, i) => {
                  const rawRatio = Math.max(0, Math.min(1,
                    (dragStartX.current! - dragX) / dragPageW.current
                  ));
                  const rotDeg = rawRatio * 90 * (0.5 + 0.1 * i);
                  return (
                    <div key={`drag-${i}`} style={{
                      position: "absolute", top: 0, bottom: 0,
                      left: `${(i / STRIP_N) * 100}%`, width: `${100 / STRIP_N}%`,
                      overflow: "hidden",
                      transformOrigin: `${-i * 100}% 50%`,
                      transform: `rotateY(-${rotDeg}deg)`,
                      zIndex: 5 + STRIP_N - i,
                      pointerEvents: "none",
                    }}>
                      <div style={{
                        position: "absolute", inset: 0,
                        left: `-${i * 100}%`, width: `${STRIP_N * 100}%`,
                        background: hanji,
                        backgroundImage: flipSnap ? `url(${flipSnap})` : "none",
                        backgroundSize: "100% 100%",
                        backgroundRepeat: "no-repeat",
                        boxShadow: "inset -4px 0 12px rgba(0,0,0,0.08)",
                      }}>
                        {!flipSnap && renderContent(activeTab)}
                      </div>
                    </div>
                  );
                })
              )}
              {/* 스냅백 — 드래그 취소 시 복귀 애니메이션 */}
              {snapBackPhase !== null && flippingFrom === null && (
                Array.from({ length: STRIP_N }).map((_, i) => {
                  const rotDeg = snapBackPhase === "from"
                    ? snapBackFromRatioRef.current * 90 * (0.5 + 0.1 * i)
                    : 0;
                  return (
                    <div key={`sb-${i}`} style={{
                      position: "absolute", top: 0, bottom: 0,
                      left: `${(i / STRIP_N) * 100}%`, width: `${100 / STRIP_N}%`,
                      overflow: "hidden",
                      transformOrigin: `${-i * 100}% 50%`,
                      transform: `rotateY(-${rotDeg}deg)`,
                      transition: snapBackPhase === "to" ? `transform 0.26s cubic-bezier(0.34,1.08,0.64,1) ${i * 0.012}s` : "none",
                      zIndex: 5 + STRIP_N - i,
                      pointerEvents: "none",
                    }}>
                      <div style={{
                        position: "absolute", inset: 0,
                        left: `-${i * 100}%`, width: `${STRIP_N * 100}%`,
                        background: hanji,
                        backgroundImage: flipSnap ? `url(${flipSnap})` : "none",
                        backgroundSize: "100% 100%",
                        backgroundRepeat: "no-repeat",
                        boxShadow: "inset -4px 0 12px rgba(0,0,0,0.08)",
                      }}>
                        {!flipSnap && renderContent(activeTab)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 코너 컬 힌트 — 다음 탭 넘기기 */}
            {coverDone && nextTabId && flippingFrom === null && (
              <div
                className="hidden sm:block"
                style={{
                  position: "absolute", bottom: 0, right: 0,
                  width: cornerHover ? 38 : 26, height: cornerHover ? 38 : 26,
                  zIndex: 8, cursor: "pointer",
                  transition: "width 0.22s ease, height 0.22s ease",
                }}
                onMouseEnter={() => setCornerHover(true)}
                onMouseLeave={() => setCornerHover(false)}
                onClick={() => { if (flippingFrom !== null) return; nextTabId && handleTabClick(nextTabId); }}
              >
                <div style={{
                  position: "absolute", bottom: 0, right: 0,
                  width: "100%", height: "100%",
                  background: theme === "light"
                    ? "linear-gradient(135deg, transparent 50%, rgba(210,190,140,0.55) 50%)"
                    : "linear-gradient(135deg, transparent 50%, rgba(90,70,40,0.6) 50%)",
                  boxShadow: cornerHover
                    ? "-3px -3px 8px rgba(0,0,0,0.18)"
                    : "-1px -1px 4px rgba(0,0,0,0.09)",
                  borderRadius: "0 0 10px 0",
                  transition: "box-shadow 0.22s",
                }} />
              </div>
            )}

            {/* 우측 페이지 챕터 헤더 */}
            {coverDone && (
              <div
                className="hidden sm:flex"
                style={{
                  position: "absolute", top: 8, left: 0, right: 0,
                  justifyContent: "center", zIndex: 2, pointerEvents: "none",
                  opacity: flippingFrom !== null ? 0 : 1,
                  transition: "opacity 0.12s",
                }}
              >
                <span style={{
                  fontFamily: "var(--font-song, serif)", fontSize: 9,
                  color: "rgba(var(--diary-ink-rgb), 0.3)", letterSpacing: "0.22em",
                }}>
                  {TABS.find(t => t.id === activeTab)?.label}
                </span>
              </div>
            )}

            {/* 우측 페이지 번호 */}
            {coverDone && (
              <div
                className="hidden sm:flex"
                style={{
                  position: "absolute", bottom: 8, left: 0, right: 0,
                  justifyContent: "center", zIndex: 2, pointerEvents: "none",
                  opacity: flippingFrom !== null ? 0 : 1,
                  transition: "opacity 0.12s",
                }}
              >
                <span style={{
                  fontFamily: "var(--font-song, serif)", fontSize: 9,
                  color: "rgba(var(--diary-ink-rgb), 0.28)", letterSpacing: "0.15em",
                }}>
                  {toRoman(TAB_IDX[activeTab] * 2 + 1)}
                </span>
              </div>
            )}

            {/* ── 표지 — 출발 (우측) ── */}
            {!coverFlipped && (
              <div
                style={{
                  position: "absolute", inset: 0, zIndex: 20,
                  perspective: "1400px",
                  cursor: coverOpen ? "default" : "pointer",
                  pointerEvents: coverOpen ? "none" : "auto",
                }}
                onClick={() => { if (!coverOpen) { playPageSound(); setCoverOpen(true); } }}
              >
                {Array.from({ length: STRIP_N }).map((_, i) => {
                  const lp = (i / STRIP_N) * 100;
                  const wp = 100 / STRIP_N;
                  /* 바깥 끝(i=N-1)이 먼저, 척추(i=0)가 마지막에 넘어감 */
                  const delay = (STRIP_N - 1 - i) * 0.02;
                  return (
                    <div
                      key={i}
                      style={{
                        position: "absolute", top: 0, bottom: 0,
                        left: `${lp}%`, width: `${wp}%`,
                        overflow: "hidden",
                        /* 각 스트립의 회전 축 = 커버 척추(맨 왼쪽) */
                        transformOrigin: `${-i * 100}% 50%`,
                        zIndex: STRIP_N - i,
                        animation: coverOpen
                          ? `csd${i} 0.50s cubic-bezier(0.25,0.1,0.2,1) ${delay}s forwards`
                          : "none",
                      }}
                      onAnimationEnd={coverOpen && i === 0 ? () => setCoverFlipped(true) : undefined}
                    >
                      {/* 스트립 내부: 커버 전체 너비 콘텐츠를 올바른 구간만 보이도록 오프셋 */}
                      <div style={{
                        position: "absolute", top: 0, bottom: 0,
                        left: `-${i * 100}%`,
                        width: `${STRIP_N * 100}%`,
                        background: [
                          "repeating-linear-gradient(89deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)",
                          "repeating-linear-gradient(1deg, transparent, transparent 6px, rgba(255,255,255,0.01) 6px, rgba(255,255,255,0.01) 7px)",
                          "linear-gradient(160deg, #1A1007 0%, #231608 30%, #1E1309 60%, #150E06 100%)",
                        ].join(", "),
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {Array.from({ length: 18 }).map((_, li) => (
                          <div key={li} style={{
                            position: "absolute", left: 0, right: 0, top: `${li * 5.6}%`, height: 1,
                            background: "linear-gradient(90deg, transparent, rgba(80,55,20,0.28) 30%, rgba(80,55,20,0.28) 70%, transparent)",
                          }} />
                        ))}
                        <div style={{ position: "absolute", inset: 20, border: "1px solid rgba(180,140,60,0.2)", borderRadius: 3 }} />
                        <div style={{ position: "absolute", inset: 28, border: "1px solid rgba(180,140,60,0.1)", borderRadius: 2 }} />
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, zIndex: 1 }}>
                          <div style={{
                            fontFamily: "var(--font-song, 'Nanum Myeongjo', serif)",
                            fontSize: 26, color: "#C4AA7C",
                            writingMode: "vertical-rl", letterSpacing: "0.22em",
                            textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 -1px 1px rgba(220,180,80,0.15)",
                          }}>
                            청음일기
                          </div>
                          {/* 열기 힌트는 중앙 스트립에만 */}
                          {!coverOpen && i === Math.floor(STRIP_N / 2) && (
                            <div style={{
                              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                              animation: "coverHint 2.2s ease-in-out infinite",
                            }}>
                              <div style={{ width: 1, height: 22, background: "linear-gradient(180deg, transparent, rgba(196,170,124,0.5), transparent)" }} />
                              <span style={{ fontSize: 9, color: "rgba(196,170,124,0.6)", letterSpacing: "0.22em", fontFamily: "var(--font-song, serif)" }}>
                                열기
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
        {/* ── 데스크탑 리본 책갈피 탭 (clip 범위 밖) ── */}
        <div
          className="hidden sm:flex"
          style={{
            position: "absolute", right: -40, top: 24,
            flexDirection: "column", gap: 6, zIndex: 15,
            opacity: coverOpen ? 1 : 0,
            transition: "opacity 0.4s ease",
            pointerEvents: coverOpen ? "auto" : "none",
          }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                style={{
                  writingMode: "vertical-rl", textOrientation: "mixed",
                  padding: "16px 9px 20px", border: "none", cursor: "pointer",
                  clipPath: "polygon(0 0, 100% 0, 100% 86%, 50% 100%, 0 86%)",
                  background: isActive
                    ? "linear-gradient(180deg, var(--diary-page-from) 0%, var(--diary-page-to) 100%)"
                    : "linear-gradient(180deg, #8a8070 0%, #7a7060 100%)",
                  color: isActive ? "var(--text)" : "rgba(250,248,244,0.75)",
                  fontSize: 10, fontWeight: isActive ? 700 : 500,
                  fontFamily: "var(--font-song, serif)", letterSpacing: "0.12em",
                  transition: "all 0.2s ease",
                  transform: isActive ? "translateX(5px)" : "translateX(0)",
                  filter: isActive
                    ? "drop-shadow(3px 0 8px rgba(var(--diary-ink-rgb), 0.28))"
                    : "drop-shadow(2px 0 5px rgba(0,0,0,0.5))",
                  flexShrink: 0,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        </div>
      </div>

      {/* 모바일 FAB */}
      <button
        onClick={onNewEntry}
        className="sm:hidden active:scale-[0.92]"
        style={{
          position: "fixed",
          bottom: "calc(60px + env(safe-area-inset-bottom) + 16px)",
          right: 16, zIndex: 45,
          width: 50, height: 50, borderRadius: "50%",
          background: "linear-gradient(135deg, #9f2f21 0%, #7a2219 100%)",
          border: "none", color: "#f7efd8",
          fontSize: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5), 0 2px 6px rgba(138,45,36,0.3)",
          transition: "transform 0.12s",
        }}
        aria-label="새 기록"
      >
        ✎
      </button>
    </>
  );
}
