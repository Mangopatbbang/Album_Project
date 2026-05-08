"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "acs_onboarding_v1";
const GUIDE_STORAGE_KEY = "acs_tutorial_dismissed_v1";

// ── Step definitions ───────────────────────────────────────────

type TourStep = {
  id: string;
  title: string;
  body: string;
  selector: string;
  altSelector?: string; // fallback for desktop when primary is sm:hidden
  navigate?: string;
};

const STEPS: TourStep[] = [
  {
    id: "nav-albums",
    title: "음반고",
    body: "저장된 모든 앨범을 탐색해보세요. 검색·장르·정렬 필터로 원하는 앨범을 찾을 수 있어요.",
    selector: '[data-tour="nav-albums"]',
    navigate: "/albums",
  },
  {
    id: "albums-filter",
    title: "검색 & 필터",
    body: "제목이나 아티스트명으로 실시간 검색이 가능해요. 장르·정렬·점수 필터도 자유롭게 조합할 수 있어요.",
    selector: '[data-tour="albums-filter"]',
  },
  {
    id: "album-card",
    title: "앨범 카드",
    body: "클릭하면 상세 화면이 열려요. 1~8점 평가, 한줄평, 북마크, 수록곡 좋아요를 남길 수 있어요.",
    selector: '[data-tour="album-card"]',
  },
  {
    id: "nav-best",
    title: "청음감 — 명반 랭킹",
    body: "전체·연도별·장르별·아티스트별 랭킹을 볼 수 있어요. 국내/해외 필터도 지원돼요.",
    selector: '[data-tour="nav-best"]',
    altSelector: '[data-tour="best-main"]',
    navigate: "/best",
  },
  {
    id: "best-tabs",
    title: "랭킹 보기 전환",
    body: "통합 랭킹부터 연도별·장르별·아티스트별로 다양하게 볼 수 있어요.",
    selector: '[data-tour="best-tabs"]',
  },
  {
    id: "nav-reviews",
    title: "청음평 — 한줄평 피드",
    body: "모든 멤버의 한줄평을 피드로 볼 수 있어요. 공감하거나 댓글을 달 수도 있어요.",
    selector: '[data-tour="nav-reviews"]',
    altSelector: '[data-tour="reviews-main"]',
    navigate: "/reviews",
  },
  {
    id: "nav-members",
    title: "청음인 — 멤버 현황",
    body: "모임 멤버들의 평가 현황과 취향 궁합을 확인할 수 있어요.",
    selector: '[data-tour="nav-members"]',
    altSelector: '[data-tour="members-main"]',
    navigate: "/members",
  },
  {
    id: "nav-profile",
    title: "청음록 — 내 프로필",
    body: "내 평점 통계, 청음 캘린더, 뱃지, 북마크 목록이 여기에 있어요. 로그인 후 사용할 수 있어요.",
    selector: '[data-tour="nav-profile"]',
  },
  {
    id: "floating-actions",
    title: "··· 메뉴",
    body: "공지사항, 튜토리얼 다시 보기, 이용 가이드, 문의 게시판에 접근할 수 있어요.",
    selector: '[data-tour="floating-actions"]',
  },
];

// ── Element finder ─────────────────────────────────────────────

