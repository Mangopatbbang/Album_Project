import html2canvas from "html2canvas";

export async function captureElement(el: HTMLElement): Promise<void> {
  const canvas = await html2canvas(el, {
    backgroundColor: "#242220", // --bg-card
    useCORS: true,
    allowTaint: false,
    scale: 2,
    logging: false,
  });

  // 클립보드에 복사 시도
  try {
    canvas.toBlob(async (blob) => {
      if (!blob) throw new Error();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
    }, "image/png");
    return;
  } catch {
    // 클립보드 실패 시 파일 다운로드
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "capture.png";
    a.click();
  }
}
