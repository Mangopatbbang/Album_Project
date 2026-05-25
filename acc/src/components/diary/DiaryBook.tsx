"use client";

import { useState, useEffect } from "react";
import { DiaryEntry } from "@/types/diary";
import RecordsTab from "./tabs/RecordsTab";
import CalendarTab from "./tabs/CalendarTab";
import AlbumsTab from "./tabs/AlbumsTab";
import StatsTab from "./tabs/StatsTab";

type Tab = "records" | "calendar" | "albums" | "stats";
type FlipPhase = "idle" | "exit" | "enter";

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

/* 한지 텍스처 배경 — 노화 반점 + 기본 색상 */
const hanji =
  "radial-gradient(circle at 22% 16%, rgba(255,255,255,0.16), transparent 22%)," +
  "radial-gradient(circle at 78% 80%, rgba(80,50,20,0.09), transparent 24%)," +
  "radial-gradient(circle at 54% 44%, rgba(90,60,20,0.05), transparent 38%)," +
  "#e8ddb4";

/* SVG 노이즈 — 종이 결 시뮬레이션 */
const noise =
  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'140\' height=\'140\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.72\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'140\' height=\'140\' filter=\'url(%23n)\' opacity=\'0.28\'/%3E%3C/svg%3E")';

/* 코너 장식 — 먹선 스타일 */
const INK = "rgba(43,34,24,0.38)";
const corners: React.CSSProperties[] = [
  { top: 16, left: 16, borderTop: `1px solid ${INK}`, borderLeft: `1px solid ${INK}` },
  { top: 16, right: 16, borderTop: `1px solid ${INK}`, borderRight: `1px solid ${INK}` },
  { bottom: 16, left: 16, borderBottom: `1px solid ${INK}`, borderLeft: `1px solid ${INK}` },
  { bottom: 16, right: 16, borderBottom: `1px solid ${INK}`, borderRight: `1px solid ${INK}` },
];

/* 제본 스티치 위치 (%) */
const STITCH_POS = [8, 22, 38, 54, 70, 84, 94];

