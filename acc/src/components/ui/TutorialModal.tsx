"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "acs_tutorial_dismissed_v1";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{
        fontSize: 15, fontWeight: 700, color: "var(--accent)",
        margin: "0 0 12px 0", paddingBottom: 8,
        borderBottom: "1px solid var(--border)",
        letterSpacing: "0.02em",
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: "0 0 4px 0", padding: 0, listStyle: "none" }}>
      {items.map((item, i) => (
        <li key={i} style={{
          display: "flex", gap: 8, alignItems: "flex-start",
          fontSize: 13.5, color: "var(--text)", lineHeight: 1.7, marginBottom: 2,
        }}>
          <span style={{ color: "var(--text-secondary)", flexShrink: 0, marginTop: 1 }}>·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Cautions({ items }: { items: string[] }) {
  return (
    <div style={{
      backgroundColor: "rgba(232,213,163,0.06)",
      border: "1px solid rgba(232,213,163,0.18)",
      borderRadius: 8,
      padding: "10px 14px",
      marginTop: 12,
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", margin: "0 0 6px 0", letterSpacing: "0.06em" }}>
        ⚠ 유의사항
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {items.map((item, i) => (
          <li key={i} style={{
            display: "flex", gap: 8, alignItems: "flex-start",
            fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 2,
          }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}>–</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TutorialModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    const handler = () => setOpen(true);
    window.addEventListener("open-tutorial", handler);
    return () => window.removeEventListener("open-tutorial", handler);
  }, []);

  const backdropRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      style={{ position: "fixed", inset: 0, zIndex: 300, backgroundColor: "rgba(0,0,0,0.7)" }}
      className="flex items-end sm:items-center justify-center"
      onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === backdropRef.current; }}
      onMouseUp={(e) => { if (mouseDownOnBackdrop.current && e.target === backdropRef.current) dismiss(); mouseDownOnBackdrop.current = false; }}
    >
      <div
        style={{
          width: "100%", maxWidth: 680, maxHeight: "92dvh",
          backgroundColor: "var(--bg-card)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
        className="rounded-t-2xl sm:rounded-2xl"
      >
        {/* 헤더 */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 2px 0" }}>GUIDE</p>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: 0 }}>아차청음사 이용 안내</h1>
          </div>
          <button onClick={dismiss} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div style={{ overflowY: "auto", padding: "24px 20px", flex: 1 }}>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 28, lineHeight: 1.7 }}>
            아차청음사는 멤버들이 함께 음반을 듣고 점수를 매기며 청음 기록을 남기는 공간입니다.
          </p>

          {/* 홈 */}
          <Section title="🏠 홈">
            <FeatureList items={[
              "최근 등록된 앨범 카드와 멤버들의 한줄평 흐름을 볼 수 있습니다.",
              "검색창에 앨범 제목 또는 아티스트명을 입력하면 음반고로 바로 검색 이동합니다.",
              "연도별 명반, 선곡집 미리보기, 멤버 현황을 한눈에 확인할 수 있습니다.",
              "앨범 카드를 누르면 상세 모달이 열립니다.",
            ]} />
            <Cautions items={[
              "홈 검색창은 음반고로 이동하는 단축 경로입니다. 검색어를 그대로 유지한 채 음반고로 넘어갑니다.",
              "앨범 추가는 하단 + 버튼(모바일) 또는 음반고에서 할 수 있습니다. 수록곡이 3개 미만인 싱글은 등록할 수 없습니다.",
            ]} />
          </Section>

          {/* 음반고 */}
          <Section title="📦 음반고">
            <FeatureList items={[
              "등록된 모든 앨범을 탐색하는 공간입니다.",
              "제목·아티스트 검색, 장르 필터, 정렬 기준(최신순·발매일순·평점순·가나다순)을 조합해 찾을 수 있습니다.",
              "로그인 시 '내 평점 높은순', '미평가만 보기', '점수별 필터' 등 나만의 기준으로도 볼 수 있습니다.",
              "앨범 카드를 누르면 상세 모달이 열립니다.",
            ]} />
            <Cautions items={[
              "평점 높은순 정렬 시 아무도 평가하지 않은 앨범은 맨 뒤로 밀립니다.",
              "미평가만 보기는 내 계정 기준입니다. 다른 멤버가 미평가한 앨범과 다릅니다.",
              "검색 시 아티스트 정식 영문 표기가 다를 수 있습니다. 결과가 없으면 영문 표기를 바꿔 검색해보세요.",
            ]} />
          </Section>

          {/* 앨범 상세 */}
          <Section title="🎵 앨범 상세">
            <FeatureList items={[
              "앨범 카드를 누르면 열리는 모달입니다.",
              "1~8점 사이로 점수를 매기고 100자 이내 한줄평을 남길 수 있습니다.",
              "수록곡 목록이 있는 경우 트랙 옆 하트를 눌러 좋아하는 트랙을 기록할 수 있습니다.",
              "다른 멤버의 한줄평에 좋아요를 누를 수 있습니다.",
              "Spotify·Apple Music·YouTube Music 링크로 바로 감상할 수 있습니다.",
            ]} />
            <Cautions items={[
              "점수 삭제 버튼을 누르면 한줄평과 트랙 좋아요까지 함께 삭제됩니다.",
              "한줄평은 100자를 초과하면 저장되지 않습니다.",
              "수록곡 정보가 없는 앨범은 트랙 좋아요 기능을 사용할 수 없습니다.",
            ]} />
          </Section>

          {/* 청음감 */}
          <Section title="📖 청음감">
            <FeatureList items={[
              "청음사에 등록된 앨범들의 명반 모음을 볼 수 있는 아카이브입니다.",
              "연도별 — 각 연도 멤버 평균 점수 1위 앨범을 확인합니다.",
              "장르별 — 장르별 최고 평점 앨범을 모아볼 수 있습니다.",
              "아티스트별 — 2장 이상 등록된 아티스트의 대표작을 확인합니다.",
              "상단 탭으로 연도별·장르별·아티스트별 보기를 전환할 수 있습니다.",
            ]} />
            <Cautions items={[
              "청음감은 개인 컬렉션이 아니라 청음사 전체 평가 기반의 통계 아카이브입니다.",
              "평가 인원이 적은 앨범이 1위가 될 수 있습니다.",
            ]} />
          </Section>

          {/* 청음집 */}
          <Section title="🎧 청음집">
            <FeatureList items={[
              "두 가지 섹션으로 구성됩니다.",
              "선곡집 — 멤버들이 직접 만든 테마 플레이리스트입니다. 로그인 시 새 선곡집을 만들 수 있습니다.",
              "테마 — 8점 클럽, 만장일치 명반, 아티스트 대표작, 숨겨진 명반, 의견 충돌 등 자동 생성 컬렉션입니다.",
              "선곡집 제목을 누르면 앨범 목록·큐레이터 코멘트·추천 트랙을 볼 수 있습니다.",
            ]} />
            <Cautions items={[
              "테마 컬렉션은 전체 멤버의 평가 데이터를 기반으로 자동 생성됩니다. 수동으로 편집할 수 없습니다.",
              "선곡집은 로그인한 멤버만 만들 수 있습니다.",
            ]} />
          </Section>

          {/* 청음인 */}
          <Section title="🧑‍🤝‍🧑 청음인">
            <FeatureList items={[
              "아차청음사 멤버 목록과 각자의 청음 통계를 볼 수 있습니다.",
              "전원이 청음한 만장일치 명반과 의견이 가장 엇갈린 취향 충돌 앨범 목록이 함께 표시됩니다.",
            ]} />
            <Cautions items={[
              "멤버 카드를 눌러 청음록(프로필)으로 이동할 수 있습니다.",
            ]} />
          </Section>

          {/* 청음록 */}
          <Section title="👤 청음록">
            <FeatureList items={[
              "내 청음 기록과 통계를 모아볼 수 있는 개인 페이지입니다.",
              "청음 캘린더 — 월별 청음 활동 기록을 확인합니다.",
              "명예의 전당 — 8점을 준 앨범 목록입니다.",
              "아티스트 통계 — 가장 많이 들은 아티스트와 평균 점수를 볼 수 있습니다.",
              "최근 소감·최근 목록 — 최근에 남긴 한줄평과 최근 평가 앨범을 확인합니다.",
              "나중에 들을 목록 — 찜해둔 앨범 모음입니다.",
              "취향 비교 — 다른 멤버와 공통 청음 앨범 기준으로 취향 유사도를 비교합니다.",
              "닉네임과 프로필 이미지를 수정할 수 있습니다.",
            ]} />
            <Cautions items={[
              "통계와 캘린더는 평점 저장 즉시 반영됩니다.",
              "나중에 들을 목록은 앨범 상세 모달에서 별 아이콘을 눌러 추가할 수 있습니다.",
            ]} />
          </Section>

          {/* 문의판 */}
          <Section title="📋 문의판">
            <FeatureList items={[
              "관리자 공지사항을 확인하고 건의·문의를 남길 수 있습니다.",
              "음반 추가 요청, 오류 제보, 기능 제안을 남겨주세요.",
              "화면 우측 하단 '문의' 버튼으로 어느 페이지에서든 바로 이동할 수 있습니다.",
            ]} />
            <Cautions items={[
              "이미 등록된 앨범 추가 요청은 처리되지 않습니다. 음반고에서 먼저 검색해보세요.",
            ]} />
          </Section>
        </div>

        {/* 하단 버튼 */}
        <div style={{
          padding: "14px 20px",
          borderTop: "1px solid var(--border)",
          flexShrink: 0,
          paddingBottom: "calc(14px + env(safe-area-inset-bottom))",
        }}>
          <button
            onClick={dismiss}
            style={{
              width: "100%",
              padding: "12px 0",
              backgroundColor: "var(--accent)",
              color: "var(--bg)",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            확인했어요
          </button>
        </div>
      </div>
    </div>
  );
}

export function openTutorial() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("open-tutorial"));
}
