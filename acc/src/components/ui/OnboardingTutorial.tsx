"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "acs_onboarding_v1";
const GUIDE_STORAGE_KEY = "acs_tutorial_dismissed_v1";
const SM = 640;
const NAV_H = 64;

const STEPS = [
  { label: "홈", desc: "메인 화면이에요. 최근 추가된 앨범과 멤버들의 한줄평을 볼 수 있어요." },
  { label: "음반고", desc: "등록된 모든 앨범을 탐색하는 공간이에요. 검색·필터·정렬을 자유롭게 조합할 수 있어요." },
  { label: "청음감", desc: "멤버 평가를 집계한 명반 랭킹이에요. 연도별·장르별·아티스트별로 볼 수 있어요." },
  { label: "청음평", desc: "멤버들의 한줄평을 모아보는 피드예요. 공감과 댓글도 남길 수 있어요." },
  { label: "청음인", desc: "멤버 목록과 통계, 취향 궁합을 한눈에 볼 수 있어요." },
  { label: "청음록", desc: "내 청음 기록이에요. 나중에 들을 목록, 통계, 취향 비교도 여기에 있어요." },
] as const;

export function openOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("open-onboarding"));
}

export default function OnboardingTutorial() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [vw, setVw] = useState(0);

  const measure = useCallback(() => setVw(window.innerWidth), []);

  useEffect(() => {
    if (window.innerWidth >= SM) return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(GUIDE_STORAGE_KEY, "1");
      measure();
      setOpen(true);
    }

    const handleOpen = () => {
      if (window.innerWidth >= SM) return;
      localStorage.setItem(GUIDE_STORAGE_KEY, "1");
      measure();
      setStep(0);
      setOpen(true);
    };

    window.addEventListener("open-onboarding", handleOpen);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("open-onboarding", handleOpen);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  useEffect(() => {
    if (!open) {
      document.body.classList.remove("onboarding-active");
      return;
    }
    document.body.classList.add("onboarding-active");
    return () => {
      document.body.classList.remove("onboarding-active");
    };
  }, [open]);

  const advance = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem(STORAGE_KEY, "1");
      setOpen(false);
    }
  };

  if (!open || vw === 0 || vw >= SM) return null;

  const tabW = vw / STEPS.length;
  const tabL = step * tabW;
  const tipW = 272;
  const tipL = Math.max(12, Math.min(tabL + tabW / 2 - tipW / 2, vw - tipW - 12));
  const isLast = step === STEPS.length - 1;

  return (
    <>
      {/* Dark backdrop — BottomNav is elevated above this via .onboarding-active CSS */}
      <div style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.8)" }} />

      {/* Highlight border on active tab */}
      <div
        style={{
          position: "fixed",
          left: tabL,
          bottom: 0,
          width: tabW,
          height: `calc(${NAV_H}px + env(safe-area-inset-bottom))`,
          zIndex: 202,
          border: "2px solid var(--accent)",
          borderBottom: "none",
          borderRadius: "10px 10px 0 0",
          boxShadow: "0 0 12px rgba(232,213,163,0.25)",
          pointerEvents: "none",
        }}
      />

      {/* Tooltip card */}
      <div
        style={{
          position: "fixed",
          left: tipL,
          bottom: `calc(${NAV_H}px + env(safe-area-inset-bottom) + 14px)`,
          width: tipW,
          zIndex: 202,
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "14px 16px",
          pointerEvents: "none",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.08em" }}>
            {step + 1} / {STEPS.length}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
            {STEPS[step].label}
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, margin: "0 0 10px 0" }}>
          {STEPS[step].desc}
        </p>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
          {isLast ? "탭해서 완료" : "탭해서 다음으로 →"}
        </p>
      </div>

      {/* Full-screen click catcher — touch-action: none prevents scroll-through on mobile */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 203, cursor: "pointer", touchAction: "none" }}
        onClick={advance}
      />
    </>
  );
}
