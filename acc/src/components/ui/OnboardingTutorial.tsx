"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "acs_onboarding_v1";
const GUIDE_STORAGE_KEY = "acs_tutorial_dismissed_v1";

// ── UI primitives ──────────────────────────────────────────────

function Btn({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline",
      padding: "1px 7px", borderRadius: 4,
      border: "1px solid var(--border-light)",
      backgroundColor: "var(--bg-elevated)",
      fontSize: "0.87em", fontWeight: 700,
      color: "var(--text)", verticalAlign: "middle",
    }}>
      {children}
    </span>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ display: "flex", gap: 7, marginBottom: 10, alignItems: "flex-start" }}>
      <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0, marginTop: 2, fontSize: 11 }}>▸</span>
      <span style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65 }}>{children}</span>
    </li>
  );
}

function Rows({ children }: { children: React.ReactNode }) {
  return <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>{children}</ul>;
}

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em",
      margin: "14px 0 7px 0", paddingBottom: 5,
      borderBottom: "1px solid rgba(232,213,163,0.15)",
    }}>
      {children}
    </p>
  );
}

function CautionBox({ items }: { items: React.ReactNode[] }) {
  return (
    <div style={{
      backgroundColor: "rgba(232,213,163,0.05)",
      border: "1px solid rgba(232,213,163,0.15)",
      borderRadius: 8, padding: "9px 12px", marginTop: 14,
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", margin: "0 0 5px 0", letterSpacing: "0.06em" }}>⚠ 유의사항</p>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {items.map((item, i) => (
          <li key={i} style={{
            display: "flex", gap: 6, alignItems: "flex-start",
            fontSize: 12, color: "var(--text-sub)", lineHeight: 1.65,
            marginBottom: i < items.length - 1 ? 4 : 0,
          }}>
            <span style={{ flexShrink: 0 }}>–</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Step content ───────────────────────────────────────────────

function S0() {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 13, color: "var(--text-sub)", lineHeight: 1.8, marginBottom: 20 }}>
        소규모 음악 모임을 위한 앨범 평가 아카이브예요.<br />
        앨범을 탐색하고, 점수와 한줄평을 남기고,<br />
        멤버들의 취향을 비교해보세요.
      </p>
      <div style={{
        display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center",
        backgroundColor: "var(--bg-elevated)", borderRadius: 12, padding: "14px 16px", marginBottom: 20,
      }}>
        {["음반고 탐색", "앨범 평가", "명반 랭킹", "한줄평 피드", "멤버 통계", "프로필"].map((label) => (
          <span key={label} style={{
            fontSize: 12, color: "var(--text-muted)",
            backgroundColor: "var(--bg-card)", borderRadius: 6,
            padding: "3px 10px", border: "1px solid var(--border)",
          }}>
            {label}
          </span>
        ))}
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
        각 기능의 주요 버튼과 상호작용을 순서대로 안내해드릴게요.<br />
        언제든 건너뛰기로 닫을 수 있어요.
      </p>
    </div>
  );
}

function S1() {
  return (
    <>
      <Rows>
        <Row>상단 <Btn>검색창</Btn>에 제목 또는 아티스트명 입력 → 실시간으로 결과가 필터링돼요.</Row>
        <Row><Btn>장르</Btn> · <Btn>정렬</Btn> 드롭다운으로 필터를 자유롭게 조합할 수 있어요.</Row>
        <Row>로그인 후엔 <Btn>내 평점 높은순</Btn> · <Btn>미청음만 보기</Btn> · 점수 버튼 필터가 추가로 활성화돼요.</Row>
        <Row>앨범 카드 아래 아티스트 이름 클릭 → 해당 아티스트의 다른 앨범을 모아보는 모달이 열려요.</Row>
        <Row>카드 우측 하단 <Btn>Spotify</Btn> · <Btn>SC</Btn> 아이콘 → 해당 스트리밍 서비스로 바로 이동해요.</Row>
        <Row>목록 하단까지 스크롤하면 다음 앨범이 자동으로 불러와져요 <span style={{ color: "var(--text-muted)", fontSize: 12 }}>(무한스크롤)</span>.</Row>
        <Row>우측 상단 <Btn>입고</Btn> 버튼으로 새 앨범을 등록할 수 있어요.</Row>
      </Rows>
      <CautionBox items={[
        <>검색 결과가 없을 때 <Btn>바로 추가하기</Btn>를 누르면 해당 검색어가 입력된 채로 입고 창으로 이동해요.</>,
        <>아티스트 영문 표기가 다를 수 있어요. 결과가 없으면 표기를 바꿔서 시도해보세요.</>,
      ]} />
    </>
  );
}

function S2() {
  return (
    <>
      <Rows>
        <Row>앨범 카드 클릭 → 상세 모달 오픈. 닫기: <Btn>✕</Btn> · ESC · 배경 클릭 · 모바일에서 아래로 스와이프.</Row>
        <Row><Btn>1</Btn>~<Btn>8</Btn> 점수 버튼으로 점수 선택 → <Btn>저장</Btn> 클릭으로 확정. <Btn>기준 참고</Btn>로 채점 기준표를 볼 수 있어요.</Row>
        <Row>한줄평 입력란에 최대 <b>100자</b> 소감을 남겨요. 긴 한줄평은 <Btn>...더보기</Btn>로 펼쳐져요.</Row>
        <Row><Btn>🔖</Btn> 북마크 버튼 → 나중에 들을 목록에 추가·제거. 청음록에서 확인할 수 있어요.</Row>
        <Row>다른 멤버 한줄평 옆 <Btn>♡</Btn> 버튼으로 공감. 공감 수 이모지를 누르면 공감한 멤버 목록이 나와요.</Row>
        <Row>수록곡 영역 클릭 → 트랙 목록 펼치기. 트랙 옆 <Btn>♡</Btn>로 좋아하는 곡 기록 — 스토리카드에 포함 가능해요.</Row>
        <Row>우측 상단 <Btn>카드</Btn> 버튼으로 평가 내용을 스토리 이미지로 저장할 수 있어요.</Row>
      </Rows>
      <CautionBox items={[
        <><Btn>삭제</Btn> 클릭 후 5초 안에 되돌리기 가능 — 이후엔 한줄평·트랙 좋아요까지 함께 삭제돼요.</>,
        <>한줄평 100자 초과 시 저장되지 않아요.</>,
        <>자신의 한줄평에는 공감을 누를 수 없어요.</>,
        <>수록곡 정보가 없는 앨범은 트랙 좋아요 기능이 비활성화돼요.</>,
      ]} />
    </>
  );
}

function S3() {
  return (
    <>
      <Rows>
        <Row>음반고 우측 상단 <Btn>입고</Btn> 버튼 클릭 → 입고 창 오픈.</Row>
        <Row>아티스트명 + 앨범명 입력 → <Btn>Spotify에서 검색</Btn> 클릭 → 후보 목록 확인.</Row>
        <Row>후보 앨범 선택 → 커버·발매일·수록곡이 자동으로 채워져요.</Row>
        <Row>발매일이 Spotify와 Apple Music에서 다를 경우 직접 날짜를 선택할 수 있어요.</Row>
        <Row>장르는 드롭다운에서 선택. 수록곡이 자동으로 채워지지 않으면 직접 입력 <span style={{ color: "var(--text-muted)", fontSize: 12 }}>(세미콜론으로 구분)</span>해요.</Row>
        <Row>Spotify에 없는 앨범은 하단 <Btn>SoundCloud 앨범 입고</Btn> 탭을 이용하세요.</Row>
      </Rows>
      <CautionBox items={[
        <>수록곡 3곡 미만인 싱글·EP는 등록할 수 없어요.</>,
        <>이미 등록된 앨범은 중복이 차단돼요. 음반고에서 먼저 검색해보세요.</>,
      ]} />
    </>
  );
}

function S4() {
  return (
    <>
      <SLabel>청음감 — 명반 랭킹</SLabel>
      <Rows>
        <Row>상단 탭으로 <Btn>전체 랭킹</Btn> / <Btn>연도별</Btn> / <Btn>장르별</Btn> / <Btn>아티스트별</Btn> 보기를 전환해요.</Row>
        <Row><Btn>전체</Btn> · <Btn>국내</Btn> · <Btn>해외</Btn> 필터로 지역별로 골라볼 수 있어요.</Row>
        <Row>아티스트별 보기에서 <Btn>평균 평점순</Btn> / <Btn>음반 수순</Btn> 정렬 전환이 가능해요.</Row>
        <Row>장르·연도별 섹션 우측 <Btn>더보기</Btn> → 해당 카테고리 전체 목록이 팝업으로 나와요.</Row>
      </Rows>
      <SLabel>청음평 — 한줄평 피드</SLabel>
      <Rows>
        <Row>멤버별·점수 범위별 필터와 <Btn>최신순</Btn> / <Btn>공감순</Btn> 정렬을 조합할 수 있어요.</Row>
        <Row>앨범 제목 클릭 → 해당 앨범 한줄평만 필터링. 상단 배지 <Btn>✕</Btn>로 해제해요.</Row>
        <Row>한줄평 우측 말풍선 아이콘 → 댓글 영역 펼치기. 최대 200자, Enter로 바로 제출돼요.</Row>
        <Row><Btn>♡</Btn> 버튼으로 다른 멤버 한줄평에 공감. 공감 이모지로 공감한 멤버 목록 확인 가능.</Row>
      </Rows>
      <CautionBox items={[
        <>자신의 한줄평에는 공감을 누를 수 없어요.</>,
        <>평가 인원이 적은 앨범이 랭킹 상위에 오를 수 있어요. 통계적 참고 자료로 활용하세요.</>,
      ]} />
    </>
  );
}

function S5() {
  return (
    <>
      <SLabel>청음인 — 멤버 현황</SLabel>
      <Rows>
        <Row>멤버 카드 클릭 → 해당 멤버의 청음록(프로필)으로 이동해요.</Row>
        <Row>취향 궁합 섹션 → 두 멤버 간 공통 앨범의 점수 차이를 볼 수 있어요. 낮을수록 취향이 비슷해요.</Row>
      </Rows>
      <SLabel>청음록 — 내 프로필 & 통계</SLabel>
      <Rows>
        <Row><Btn>편집</Btn> 버튼으로 닉네임·프로필 이미지를 변경할 수 있어요.</Row>
        <Row>점수 분포 막대 클릭 → 해당 점수를 준 앨범만 음반고에서 바로 볼 수 있어요.</Row>
        <Row>청음 캘린더 날짜 클릭 → 그날 평가한 앨범 목록이 표시돼요.</Row>
        <Row>취향 비교 드롭다운 → 다른 멤버와 공통 앨범 점수를 비교해요.</Row>
        <Row><Btn>카메라</Btn> 아이콘 → 프로필 카드를 이미지로 캡처·저장해요.</Row>
        <Row><Btn>하트</Btn> 아이콘 → 내가 트랙 <Btn>♡</Btn>를 누른 곡 전체 목록을 볼 수 있어요.</Row>
        <Row>뱃지 위에 마우스를 올리거나(데스크탑) 길게 누르면(모바일) 획득 조건이 표시돼요.</Row>
      </Rows>
    </>
  );
}

// ── Step definitions ───────────────────────────────────────────

const STEPS = [
  { icon: "🎵", subtitle: "투어 시작", title: "아차청음사", Content: S0 },
  { icon: "📦", subtitle: "음반고", title: "앨범 탐색", Content: S1 },
  { icon: "⭐", subtitle: "앨범 상세", title: "평가하기", Content: S2 },
  { icon: "📥", subtitle: "입고", title: "앨범 등록하기", Content: S3 },
  { icon: "📖", subtitle: "청음감 · 청음평", title: "랭킹 & 리뷰 피드", Content: S4 },
  { icon: "👥", subtitle: "청음인 · 청음록", title: "멤버 & 프로필", Content: S5 },
] as const;

// ── Exports ────────────────────────────────────────────────────

export function openOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("open-onboarding"));
}

