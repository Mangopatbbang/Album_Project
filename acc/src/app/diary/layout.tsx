import { Playfair_Display, Lora, Song_Myung } from "next/font/google";
import DiaryHeader from "@/components/diary/DiaryHeader";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-playfair",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  variable: "--font-lora",
});

const songMyung = Song_Myung({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-song",
});

export default function DiaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${playfair.variable} ${lora.variable} ${songMyung.variable}`}
      style={{
        /* 일기 전용 한지 테마 — 다이어리 섹션 내부에만 적용 */
        "--bg": "#eae0be",
        "--bg-card": "#f0e8cc",
        "--bg-elevated": "#f5eed8",
        "--bg-rgb": "234,224,190",
        "--border": "rgba(43,34,24,0.25)",
        "--border-light": "rgba(43,34,24,0.12)",
        "--text": "#241b14",
        "--text-muted": "rgba(36,27,20,0.58)",
        "--text-sub": "rgba(36,27,20,0.38)",
        "--accent": "#8a2d24",
        "--accent-rgb": "138,45,36",
      } as React.CSSProperties}
    >
      <DiaryHeader />
      {children}
    </div>
  );
}
