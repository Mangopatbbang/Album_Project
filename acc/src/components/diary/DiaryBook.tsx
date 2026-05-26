"use client";

import { useState, useEffect, useMemo } from "react";
import { DiaryEntry } from "@/types/diary";
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

const hanji = "linear-gradient(160deg, var(--diary-page-from) 0%, var(--diary-page-mid) 55%, var(--diary-page-to) 100%)";

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

export default function DiaryBook({ displayEntries, loading, isSample, onEdit, onDelete, onNewEntry }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("records");
  const [flippingFrom, setFlippingFrom] = useState<Tab | null>(null);
  const [flipDir, setFlipDir] = useState<1 | -1>(1);
  const [coverOpen, setCoverOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCoverOpen(true), 200);
    return () => clearTimeout(t);
  }, []);

  /* flippingFrom 설정되면 애니메이션 끝난 후 정리 */
  useEffect(() => {
    if (flippingFrom === null) return;
    const t = setTimeout(() => setFlippingFrom(null), 560);
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
    setFlipDir(TAB_IDX[tab] > TAB_IDX[activeTab] ? 1 : -1);
    setFlippingFrom(activeTab); /* 이전 탭이 3D로 뒤집혀 나감 */
    setActiveTab(tab);          /* 새 탭이 즉시 아래 레이어에 깔림 */
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
        @keyframes bookCoverOpen {
          0%   { transform: rotateY(0deg); opacity: 1; }
          45%  { opacity: 1; }
          80%  { opacity: 0.3; }
          100% { transform: rotateY(-115deg); opacity: 0; }
        }
        @keyframes mobileCoverFade {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.97); }
        }
        /* 앞으로 — 왼쪽 끝을 축으로 앞장이 뒤로 넘어감 */
        @keyframes flipFwd {
          from { transform: rotateY(0deg); }
          to   { transform: rotateY(-180deg); }
        }
        /* 뒤로 — 오른쪽 끝을 축으로 앞장이 뒤로 넘어감 */
        @keyframes flipBwd {
          from { transform: rotateY(0deg); }
          to   { transform: rotateY(180deg); }
        }
      `}</style>

      <div
        className="sm:pr-[54px]"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "calc(100dvh - 52px)",
          background: "radial-gradient(ellipse 90% 70% at 50% 50%, #1C1410 0%, #0D0A07 100%)",
          padding: "16px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <div style={{
          display: "flex",
          height: "100%",
          width: "min(920px, 100%)",
          position: "relative",
          boxShadow:
            "0 40px 80px rgba(0,0,0,0.9), 0 12px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.5)",
          borderRadius: 10,
        }}>

          {/* ── 왼쪽 페이지 ── */}
          <div
            className="hidden sm:block"
            style={{
              width: "36%",
              flexShrink: 0,
              background: hanji,
              borderRadius: "10px 0 0 10px",
              border: "1px solid rgba(var(--diary-ink-rgb), 0.15)",
              borderRight: "none",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", inset: 0, backgroundImage: noise, opacity: 0.13, mixBlendMode: "multiply", pointerEvents: "none" }} />

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
          </div>

          {/* ── 책등 ── */}
          <div
            className="hidden sm:block"
            style={{
              width: 20, flexShrink: 0,
              background: "linear-gradient(90deg, #0A0806 0%, #1E160E 38%, #1A1209 62%, #0A0806 100%)",
              boxShadow: "inset 2px 0 5px rgba(0,0,0,0.8), inset -2px 0 5px rgba(0,0,0,0.8)",
              position: "relative", overflow: "hidden",
            }}
          >
            {[0.1, 0.25, 0.75, 0.9].map((pos) => (
              <div key={pos} style={{
                position: "absolute", left: 0, right: 0, top: `${pos * 100}%`, height: 4,
                background: "linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(160,120,50,0.14) 50%, rgba(0,0,0,0.5) 100%)",
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
              <div style={{ position: "absolute", inset: 0, backgroundImage: noise, opacity: 0.1, mixBlendMode: "multiply", pointerEvents: "none" }} />
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
                perspective: "1000px",
                zIndex: 1,
              }}
            >
              {/* 새 내용 — 항상 아래에 깔려있음 */}
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
                {renderContent(activeTab)}
              </div>

              {/* 이전 내용 — 3D 카드로 뒤집혀 나감 */}
              {flippingFrom !== null && (
                <div
                  style={{
                    position: "absolute", inset: 0,
                    zIndex: 5,
                    transformOrigin: flipDir === 1 ? "left center" : "right center",
                    transformStyle: "preserve-3d",
                    animation: flipDir === 1
                      ? "flipFwd 0.52s cubic-bezier(0.4,0,0.6,1) forwards"
                      : "flipBwd 0.52s cubic-bezier(0.4,0,0.6,1) forwards",
                    pointerEvents: "none",
                  }}
                >
                  {/* 앞면: 이전 내용 (0° → 90°에서 보임) */}
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
                    {renderContent(flippingFrom)}
                  </div>

                  {/* 뒷면: 빈 한지 (90° → 180°에서 보임) */}
                  <div style={{
                    position: "absolute", inset: 0,
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    background: hanji,
                    boxShadow: flipDir === 1
                      ? "inset 6px 0 18px rgba(0,0,0,0.09)"
                      : "inset -6px 0 18px rgba(0,0,0,0.09)",
                  }}>
                    <div style={{ position: "absolute", inset: 0, backgroundImage: noise, opacity: 0.12, mixBlendMode: "multiply" }} />
                    {/* 빈 줄 */}
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

            {/* ── 표지 — 데스크탑 3D ── */}
            <div
              className="hidden sm:block"
              style={{
                position: "absolute", inset: 0,
                transformOrigin: "left center",
                animation: coverOpen
                  ? "bookCoverOpen 1.0s cubic-bezier(0.4,0,0.2,1) 0.3s forwards"
                  : "none",
                zIndex: 20,
                pointerEvents: coverOpen ? "none" : "auto",
                borderRadius: "0 10px 10px 0",
                overflow: "hidden",
              }}
            >
              <div style={{
                width: "100%", height: "100%",
                background: [
                  "repeating-linear-gradient(89deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)",
                  "repeating-linear-gradient(1deg, transparent, transparent 6px, rgba(255,255,255,0.01) 6px, rgba(255,255,255,0.01) 7px)",
                  "linear-gradient(160deg, #1A1007 0%, #231608 30%, #1E1309 60%, #150E06 100%)",
                ].join(", "),
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative", overflow: "hidden",
              }}>
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} style={{
                    position: "absolute", left: 0, right: 0, top: `${i * 5.6}%`, height: 1,
                    background: "linear-gradient(90deg, transparent, rgba(80,55,20,0.28) 30%, rgba(80,55,20,0.28) 70%, transparent)",
                  }} />
                ))}
                <div style={{ position: "absolute", inset: 20, border: "1px solid rgba(180,140,60,0.2)", borderRadius: 3 }} />
                <div style={{ position: "absolute", inset: 28, border: "1px solid rgba(180,140,60,0.1)", borderRadius: 2 }} />
                <div style={{ textAlign: "center", zIndex: 1 }}>
                  <div style={{
                    fontFamily: "var(--font-song, 'Nanum Myeongjo', serif)",
                    fontSize: 26, color: "#C4AA7C",
                    writingMode: "vertical-rl", letterSpacing: "0.22em",
                    textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 -1px 1px rgba(220,180,80,0.15)",
                  }}>
                    청음일기
                  </div>
                </div>
              </div>
            </div>

            {/* ── 표지 — 모바일 페이드 ── */}
            <div
              className="sm:hidden"
              style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(160deg, #1A1007 0%, #231608 50%, #150E06 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: coverOpen ? "mobileCoverFade 0.7s ease-out 0.3s forwards" : "none",
                zIndex: 20,
                pointerEvents: coverOpen ? "none" : "auto",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontFamily: "var(--font-song, serif)",
                  fontSize: 26, color: "#C4AA7C",
                  writingMode: "vertical-rl", letterSpacing: "0.22em",
                  textShadow: "0 1px 3px rgba(0,0,0,0.9)",
                }}>
                  청음일기
                </div>
                <div style={{
                  width: 1, height: 28, margin: "12px auto 0",
                  background: "linear-gradient(180deg, transparent, rgba(180,140,60,0.45), transparent)",
                }} />
              </div>
            </div>

            {/* ── 데스크탑 리본 책갈피 탭 ── */}
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
