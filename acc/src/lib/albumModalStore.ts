import type { AlbumWithRatings } from "@/types";

function storageKey(id: string) {
  return `album_modal:${id}`;
}

export function preloadModal(id: string, data: AlbumWithRatings): void {
  try {
    sessionStorage.setItem(storageKey(id), JSON.stringify(data));
  } catch {}
}

export function consumeModal(id: string): AlbumWithRatings | null {
  try {
    const raw = sessionStorage.getItem(storageKey(id));
    return raw ? (JSON.parse(raw) as AlbumWithRatings) : null;
  } catch {
    return null;
  }
}

export function clearModal(id: string): void {
  try {
    sessionStorage.removeItem(storageKey(id));
  } catch {}
}
