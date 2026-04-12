"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "acs_tutorial_dismissed_v1";

function TutorialImage({ file, alt }: { file: string; alt: string }) {
  const src = `/tutorial/${file}`;
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setExists(true);
    img.onerror = () => setExists(false);
    img.src = src;
  }, [src]);

  if (exists === true) {
    return (
      <img
        src={src}
        alt={alt}
        style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)", display: "block", marginTop: 12 }}
      />
    );
  }

  // 이미지 없을 때 플레이스홀더
  return (
    <div style={{
      width: "100%", aspectRatio: "16/9",
      backgroundColor: "var(--bg-sub)",
      border: "1px dashed var(--border)",
      borderRadius: 8,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 6,
      color: "var(--text-secondary)",
      fontSize: 11,
      marginTop: 12,
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      <span style={{ opacity: 0.5 }}>{file}</span>
    </div>
  );
}

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
          fontSize: 13.5, color: "var(--text)", lineHeight: 1.7,
          marginBottom: 2,
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
            fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.7,
            marginBottom: 2,
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
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
    const handler = () => setOpen(true);
    window.addEventListener("open-tutorial", handler);
    return () => window.removeEventListener("open-tutorial", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  const close = () => setOpen(false);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        backgroundColor: "rgba(0,0,0,0.7)",
      }}
      className="flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div style={{
        width: "100%", maxWidth: 680,
        maxHeight: "92dvh",
        backgroundColor: "var(--bg-card)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}
        className="rounded-t-2xl sm:rounded-2xl sm:mb-0 mb-0"
      >
        {/* 헤더 */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 2px 0" }}>
              GUIDE
            </p>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: 0 }}>
              아차청음사 이용 안내
            </h1>
          </div>
          <button
            onClick={close}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-secondary)", padding: 4,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div style={{ overflowY: "auto", padding: "24px 20px", flex: 1 }}>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 28, lineHeight: 1.7 }}>
            아차청음사는 멤버들이 함께 음반을 듣고 점수를 매기며 청음 기록을 남기는 공간입니다.
            이 안내를 읽으면 모든 기능을 바로 활용하실 수 있습니다.
          </p>

          {/* 홈 */}
          <Section title="🏠 홈">
            <FeatureList items={[
              "최근 등록된 앨범 카드를 보여주는 메인 피드입니다.",
              "검색창에 앨범 제목 또는 아티스트 이름을 입력해 원하는 음반을 찾을 수 있습니다.",
              "정렬 기준(최신순, 발매일순, 평균점수순 등)과 장르 필터로 목록을 좁힐 수 있습니다.",
              "앨범 카드에서 바로 점수를 줄 수 있습니다.",
            ]} />
            <TutorialImage file="01_home_overview.png" alt="홈 화면 전체" />
            <TutorialImage file="02_home_search.png" alt="검색 및 정렬/필터" />
            <TutorialImage file="03_home_score_input.png" alt="앨범 카드 점수 입력" />
            <Cautions items={[
              "점수는 1~8점 사이만 입력 가능합니다. 0점이나 소수점은 입력되지 않습니다.",
              "검색 결과가 없을 때는 아티스트의 정식 영문 표기로 검색해보세요. (예: 칸예 → Ye)",
              "앨범 추가 시 수록곡이 3개 미만인 싱글 앨범은 등록할 수 없습니다.",
            ]} />
          </Section>

          {/* 음반고 */}
          <Section title="📦 음반고">
            <FeatureList items={[
              "등록된 모든 앨범을 탐색하는 공간입니다.",
              "다양한 정렬 기준과 장르 필터, 미평가 앨범만 보기 기능을 제공합니다.",
              "나의 점수 기준으로도 정렬할 수 있습니다.",
            ]} />
            <TutorialImage file="04_albums_overview.png" alt="음반고 화면" />
            <Cautions items={[
              "평균점수 정렬 시 아무도 평가하지 않은 앨범은 맨 뒤로 밀립니다. 새 앨범이 안 보이면 정렬을 '최신순'으로 바꿔보세요.",
              "미평가만 보기 필터는 현재 내 계정 기준입니다. 다른 멤버가 미평가한 앨범과는 다릅니다.",
            ]} />
          </Section>

          {/* 앨범 상세 */}
          <Section title="🎵 앨범 상세">
            <FeatureList items={[
              "앨범의 수록곡 목록, 멤버들의 점수 및 한줄평을 볼 수 있습니다.",
              "내 점수와 한줄평을 입력하거나 수정·삭제할 수 있습니다.",
              "수록곡 옆 하트를 눌러 좋아하는 트랙을 저장할 수 있습니다.",
              "다른 멤버의 한줄평에 좋아요를 누를 수 있습니다.",
            ]} />
            <TutorialImage file="05_album_detail_score.png" alt="앨범 상세 점수/한줄평 입력" />
            <TutorialImage file="06_album_detail_tracks.png" alt="수록곡 하트 버튼" />
            <TutorialImage file="07_album_detail_reviews.png" alt="멤버 한줄평 목록" />
            <Cautions items={[
              "한줄평은 100자 이하입니다. 초과하면 저장되지 않습니다.",
              "점수 삭제 버튼을 누르면 한줄평과 트랙 좋아요까지 함께 삭제됩니다. 실수로 누르지 않도록 주의하세요.",
              "트랙 좋아요는 청음집 페이지에 자동으로 반영됩니다.",
              "수록곡 정보가 없는 앨범은 트랙 좋아요 기능을 사용할 수 없습니다.",
            ]} />
          </Section>

          {/* 도감 */}
          <Section title="📖 도감">
            <FeatureList items={[
              "내가 점수를 매긴 앨범들을 점수별로 한눈에 볼 수 있는 컬렉션 뷰입니다.",
              "점수 칸을 눌러 특정 점수의 앨범만 모아볼 수 있습니다.",
            ]} />
            <TutorialImage file="08_dogam_overview.png" alt="도감 화면" />
            <Cautions items={[
              "점수를 매기지 않은 앨범은 도감에 나타나지 않습니다.",
              "도감은 나의 기록만 보여줍니다. 다른 멤버의 도감은 청음인 페이지에서 확인하세요.",
            ]} />
          </Section>

          {/* 청음집 */}
          <Section title="🎧 청음집">
            <FeatureList items={[
              "앨범 상세에서 하트를 누른 트랙들이 모인 나만의 플레이리스트입니다.",
              "아티스트별, 앨범별로 묶어서 볼 수 있습니다.",
            ]} />
            <TutorialImage file="09_playlist_overview.png" alt="청음집 화면" />
            <Cautions items={[
              "청음집은 앨범 상세 페이지에서 트랙 하트를 눌러야만 채워집니다. 자동으로 채워지지 않습니다.",
              "트랙 하트를 취소하면 청음집에서도 바로 사라집니다.",
              "수록곡 정보가 없는 앨범은 청음집에 추가할 수 없습니다.",
            ]} />
          </Section>

          {/* 프로필(청음록) */}
          <Section title="👤 청음록">
            <FeatureList items={[
              "내 평가 통계(평균 점수, 장르 분포, 점수 분포)를 한눈에 볼 수 있습니다.",
              "평가한 앨범 목록을 최신순·점수순으로 볼 수 있습니다.",
              "닉네임과 프로필 이미지를 변경할 수 있습니다.",
            ]} />
            <TutorialImage file="10_profile_stats.png" alt="청음록 통계 영역" />
            <TutorialImage file="11_profile_edit.png" alt="닉네임/이미지 수정" />
            <Cautions items={[
              "통계는 점수를 매기거나 수정한 직후 자동으로 반영됩니다. 새로고침이 필요 없습니다.",
              "닉네임은 사이트 전체에서 사용되므로 변경 시 한줄평 등에도 즉시 반영됩니다.",
            ]} />
          </Section>

          {/* 청음인 */}
          <Section title="🧑‍🤝‍🧑 청음인">
            <FeatureList items={[
              "사이트에 가입된 멤버 목록을 볼 수 있습니다.",
              "멤버를 클릭하면 그 사람의 도감과 한줄평 목록을 볼 수 있습니다.",
            ]} />
            <TutorialImage file="12_members_list.png" alt="청음인 목록" />
            <Cautions items={[
              "탈퇴하거나 비공개로 설정된 멤버는 목록에 표시되지 않을 수 있습니다.",
            ]} />
          </Section>

          {/* 문의판 */}
          <Section title="📋 문의판">
            <FeatureList items={[
              "관리자에게 건의사항이나 문의를 남길 수 있는 게시판입니다.",
              "음반 추가 요청, 오류 제보, 기능 제안 등을 남겨주세요.",
              "화면 우측 하단의 '문의' 버튼으로 언제든지 이동할 수 있습니다.",
            ]} />
            <TutorialImage file="13_inquiry_board.png" alt="문의판 화면" />
            <Cautions items={[
              "문의판은 관리자만 답변할 수 있습니다.",
              "이미 등록된 음반 추가 요청은 처리되지 않을 수 있습니다. 음반고에서 먼저 검색해보세요.",
            ]} />
          </Section>
        </div>

        {/* 하단 버튼 */}
        <div style={{
          padding: "14px 20px",
          borderTop: "1px solid var(--border)",
          display: "flex", gap: 10, flexShrink: 0,
          paddingBottom: "calc(14px + env(safe-area-inset-bottom))",
        }}>
          <button
            onClick={dismiss}
            style={{
              flex: 1,
              padding: "11px 0",
              backgroundColor: "var(--accent)",
              color: "var(--bg)",
              border: "none",
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            다시 보지 않기
          </button>
          <button
            onClick={close}
            style={{
              flex: 1,
              padding: "11px 0",
              backgroundColor: "var(--bg-sub)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            나중에 보기
          </button>
        </div>
      </div>
    </div>
  );
}

// 외부에서 수동으로 열 수 있도록 트리거 함수 export
export function openTutorial() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("open-tutorial"));
}
