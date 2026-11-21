/** 앨범 커버에서 채도 높은 픽셀들의 지배적인 Hue 추출 */
export function extractDominantHue(url: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const size = 80;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(215); return; }
      ctx.drawImage(img, 0, 0, size, size);
      try {
        const { data } = ctx.getImageData(0, 0, size, size);
        const buckets = new Array(36).fill(0);
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const chroma = max - min;
          const l = (max + min) / 2;
          if (chroma < 0.12 || l < 0.12 || l > 0.88) continue;
          let hue: number;
          if (max === r) hue = ((g - b) / chroma + (g < b ? 6 : 0)) * 60;
          else if (max === g) hue = ((b - r) / chroma + 2) * 60;
          else hue = ((r - g) / chroma + 4) * 60;
          buckets[Math.floor(hue / 10)] += chroma;
        }
        const maxVal = Math.max(...buckets);
        if (maxVal === 0) { resolve(215); return; }
        resolve(buckets.indexOf(maxVal) * 10 + 5);
      } catch { resolve(215); }
    };
    img.onerror = () => resolve(215);
    img.src = url;
  });
}

/** 캔버스로 그레인 노이즈 텍스처 data URI 생성 */
export function generateNoiseBg(): string {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const imgData = ctx.createImageData(size, size);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = v;
    imgData.data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL();
}
