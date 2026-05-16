const GENRE_KO: Record<string, string> = {
  // 구 영문 장르 → 정규화 영문
  "Rap & Hiphop": "Hip-Hop",
  "K-pop": "Pop",
  "외힙": "Hip-Hop",
  "Electronica": "Electronic",
  "Alternative Rock": "Alternative",
  "국외영화": "Other",
  "국내드라마": "Other",
  "국내예능": "Other",
  "기타": "Other",
  "외국힙합 컴필레이션": "Compilation",
  "Korean Folk/Blues": "Folk",
  // 구 한글 장르 → 영문
  "힙합": "Hip-Hop",
  "알앤비": "R&B",
  "팝": "Pop",
  "락": "Rock",
  "일렉트로니카": "Electronic",
  "포크": "Folk",
  "얼터너티브": "Alternative",
  "재즈": "Jazz",
  "컨트리": "Country",
  "컴필레이션": "Compilation",
  "기타 (영화, 드라마, 예능 등)": "Other",
};

export function koGenre(genre: string): string {
  return GENRE_KO[genre] ?? genre;
}

// 정규화된 장르명 → DB에 저장될 수 있는 모든 원시 값 (필터 쿼리용)
export function getRawGenreValues(normalizedGenre: string): string[] {
  const result = new Set<string>([normalizedGenre]);
  for (const [raw, norm] of Object.entries(GENRE_KO)) {
    if (norm === normalizedGenre) result.add(raw);
  }
  return [...result];
}

export const GENRE_COLOR: Record<string, string> = {
  "Hip-Hop":     "#f59e0b",
  "R&B":         "#a855f7",
  "Pop":         "#ec4899",
  "Rock":        "#ef4444",
  "Electronic":  "#06b6d4",
  "Folk":        "#65a30d",
  "Alternative": "#14b8a6",
  "Jazz":        "#6366f1",
  "Country":     "#f97316",
  "OST":         "#64748b",
  "Compilation": "#78716c",
  "Other":       "#94a3b8",
};

export const GENRE_EMOJI: Record<string, string> = {
  "Hip-Hop": "📼",
  "R&B": "🎷",
  "Pop": "🫧",
  "Rock": "🎸",
  "Electronic": "🎛️",
  "Folk": "🌿",
  "Alternative": "🌊",
  "Jazz": "🎹",
  "Country": "🪕",
  "OST": "🎬",
  "Compilation": "💽",
  "Other": "📺",
};

