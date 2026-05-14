import html2canvas from "html2canvas";

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
  width?: number,
  height?: number,
  onclone?: (doc: Document, clonedEl: HTMLElement) => void,
): Promise<Blob | null> {
  const canvas = await html2canvas(el, {
    backgroundColor: bg,
    useCORS: true,
    allowTaint: false,
    scale: 3,
    logging: false,
    ...(onclone && { onclone }),
    ...(width !== undefined && { width }),
    ...(height !== undefined && { height }),
  });
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

// html2canvas는 CSS filter(blur, brightness 등)를 지원하지 않으므로
// canvas 2D API로 blur 배경을 미리 렌더링해 data URL로 반환
export function prerenderBlur(proxiedUrl: string, width = 360, height = 640): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(null); return; }
      const scale = 1.15;
      const sw = width * scale;
      const sh = height * scale;
      const sx = (width - sw) / 2;
      const sy = (height - sh) / 2;
      ctx.filter = "blur(40px) saturate(1.8) brightness(0.45)";
      ctx.drawImage(img, sx, sy, sw, sh);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = proxiedUrl;
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
