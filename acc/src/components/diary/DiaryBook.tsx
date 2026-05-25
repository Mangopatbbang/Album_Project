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

/* Corner ornament helper */
const corners: React.CSSProperties[] = [
  { top: 18, left: 18, borderTop: "1px solid rgba(180,140,60,0.28)", borderLeft: "1px solid rgba(180,140,60,0.28)" },
  { top: 18, right: 18, borderTop: "1px solid rgba(180,140,60,0.28)", borderRight: "1px solid rgba(180,140,60,0.28)" },
  { bottom: 18, left: 18, borderBottom: "1px solid rgba(180,140,60,0.28)", borderLeft: "1px solid rgba(180,140,60,0.28)" },
  { bottom: 18, right: 18, borderBottom: "1px solid rgba(180,140,60,0.28)", borderRight: "1px solid rgba(180,140,60,0.28)" },
];

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
    const t = setTimeout(() => { setVisibleTab(activeTab); setFlipPhase("enter"); }, 180);
    return () => clearTimeout(t);
  }, [flipPhase, activeTab]);

  useEffect(() => {
    if (flipPhase !== "enter") return;
    const t = setTimeout(() => setFlipPhase("idle"), 180);
    return () => clearTimeout(t);
  }, [flipPhase]);

  const pageAnim =
    flipPhase === "exit"
      ? (flipDir === 1 ? "pageExitFwd 0.18s ease-in forwards" : "pageExitBwd 0.18s ease-in forwards")
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
          from { transform: perspective(900px) translateX(0) rotateY(0deg); opacity: 1; }
          to   { transform: perspective(900px) translateX(-22px) rotateY(-10deg); opacity: 0; }
        }
        @keyframes pageEnterFwd {
          from { transform: perspective(900px) translateX(22px) rotateY(10deg); opacity: 0; }
          to   { transform: perspective(900px) translateX(0) rotateY(0deg); opacity: 1; }
        }
        @keyframes pageExitBwd {
          from { transform: perspective(900px) translateX(0) rotateY(0deg); opacity: 1; }
          to   { transform: perspective(900px) translateX(22px) rotateY(10deg); opacity: 0; }
        }
        @keyframes pageEnterBwd {
          from { transform: perspective(900px) translateX(-22px) rotateY(-10deg); opacity: 0; }
          to   { transform: perspective(900px) translateX(0) rotateY(0deg); opacity: 1; }
        }
      `}</style>

      {/* Outer — vignette background, right padding for ribbon tabs */}
      <div
        className="sm:pr-[54px]"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "calc(100dvh - 52px)",
          background: "radial-gradient(ellipse 90% 70% at 50% 50%, #1C1610 0%, #100D09 100%)",
          padding: "16px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* Book wrapper — deep shadow for physical presence */}
        <div
          style={{
            display: "flex",
            height: "100%",
            width: "min(920px, 100%)",
            position: "relative",
            boxShadow:
              "0 40px 80px rgba(0,0,0,0.9), 0 12px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,220,120,0.04)",
            borderRadius: 10,
          }}
        >
          {/* ── Left decorative panel (desktop) ── */}
          <div
            className="hidden sm:flex"
            style={{
              width: "36%",
              flexShrink: 0,
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(160deg, #1A1208 0%, #1E1610 60%, #17110A 100%)",
              borderRadius: "10px 0 0 10px",
              border: "1px solid rgba(80,60,30,0.6)",
              borderRight: "none",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Aged rule lines */}
            {Array.from({ length: 26 }).map((_, i) => (
              <div key={i} style={{
                position: "absolute", left: 32, right: 32,
                top: `${6 + i * 3.6}%`, height: 1,
                background: "linear-gradient(90deg, transparent 0%, rgba(120,90,50,0.35) 20%, rgba(120,90,50,0.35) 80%, transparent 100%)",
              }} />
            ))}
            {/* Red margin line */}
            <div style={{
              position: "absolute", left: 58, top: "6%", bottom: "6%",
              width: 1,
              background: "linear-gradient(180deg, transparent 0%, rgba(140,50,50,0.35) 15%, rgba(140,50,50,0.35) 85%, transparent 100%)",
            }} />
            {/* Corner ornaments */}
            {corners.map((s, i) => (
              <div key={i} style={{ position: "absolute", width: 18, height: 18, ...s }} />
            ))}
            {/* Watermark */}
            <div style={{ zIndex: 1, textAlign: "center", opacity: 0.13, transform: "rotate(-5deg)" }}>
              <div style={{ fontFamily: "var(--font-playfair, serif)", fontSize: 58, color: "#C4AA7C", lineHeight: 1.05, letterSpacing: "0.02em" }}>
                청음
              </div>
              <div style={{ fontFamily: "var(--font-lora, serif)", fontStyle: "italic", fontSize: 17, color: "#9E9890", letterSpacing: "0.18em", marginTop: 10 }}>
                Diary
              </div>
            </div>
          </div>

          {/* ── Spine (desktop) ── */}
          <div
            className="hidden sm:block"
            style={{
              width: 22,
              flexShrink: 0,
              background: "linear-gradient(90deg, #080603 0%, #1E1710 20%, #2A2014 50%, #1E1710 80%, #080603 100%)",
              boxShadow: "inset 2px 0 6px rgba(0,0,0,0.8), inset -2px 0 6px rgba(0,0,0,0.8)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Raised band highlights — simulates leather spine bands */}
            {[0.12, 0.28, 0.72, 0.88].map((pos) => (
              <div key={pos} style={{
                position: "absolute", left: 0, right: 0,
                top: `${pos * 100}%`, height: 4,
                background: "linear-gradient(90deg, rgba(0,0,0,0.4) 0%, rgba(180,140,60,0.18) 50%, rgba(0,0,0,0.4) 100%)",
              }} />
            ))}
          </div>

          {/* ── Right panel wrapper (overflow: visible for ribbon tabs) ── */}
          <div style={{ flex: 1, minWidth: 0, position: "relative" }}>

            {/* Page-edge depth effect */}
            <div style={{
              position: "absolute", right: -3, top: 2, bottom: 2, width: 5,
              background: "linear-gradient(90deg, rgba(160,130,70,0.12) 0%, rgba(160,130,70,0.22) 50%, rgba(100,80,40,0.08) 100%)",
              borderRadius: "0 4px 4px 0",
              zIndex: 5,
            }} />

            {/* Visual page box */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(180deg, #201B13 0%, #1E1A12 100%)",
              borderRadius: "0 10px 10px 0",
              border: "1px solid rgba(90,68,35,0.55)",
              borderLeft: "none",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "inset 5px 0 18px rgba(0,0,0,0.55)",
            }}>

              {/* Mobile tab bar — styled as aged paper with gold underline */}
              <div
                className="sm:hidden"
                style={{
                  display: "flex",
                  borderBottom: "1px solid rgba(90,68,35,0.5)",
                  background: "linear-gradient(180deg, #1A1509 0%, #1E1A12 100%)",
                  flexShrink: 0,
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
                        borderBottom: isActive ? "2px solid #B8943F" : "2px solid transparent",
                        backgroundColor: "transparent",
                        color: isActive ? "#C4AA7C" : "#7A6A50",
                        fontSize: 12, fontWeight: isActive ? 700 : 400,
                        cursor: "pointer", letterSpacing: "0.01em",
                        fontFamily: isActive ? "var(--font-playfair, serif)" : "inherit",
                        transition: "color 0.15s, border-color 0.15s",
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Scrollable page content */}
              <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", animation: pageAnim }}>
                {isSample && (
                  <div style={{ padding: "12px 20px 0" }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      backgroundColor: "rgba(180,140,60,0.06)",
                      border: "1px solid rgba(180,140,60,0.18)",
                      borderRadius: 6, padding: "8px 12px",
                    }}>
                      <span style={{ color: "#C4AA7C", fontSize: 10, opacity: 0.6, flexShrink: 0 }}>✦</span>
                      <p style={{ color: "#7A6A50", fontSize: 11, margin: 0 }}>
                        예시 기록입니다. 앨범 커버는 실제 기록에서 표시돼요.
                      </p>
                    </div>
                  </div>
                )}
                {renderContent()}
              </div>

              {/* ── Cover — desktop 3D open ── */}
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
                {/* Leather cover */}
                <div style={{
                  width: "100%", height: "100%",
                  background: [
                    /* fine grain texture */
                    "repeating-linear-gradient(89deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)",
                    "repeating-linear-gradient(1deg, transparent, transparent 6px, rgba(255,255,255,0.01) 6px, rgba(255,255,255,0.01) 7px)",
                    /* base leather gradient */
                    "linear-gradient(160deg, #1A1007 0%, #231608 30%, #1E1309 60%, #150E06 100%)",
                  ].join(", "),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative", overflow: "hidden",
                }}>
                  {/* Aged horizontal grain lines */}
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i} style={{
                      position: "absolute", left: 0, right: 0,
                      top: `${i * 5.6}%`, height: 1,
                      background: "linear-gradient(90deg, transparent 0%, rgba(80,55,20,0.3) 30%, rgba(80,55,20,0.3) 70%, transparent 100%)",
                    }} />
                  ))}
                  {/* Outer decorative border */}
                  <div style={{
                    position: "absolute", inset: 20,
                    border: "1px solid rgba(180,140,60,0.18)",
                    borderRadius: 4,
                  }} />
                  {/* Inner decorative border */}
                  <div style={{
                    position: "absolute", inset: 28,
                    border: "1px solid rgba(180,140,60,0.1)",
                    borderRadius: 2,
                  }} />
                  {/* Corner accents on cover */}
                  {corners.map((s, i) => (
                    <div key={i} style={{
                      position: "absolute", width: 14, height: 14,
                      ...s,
                      top: typeof s.top === "number" ? s.top + 22 : undefined,
                      bottom: typeof s.bottom === "number" ? s.bottom + 22 : undefined,
                      left: typeof s.left === "number" ? s.left + 22 : undefined,
                      right: typeof s.right === "number" ? s.right + 22 : undefined,
                    }} />
                  ))}
                  {/* Title */}
                  <div style={{ textAlign: "center", zIndex: 1 }}>
                    <div style={{
                      fontFamily: "var(--font-playfair, serif)",
                      fontSize: 26,
                      color: "#C4AA7C",
                      letterSpacing: "0.1em",
                      textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 -1px 0 rgba(220,180,80,0.15)",
                    }}>
                      청음일기
                    </div>
                    <div style={{
                      width: 60, height: 1, margin: "12px auto 12px",
                      background: "linear-gradient(90deg, transparent, rgba(180,140,60,0.5), transparent)",
                    }} />
                    <div style={{
                      fontFamily: "var(--font-lora, serif)",
                      fontStyle: "italic",
                      fontSize: 11,
                      color: "#9E8C6A",
                      letterSpacing: "0.2em",
                      textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                    }}>
                      Listening Diary
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Cover — mobile fade ── */}
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
                    fontFamily: "var(--font-playfair, serif)",
                    fontSize: 26, color: "#C4AA7C",
                    letterSpacing: "0.08em",
                    textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 -1px 0 rgba(220,180,80,0.12)",
                  }}>
                    청음일기
                  </div>
                  <div style={{
                    width: 40, height: 1, margin: "10px auto 0",
                    background: "linear-gradient(90deg, transparent, rgba(180,140,60,0.45), transparent)",
                  }} />
                </div>
              </div>
            </div>

            {/* ── Desktop ribbon bookmark tabs ── */}
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
                      /* ribbon bookmark shape — pointed at bottom */
                      clipPath: "polygon(0 0, 100% 0, 100% 86%, 50% 100%, 0 86%)",
                      background: isActive
                        ? "linear-gradient(180deg, #C4A84A 0%, #A8893A 100%)"
                        : "linear-gradient(180deg, #3A2D1C 0%, #2E2416 100%)",
                      color: isActive ? "#110E08" : "#7A6848",
                      fontSize: 10,
                      fontWeight: isActive ? 700 : 500,
                      letterSpacing: "0.08em",
                      fontFamily: isActive ? "var(--font-playfair, serif)" : "inherit",
                      transition: "all 0.2s ease",
                      transform: isActive ? "translateX(5px)" : "translateX(0)",
                      filter: isActive
                        ? "drop-shadow(4px 0 10px rgba(196,168,74,0.35))"
                        : "drop-shadow(2px 0 5px rgba(0,0,0,0.6))",
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

      {/* Mobile FAB */}
      <button
        onClick={onNewEntry}
        className="sm:hidden active:scale-[0.92]"
        style={{
          position: "fixed",
          bottom: "calc(60px + env(safe-area-inset-bottom) + 16px)",
          right: 16, zIndex: 45,
          width: 50, height: 50, borderRadius: "50%",
          background: "linear-gradient(135deg, #C4A84A 0%, #A8893A 100%)",
          border: "none", color: "#110E08",
          fontSize: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5), 0 2px 6px rgba(196,168,74,0.25)",
          transition: "transform 0.12s",
        }}
        aria-label="새 기록"
      >
        ✎
      </button>
    </>
  );
}
