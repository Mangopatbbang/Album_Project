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

export default function DiaryBook({ displayEntries, loading, isSample, onEdit, onDelete, onNewEntry }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("records");
  const [visibleTab, setVisibleTab] = useState<Tab>("records");
  const [flipPhase, setFlipPhase] = useState<FlipPhase>("idle");
  const [flipDir, setFlipDir] = useState<1 | -1>(1);
  const [coverOpen, setCoverOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCoverOpen(true), 120);
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
    const t = setTimeout(() => {
      setVisibleTab(activeTab);
      setFlipPhase("enter");
    }, 180);
    return () => clearTimeout(t);
  }, [flipPhase, activeTab]);

  useEffect(() => {
    if (flipPhase !== "enter") return;
    const t = setTimeout(() => setFlipPhase("idle"), 180);
    return () => clearTimeout(t);
  }, [flipPhase]);

  const pageAnim =
    flipPhase === "exit"
      ? flipDir === 1
        ? "pageExitFwd 0.18s ease-in forwards"
        : "pageExitBwd 0.18s ease-in forwards"
      : flipPhase === "enter"
      ? flipDir === 1
        ? "pageEnterFwd 0.18s ease-out forwards"
        : "pageEnterBwd 0.18s ease-out forwards"
      : "none";

  const renderContent = () => {
    switch (visibleTab) {
      case "records":
        return (
          <RecordsTab
            entries={displayEntries}
            loading={loading}
            onEdit={onEdit}
            onDelete={onDelete}
            onNewEntry={onNewEntry}
            isSample={isSample}
          />
        );
      case "calendar":
        return (
          <CalendarTab
            entries={displayEntries}
            onEdit={onEdit}
            onDelete={onDelete}
            isSample={isSample}
          />
        );
      case "albums":
        return (
          <AlbumsTab
            entries={displayEntries}
            onEdit={onEdit}
            onDelete={onDelete}
            isSample={isSample}
          />
        );
      case "stats":
        return <StatsTab entries={displayEntries} />;
    }
  };

  return (
    <>
      <style>{`
        @keyframes bookCoverOpen {
          0%   { transform: rotateY(0deg); opacity: 1; }
          50%  { opacity: 0.8; }
          100% { transform: rotateY(-112deg); opacity: 0; }
        }
        @keyframes mobileCoverFade {
          0%   { opacity: 1; }
          100% { opacity: 0; }
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

      {/* Outer layout — sm: has right padding to give room for post-it tabs */}
      <div
        className="sm:pr-[54px]"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "calc(100dvh - 52px)",
          backgroundColor: "var(--bg)",
          padding: "16px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* Book wrapper */}
        <div
          style={{
            display: "flex",
            height: "100%",
            width: "min(920px, 100%)",
            position: "relative",
          }}
        >
          {/* Left decorative panel — desktop only */}
          <div
            className="hidden sm:flex"
            style={{
              width: "36%",
              flexShrink: 0,
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#1F1C19",
              borderRadius: "10px 0 0 10px",
              border: "1px solid var(--border)",
              borderRight: "none",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Lined paper effect */}
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 28,
                  right: 28,
                  top: `${7 + i * 3.9}%`,
                  height: 1,
                  backgroundColor: "var(--border)",
                  opacity: 0.4,
                }}
              />
            ))}
            {/* Red margin line */}
            <div
              style={{
                position: "absolute",
                left: 52,
                top: "7%",
                bottom: "7%",
                width: 1,
                backgroundColor: "#7B3B3B",
                opacity: 0.18,
              }}
            />
            {/* Watermark */}
            <div
              style={{
                zIndex: 1,
                textAlign: "center",
                opacity: 0.08,
                transform: "rotate(-5deg)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-playfair, serif)",
                  fontSize: 56,
                  color: "var(--accent)",
                  lineHeight: 1.05,
                }}
              >
                청음
              </div>
              <div
                style={{
                  fontFamily: "var(--font-lora, serif)",
                  fontStyle: "italic",
                  fontSize: 18,
                  color: "var(--text-muted)",
                  letterSpacing: "0.14em",
                  marginTop: 10,
                }}
              >
                Diary
              </div>
            </div>
          </div>

          {/* Spine — desktop only */}
          <div
            className="hidden sm:block"
            style={{
              width: 14,
              flexShrink: 0,
              background:
                "linear-gradient(90deg, #0C0A08 0%, #231F1B 44%, #1A1714 56%, #0C0A08 100%)",
              boxShadow: "inset 0 0 10px rgba(0,0,0,0.7)",
            }}
          />

          {/* Right panel — content area wrapper (overflow: visible for tabs) */}
          <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
            {/* Visual page box */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "var(--bg-card)",
                borderRadius: "0 10px 10px 0",
                border: "1px solid var(--border)",
                borderLeft: "none",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Mobile tab bar */}
              <div
                className="sm:hidden"
                style={{
                  display: "flex",
                  borderBottom: "1px solid var(--border)",
                  backgroundColor: "#201D1A",
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
                        flex: 1,
                        padding: "11px 0",
                        border: "none",
                        borderBottom: isActive
                          ? "2px solid var(--accent)"
                          : "2px solid transparent",
                        backgroundColor: "transparent",
                        color: isActive ? "var(--accent)" : "var(--text-muted)",
                        fontSize: 12,
                        fontWeight: isActive ? 700 : 400,
                        cursor: "pointer",
                        letterSpacing: "-0.01em",
                        transition: "color 0.15s, border-color 0.15s",
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Scrollable page content */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  overflowX: "hidden",
                  animation: pageAnim,
                }}
              >
                {isSample && (
                  <div style={{ padding: "12px 20px 0" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        backgroundColor: "rgba(196,170,124,0.05)",
                        border: "1px solid rgba(196,170,124,0.15)",
                        borderRadius: 8,
                        padding: "8px 12px",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--accent)",
                          fontSize: 10,
                          opacity: 0.6,
                          flexShrink: 0,
                        }}
                      >
                        ✦
                      </span>
                      <p
                        style={{
                          color: "var(--text-muted)",
                          fontSize: 11,
                          margin: 0,
                        }}
                      >
                        예시 기록입니다. 앨범 커버는 실제 기록에서 표시돼요.
                      </p>
                    </div>
                  </div>
                )}
                {renderContent()}
              </div>

              {/* Cover — desktop 3D open */}
              <div
                className="hidden sm:block"
                style={{
                  position: "absolute",
                  inset: 0,
                  transformOrigin: "left center",
                  animation: coverOpen
                    ? "bookCoverOpen 0.9s cubic-bezier(0.22,1,0.36,1) 0.2s forwards"
                    : "none",
                  zIndex: 20,
                  pointerEvents: coverOpen ? "none" : "auto",
                  borderRadius: "0 10px 10px 0",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: "#1C1814",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: `${i * 5}%`,
                        height: 1,
                        backgroundColor: "#3C3733",
                        opacity: 0.28,
                      }}
                    />
                  ))}
                  <div style={{ textAlign: "center", zIndex: 1 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-playfair, serif)",
                        fontSize: 28,
                        color: "#C4AA7C",
                        opacity: 0.78,
                        letterSpacing: "0.06em",
                      }}
                    >
                      청음일기
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-lora, serif)",
                        fontStyle: "italic",
                        fontSize: 12,
                        color: "#9E9890",
                        opacity: 0.52,
                        marginTop: 12,
                        letterSpacing: "0.14em",
                      }}
                    >
                      Listening Diary
                    </div>
                  </div>
                </div>
              </div>

              {/* Cover — mobile fade */}
              <div
                className="sm:hidden"
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "#1C1814",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  animation: coverOpen
                    ? "mobileCoverFade 0.65s ease-out 0.2s forwards"
                    : "none",
                  zIndex: 20,
                  pointerEvents: coverOpen ? "none" : "auto",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-playfair, serif)",
                      fontSize: 26,
                      color: "#C4AA7C",
                      opacity: 0.72,
                    }}
                  >
                    청음일기
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop post-it bookmark tabs (outside overflow:hidden page box) */}
            <div
              className="hidden sm:flex"
              style={{
                position: "absolute",
                right: -42,
                top: 28,
                flexDirection: "column",
                gap: 5,
                zIndex: 15,
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
                      padding: "14px 8px",
                      border: "1px solid",
                      borderLeft: "none",
                      borderColor: isActive
                        ? "rgba(196,170,124,0.4)"
                        : "rgba(60,55,51,0.7)",
                      cursor: "pointer",
                      borderRadius: "0 6px 6px 0",
                      backgroundColor: isActive ? "#C4AA7C" : "#2A2420",
                      color: isActive ? "#1C1917" : "#6E6560",
                      fontSize: 11,
                      fontWeight: isActive ? 700 : 500,
                      letterSpacing: "0.05em",
                      transition: "all 0.18s ease",
                      transform: isActive ? "translateX(4px)" : "translateX(0)",
                      boxShadow: isActive
                        ? "4px 0 14px rgba(196,170,124,0.22)"
                        : "2px 0 6px rgba(0,0,0,0.45)",
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
          right: 16,
          zIndex: 45,
          width: 50,
          height: 50,
          borderRadius: "50%",
          backgroundColor: "var(--accent)",
          border: "none",
          color: "#1C1917",
          fontSize: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
          transition: "transform 0.12s",
        }}
        aria-label="새 기록"
      >
        ✎
      </button>
    </>
  );
}
