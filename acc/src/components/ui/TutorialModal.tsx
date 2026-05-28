"use client";

import { useEffect, useRef, useState } from "react";
import { openOnboarding } from "@/components/ui/SpotlightTour";

const STORAGE_KEY = "acs_tutorial_dismissed_v1";

const PAGES = ["홈·음반고", "앨범 상세", "입고", "청음감·청음평", "청음인·청음록", "청음집·기타", "규정집"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{
        fontSize: 14, fontWeight: 700, color: "var(--accent)",
        margin: "0 0 10px 0", paddingBottom: 7,
        borderBottom: "1px solid var(--border)",
        letterSpacing: "0.02em",
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li style={{
      display: "flex", gap: 8, alignItems: "flex-start",
      fontSize: 13, color: "var(--text)", lineHeight: 1.7, marginBottom: 3,
    }}>
      <span style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 1 }}>·</span>
      <span>{children}</span>
    </li>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <ul style={{ margin: "0 0 8px 0", padding: 0, listStyle: "none" }}>{children}</ul>;
}

function Caution({ children }: { children: React.ReactNode }) {
  return (
    <li style={{
      display: "flex", gap: 8, alignItems: "flex-start",
      fontSize: 12, color: "var(--text-sub)", lineHeight: 1.7, marginBottom: 2,
    }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>–</span>
      <span>{children}</span>
    </li>
  );
}

function Cautions({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: "rgba(232,213,163,0.05)",
      border: "1px solid rgba(232,213,163,0.15)",
      borderRadius: 8, padding: "9px 13px", marginTop: 10,
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", margin: "0 0 5px 0", letterSpacing: "0.06em" }}>⚠ 유의사항</p>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>{children}</ul>
    </div>
  );
}

function Page1() {
  return (
    <>
      <Section title="🏠 홈">
        <List>
          <Item>상단에 멤버들의 최근 한줄평이 실시간으로 흘러갑니다(평베이어벨트). 클릭하면 해당 앨범 상세 모달이 열립니다.</Item>
          <Item>오늘의 인연 카드 — 방문할 때마다 아직 평가하지 않은 앨범 한 장을 랜덤으로 제안합니다.</Item>
          <Item>오늘의 인연에서 '감상하기'를 누르면 Spotify · Apple Music · YouTube Music 중 원하는 서비스로 바로 이동합니다.</Item>
          <Item>오늘의 인연에서 '평가하기'를 누르면 해당 앨범 상세 모달이 열립니다.</Item>
          <Item>'다른 인연' 버튼을 누르면 다른 앨범으로 교체됩니다.</Item>
          <Item>모바일에서 오늘의 인연 카드 내 '트랙리스트 N곡' 버튼을 누르면 수록곡 목록을 바로 확인할 수 있습니다.</Item>
          <Item>하단 최근 청음 피드에서 멤버들의 최근 평가 활동을 확인할 수 있습니다.</Item>
          <Item>상단 검색창에 앨범 제목 또는 아티스트명을 입력하면 음반고로 바로 이동해 검색 결과를 보여줍니다.</Item>
        </List>
        <Cautions>
          <Caution>홈 검색창은 음반고로 이동하는 단축 경로입니다. 검색어가 유지된 채로 음반고로 넘어갑니다.</Caution>
          <Caution>오늘의 인연은 이미 평가한 앨범은 제외하고 제안합니다. 로그인 상태에서만 필터링이 적용됩니다.</Caution>
        </Cautions>
      </Section>

      <Section title="📦 음반고">
        <List>
          <Item>등록된 모든 앨범을 탐색하는 공간입니다.</Item>
          <Item>제목·아티스트 검색, 장르 필터, 정렬(최신순·발매일순·평점순·가나다순)을 자유롭게 조합할 수 있습니다.</Item>
          <Item>로그인 상태에서는 '내 평점 높은순/낮은순', '미청음만 보기', 1~8점 버튼 필터(데스크탑) 또는 드롭다운(모바일)이 추가로 활성화됩니다.</Item>
          <Item>목록 하단에 다다르면 자동으로 다음 앨범들을 불러옵니다(무한 스크롤).</Item>
          <Item>검색 결과가 없을 때 '바로 추가하기' 버튼을 누르면 해당 검색어를 입고 모달로 바로 넘깁니다.</Item>
          <Item>우측 상단 '입고' 버튼으로 새 앨범을 등록할 수 있습니다.</Item>
          <Item>앨범 카드의 아티스트 이름을 누르면 아티스트 모달이 열립니다.</Item>
          <Item>앨범 카드 우측 하단의 Spotify(녹색) 또는 SoundCloud(SC) 아이콘을 누르면 해당 서비스로 바로 이동합니다.</Item>
        </List>
        <Cautions>
          <Caution>미청음만 보기는 내 계정 기준입니다. 다른 멤버가 평가하지 않은 앨범과는 다릅니다.</Caution>
          <Caution>평점 높은순 정렬 시 아무도 평가하지 않은 앨범은 맨 뒤로 밀립니다.</Caution>
          <Caution>아티스트 영문 표기가 다를 수 있습니다. 검색 결과가 없으면 표기 방식을 바꿔 시도해보세요.</Caution>
        </Cautions>
      </Section>
    </>
  );
}

function Page2() {
  return (
    <>
      <Section title="🎵 앨범 상세 — 기본">
        <List>
          <Item>앨범 카드를 누르면 열리는 모달입니다.</Item>
          <Item>닫기: ✕ 버튼, ESC 키, 배경 클릭, 모바일에서는 아래로 스와이프해도 닫힙니다.</Item>
          <Item>아티스트 이름(또는 참여 아티스트)을 누르면 해당 아티스트의 다른 앨범을 볼 수 있는 아티스트 모달이 열립니다.</Item>
          <Item>Spotify · Apple Music · YouTube Music 아이콘을 누르면 해당 서비스에서 앨범을 바로 들을 수 있습니다.</Item>
          <Item>북마크 아이콘(🔖)을 누르면 나중에 들을 목록에 추가하거나 제거할 수 있습니다.</Item>
          <Item>우측 상단 '카드' 버튼으로 이 앨범의 평가를 스토리 이미지로 만들어 저장할 수 있습니다.</Item>
        </List>
      </Section>

      <Section title="🎵 앨범 상세 — 평가">
        <List>
          <Item>1~8점 버튼을 눌러 점수를 선택합니다. '기준 참고' 버튼을 누르면 채점 기준표를 확인할 수 있습니다.</Item>
          <Item>한줄평 입력란에 최대 100자의 소감을 남길 수 있습니다.</Item>
          <Item>'저장' 버튼을 누르면 평점과 한줄평이 저장됩니다.</Item>
          <Item>저장 후 '삭제' 버튼을 누르면 5초간 되돌리기 버튼이 표시됩니다. 이 시간 안에 되돌리면 삭제가 취소됩니다.</Item>
        </List>
        <Cautions>
          <Caution>평점 삭제 시 한줄평과 트랙 좋아요가 함께 삭제됩니다.</Caution>
          <Caution>한줄평은 100자를 초과하면 저장되지 않습니다.</Caution>
        </Cautions>
      </Section>

      <Section title="🎵 앨범 상세 — 멤버 평가 보기">
        <List>
          <Item>다른 멤버들의 점수와 한줄평이 표시됩니다. 긴 한줄평은 '...더보기'를 눌러 펼칠 수 있습니다.</Item>
          <Item>평가한 멤버가 많으면 '더보기' 버튼으로 전체 목록을 볼 수 있습니다.</Item>
          <Item>다른 멤버의 한줄평 옆 ♡ 버튼을 눌러 공감을 남길 수 있습니다. 공감 수 옆 이모지를 누르면 누가 공감했는지 확인할 수 있습니다.</Item>
        </List>
        <Cautions>
          <Caution>자신의 한줄평에는 공감을 누를 수 없습니다.</Caution>
        </Cautions>
      </Section>

      <Section title="🎵 앨범 상세 — 수록곡">
        <List>
          <Item>수록곡 영역을 누르면 트랙 목록이 펼쳐집니다. 10곡 이상이면 '+ N곡 더보기' 버튼으로 전체를 확인할 수 있습니다.</Item>
          <Item>트랙 옆 ♡ 버튼을 눌러 좋아하는 곡을 기록할 수 있습니다. 기록된 트랙은 스토리카드에 포함할 수 있습니다.</Item>
        </List>
        <Cautions>
          <Caution>수록곡 정보가 없는 앨범은 트랙 좋아요 기능을 사용할 수 없습니다.</Caution>
        </Cautions>
      </Section>
    </>
  );
}

function Page3() {
  return (
    <>
      <Section title="📥 앨범 입고">
        <List>
          <Item>음반고 우측 상단 '입고' 버튼으로 새 앨범을 등록합니다.</Item>
          <Item>아티스트명과 앨범명을 입력하고 'Spotify에서 검색' 버튼을 누르면 후보 앨범 목록이 나타납니다. 검색 결과가 많으면 '더보기' 버튼으로 전체를 볼 수 있습니다.</Item>
          <Item>후보 앨범을 선택하면 커버·발매일·수록곡 정보가 자동으로 채워집니다.</Item>
          <Item>아티스트 이름이 확실하지 않을 때는 자동 완성 힌트를 눌러 정확한 표기를 사용할 수 있습니다.</Item>
          <Item>발매일이 Spotify와 Apple Music에서 다르게 표시되는 경우, 원하는 날짜를 직접 선택할 수 있습니다.</Item>
          <Item>장르는 드롭다운에서 선택합니다. 수록곡 목록이 자동으로 채워지지 않으면 직접 입력(세미콜론으로 구분)할 수 있습니다.</Item>
          <Item>Spotify에 없는 앨범은 하단 'SoundCloud 앨범 입고' 탭에서 별도 등록할 수 있습니다.</Item>
        </List>
        <Cautions>
          <Caution>수록곡이 3개 미만인 싱글·EP는 등록할 수 없습니다.</Caution>
          <Caution>이미 등록된 앨범은 중복 등록이 차단됩니다. 음반고에서 먼저 검색해보세요.</Caution>
        </Cautions>
      </Section>
    </>
  );
}

function Page4() {
  return (
    <>
      <Section title="📖 청음감">
        <List>
          <Item>멤버 전체의 평가를 집계한 명반 랭킹 아카이브입니다.</Item>
          <Item>보기 모드를 전환해 전체 랭킹, 연도별 1위, 장르별 최고작, 아티스트별 대표작을 확인할 수 있습니다.</Item>
          <Item>아티스트별 보기에서는 정렬 기준(평균 평점 / 음반 수)을 바꿀 수 있습니다.</Item>
          <Item>전체·국내·해외 필터로 지역별로 골라볼 수 있습니다.</Item>
          <Item>장르별·연도별 보기에서 섹션 우측 '더보기'를 누르면 해당 카테고리의 전체 목록을 팝업으로 볼 수 있습니다.</Item>
          <Item>아티스트 이름을 누르면 아티스트 모달이 열립니다. 앨범을 누르면 앨범 상세 모달이 열립니다.</Item>
        </List>
        <Cautions>
          <Caution>평가 인원이 적은 앨범이 상위에 오를 수 있습니다. 통계적 참고 자료로 활용하세요.</Caution>
        </Cautions>
      </Section>

      <Section title="💬 청음평">
        <List>
          <Item>멤버들이 남긴 한줄평을 모아보는 피드입니다.</Item>
          <Item>멤버별, 점수 범위별(N점 이상 ~ N점 이하)로 필터링할 수 있습니다.</Item>
          <Item>최신순 또는 공감 많은 순으로 정렬할 수 있습니다.</Item>
          <Item>필터를 모두 초기화하려면 '✕ 초기화' 버튼을 누릅니다.</Item>
          <Item>앨범 커버를 누르면 앨범 상세 모달이 열립니다.</Item>
          <Item>앨범 제목을 누르면 해당 앨범의 한줄평만 필터링해 볼 수 있습니다. 상단 배지의 ✕를 누르면 필터가 해제됩니다.</Item>
          <Item>한줄평 우측 말풍선 아이콘을 누르면 댓글 영역이 펼쳐집니다. 댓글은 최대 200자이며 Enter 키로 바로 제출할 수 있습니다.</Item>
          <Item>다른 멤버의 한줄평에 ♡ 버튼으로 공감을 남길 수 있습니다.</Item>
        </List>
        <Cautions>
          <Caution>자신의 한줄평에는 공감을 누를 수 없습니다.</Caution>
        </Cautions>
      </Section>
    </>
  );
}

function Page5() {
  return (
    <>
      <Section title="🧑‍🤝‍🧑 청음인">
        <List>
          <Item>아차청음사 멤버 목록과 각자의 청음 통계(총 청음 수·평균 점수·선호 장르·점수 분포)를 볼 수 있습니다.</Item>
          <Item>청음 수 랭킹과 평균 점수 랭킹을 한눈에 볼 수 있습니다.</Item>
          <Item>취향 궁합 섹션에서 두 멤버 간 공통 청음 앨범의 평균 점수 차이를 확인할 수 있습니다. 숫자가 낮을수록 취향이 비슷합니다. '더보기'로 전체 조합을 볼 수 있습니다.</Item>
          <Item>멤버 카드를 누르면 해당 멤버의 청음록(프로필)으로 이동합니다.</Item>
        </List>
      </Section>

      <Section title="👤 청음록 — 프로필 상단">
        <List>
          <Item>프로필 이미지를 누르면 원본 크기로 볼 수 있습니다.</Item>
          <Item>우측 상단 편집 버튼으로 닉네임과 프로필 이미지를 변경할 수 있습니다.</Item>
          <Item>카메라 아이콘을 누르면 프로필 카드를 이미지로 캡처해 저장할 수 있습니다.</Item>
          <Item>하트 버튼을 누르면 트랙 좋아요를 누른 곡 전체 목록을 볼 수 있습니다.</Item>
          <Item>뱃지 위에 마우스를 올리면(데스크탑) 또는 길게 누르면(모바일) 뱃지 획득 조건 설명이 나타납니다.</Item>
        </List>
      </Section>

      <Section title="👤 청음록 — 통계·기록">
        <List>
          <Item>명반전 — 8점을 준 앨범 모음입니다. 앨범을 누르면 상세 모달이 열립니다.</Item>
          <Item>점수 분포 — 점수별 평가 횟수를 막대로 표시합니다. 막대를 누르면 해당 점수를 준 앨범만 음반고에서 바로 볼 수 있습니다.</Item>
          <Item>청음 캘린더 — 월별 청음 활동량을 확인합니다. 특정 날짜를 누르면 그날 평가한 앨범 목록이 표시됩니다.</Item>
          <Item>아티스트 TOP 5 — 가장 많이 들은 아티스트와 평균 점수 기준 상위 아티스트를 볼 수 있습니다. 아티스트 이름을 누르면 아티스트 모달이 열립니다.</Item>
          <Item>최근 청음 / 최근 한줄 소감 — 항목을 누르면 해당 앨범 상세 모달이 열립니다.</Item>
        </List>
      </Section>

      <Section title="👤 청음록 — 위시리스트·비교">
        <List>
          <Item>나중에 들을 목록 — 앨범 상세에서 북마크한 앨범들이 여기 모입니다. 항목을 누르면 앨범 상세 모달이 열립니다.</Item>
          <Item>장르 분포 — 장르별 청음 비율과 평균 점수, 국내·해외 비율을 볼 수 있습니다.</Item>
          <Item>취향 비교 — 드롭다운에서 다른 멤버를 선택하면 공통으로 들은 앨범에서 점수 차이를 비교해줍니다.</Item>
        </List>
      </Section>
    </>
  );
}

function Page6() {
  return (
    <>
      <Section title="🎧 청음집">
        <List>
          <Item>멤버들이 직접 만든 테마 플레이리스트 모음입니다.</Item>
          <Item>청음집 카드를 누르면 앨범 목록, 큐레이터 코멘트, 추천 트랙을 볼 수 있습니다.</Item>
          <Item>로그인 상태에서 '+ 새 청음집' 버튼으로 직접 만들 수 있습니다.</Item>
        </List>
        <Cautions>
          <Caution>청음집은 현재 데스크탑(PC) 화면에서만 접근할 수 있습니다.</Caution>
        </Cautions>
      </Section>

      <Section title="🔔 알림">
        <List>
          <Item>헤더 우측 벨 아이콘을 누르면 알림 드롭다운이 열립니다.</Item>
          <Item>드롭다운을 열면 읽지 않은 알림이 자동으로 읽음 처리됩니다.</Item>
        </List>
      </Section>

      <Section title="🔲 플로팅 메뉴">
        <List>
          <Item>화면 우측 하단의 메뉴 버튼(···)을 누르면 가이드, 공지사항, 문의 버튼이 나타납니다.</Item>
          <Item>가이드 — 이 안내를 다시 열 수 있습니다.</Item>
          <Item>공지사항 — 운영진의 최신 안내를 확인합니다.</Item>
          <Item>문의 — 오류 제보, 기능 제안, 앨범 추가 요청을 남길 수 있습니다.</Item>
        </List>
        <Cautions>
          <Caution>이미 음반고에 등록된 앨범의 추가 요청은 별도 처리되지 않습니다. 음반고에서 먼저 검색해보세요.</Caution>
        </Cautions>
      </Section>
    </>
  );
}

function ViolationRow({ level, label, items }: { level: string; label: string; items: string[] }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 5 }}>
        {level} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{label}</span>
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {items.map((item) => (
          <li key={item} style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7, paddingLeft: 10, position: "relative" }}>
            <span style={{ position: "absolute", left: 0 }}>·</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Page7() {
  return (
    <>
      <Section title="📋 서비스 목적">
        <List>
          <Item>아차청음사는 음악을 좋아하는 멤버들이 앨범을 함께 듣고, 평가하고, 기록을 나누는 청음 커뮤니티입니다.</Item>
          <Item>좋은 음악을 발견하고 취향을 나누는 공간으로 유지하기 위해 아래 규정을 운영합니다.</Item>
        </List>
      </Section>

      <Section title="📦 앨범 입고 규정">
        <List>
          <Item>수록곡 3곡 이상의 앨범만 입고 가능합니다 (싱글 불가).</Item>
          <Item>Spotify 또는 SoundCloud에서 청취 가능한 앨범이어야 합니다.</Item>
          <Item>이미 등록된 앨범은 중복 입고할 수 없습니다.</Item>
          <Item>혐오·폭력·불법 콘텐츠를 주제로 한 앨범은 어드민 검토 후 삭제될 수 있습니다.</Item>
        </List>
      </Section>

      <Section title="⭐ 평점 및 소감">
        <List>
          <Item>평점은 <b>본인이 직접 들은 앨범</b>에 한해 작성할 수 있습니다.</Item>
          <Item>8점은 인생을 통틀어 손에 꼽을 명반에만 부여합니다. 최대 12장 제한이 있습니다.</Item>
          <Item>혐오·차별 표현 또는 타인을 비방하는 소감은 신고 대상입니다.</Item>
        </List>
      </Section>

      <Section title="🤝 커뮤니티 행동 강령">
        <List>
          <Item>음악적 의견 차이는 자연스러운 것입니다. 의견 충돌 시 음악에 대한 논의로 한정해주세요.</Item>
          <Item>다른 멤버의 취향을 존중합니다. 낮은 평점 자체는 문제 없으나 인신공격은 금지됩니다.</Item>
          <Item>스팸·도배(3회 이상 반복)·홍보 행위는 금지됩니다.</Item>
          <Item>댓글은 해당 소감·앨범과 관련된 내용으로 작성해주세요.</Item>
        </List>
      </Section>

      <Section title="⚠️ 위반 등급 및 조치">
        <ViolationRow
          level="🟡 경고"
          label="(1등급)"
          items={["도배·스팸 (동일 내용 3회 이상)", "주제와 무관한 댓글", "가벼운 비속어", "미청음 평가 의심"]}
        />
        <ViolationRow
          level="🟠 7일 정지"
          label="(2등급)"
          items={["특정 멤버 인신공격·조롱", "의도적 스팸·홍보", "경고 후 동일 위반 반복"]}
        />
        <ViolationRow
          level="🔴 14일 정지"
          label="(3등급)"
          items={["혐오·차별 표현 (첫 위반)", "7일 정지 이후 재발"]}
        />
        <ViolationRow
          level="⚫ 영구 정지"
          label="(4등급)"
          items={["타인 개인정보 노출*", "불법 콘텐츠 유포", "14일 정지 이후 재발", "지속적인 서비스 운영 방해"]}
        />
        <Cautions>
          <Caution>* 개인정보 노출(타인의 실명·연락처·위치 등)은 심각성에 따라 즉시 영구 정지될 수 있습니다.</Caution>
          <Caution>같은 등급 위반이 반복되면 다음 등급 조치가 적용됩니다.</Caution>
        </Cautions>
      </Section>

      <Section title="📝 처리 원칙">
        <List>
          <Item>처리 결과는 신고자·피신고자 모두에게 알림으로 전송됩니다.</Item>
          <Item>이의 신청은 처리일로부터 7일 이내 게시판을 통해 접수할 수 있습니다.</Item>
          <Item>최종 판단은 어드민의 재량에 따릅니다. 동일 위반이라도 맥락·심각성에 따라 조정될 수 있습니다.</Item>
          <Item>규정은 사전 공지 후 변경될 수 있습니다. 규정 문의는 게시판으로 접수해주세요.</Item>
        </List>
      </Section>

      <div style={{
        display: "flex", gap: 8, marginTop: 8,
        paddingTop: 20, borderTop: "1px solid var(--border)",
      }}>
        <a
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1, padding: "9px 0", textAlign: "center",
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)", borderRadius: 8,
            color: "var(--text-muted)", fontSize: 12, fontWeight: 600,
            textDecoration: "none",
          }}
        >
          이용약관
        </a>
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1, padding: "9px 0", textAlign: "center",
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)", borderRadius: 8,
            color: "var(--text-muted)", fontSize: 12, fontWeight: 600,
            textDecoration: "none",
          }}
        >
          개인정보처리방침
        </a>
      </div>
    </>
  );
}