// ── Main component ─────────────────────────────────────────────

export default function OnboardingTutorial() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [isEnd, setIsEnd] = useState(false);
  const router = useRouter();
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(GUIDE_STORAGE_KEY, "1");
      setOpen(true);
    }
    const handleOpen = () => {
      localStorage.setItem(GUIDE_STORAGE_KEY, "1");
      setStep(0);
      setIsEnd(false);
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

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [step, isEnd]);

  const skip = () => { localStorage.setItem(STORAGE_KEY, "1"); setOpen(false); };
  const finish = () => { localStorage.setItem(STORAGE_KEY, "1"); setOpen(false); };
  const goLogin = () => { localStorage.setItem(STORAGE_KEY, "1"); setOpen(false); router.push("/login"); };

  const goNext = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else setIsEnd(true);
  };

  const goPrev = () => {
    if (isEnd) setIsEnd(false);
    else if (step > 0) setStep((s) => s - 1);
  };

  if (!open) return null;

  const { icon, subtitle, title, Content } = STEPS[step];
  const canGoBack = step > 0 || isEnd;
  const totalDots = STEPS.length + 1;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 300, backgroundColor: "rgba(0,0,0,0.75)" }}
      className="flex items-end sm:items-center justify-center"
    >
      <div
        style={{
          width: "100%", maxWidth: 520, maxHeight: "92dvh",
          backgroundColor: "var(--bg-card)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
        className="rounded-t-2xl sm:rounded-2xl"
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>{isEnd ? "🎉" : icon}</span>
            <div>
              <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.08em", margin: 0 }}>
                {isEnd ? "완료" : subtitle}
              </p>
              <p style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", margin: 0 }}>
                {isEnd ? "투어 완료!" : title}
              </p>
            </div>
          </div>
          <button
            onClick={skip}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--text-muted)", padding: "6px 2px" }}
          >
            건너뛰기 ✕
          </button>
        </div>

        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 5, padding: "10px 20px 0", flexShrink: 0 }}>
          {Array.from({ length: totalDots }, (_, i) => {
            const active = isEnd ? i === totalDots - 1 : i === step;
            const past = isEnd ? true : i < step;
            return (
              <div key={i} style={{
                width: active ? 18 : 6, height: 6, borderRadius: 3,
                backgroundColor: active ? "var(--accent)" : past ? "rgba(232,213,163,0.35)" : "var(--border-light)",
                transition: "all 0.2s ease",
              }} />
            );
          })}
        </div>

        {/* Body */}
        {isEnd ? (
          <div ref={bodyRef} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "28px 24px", textAlign: "center", overflowY: "auto",
          }}>
            <p style={{ fontSize: 40, marginBottom: 14 }}>🎉</p>
            <p style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>모든 기능을 둘러봤어요!</p>
            <p style={{ fontSize: 13, color: "var(--text-sub)", lineHeight: 1.7, marginBottom: 28 }}>
              로그인하고 첫 번째 앨범 평가를 남겨보세요.<br />
              로그인 없이도 앨범과 한줄평을 둘러볼 수 있어요.
            </p>
            <button
              onClick={goLogin}
              style={{
                width: "100%", maxWidth: 300, padding: "13px 0",
                backgroundColor: "var(--accent)", color: "var(--bg)",
                border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700,
                cursor: "pointer", marginBottom: 12,
              }}
            >
              로그인 / 회원가입
            </button>
            <button
              onClick={finish}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text-muted)", padding: "6px 0" }}
            >
              그냥 둘러볼게요
            </button>
          </div>
        ) : (
          <div ref={bodyRef} style={{ flex: 1, overflowY: "auto", padding: "16px 20px 20px" }}>
            <Content />
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: "flex", gap: 8, padding: "12px 20px",
          borderTop: "1px solid var(--border)", flexShrink: 0,
          paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
        }}>
          {canGoBack && (
            <button
              onClick={goPrev}
              style={{
                flex: 1, padding: "11px 0",
                backgroundColor: "var(--bg-elevated)", color: "var(--text-sub)",
                border: "1px solid var(--border)", borderRadius: 10,
                fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              이전
            </button>
          )}
          {!isEnd && (
            <button
              onClick={goNext}
              style={{
                flex: canGoBack ? 2 : 1, padding: "11px 0",
                backgroundColor: "var(--accent)", color: "var(--bg)",
                border: "none", borderRadius: 10,
                fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}
            >
              {step === STEPS.length - 1 ? "완료 →" : "다음 →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
