"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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

let _audioCtx: AudioContext | null = null;
function playPageSound() {
  try {
    if (!_audioCtx || _audioCtx.state === "closed") {
      _audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    const ctx = _audioCtx;
    if (ctx.state === "suspended") ctx.resume();
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
    bp.type = "bandpass";
    bp.frequency.value = 2800;
    bp.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.45, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
    src.start();
  } catch (_) { /* 오디오 미지원 환경 무시 */ }
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

  /* 표지 착지 — 출발 완료 시 착지 사운드 */
  useEffect(() => {
    if (!coverFlipped) return;
    const t = setTimeout(playPageSound, 60);
    return () => clearTimeout(t);
  }, [coverFlipped]);

  /* 플립 완료 후 다음 큐 처리 */
  useEffect(() => {
    if (flippingFrom === null) return;
    const t = setTimeout(() => {
      setFlippingFrom(null);
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
    }, 540);
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

  const handleTabClick = (tab: Tab) => {
    if (tab === activeTab || flippingFrom !== null) return;
    const fromIdx = TAB_IDX[activeTab];
    const toIdx = TAB_IDX[tab];
    const dir: 1 | -1 = toIdx > fromIdx ? 1 : -1;
    /* 건너뛰는 탭 수만큼 플립 시퀀스 생성 */
    const steps: Array<{ from: Tab; to: Tab; dir: 1 | -1 }> = [];
    for (let i = fromIdx + dir; dir > 0 ? i <= toIdx : i >= toIdx; i += dir) {
      const prev = steps.length > 0 ? steps[steps.length - 1].to : activeTab;
      const next = (Object.keys(TAB_IDX) as Tab[]).find(k => TAB_IDX[k] === i)!;
      steps.push({ from: prev, to: next, dir });
    }
    const [first, ...rest] = steps;
    flipQueueRef.current = rest;
    playPageSound();
    setFlipDir(first.dir);
    setFlippingFrom(first.from);
    setActiveTab(first.to);
  };

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
        ${DEPART_KF}${ARRIVE_KF}
        @keyframes coverHint {
          0%, 100% { opacity: 0.5; transform: translateY(0px); }
          50% { opacity: 0.85; transform: translateY(4px); }
        }
        /* 앞으로 — 왼쪽 끝 축, 종이가 휘며 넘어가는 효과 */
        @keyframes flipFwd {
          0%   { transform: rotateY(0deg) skewY(0deg); opacity: 1; }
          28%  { transform: rotateY(-48deg) skewY(-4deg); opacity: 1; }
          58%  { transform: rotateY(-86deg) skewY(4deg); opacity: 1; }
          78%  { transform: rotateY(-100deg) skewY(1deg); opacity: 0.7; }
          100% { transform: rotateY(-105deg) skewY(0deg); opacity: 0; }
        }
        /* 뒤로 — 왼쪽에서 오른쪽으로 종이가 펼쳐지며 넘어오는 효과 */
        @keyframes flipBwdIn {
          0%   { transform: rotateY(-105deg) skewY(0deg); opacity: 0; }
          22%  { transform: rotateY(-100deg) skewY(1deg); opacity: 0.7; }
          42%  { transform: rotateY(-86deg) skewY(4deg); opacity: 1; }
          72%  { transform: rotateY(-48deg) skewY(-4deg); opacity: 1; }
          100% { transform: rotateY(0deg) skewY(0deg); opacity: 1; }
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
        <div style={{ position: "relative", height: "100%", width: "min(920px, 100%)" }}>
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
              background: hanji,
              borderRadius: "10px 0 0 10px",
              border: "1px solid rgba(var(--diary-ink-rgb), 0.15)",
              borderRight: "none",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", inset: 0, backgroundImage: noise, opacity: noiseOpacity, mixBlendMode: "multiply", pointerEvents: "none" }} />

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

            {/* 새 기록 버튼 */}
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

            {/* 제본 스티치 */}
            <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 22, zIndex: 1 }}>
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
              width: 20, flexShrink: 0,
              background: spineBg,
              boxShadow: "inset 2px 0 5px rgba(0,0,0,0.5), inset -2px 0 5px rgba(0,0,0,0.5)",
              position: "relative", overflow: "hidden",
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
          </div>

          {/* ── 오른쪽 패널 ── */}
          <div style={{ flex: 1, minWidth: 0, position: "relative" }}>

            {/* 페이지 단면 */}
            <div style={{
              position: "absolute", right: -3, top: 2, bottom: 2, width: 5,
              background: "linear-gradient(90deg, rgba(180,155,100,0.15) 0%, rgba(200,175,115,0.3) 50%, rgba(130,100,55,0.12) 100%)",
              borderRadius: "0 4px 4px 0", zIndex: 5,
            }} />

            {/* 페이지 배경/테두리 쉘 */}
            <div style={{
              position: "absolute", inset: 0,
              background: hanji,
              borderRadius: "0 10px 10px 0",
              border: "1px solid rgba(var(--diary-ink-rgb), 0.14)",
              borderLeft: "none",
              overflow: "hidden",
              boxShadow: "inset 5px 0 18px rgba(0,0,0,0.07), 0 0 0 1px var(--diary-page-inset) inset",
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
              }}
            >
              {/* base layer — 앞방향: 새 내용 / 뒷방향: 이전 내용 */}
              <div style={{ position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden", background: hanji, zIndex: 0 }}>
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

              {/* flip layer — 앞방향: 이전 내용이 왼쪽으로 넘어감 / 뒷방향: 새 내용이 왼쪽에서 펼쳐짐 */}
              {flippingFrom !== null && (
                <div
                  style={{
                    position: "absolute", inset: 0,
                    zIndex: 5,
                    transformOrigin: "left center",
                    transformStyle: "preserve-3d",
                    animation: flipDir === 1
                      ? "flipFwd 0.52s cubic-bezier(0.45,0,0.55,1) forwards"
                      : "flipBwdIn 0.52s cubic-bezier(0.45,0,0.55,1) forwards",
                    pointerEvents: "none",
                  }}
                >
                  {/* 앞면 — 앞방향: 이전 내용 / 뒷방향: 새 내용 */}
                  <div style={{
                    position: "absolute", inset: 0,
                    overflowY: "hidden",
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    background: hanji,
                    boxShadow: flipDir === 1
                      ? "inset -6px 0 18px rgba(0,0,0,0.09)"
                      : "inset 6px 0 18px rgba(0,0,0,0.09)",
                  }}>
                    {flipDir === 1 ? renderContent(flippingFrom) : renderContent(activeTab)}
                  </div>

                  {/* 뒷면: 빈 한지 */}
                  <div style={{
                    position: "absolute", inset: 0,
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    background: hanji,
                    boxShadow: "inset 6px 0 18px rgba(0,0,0,0.09)",
                  }}>
                    <div style={{ position: "absolute", inset: 0, backgroundImage: noise, opacity: noiseOpacity, mixBlendMode: "multiply" }} />
                    {Array.from({ length: 22 }).map((_, i) => (
                      <div key={i} style={{
                        position: "absolute", left: 24, right: 24,
                        top: `${8 + i * 4.2}%`, height: 1,
                        background: "linear-gradient(90deg, transparent, rgba(var(--diary-ink-rgb), 0.09) 15%, rgba(var(--diary-ink-rgb), 0.09) 85%, transparent)",
                      }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

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
