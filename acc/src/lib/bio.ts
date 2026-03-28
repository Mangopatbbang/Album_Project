type BioParams = {
  avg: string | null;
  topGenre: string | null;
  topGenreRatio: number;
  topArtist: string | null;
  topArtistCount: number;
  eightCount: number;
  total: number;
  reviewCount: number;
};

export function generateBio(params: BioParams): string {
  const { avg, topGenre, topGenreRatio, topArtist, topArtistCount, eightCount, total, reviewCount } = params;

  const avgNum = avg ? parseFloat(avg) : 0;
  const reviewRatio = total > 0 ? reviewCount / total : 0;

  // 점수 성향
  const tendency =
    avgNum >= 7.0 ? "너그러운" :
    avgNum >= 6.2 ? "균형잡힌" :
    avgNum >= 5.5 ? "까다로운" : "냉철한";

  // 특정 아티스트 애청
  if (topArtist && topArtistCount >= 5) {
    return `${topArtist} 애청자`;
  }

  // 명반 수집가 (8점이 많을 때)
  if (eightCount >= 10) {
    return `${tendency} 명반 수집가`;
  }

  // 평론가 기질 (한줄평 비율 높을 때)
  if (reviewRatio >= 0.6 && total >= 10) {
    return topGenre ? `${topGenre}을 말하는 평론가` : "기록하는 청음인";
  }

  // 장르 편식
  if (topGenre && topGenreRatio >= 0.45) {
    return `${tendency} ${topGenre} 편식가`;
  }

  // 일반
  if (topGenre) {
    return `${tendency} ${topGenre} 청음인`;
  }

  return `${tendency} 청음인`;
}
