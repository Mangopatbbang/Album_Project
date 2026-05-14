import { toBlob } from "html-to-image";

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function captureToBlob(
  el: HTMLElement,
  bg = "#1a1817",
): Promise<Blob | null> {
  return toBlob(el, {
    backgroundColor: bg,
    pixelRatio: 3,
  });
}

export async function captureElement(el: HTMLElement): Promise<void> {
  const blob = await toBlob(el, {
    backgroundColor: "#242220",
    pixelRatio: Math.min(window.devicePixelRatio * 2, 4),
  });

  try {
    if (!blob) throw new Error();
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  } catch {
    if (!blob) return;
    downloadBlob(blob, "capture.png");
  }
}
