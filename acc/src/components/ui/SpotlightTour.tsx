"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const STORAGE_KEY = "acs_onboarding_v1";
const GUIDE_STORAGE_KEY = "acs_tutorial_dismissed_v1";

// ── Step definitions ───────────────────────────────────────────

type TourStep = {
  id: string;
  title: string;
  body: string;
  selector: string;
  altSelector?: string;
  navigate?: string;
};

function makeSteps(isDesktop: boolean, profilePath?: string): TourStep[] {
  if (isDesktop) {
    return [
      // ── 홈 ──────────────────────────────────────────────────
      {
        id: "home-ticker",
        title: "리뷰 티커",
        body: "멤버들의 최신 한줄평이 실시간으로 흐릅니다. 클릭하면 해당 앨범의 상세 화면으로 이동해요.",
        selector: '[data-tour="home-ticker"]',
        navigate: "/",
      },
      {
        id: "today-card",
        title: "오늘의 인연",
        body: "매일 새로운 앨범을 랜덤으로 추천받아요. 커버를 클릭하면 상세 정보와 평가 화면이 열려요.",
        selector: '[data-tour="today-card"]',
      },
      {
        id: "today-streaming-btn",
        title: "감상하기",
        body: "Spotify, Apple Music, YouTube Music 중 원하는 서비스로 바로 이동해요.",
        selector: '[data-tour="today-streaming-btn"]',
      },
      {
        id: "today-shuffle-btn",
        title: "다른 인연",
        body: "오늘의 추천 앨범이 마음에 안 들면 다른 앨범으로 바꿀 수 있어요.",
        selector: '[data-tour="today-shuffle-btn"]',
      },
      {
        id: "home-feed",
        title: "최근 청음 피드",
        body: "멤버들이 최근에 평가한 앨범 목록이에요. 클릭하면 해당 앨범 상세 화면으로 이동해요.",
        selector: '[data-tour="home-feed"]',
      },
      {
        id: "home-watchlist",
        title: "나중에 들을 앨범",
        body: "앨범에 북마크를 달아두면 여기에 모아서 볼 수 있어요.",
        selector: '[data-tour="home-watchlist"]',
      },
      {
        id: "home-controversial",
        title: "갑론을박",
        body: "멤버들 사이에서 평점이 엇갈리는 앨범들이에요. 의견이 다양하게 나뉜 음반들을 한눈에 볼 수 있어요.",
        selector: '[data-tour="home-controversial"]',
      },
      {
        id: "home-diary-banner",
        title: "청음일기 배너",
        body: "상단 배너를 통해 청음일기 페이지로 빠르게 이동할 수 있어요.",
        selector: '[data-tour="home-diary-banner"]',
      },
      // ── 음반고 ───────────────────────────────────────────────
      {
        id: "nav-albums",
        title: "음반고",
        body: "저장된 모든 앨범을 탐색하는 공간이에요. 검색·장르·정렬 필터로 원하는 앨범을 찾을 수 있어요.",
        selector: '[data-tour="nav-albums"]',
        navigate: "/albums",
      },
      {
        id: "albums-filter",
        title: "검색 & 필터",
        body: "제목이나 아티스트명으로 실시간 검색이 가능해요. 장르·정렬 필터도 자유롭게 조합할 수 있어요.",
        selector: '[data-tour="albums-filter"]',
      },
      {
        id: "albums-score-filter",
        title: "점수 & 지역 필터",
        body: "국내/해외 구분과 미청음만 보기 필터로 취향에 맞는 앨범을 좁혀볼 수 있어요.",
        selector: '[data-tour="albums-score-filter"]',
      },
      {
        id: "albums-import",
        title: "입고",
        body: "새 앨범을 직접 추가할 수 있어요. 로그인 후 사용 가능해요.",
        selector: '[data-tour="albums-import"]',
      },
      {
        id: "album-card",
        title: "앨범 카드",
        body: "클릭하면 상세 화면이 열려요. 1~8점 평가, 한줄평, 북마크, 수록곡 좋아요를 남길 수 있어요.",
        selector: '[data-tour="album-card"]',
      },
      // ── 청음감 ───────────────────────────────────────────────
      {
        id: "nav-best",
        title: "청음감 — 명반 랭킹",
        body: "멤버들의 평가를 집계한 명반 랭킹 페이지예요. 전체/연도별/장르별/아티스트별로 볼 수 있어요.",
        selector: '[data-tour="nav-best"]',
        navigate: "/best",
      },
      {
        id: "best-region-filter",
        title: "국내 / 해외 필터",
        body: "국내 앨범과 해외 앨범을 구분해서 랭킹을 볼 수 있어요.",
        selector: '[data-tour="best-region-filter"]',
      },
      {
        id: "best-main",
        title: "랭킹 보기 전환",
        body: "통합 랭킹부터 연도별·장르별·아티스트별로 다양하게 확인할 수 있어요.",
        selector: '[data-tour="best-main"]',
      },
      // ── 청음평 ───────────────────────────────────────────────
      {
        id: "nav-reviews",
        title: "청음평 — 한줄평 피드",
        body: "모든 멤버의 한줄평을 피드로 볼 수 있어요. 앨범별로 묶어보거나 최신순으로 볼 수 있어요.",
        selector: '[data-tour="nav-reviews"]',
        navigate: "/reviews",
      },
      {
        id: "reviews-filter",
        title: "피드 필터",
        body: "멤버별·점수별 필터와 키워드 검색으로 원하는 소감을 찾아볼 수 있어요.",
        selector: '[data-tour="reviews-filter"]',
      },
      {
        id: "reviews-reactions",
        title: "공감 & 댓글",
        body: "마음에 드는 소감에 공감을 남기거나 댓글을 달 수 있어요. 로그인 후 사용 가능해요.",
        selector: '[data-tour="reviews-reactions"]',
      },
      // ── 청음인 ───────────────────────────────────────────────
      {
        id: "nav-members",
        title: "청음인 — 멤버 현황",
        body: "모임 멤버들의 평가 현황을 한눈에 볼 수 있는 페이지예요.",
        selector: '[data-tour="nav-members"]',
        navigate: "/members",
      },
      {
        id: "members-compat",
        title: "취향 궁합",
        body: "멤버들 간의 평점 상관관계를 분석해 취향이 가장 비슷한 짝을 찾아줘요.",
        selector: '[data-tour="members-compat"]',
      },
      // ── 청음록(프로필) ────────────────────────────────────────
      {
        id: "nav-profile",
        title: "청음록 — 내 프로필",
        body: "내 평점 통계, 청음 캘린더, 뱃지, 북마크 목록이 여기에 있어요.",
        selector: '[data-tour="nav-profile"]',
        navigate: profilePath,
      },
      {
        id: "profile-diary-btn",
        title: "청음일기 바로가기",
        body: "프로필에서 내 청음일기로 바로 이동할 수 있어요.",
        selector: '[data-tour="profile-diary-btn"]',
      },
      {
        id: "profile-edit",
        title: "프로필 편집",
        body: "닉네임, 프로필 사진, 소개글을 수정할 수 있어요.",
        selector: '[data-tour="profile-edit"]',
      },
      {
        id: "profile-insight",
        title: "인사이트",
        body: "나와 평점이 가장 다른 앨범과 남들보다 높게 평가한 숨은 명반을 볼 수 있어요.",
        selector: '[data-tour="profile-insight"]',
      },
      {
        id: "profile-score-dist",
        title: "점수 분포",
        body: "내가 준 점수별 앨범 수를 한눈에 볼 수 있어요. 클릭하면 해당 점수 앨범 목록으로 이동해요.",
        selector: '[data-tour="profile-score-dist"]',
      },
      {
        id: "profile-watchlist",
        title: "나중에 들을 앨범",
        body: "앨범을 북마크해두면 프로필에서 한번에 확인할 수 있어요.",
        selector: '[data-tour="profile-watchlist"]',
      },
      {
        id: "profile-comparison",
        title: "취향 궁합 (프로필)",
        body: "나와 취향이 가장 비슷한 멤버와 차이가 큰 멤버를 확인할 수 있어요.",
        selector: '[data-tour="profile-comparison"]',
      },
      // ── 청음일기 ─────────────────────────────────────────────
      {
        id: "diary-new-btn",
        title: "청음일기 — 새 기록",
        body: "나만의 음악 감상 일기를 기록하는 공간이에요. 커버의 新記 버튼으로 새 기록을 추가하고, 캘린더·앨범·통계 탭으로 기록을 탐색해요.",
        selector: '[data-tour="diary-new-btn"]',
        navigate: "/diary",
      },
      // ── 청음집 ───────────────────────────────────────────────
      {
        id: "themes-new-btn",
        title: "청음집",
        body: "테마별 앨범 컬렉션을 만들 수 있어요. 로그인 후 직접 청음집을 제작할 수 있어요.",
        selector: '[data-tour="themes-new-btn"]',
        navigate: "/themes",
      },
      // ── 메뉴 ─────────────────────────────────────────────────
      {
        id: "floating-actions",
        title: "··· 메뉴",
        body: "공지사항, 튜토리얼 다시 보기, 이용 가이드, 문의 게시판에 접근할 수 있어요.",
        selector: '[data-tour="floating-actions"]',
      },
    ];
  }

  // ── Mobile steps ─────────────────────────────────────────────
  return [
    // ── 홈 ──────────────────────────────────────────────────
    {
      id: "today-card",
      title: "오늘의 인연",
      body: "매일 새로운 앨범을 랜덤으로 추천받아요. 커버를 탭하면 상세 정보와 평가 화면이 열려요.",
      selector: '[data-tour="today-card"]',
      navigate: "/",
    },
    {
      id: "today-streaming-btn",
      title: "감상하기",
      body: "Spotify, Apple Music, YouTube Music 중 원하는 서비스로 바로 이동해요.",
      selector: '[data-tour="today-streaming-btn"]',
    },
    {
      id: "today-shuffle-btn",
      title: "다른 인연",
      body: "오늘의 추천 앨범이 마음에 안 들면 다른 앨범으로 바꿀 수 있어요.",
      selector: '[data-tour="today-shuffle-btn"]',
    },
    {
      id: "home-feed",
      title: "최근 청음 피드",
      body: "멤버들이 최근에 평가한 앨범 목록이에요. 탭하면 해당 앨범 상세 화면으로 이동해요.",
      selector: '[data-tour="home-feed"]',
    },
    // ── 음반고 ───────────────────────────────────────────────
    {
      id: "nav-albums",
      title: "음반고",
      body: "저장된 모든 앨범을 탐색하는 공간이에요. 검색·장르·점수 필터를 자유롭게 조합할 수 있어요.",
      selector: '[data-tour="nav-albums"]',
      navigate: "/albums",
    },
    {
      id: "albums-filter",
      title: "검색 & 필터",
      body: "제목이나 아티스트명으로 검색하고 장르·정렬 필터도 조합할 수 있어요.",
      selector: '[data-tour="albums-filter"]',
    },
    {
      id: "albums-score-filter",
      title: "지역 & 미청음 필터",
      body: "국내/해외 구분과 미청음만 보기 필터로 취향에 맞는 앨범을 좁혀볼 수 있어요.",
      selector: '[data-tour="albums-score-filter"]',
    },
    {
      id: "album-card",
      title: "앨범 카드",
      body: "탭하면 상세 화면이 열려요. 1~8점 평가, 한줄평, 북마크, 수록곡 좋아요를 남길 수 있어요.",
      selector: '[data-tour="album-card"]',
    },
    // ── 청음감 ───────────────────────────────────────────────
    {
      id: "nav-best",
      title: "청음감 — 명반 랭킹",
      body: "멤버들의 평가를 집계한 명반 랭킹 페이지예요.",
      selector: '[data-tour="nav-best"]',
      navigate: "/best",
    },
    {
      id: "best-tabs",
      title: "랭킹 필터",
      body: "국내/해외 필터와 통합·연도별·장르별·아티스트별 보기를 선택할 수 있어요.",
      selector: '[data-tour="best-tabs"]',
    },
    // ── 청음평 ───────────────────────────────────────────────
    {
      id: "nav-reviews",
      title: "청음평 — 한줄평 피드",
      body: "모든 멤버의 한줄평을 피드로 볼 수 있어요.",
      selector: '[data-tour="nav-reviews"]',
      navigate: "/reviews",
    },
    {
      id: "reviews-filter",
      title: "피드 필터",
      body: "멤버별·점수별 필터와 키워드 검색으로 원하는 소감을 찾아볼 수 있어요.",
      selector: '[data-tour="reviews-filter"]',
    },
    {
      id: "reviews-reactions",
      title: "공감 & 댓글",
      body: "마음에 드는 소감에 공감을 남기거나 댓글을 달 수 있어요. 로그인 후 사용 가능해요.",
      selector: '[data-tour="reviews-reactions"]',
    },
    // ── 청음인 ───────────────────────────────────────────────
    {
      id: "nav-members",
      title: "청음인 — 멤버 현황",
      body: "모임 멤버들의 평가 현황을 한눈에 볼 수 있는 페이지예요.",
      selector: '[data-tour="nav-members"]',
      navigate: "/members",
    },
    {
      id: "members-compat",
      title: "취향 궁합",
      body: "멤버들 간의 평점 상관관계를 분석해 취향이 가장 비슷한 짝을 찾아줘요.",
      selector: '[data-tour="members-compat"]',
    },
    // ── 청음록(프로필) ────────────────────────────────────────
    {
      id: "nav-profile",
      title: "청음록 — 내 프로필",
      body: "내 평점 통계, 청음 캘린더, 뱃지, 북마크 목록이 여기에 있어요.",
      selector: '[data-tour="nav-profile"]',
      navigate: profilePath,
    },
    {
      id: "profile-diary-btn",
      title: "청음일기 바로가기",
      body: "프로필에서 내 청음일기로 바로 이동할 수 있어요.",
      selector: '[data-tour="profile-diary-btn"]',
    },
    {
      id: "profile-edit",
      title: "프로필 편집",
      body: "닉네임, 프로필 사진, 소개글을 수정할 수 있어요.",
      selector: '[data-tour="profile-edit"]',
    },
    {
      id: "profile-insight",
      title: "인사이트",
      body: "나와 평점이 가장 다른 앨범과 남들보다 높게 평가한 숨은 명반을 볼 수 있어요.",
      selector: '[data-tour="profile-insight"]',
    },
    {
      id: "profile-score-dist",
      title: "점수 분포",
      body: "내가 준 점수별 앨범 수를 한눈에 볼 수 있어요.",
      selector: '[data-tour="profile-score-dist"]',
    },
    {
      id: "profile-watchlist",
      title: "나중에 들을 앨범",
      body: "앨범을 북마크해두면 프로필에서 한번에 확인할 수 있어요.",
      selector: '[data-tour="profile-watchlist"]',
    },
    {
      id: "profile-comparison",
      title: "취향 궁합 (프로필)",
      body: "나와 취향이 가장 비슷한 멤버와 차이가 큰 멤버를 확인할 수 있어요.",
      selector: '[data-tour="profile-comparison"]',
    },
    // ── 청음일기 ─────────────────────────────────────────────
    {
      id: "diary-tab-calendar",
      title: "청음일기 — 캘린더",
      body: "나만의 음악 감상 일기를 기록하는 공간이에요. 날짜별로 청음 기록을 볼 수 있어요.",
      selector: '[data-tour="diary-tab-calendar"]',
      navigate: "/diary",
    },
    {
      id: "diary-tab-albums",
      title: "앨범 탭",
      body: "일기에 기록한 앨범들을 모아서 한눈에 볼 수 있어요.",
      selector: '[data-tour="diary-tab-albums"]',
    },
    {
      id: "diary-tab-stats",
      title: "통계 탭",
      body: "청음 통계와 연속 기록 스트릭을 확인할 수 있어요.",
      selector: '[data-tour="diary-tab-stats"]',
    },
    // ── 청음집 ───────────────────────────────────────────────
    {
      id: "themes",
      title: "청음집",
      body: "테마별 앨범 컬렉션을 만들고 공유할 수 있는 페이지예요.",
      selector: '[data-tour="themes-new-btn"]',
      navigate: "/themes",
    },
    // ── 메뉴 ─────────────────────────────────────────────────
    {
      id: "floating-actions",
      title: "··· 메뉴",
      body: "공지사항, 튜토리얼 다시 보기, 이용 가이드, 문의 게시판에 접근할 수 있어요.",
      selector: '[data-tour="floating-actions"]',
    },
  ];
}