const PAGE_COMPONENTS = [Page1, Page2, Page3, Page4, Page5, Page6, Page7];

export default function TutorialModal() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const p = (e as CustomEvent<{ page?: number }>).detail?.page ?? 0;
      setOpen(true);
      setPage(p);
    };
    window.addEventListener("open-tutorial", handler);
    return () => window.removeEventListener("open-tutorial", handler);
  }, []);

  const backdropRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // 페이지 전환 시 스크롤 상단으로
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [page]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  if (!open) return null;

  const PageComponent = PAGE_COMPONENTS[page];
  const isLast = page === PAGES.length - 1;

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
          padding: "14px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 2px 0" }}>GUIDE</p>
            <h1 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", margin: 0 }}>아차청음사 이용 안내</h1>
          </div>
          <button onClick={dismiss} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-sub)", padding: 10, margin: -6 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* 페이지 탭 */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0, overflowX: "auto" }}>
          {PAGES.map((label, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              style={{
                flexShrink: 0,
                padding: "9px 14px",
                background: "none", border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: page === i ? 700 : 400,
                color: page === i ? "var(--accent)" : "var(--text-muted)",
                borderBottom: page === i ? "2px solid var(--accent)" : "2px solid transparent",
                transition: "color 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 본문 */}
        <div ref={bodyRef} style={{ overflowY: "auto", padding: "22px 20px", flex: 1 }}>
          <PageComponent />
        </div>

        {/* 하단 네비 */}
        <div style={{
          padding: "12px 20px",
          borderTop: "1px solid var(--border)",
          flexShrink: 0,
          paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div style={{ display: "flex", gap: 8 }}>
            {page > 0 && (
              <button
                onClick={() => setPage(page - 1)}
                style={{
                  flex: 1, padding: "11px 0",
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text-sub)",
                  border: "1px solid var(--border)",
                  borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >
                이전
              </button>
            )}
            {isLast ? (
              <button
                onClick={dismiss}
                style={{
                  flex: 2, padding: "11px 0",
                  backgroundColor: "var(--accent)", color: "var(--bg)",
                  border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}
              >
                확인했어요
              </button>
            ) : (
              <button
                onClick={() => setPage(page + 1)}
                style={{
                  flex: 2, padding: "11px 0",
                  backgroundColor: "var(--accent)", color: "var(--bg)",
                  border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}
              >
                다음 →
              </button>
            )}
          </div>
          {/* 단계별 투어 */}
          <button
            onClick={() => { dismiss(); openOnboarding(); }}
            style={{
              background: "none", border: "1px solid var(--border)",
              borderRadius: 10, padding: "9px 0",
              color: "var(--text-muted)", fontSize: 12, cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(var(--accent-rgb),0.5)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
          >
            버튼 하나씩 직접 둘러보기 →
          </button>
        </div>
      </div>
    </div>
  );
}

export function openTutorial(page?: number) {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("open-tutorial", { detail: { page } }));
}

export const RULES_PAGE_INDEX = 6;
