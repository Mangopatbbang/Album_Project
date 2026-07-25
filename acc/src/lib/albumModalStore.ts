import type { AlbumWithRatings } from "@/types";

// 클라이언트 모듈 레벨 스토어 — AlbumCard 클릭 시 저장, InterceptedAlbumModal에서 즉시 읽기
// 브라우저 JS는 모듈을 싱글톤으로 캐시하므로 두 컴포넌트가 같은 인스턴스를 공유
const store = new Map<string, AlbumWithRatings>();

export function preloadModal(id: string, data: AlbumWithRatings): void {
  store.set(id, data);
}

export function consumeModal(id: string): AlbumWithRatings | null {
  return store.get(id) ?? null;
}

export function clearModal(id: string): void {
  store.delete(id);
}
