export const SCORE_COLORS: Record<number, string> = {
  1: "#e05050", // 빨강
  2: "#e07838", // 주황-빨강
  3: "#df9e30", // 주황-앰버
  4: "#c8c028", // 노랑
  5: "#80c040", // 연두
  6: "#38b068", // 초록
  7: "#30a0b8", // 청록
  8: "#e8ff48", // 네온 라임 (special)
};

export function scoreColor(score: number | string | null | undefined): string {
  if (score === null || score === undefined) return "var(--text-muted)";
  const n = Math.floor(typeof score === "string" ? parseFloat(score) : score);
  return SCORE_COLORS[Math.min(Math.max(n, 1), 8)] ?? "var(--text-muted)";
}
