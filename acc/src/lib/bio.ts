const GENRE_KO: Record<string, string> = {
  "Rap & Hiphop": "랩/힙합",
  "R&B": "알앤비",
  "K-pop": "K-pop",
  "Rock": "록",
  "외힙": "외힙",
  "Pop": "팝",
  "인디": "인디",
  "Ballad": "발라드",
  "Electronica": "일렉트로니카",
  "컴필레이션": "컴필레이션",
  "Folk": "포크",
  "Alternative": "얼터너티브",
  "Alternative Rock": "얼터너티브 록",
  "Country": "컨트리",
  "국외영화": "국외영화",
  "국내드라마": "국내드라마",
  "국내예능": "국내예능",
  "기타": "기타",
  // 잔여 이상 데이터
  "외국힙합 컴필레이션": "외힙 컴필레이션",
  "Pop Ballad": "팝 발라드",
  "Korean Folk/Blues": "포크/블루스",
};

export function koGenre(genre: string): string {
  return GENRE_KO[genre] ?? genre;
}

type BioParams = {
  avg: string | null;
  topGenre: string | null;
  topGenreRatio: number;
  topArtist: string | null;
  topArtistCount: number;
  topArtistAvg: number;
  eightCount: number;
  total: number;
  reviewCount: number;
};

export function generateBadges(params: BioParams): string[] {
  const { avg, topGenre, topGenreRatio, topArtist, topArtistCount, topArtistAvg, eightCount, total, reviewCount } = params;
  if (total < 5) return [];

  const avgNum = avg ? parseFloat(avg) : 0;
  const reviewRatio = total > 0 ? reviewCount / total : 0;
  const badges: string[] = [];

  // 1. 성향 뱃지
  const tendency =
    avgNum >= 7.0 ? "너그러운 귀" :
    avgNum >= 6.2 ? "균형잡힌 귀" :
    avgNum >= 5.5 ? "까다로운 귀" : "냉철한 귀";
  badges.push(tendency);

  // 2. 장르 뱃지
  if (topGenre && topGenreRatio >= 0.45) {
    badges.push(`${koGenre(topGenre)}만 듣는 귀`);
  } else if (topGenre) {
    badges.push(`${koGenre(topGenre)} 청음인`);
  }

  // 3. 아티스트 뱃지 — 3장 이상 + 평균 6.0 이상이어야 진짜 애청자
  if (topArtist && topArtistCount >= 3 && topArtistAvg >= 6.0) {
    badges.push(`${topArtist} 애청자`);
  }

  // 4. 특성 뱃지
  if (eightCount >= 10) {
    badges.push("명반 수집가");
  } else if (eightCount >= 3) {
    badges.push(`명반 ${eightCount}장`);
  }

  if (reviewRatio >= 0.5 && total >= 10) {
    badges.push("기록하는 청음인");
  }

  return badges.slice(0, 3); // 최대 3개
}

// 하위 호환 (멤버 페이지 등에서 단순 텍스트 필요할 때)
export function generateBio(params: BioParams): string {
  const badges = generateBadges(params);
  return badges[0] ?? "";
}
