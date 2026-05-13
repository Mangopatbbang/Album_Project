import html2canvas from "html2canvas";

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function captureToBlob(el: HTMLElement, bg = "#1a1817", width?: number, height?: number): Promise<Blob | null> {
  const canvas = await html2canvas(el, {
    backgroundColor: bg,
    useCORS: true,
    allowTaint: false,
    scale: 3,
    logging: false,
    // transform 부모로 인해 getBoundingClientRect가 축소 값을 반환할 수 있으므로 명시적 지정
    ...(width !== undefined && { width }),
    ...(height !== undefined && { height }),
  });
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export async function captureStoryCard(el: HTMLElement, albumTitle: string): Promise<void> {
  const blob = await captureToBlob(el);
  if (!blob) return;
  downloadBlob(blob, `${albumTitle.replace(/[<>:"/\\|?*]/g, "")}_card.png`);
}

export async function captureElement(el: HTMLElement): Promise<void> {
  const canvas = await html2canvas(el, {
    backgroundColor: "#242220", // --bg-card
    useCORS: true,
    allowTaint: false,
    scale: Math.min(window.devicePixelRatio * 2, 4),
    logging: false,
  });

  // 클립보드에 복사 시도 (toBlob은 비동기 콜백 → Promise로 래핑)
  await new Promise<void>((resolve) => {
    canvas.toBlob(async (blob) => {
      try {
        if (!blob) throw new Error();
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      } catch {
        // 클립보드 실패 시 파일 다운로드
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = "capture.png";
        a.click();
      }
      resolve();
    }, "image/png");
  });
}