export default function DiaryBook({ displayEntries, loading, isSample, onEdit, onDelete, onNewEntry }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("records");
  const [visibleTab, setVisibleTab] = useState<Tab>("records");
  const [flipPhase, setFlipPhase] = useState<FlipPhase>("idle");
  const [flipDir, setFlipDir] = useState<1 | -1>(1);
  const [coverOpen, setCoverOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCoverOpen(true), 200);
    return () => clearTimeout(t);
  }, []);

  const handleTabClick = (tab: Tab) => {
    if (tab === activeTab || flipPhase !== "idle") return;
    const dir = (TAB_IDX[tab] > TAB_IDX[activeTab] ? 1 : -1) as 1 | -1;
    setFlipDir(dir);
    setActiveTab(tab);
    setFlipPhase("exit");
  };

  useEffect(() => {
    if (flipPhase !== "exit") return;
    const t = setTimeout(() => { setVisibleTab(activeTab); setFlipPhase("enter"); }, 140);
    return () => clearTimeout(t);
  }, [flipPhase, activeTab]);

  useEffect(() => {
    if (flipPhase !== "enter") return;
    const t = setTimeout(() => setFlipPhase("idle"), 190);
    return () => clearTimeout(t);
  }, [flipPhase]);

  const pageAnim =
    flipPhase === "exit"
      ? (flipDir === 1 ? "pageExitFwd 0.14s ease-in forwards" : "pageExitBwd 0.14s ease-in forwards")
      : flipPhase === "enter"
      ? (flipDir === 1 ? "pageEnterFwd 0.18s ease-out forwards" : "pageEnterBwd 0.18s ease-out forwards")
      : "none";

  const renderContent = () => {
    switch (visibleTab) {
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
        @keyframes pageExitFwd {
          from { opacity: 1; transform: translateX(0)     scale(1);    filter: brightness(1); }
          to   { opacity: 0; transform: translateX(-12%)  scale(0.96); filter: brightness(0.82); }
        }
        @keyframes pageEnterFwd {
          from { opacity: 0; transform: translateX(12%)   scale(0.96); filter: brightness(0.82); }
          to   { opacity: 1; transform: translateX(0)     scale(1);    filter: brightness(1); }
        }
        @keyframes pageExitBwd {
          from { opacity: 1; transform: translateX(0)     scale(1);    filter: brightness(1); }
          to   { opacity: 0; transform: translateX(12%)   scale(0.96); filter: brightness(0.82); }
        }
        @keyframes pageEnterBwd {
          from { opacity: 0; transform: translateX(-12%)  scale(0.96); filter: brightness(0.82); }
          to   { opacity: 1; transform: translateX(0)     scale(1);    filter: brightness(1); }
        }
      `}</style>

      {/* 외부 어두운 프레임 — 나무/가죽 재질의 독서대 */}
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
        {/* 책 본체 */}
        <div style={{
          display: "flex",
          height: "100%",
          width: "min(920px, 100%)",
          position: "relative",
          boxShadow:
            "0 40px 80px rgba(0,0,0,0.9), 0 12px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.5)",
          borderRadius: 10,
        }}>

          {/* ── 왼쪽 페이지 — 한지 (데스크탑) ── */}
          <div
            className="hidden sm:block"
            style={{
              width: "36%",
              flexShrink: 0,
              background: hanji,
              borderRadius: "10px 0 0 10px",
              border: "1px solid rgba(43,34,24,0.4)",
              borderRight: "none",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* 종이 결 노이즈 오버레이 */}
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: noise,
              opacity: 0.13,
              mixBlendMode: "multiply",
              pointerEvents: "none",
            }} />

            {/* 가로 줄 — 먹선 */}
            {Array.from({ length: 26 }).map((_, i) => (
              <div key={i} style={{
                position: "absolute", left: 32, right: 20,
                top: `${6 + i * 3.6}%`, height: 1,
                background: "linear-gradient(90deg, transparent, rgba(43,34,24,0.16) 12%, rgba(43,34,24,0.16) 88%, transparent)",
              }} />
            ))}

            {/* 붉은 여백선 */}
            <div style={{
              position: "absolute", left: 58, top: "6%", bottom: "6%", width: 1,
              background: "linear-gradient(180deg, transparent, rgba(138,45,36,0.48) 10%, rgba(138,45,36,0.48) 90%, transparent)",
            }} />

            {/* 코너 장식 */}
            {corners.map((s, i) => (
              <div key={i} style={{ position: "absolute", width: 16, height: 16, ...s }} />
            ))}

            {/* 표제지 라벨 — 세로쓰기 "청음일기" */}
            <div style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}>
              {/* 이중 테두리 표제 상자 */}
              <div style={{
                border: "1px solid rgba(43,34,24,0.65)",
                padding: 5,
                backgroundColor: "#f7efd8",
                boxShadow: "1px 2px 6px rgba(43,34,24,0.18)",
              }}>
                <div style={{
                  border: "1px solid rgba(43,34,24,0.45)",
                  padding: "14px 8px",
                }}>
                  <h1 style={{
                    writingMode: "vertical-rl",
                    textOrientation: "upright",
                    fontFamily: "var(--font-song, 'Nanum Myeongjo', serif)",
                    fontSize: 20,
                    color: "#241b14",
                    letterSpacing: "0.22em",
                    lineHeight: 1,
                    margin: 0,
                    fontWeight: 400,
                  }}>
                    청음일기
                  </h1>
                </div>
              </div>

              {/* 私記 인장 */}
              <span style={{
                display: "inline-block",
                border: "2px solid rgba(138,45,36,0.72)",
                padding: "3px 7px",
                fontFamily: "var(--font-song, serif)",
                fontSize: 11,
                color: "rgba(138,45,36,0.72)",
                letterSpacing: "0.12em",
              }}>
                私記
              </span>
            </div>

            {/* 제본 스티치 — 오른쪽 가장자리 */}
            <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 22, zIndex: 1 }}>
              <div style={{
                position: "absolute", left: "50%", top: "6%", bottom: "6%", width: 1,
                background: "linear-gradient(180deg, transparent, rgba(138,45,36,0.5) 8%, rgba(138,45,36,0.5) 92%, transparent)",
              }} />
              {STITCH_POS.map((top) => (
                <div key={top} style={{
                  position: "absolute",
                  left: "50%", top: `${top}%`,
                  width: 6, height: 6, borderRadius: "50%",
                  border: "1px solid rgba(80,45,24,0.65)",
                  backgroundColor: "rgba(20,12,6,0.45)",
                  transform: "translate(-50%, -50%)",
                }} />
              ))}
            </div>
          </div>

          {/* ── 책등 (데스크탑) ── */}
          <div
            className="hidden sm:block"
            style={{
              width: 20,
              flexShrink: 0,
              background: "linear-gradient(90deg, #0A0806 0%, #1E160E 38%, #1A1209 62%, #0A0806 100%)",
              boxShadow: "inset 2px 0 5px rgba(0,0,0,0.8), inset -2px 0 5px rgba(0,0,0,0.8)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* 가죽 밴드 — 금박 강조선 */}
            {[0.1, 0.25, 0.75, 0.9].map((pos) => (
              <div key={pos} style={{
                position: "absolute", left: 0, right: 0, top: `${pos * 100}%`, height: 4,
                background: "linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(160,120,50,0.14) 50%, rgba(0,0,0,0.5) 100%)",
              }} />
            ))}
          </div>

          {/* ── 오른쪽 패널 wrapper (overflow: visible — 책갈피 돌출용) ── */}
          <div style={{ flex: 1, minWidth: 0, position: "relative" }}>

            {/* 페이지 단면 — 종이 두께 표현 */}
            <div style={{
              position: "absolute", right: -3, top: 2, bottom: 2, width: 5,
              background: "linear-gradient(90deg, rgba(180,155,100,0.15) 0%, rgba(200,175,115,0.3) 50%, rgba(130,100,55,0.12) 100%)",
              borderRadius: "0 4px 4px 0",
              zIndex: 5,
            }} />

            {/* 한지 페이지 본체 */}
            <div style={{
              position: "absolute", inset: 0,
              background: hanji,
              borderRadius: "0 10px 10px 0",
              border: "1px solid rgba(43,34,24,0.38)",
              borderLeft: "none",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "inset 6px 0 22px rgba(0,0,0,0.18), inset 0 0 60px rgba(100,75,30,0.06)",
            }}>
              {/* 종이 결 오버레이 */}
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: noise,
                opacity: 0.1,
                mixBlendMode: "multiply",
                pointerEvents: "none",
                zIndex: 0,
              }} />

              {/* 모바일 탭 바 — 한지 스타일 */}
              <div
                className="sm:hidden"
                style={{
                  display: "flex",
                  borderBottom: "1px solid rgba(43,34,24,0.2)",
                  backgroundColor: "#dfd3a0",
                  flexShrink: 0,
                  position: "relative", zIndex: 1,
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
                        borderBottom: isActive ? "2px solid #8a2d24" : "2px solid transparent",
                        backgroundColor: "transparent",
                        color: isActive ? "#8a2d24" : "rgba(36,27,20,0.52)",
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

              {/* 스크롤 가능한 페이지 내용 */}
              <div style={{
                flex: 1, overflowY: "auto", overflowX: "hidden",
                animation: pageAnim,
                position: "relative", zIndex: 1,
              }}>
                {isSample && (
                  <div style={{ padding: "12px 20px 0" }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      backgroundColor: "rgba(138,45,36,0.05)",
                      border: "1px solid rgba(138,45,36,0.2)",
                      borderRadius: 4, padding: "8px 12px",
                    }}>
                      <span style={{ color: "#8a2d24", fontSize: 10, opacity: 0.65, flexShrink: 0 }}>✦</span>
                      <p style={{ color: "rgba(36,27,20,0.58)", fontSize: 11, margin: 0 }}>
                        예시 기록입니다. 앨범 커버는 실제 기록에서 표시돼요.
                      </p>
                    </div>
                  </div>
                )}
                {renderContent()}
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
                  {/* 세로쓰기 표제 */}
                  <div style={{ textAlign: "center", zIndex: 1 }}>
                    <div style={{
                      fontFamily: "var(--font-song, 'Nanum Myeongjo', serif)",
                      fontSize: 26,
                      color: "#C4AA7C",
                      writingMode: "vertical-rl",
                      letterSpacing: "0.22em",
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
                    writingMode: "vertical-rl",
                    letterSpacing: "0.22em",
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
                      writingMode: "vertical-rl",
                      textOrientation: "mixed",
                      padding: "16px 9px 20px",
                      border: "none",
                      cursor: "pointer",
                      clipPath: "polygon(0 0, 100% 0, 100% 86%, 50% 100%, 0 86%)",
                      background: isActive
                        ? "linear-gradient(180deg, #f7efd8 0%, #efe4c0 100%)"
                        : "linear-gradient(180deg, #c8b88a 0%, #b8a87a 100%)",
                      color: isActive ? "#241b14" : "rgba(36,27,20,0.48)",
                      fontSize: 10,
                      fontWeight: isActive ? 700 : 500,
                      fontFamily: "var(--font-song, serif)",
                      letterSpacing: "0.12em",
                      transition: "all 0.2s ease",
                      transform: isActive ? "translateX(5px)" : "translateX(0)",
                      filter: isActive
                        ? "drop-shadow(3px 0 8px rgba(43,34,24,0.28))"
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