async function findVisible(selector: string, altSelector?: string, timeout = 2500): Promise<DOMRect | null> {
  const start = Date.now();
  let hiddenStreak = 0;
  let usingAlt = false;
  while (Date.now() - start < timeout) {
    const target = usingAlt ? altSelector! : selector;
    const el = document.querySelector(target);
    if (el) {
      const style = window.getComputedStyle(el);
      if (style.display !== "none" && style.visibility !== "hidden") {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) return rect;
      } else if (!usingAlt) {
        hiddenStreak++;
        if (hiddenStreak >= 5) {
          if (!altSelector) return null;
          usingAlt = true;
        }
      }
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

// ── SVG spotlight ──────────────────────────────────────────────

function SpotlightMask({ rect }: { rect: DOMRect }) {
  const pad = 8;
  const r = 10;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const x = Math.max(0, rect.left - pad);
  const y = Math.max(0, rect.top - pad);
  const w = Math.min(rect.width + pad * 2, W - x);
  const h = Math.min(rect.height + pad * 2, H - y);
  const cr = Math.min(r, w / 2, h / 2);

  const hole =
    `M ${x + cr},${y} h ${w - 2 * cr} a ${cr},${cr} 0 0 1 ${cr},${cr}` +
    ` v ${h - 2 * cr} a ${cr},${cr} 0 0 1 ${-cr},${cr}` +
    ` h ${-(w - 2 * cr)} a ${cr},${cr} 0 0 1 ${-cr},${-cr}` +
    ` v ${-(h - 2 * cr)} a ${cr},${cr} 0 0 1 ${cr},${-cr} Z`;

  return (
    <svg
      style={{ position: "fixed", inset: 0, zIndex: 300, pointerEvents: "none" }}
      width={W}
      height={H}
    >
      <path d={`M 0,0 H ${W} V ${H} H 0 Z ${hole}`} fill="rgba(0,0,0,0.78)" fillRule="evenodd" />
      <rect x={x} y={y} width={w} height={h} rx={cr} fill="none" stroke="rgba(232,213,163,0.45)" strokeWidth="1.5" />
    </svg>
  );
}

// ── Callout tooltip ────────────────────────────────────────────

function Callout({
  rect, step, stepIdx, totalSteps,
  onPrev, onNext, onSkip, canGoBack, isLast,
}: {
  rect: DOMRect; step: TourStep; stepIdx: number; totalSteps: number;
  onPrev: () => void; onNext: () => void; onSkip: () => void;
  canGoBack: boolean; isLast: boolean;
}) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const sidePad = 14;
  const boxW = Math.min(296, W - sidePad * 2);

  const cx = rect.left + rect.width / 2;
  const left = Math.max(sidePad, Math.min(cx - boxW / 2, W - boxW - sidePad));

  // Prefer below if enough space, else above
  const spaceBelow = H - (rect.bottom + 14);
  const spaceAbove = rect.top - 14;
  const below = spaceBelow >= 180 || spaceBelow >= spaceAbove;

  const arrowLeft = Math.max(14, Math.min(cx - left - 6, boxW - 28));

  return (
    <div style={{
      position: "fixed",
      left,
      ...(below ? { top: rect.bottom + 14 } : { bottom: H - rect.top + 14 }),
      width: boxW,
      zIndex: 302,
    }}>
      {/* Arrow (above box when below=true, below box when below=false) */}
      {below && (
        <div style={{
          position: "absolute",
          top: -6, left: arrowLeft,
          width: 12, height: 12,
          backgroundColor: "var(--bg-card)",
          borderLeft: "1px solid var(--border-light)",
          borderTop: "1px solid var(--border-light)",
          transform: "rotate(45deg)",
          zIndex: 0,
        }} />
      )}

      {/* Box */}
      <div style={{
        position: "relative",
        zIndex: 1,
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-light)",
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
        overflow: "hidden",
      }}>
        <div style={{ padding: "14px 16px 10px" }}>
          {/* Dots */}
          <div style={{ display: "flex", gap: 4, marginBottom: 10, alignItems: "center" }}>
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} style={{
                width: i === stepIdx ? 16 : 5, height: 5, borderRadius: 3, flexShrink: 0,
                backgroundColor: i === stepIdx ? "var(--accent)" : i < stepIdx ? "rgba(232,213,163,0.38)" : "var(--border-light)",
                transition: "all 0.18s",
              }} />
            ))}
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>
              {stepIdx + 1} / {totalSteps}
            </span>
          </div>
          <p style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", margin: "0 0 5px 0" }}>{step.title}</p>
          <p style={{ fontSize: 12, color: "var(--text-sub)", lineHeight: 1.65, margin: 0 }}>{step.body}</p>
        </div>
        <div style={{ display: "flex", gap: 6, padding: "8px 12px 12px", borderTop: "1px solid var(--border)" }}>
          <button onClick={onSkip} style={{
            background: "none", border: "none", color: "var(--text-muted)",
            fontSize: 11, cursor: "pointer", padding: "7px 4px", flexShrink: 0,
          }}>건너뛰기</button>
          {canGoBack && (
            <button onClick={onPrev} style={{
              flex: 1, padding: "7px 0",
              backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
              color: "var(--text-sub)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>이전</button>
          )}
          <button onClick={onNext} style={{
            flex: 2, padding: "7px 0",
            backgroundColor: "var(--accent)", border: "none",
            color: "var(--bg)", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>{isLast ? "완료 →" : "다음 →"}</button>
        </div>
      </div>

      {/* Arrow (below box when below=false) */}
      {!below && (
        <div style={{
          position: "absolute",
          bottom: -6, left: arrowLeft,
          width: 12, height: 12,
          backgroundColor: "var(--bg-card)",
          borderRight: "1px solid var(--border-light)",
          borderBottom: "1px solid var(--border-light)",
          transform: "rotate(45deg)",
        }} />
      )}
    </div>
  );
}

// ── Centered card (intro / end) ────────────────────────────────

function CenteredCard({ icon, title, body, primaryLabel, onPrimary, secondaryLabel, onSecondary }: {
  icon: string; title: string; body: string;
  primaryLabel: string; onPrimary: () => void;
  secondaryLabel?: string; onSecondary?: () => void;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 302,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        width: "100%", maxWidth: 360,
        backgroundColor: "var(--bg-card)", borderRadius: 22,
        overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.65)",
        animation: "modalIn 0.22s ease-out",
      }}>
        <div style={{ padding: "28px 24px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>{icon}</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>{title}</p>
          <p style={{ fontSize: 13, color: "var(--text-sub)", lineHeight: 1.75 }}>{body}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px 20px" }}>
          <button onClick={onPrimary} style={{
            width: "100%", padding: "13px 0",
            backgroundColor: "var(--accent)", border: "none",
            color: "var(--bg)", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}>{primaryLabel}</button>
          {secondaryLabel && onSecondary && (
            <button onClick={onSecondary} style={{
              background: "none", border: "none", color: "var(--text-muted)",
              fontSize: 13, cursor: "pointer", padding: "6px 0",
            }}>{secondaryLabel}</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Exports ────────────────────────────────────────────────────

export function openOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("open-onboarding"));
}

// ── Main component ─────────────────────────────────────────────

type Phase = "intro" | "loading" | "step" | "end";

export default function SpotlightTour() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const router = useRouter();
  const processingRef = useRef(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(GUIDE_STORAGE_KEY, "1");
      setOpen(true);
    }
    const handleOpen = () => {
      localStorage.setItem(GUIDE_STORAGE_KEY, "1");
      setPhase("intro");
      setStepIdx(0);
      setHistory([]);
      setRect(null);
      setOpen(true);
    };
    window.addEventListener("open-onboarding", handleOpen);
    return () => window.removeEventListener("open-onboarding", handleOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Re-measure on resize
  useEffect(() => {
    if (phase !== "step") return;
    const step = STEPS[stepIdx];
    const update = () => {
      const el = document.querySelector(step.selector);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [phase, stepIdx]);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
    setRect(null);
  };

  async function goToIdx(idx: number) {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      if (idx >= STEPS.length) { setPhase("end"); return; }

      setPhase("loading");
      setRect(null);

      const step = STEPS[idx];
      if (step.navigate) {
        router.push(step.navigate);
        await new Promise((r) => setTimeout(r, 420));
      }

      const found = await findVisible(step.selector, step.altSelector);
      if (!found) {
        // Element not visible (hidden on this breakpoint) — skip
        processingRef.current = false;
        await goToIdx(idx + 1);
        return;
      }

      setStepIdx(idx);
      setRect(found);
      setPhase("step");
    } finally {
      processingRef.current = false;
    }
  }

  const startTour = () => {
    setHistory([]);
    goToIdx(0);
  };

  const goNext = () => {
    setHistory((h) => [...h, stepIdx]);
    goToIdx(stepIdx + 1);
  };

  const goPrev = () => {
    if (history.length === 0) {
      setPhase("intro");
      setRect(null);
      return;
    }
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    goToIdx(prev);
  };

  const goLogin = () => {
    close();
    router.push("/login");
  };

  if (!open) return null;

  const darkOverlay = (
    <div style={{ position: "fixed", inset: 0, zIndex: 299, backgroundColor: "rgba(0,0,0,0.78)" }} />
  );
  // Blocks all page interactions during the tour
  const blocker = (
    <div style={{ position: "fixed", inset: 0, zIndex: 301 }} />
  );

  if (phase === "intro") {
    return (
      <>
        {darkOverlay}
        {blocker}
        <CenteredCard
          icon="🎵"
          title="아차청음사 둘러보기"
          body={"소규모 음악 모임을 위한 앨범 평가 아카이브예요.\n각 기능이 어디에 있는지 하나씩 알려드릴게요."}
          primaryLabel="시작하기 →"
          onPrimary={startTour}
          secondaryLabel="건너뛰기"
          onSecondary={close}
        />
      </>
    );
  }

  if (phase === "loading") {
    return (
      <>
        {darkOverlay}
        {blocker}
        <div style={{
          position: "fixed", inset: 0, zIndex: 302,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            border: "3px solid rgba(232,213,163,0.2)",
            borderTopColor: "var(--accent)",
            animation: "spin 0.8s linear infinite",
          }} />
        </div>
      </>
    );
  }

  if (phase === "end") {
    return (
      <>
        {darkOverlay}
        {blocker}
        <CenteredCard
          icon="🎉"
          title="모든 기능을 둘러봤어요!"
          body={"로그인하고 첫 번째 앨범 평가를 남겨보세요.\n로그인 없이도 앨범과 한줄평을 둘러볼 수 있어요."}
          primaryLabel="로그인 / 회원가입"
          onPrimary={goLogin}
          secondaryLabel="그냥 둘러볼게요"
          onSecondary={close}
        />
      </>
    );
  }

  // phase === "step"
  if (!rect) return null;

  return (
    <>
      <SpotlightMask rect={rect} />
      {blocker}
      <Callout
        rect={rect}
        step={STEPS[stepIdx]}
        stepIdx={stepIdx}
        totalSteps={STEPS.length}
        onPrev={goPrev}
        onNext={goNext}
        onSkip={close}
        canGoBack={history.length > 0}
        isLast={stepIdx === STEPS.length - 1}
      />
    </>
  );
}
