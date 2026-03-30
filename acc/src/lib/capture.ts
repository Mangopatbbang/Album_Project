import html2canvas from "html2canvas";

export async function captureElement(el: HTMLElement): Promise<void> {
  const canvas = await html2canvas(el, {
    backgroundColor: "#242220", // --bg-card
    useCORS: true,
    allowTaint: false,
    scale: 2,
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