// ── Element finder ─────────────────────────────────────────────

function rectIfVisible(el: Element): DOMRect | null {
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return null;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 || rect.height > 0 ? rect : null;
}

function hasWaitingAncestor(el: Element): boolean {
  let node: Element | null = el;
  while (node) {
    if (node.getAttribute("data-tour-wait") === "true") return true;
    node = node.parentElement;
  }
  return false;
}

async function findVisible(selector: string, altSelector?: string, timeout = 2500): Promise<DOMRect | null> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    for (const el of Array.from(document.querySelectorAll(selector))) {
      const r = rectIfVisible(el);
      if (r && !hasWaitingAncestor(el)) return r;
    }
    if (altSelector) {
      for (const el of Array.from(document.querySelectorAll(altSelector))) {
        const r = rectIfVisible(el);
        if (r && !hasWaitingAncestor(el)) return r;
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
      <path d={`M 0,0 H ${W} V ${H} H 0 Z ${hole}`} fill="rgba(0,0,0,0.58)" fillRule="evenodd" />
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

type Phase = "banner" | "intro" | "loading" | "step" | "end";

export default function SpotlightTour() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const stepsRef = useRef<TourStep[]>([]);
  const router = useRouter();
  const processingRef = useRef(false);
  const { profile } = useAuth();
  const profileRef = useRef(profile);

  // Keep refs current
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { stepsRef.current = steps; }, [steps]);

  // Build step list whenever auth state changes
  useEffect(() => {
    const isDesktop = window.innerWidth >= 640;
    const profilePath = profile?.id ? `/profile/${profile.id}` : undefined;
    setSteps(makeSteps(isDesktop, profilePath));
  }, [profile?.id]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(GUIDE_STORAGE_KEY, "1");
      timer = setTimeout(() => {
        setPhase("banner");
        setOpen(true);
      }, 1200);
    }
    const handleOpen = () => {
      localStorage.setItem(GUIDE_STORAGE_KEY, "1");
      setPhase("intro");
      setStepIdx(0);
      setHistory([]);
      setRect(null);
      // Rebuild steps using current profile (from ref, not stale closure)
      const isDesktop = window.innerWidth >= 640;
      const profilePath = profileRef.current?.id ? `/profile/${profileRef.current.id}` : undefined;
      const freshSteps = makeSteps(isDesktop, profilePath);
      setSteps(freshSteps);
      stepsRef.current = freshSteps;
      setOpen(true);
    };
    window.addEventListener("open-onboarding", handleOpen);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("open-onboarding", handleOpen);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open || phase === "banner") return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open, phase]);

  // Re-measure on resize
  useEffect(() => {
    if (phase !== "step" || steps.length === 0) return;
    const step = steps[stepIdx];
    const update = () => {
      const el = document.querySelector(step.selector);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [phase, stepIdx, steps]);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
    setRect(null);
  };

  async function goToIdx(idx: number) {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const currentSteps = stepsRef.current;
      if (idx >= currentSteps.length) { setPhase("end"); return; }

      setPhase("loading");
      setRect(null);

      const step = currentSteps[idx];
      if (step.navigate) {
        router.push(step.navigate);
        await new Promise((r) => setTimeout(r, 600));
      }

      const found = await findVisible(step.selector, step.altSelector, step.navigate ? 4000 : 700);
      if (!found) {
        processingRef.current = false;
        await goToIdx(idx + 1);
        return;
      }

      // 요소가 뷰포트 밖에 있으면 스크롤 후 rect 재측정
      const inView = found.top >= 0 && found.bottom <= window.innerHeight;
      let finalRect = found;
      if (!inView) {
        const selectors = [step.selector, step.altSelector].filter(Boolean) as string[];
        let targetEl: Element | null = null;
        for (const sel of selectors) {
          targetEl = Array.from(document.querySelectorAll(sel)).find((el) => rectIfVisible(el)) ?? null;
          if (targetEl) break;
        }
        if (targetEl) {
          document.body.style.overflow = "";
          targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
          await new Promise((r) => setTimeout(r, 450));
          document.body.style.overflow = "hidden";
          finalRect = targetEl.getBoundingClientRect();
        }
      }

      setStepIdx(idx);
      setRect(finalRect);
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

  if (phase === "banner") {
    return (
      <div
        className="fixed left-1/2 -translate-x-1/2 bottom-[calc(72px+env(safe-area-inset-bottom)+12px)] sm:bottom-6"
        style={{ zIndex: 200, width: "calc(100% - 32px)", maxWidth: 420, animation: "modalIn 0.28s ease-out" }}
      >
        <div style={{
          backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)",
          borderRadius: 16, padding: "14px 16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>🎵</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "0 0 2px 0" }}>처음 오셨나요?</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>주요 기능을 하나씩 안내해드릴게요.</p>
          </div>
          <button
            onClick={startTour}
            style={{
              backgroundColor: "var(--accent)", border: "none", color: "var(--bg)",
              borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700,
              cursor: "pointer", flexShrink: 0, fontFamily: "inherit",
            }}
          >둘러보기 →</button>
          <button
            onClick={close}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4, flexShrink: 0, lineHeight: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  const darkOverlay = (
    <div style={{ position: "fixed", inset: 0, zIndex: 299, backgroundColor: "rgba(0,0,0,0.58)" }} />
  );
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

  if (!rect || steps.length === 0) return null;

  return (
    <>
      <SpotlightMask rect={rect} />
      {blocker}
      <Callout
        rect={rect}
        step={steps[stepIdx]}
        stepIdx={stepIdx}
        totalSteps={steps.length}
        onPrev={goPrev}
        onNext={goNext}
        onSkip={close}
        canGoBack={history.length > 0}
        isLast={stepIdx === steps.length - 1}
      />
    </>
  );
}
