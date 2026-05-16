// 칭호 시스템 — 로직 레이어 (UI 미연결 상태)
//
// 사용법:
//   const earned = evaluateTitles(input);
//   → 조건을 충족한 Title[] 반환
//
// 프로필 페이지에서 이미 계산하는 값들로만 구성돼 있어서
// 연결할 때 DB 추가 없이 import + 렌더만 하면 됨.

export type TitleInput = {
  total: number;               // 총 청음 수
  avg: string | null;          // 평균 점수 (소수점 2자리 문자열)
  eightCount: number;          // 8점 앨범 수
  reviewCount: number;         // 한줄평 작성 수
  encounterCount: number;      // 인연으로 만난 앨범 수
  topGenreRatio: number;       // 최다 장르 비중 (0~1)
  topArtistCount: number;      // 최다 아티스트 청음 수
  distinctGenreCount: number;  // 청음한 장르 종류 수
  domesticRatio: number;       // 국내 청음 비중 (0~1)
  foreignRatio: number;        // 해외 청음 비중 (0~1)
  yearSpan: number;            // 청음 기록이 걸친 연도 수
};

export type Title = {
  key: string;
  label: string;
  description: string;
  emoji: string;
  color: string;
};

// 칭호 정의 목록
// earned(input) → true면 해당 칭호 획득
const TITLE_DEFS: Array<Title & { earned: (i: TitleInput) => boolean }> = [
  {
    key: "centurion",
    label: "백장 클럽",
    description: "청음 100장 돌파",
    emoji: "💯",
    color: "#e8d5a3",
    earned: (i) => i.total >= 100,
  },
  {
    key: "audiophile",
    label: "오디오파일",
    description: "평균 점수 6.5점 이상 (50장 이상)",
    emoji: "🎧",
    color: "#a855f7",
    earned: (i) => i.total >= 50 && parseFloat(i.avg ?? "0") >= 6.5,
  },
  {
    key: "strict_ear",
    label: "혹독한 귀",
    description: "평균 점수 4.0점 미만 (30장 이상)",
    emoji: "🗡️",
    color: "#ef4444",
    earned: (i) => i.total >= 30 && parseFloat(i.avg ?? "10") < 4.0,
  },
  {
    key: "hall_of_famer",
    label: "명반사냥꾼",
    description: "8점 앨범 5장 이상",
    emoji: "🏆",
    color: "#f59e0b",
    earned: (i) => i.eightCount >= 5,
  },
  {
    key: "chronicler",
    label: "기록가",
    description: "한줄평 30개 이상 작성",
    emoji: "📝",
    color: "#06b6d4",
    earned: (i) => i.reviewCount >= 30,
  },
  {
    key: "serendipity",
    label: "인연론자",
    description: "인연으로 만난 앨범 10장 이상",
    emoji: "◇",
    color: "#a78bfa",
    earned: (i) => i.encounterCount >= 10,
  },
  {
    key: "genre_loyalist",
    label: "장르 근본주의자",
    description: "청음의 60% 이상이 한 장르",
    emoji: "🎯",
    color: "#14b8a6",
    earned: (i) => i.topGenreRatio >= 0.6,
  },
  {
    key: "omnivore",
    label: "잡식성 귀",
    description: "6가지 이상 장르 청음",
    emoji: "🌐",
    color: "#65a30d",
    earned: (i) => i.distinctGenreCount >= 6,
  },
  {
    key: "domestic_hero",
    label: "국내파",
    description: "청음의 70% 이상이 국내 앨범",
    emoji: "🇰🇷",
    color: "#e8d5a3",
    earned: (i) => i.domesticRatio >= 0.7,
  },
  {
    key: "globe_trotter",
    label: "해외파",
    description: "청음의 80% 이상이 해외 앨범",
    emoji: "✈️",
    color: "#6b9ef0",
    earned: (i) => i.foreignRatio >= 0.8,
  },
  {
    key: "obsessive",
    label: "집착광",
    description: "한 아티스트 앨범 5장 이상 청음",
    emoji: "🔁",
    color: "#f97316",
    earned: (i) => i.topArtistCount >= 5,
  },
  {
    key: "long_term",
    label: "장기 투자자",
    description: "3년 이상에 걸친 청음 기록",
    emoji: "📅",
    color: "#78716c",
    earned: (i) => i.yearSpan >= 3,
  },
];

export function evaluateTitles(input: TitleInput): Title[] {
  return TITLE_DEFS
    .filter((def) => def.earned(input))
    .map(({ key, label, description, emoji, color }) => ({ key, label, description, emoji, color }));
}

// 프로필 페이지에서 TitleInput 조립 예시:
//
// const titleInput: TitleInput = {
//   total,
//   avg,
//   eightCount: hallOfFame.length,
//   reviewCount,
//   encounterCount: encounterAlbums.length,
//   topGenreRatio: genreList[0] ? genreList[0].count / Math.max(total, 1) : 0,
//   topArtistCount: artistByCount[0]?.count ?? 0,
//   distinctGenreCount: genreList.length,
//   domesticRatio: totalDomestic / Math.max(total, 1),
//   foreignRatio: totalForeign / Math.max(total, 1),
//   yearSpan: yearlyRecap.length,
// };
// const earnedTitles = evaluateTitles(titleInput);
