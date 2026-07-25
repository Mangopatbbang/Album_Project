// 카드 클릭 경로 vs 직접 URL 접근을 구분하는 인메모리 플래그
// sessionStorage 불필요 — 판별은 동일 JS 세션 내에서만 유효하고, 페이지 새로고침 시 초기화되어야 함
const cardOpenedIds = new Set<string>();

/** AlbumCard 클릭 시 호출: "이 앨범은 카드 클릭으로 열렸다"는 마커 등록 */
export function markCardOpened(id: string): void {
  cardOpenedIds.add(id);
}

/** InterceptedAlbumModal 마운트 시 호출: 카드 클릭 경로면 true 반환(마커 소비), 직접 URL이면 false */
export function consumeCardOpened(id: string): boolean {
  if (!cardOpenedIds.has(id)) return false;
  cardOpenedIds.delete(id);
  return true;
}
