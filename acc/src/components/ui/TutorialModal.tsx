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
          <span style={{ color: "var(--text-sub)", flexShrink: 0, marginTop: 1 }}>·</span>
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
            fontSize: 12.5, color: "var(--text-sub)", lineHeight: 1.7, marginBottom: 2,
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

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

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
          <button onClick={dismiss} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-sub)", padding: 10, margin: -6 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div style={{ overflowY: "auto", padding: "24px 20px", flex: 1 }}>
          <p style={{ fontSize: 13.5, color: "var(--text-sub)", marginBottom: 28, lineHeight: 1.7 }}>
            아차청음사는 멤버들이 함께 음반을 듣고 점수를 매기며 청음 기록을 남기는 공간입니다.
          </p>

          {/* 홈 */}
          <Section title="🏠 홈">
            <FeatureList items={[
              "상단 검색창에 앨범 제목 또는 아티스트명을 입력하면 음반고로 바로 이동해 검색 결과를 보여줍니다.",
              "주사위 아이콘(🎲)을 누르면 랜덤으로 앨범 하나를 열어줍니다.",
              "최근 등록된 앨범과 멤버들의 한줄평 흐름을 한눈에 볼 수 있습니다.",
            ]} />
            <Cautions items={[
              "홈 검색창은 음반고로 이동하는 단축 경로입니다. 검색어가 유지된 채로 음반고로 넘어갑니다.",
            ]} />
          </Section>

          {/* 음반고 */}
          <Section title="📦 음반고">
            <FeatureList items={[
              "등록된 모든 앨범을 탐색하는 공간입니다.",
              "제목·아티스트 검색, 장르 필터, 정렬(최신순·발매일순·평점순·가나다순)을 자유롭게 조합할 수 있습니다.",
              "로그인 상태에서는 '미청음만', '내 평점 높은순/낮은순', 1~8점 버튼 필터가 추가로 활성화됩니다.",
              "검색 결과가 없을 때 '바로 추가하기' 버튼으로 해당 검색어를 그대로 입고 모달에 넘길 수 있습니다.",
              "목록 하단에 다다르면 자동으로 다음 앨범들을 불러옵니다.",
              "우측 상단 '입고' 버튼으로 새 앨범을 등록할 수 있습니다.",
            ]} />
            <Cautions items={[
              "미청음만 보기는 내 계정 기준입니다. 다른 멤버가 평가하지 않은 앨범과는 다릅니다.",
              "평점 높은순 정렬 시 아무도 평가하지 않은 앨범은 맨 뒤로 밀립니다.",
              "아티스트 영문 표기가 다를 수 있습니다. 검색 결과가 없으면 표기 방식을 바꿔 시도해보세요.",
            ]} />
          </Section>

          {/* 앨범 상세 */}
          <Section title="🎵 앨범 상세">
            <FeatureList items={[
              "앨범 카드를 누르면 열리는 모달입니다. ✕ 버튼, ESC 키, 배경 클릭, 모바일에서는 아래로 스와이프해도 닫힙니다.",
              "1~8점으로 점수를 매기고 최대 100자의 한줄평을 남길 수 있습니다. '기준 참고' 버튼으로 점수 기준표를 확인할 수 있습니다.",
              "저장 후 평점을 삭제하면 5초간 되돌리기 버튼이 표시됩니다.",
              "다른 멤버의 한줄평에 좋아요(♡)를 누를 수 있습니다.",
              "수록곡 목록이 있는 앨범은 트랙 옆 하트로 좋아하는 곡을 기록할 수 있습니다.",
              "우측 상단 '카드' 버튼으로 이 앨범의 평가를 스토리 이미지로 만들어 저장할 수 있습니다.",
              "북마크(🔖) 버튼으로 나중에 들을 목록에 추가하거나 제거할 수 있습니다.",
            ]} />
            <Cautions items={[
              "평점 삭제 시 한줄평과 트랙 좋아요가 함께 삭제됩니다.",
              "한줄평은 100자를 초과하면 저장되지 않습니다.",
              "수록곡 정보가 없는 앨범은 트랙 좋아요 기능을 사용할 수 없습니다.",
              "내 리뷰에는 좋아요를 누를 수 없습니다.",
            ]} />
          </Section>

          {/* 앨범 입고 */}
          <Section title="📥 앨범 입고">
            <FeatureList items={[
              "음반고 우측 상단 '입고' 버튼으로 새 앨범을 등록합니다.",
              "아티스트명과 앨범명을 입력하고 'Spotify에서 검색' 버튼을 누르면 후보 앨범 목록이 나타납니다.",
              "맞는 앨범을 선택하면 커버·발매일·수록곡 정보가 자동으로 채워집니다.",
              "Spotify에 없는 앨범은 'SoundCloud 앨범 입고' 탭에서 별도 등록할 수 있습니다.",
            ]} />
            <Cautions items={[
              "수록곡이 3개 미만인 싱글·EP는 등록할 수 없습니다.",
              "이미 등록된 앨범은 중복 등록이 차단됩니다. 음반고에서 먼저 검색해보세요.",
            ]} />
          </Section>

          {/* 청음감 */}
          <Section title="📖 청음감">
            <FeatureList items={[
              "멤버 전체의 평가를 집계한 명반 랭킹 아카이브입니다.",
              "보기 모드를 전환해 전체 랭킹, 연도별 1위, 장르별 최고작, 아티스트별 대표작을 확인할 수 있습니다.",
              "전체·국내·해외 필터로 지역별로 골라볼 수 있습니다.",
            ]} />
            <Cautions items={[
              "평가 인원이 적은 앨범이 상위에 오를 수 있습니다. 통계적 참고 자료로 활용하세요.",
            ]} />
          </Section>

          {/* 청음평 */}
          <Section title="💬 청음평">
            <FeatureList items={[
              "멤버들이 남긴 한줄평을 모아보는 피드입니다.",
              "멤버별, 점수 범위별로 필터링하고 최신순 또는 공감 많은 순으로 정렬할 수 있습니다.",
              "앨범 커버를 누르면 앨범 상세 모달이 열립니다.",
              "앨범 제목을 누르면 해당 앨범의 한줄평만 모아서 볼 수 있습니다.",
              "한줄평 우측 댓글 아이콘을 누르면 댓글을 달 수 있습니다.",
              "다른 멤버의 한줄평에 공감(♡)을 남길 수 있습니다.",
            ]} />
            <Cautions items={[
              "자신의 한줄평에는 공감을 누를 수 없습니다.",
            ]} />
          </Section>

          {/* 청음인 */}
          <Section title="🧑‍🤝‍🧑 청음인">
            <FeatureList items={[
              "아차청음사 멤버 목록과 각자의 청음 통계(총 청음 수, 평균 점수, 선호 장르, 점수 분포)를 볼 수 있습니다.",
              "취향 궁합 섹션에서 두 멤버 간 공통 청음 앨범의 평균 점수 차이를 확인할 수 있습니다. 숫자가 낮을수록 취향이 비슷합니다.",
              "멤버 카드를 누르면 해당 멤버의 청음록(프로필)으로 이동합니다.",
            ]} />
          </Section>

          {/* 청음록 */}
          <Section title="👤 청음록">
            <FeatureList items={[
              "내 청음 기록과 통계를 모아볼 수 있는 개인 페이지입니다.",
              "명반전 — 8점을 준 앨범 모음입니다.",
              "점수 분포 — 점수별 평가 횟수를 막대로 표시합니다. 막대를 누르면 해당 점수를 준 앨범들을 음반고에서 바로 볼 수 있습니다.",
              "청음 캘린더 — 월별 청음 활동량을 한눈에 확인합니다. 특정 날짜를 누르면 그날 평가한 앨범 목록이 표시됩니다.",
              "아티스트 TOP 5 — 가장 많이 들은 아티스트와 아티스트별 평균 점수를 볼 수 있습니다.",
              "좋아한 트랙 — 프로필 상단의 버튼으로 트랙 하트를 누른 곡 목록 전체를 볼 수 있습니다.",
              "나중에 들을 목록 — 앨범 상세에서 북마크한 앨범들이 여기 모입니다.",
              "취향 비교 — 다른 멤버를 선택하면 공통으로 들은 앨범에서 점수 차이를 비교해줍니다.",
              "우측 상단 편집 버튼으로 닉네임과 프로필 이미지를 변경할 수 있습니다.",
            ]} />
            <Cautions items={[
              "평점을 저장하거나 삭제하면 통계와 캘린더에 즉시 반영됩니다.",
            ]} />
          </Section>

          {/* 청음집 */}
          <Section title="🎧 청음집">
            <FeatureList items={[
              "멤버들이 직접 만든 테마 플레이리스트 모음입니다.",
              "선곡집 카드를 누르면 앨범 목록, 큐레이터 코멘트, 추천 트랙을 볼 수 있습니다.",
              "로그인 상태에서 새 선곡집을 직접 만들 수 있습니다.",
            ]} />
            <Cautions items={[
              "청음집은 현재 데스크탑(PC) 화면에서만 접근할 수 있습니다.",
            ]} />
          </Section>

          {/* 플로팅 메뉴 */}
          <Section title="🔲 플로팅 메뉴">
            <FeatureList items={[
              "화면 우측 하단의 메뉴 버튼(···)을 누르면 언제든 가이드, 공지사항, 문의로 바로 이동할 수 있습니다.",
              "공지사항에서 운영진의 최신 안내를 확인하세요.",
              "오류 제보, 기능 제안, 앨범 추가 요청은 문의판을 이용해주세요.",
            ]} />
            <Cautions items={[
              "이미 음반고에 등록된 앨범의 추가 요청은 별도 처리되지 않습니다.",
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
