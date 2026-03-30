const GENRE_KO: Record<string, string> = {
  "Rap & Hiphop": "랩/힙합",
  "Hip-Hop": "힙합",
  "Hiphop": "힙합",
  "Rock": "록",
  "Indie Rock": "인디록",
  "Alternative": "얼터너티브",
  "Pop": "팝",
  "Indie Pop": "인디팝",
  "R&B": "알앤비",
  "Soul": "소울",
  "Jazz": "재즈",
  "Electronic": "일렉트로닉",
  "Electronic/Dance": "일렉트로닉",
  "Dance": "댄스",
  "Folk": "포크",
  "Classical": "클래식",
  "Metal": "메탈",
  "Blues": "블루스",
  "Country": "컨트리",
  "Reggae": "레게",
  "Latin": "라틴",
  "Punk": "펑크",
  "Funk": "펑크/소울",
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
