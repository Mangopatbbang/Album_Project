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
  weight: ["400"],
  variable: "--font-song",
});

export default function DiaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${playfair.variable} ${lora.variable} ${songMyung.variable}`}
      style={{
        /* 일기 전용 한지 테마 — 다이어리 섹션 내부에만 적용 */
        "--bg": "#f8f7f4",
        "--bg-card": "#ffffff",
        "--bg-elevated": "#f2f1ee",
        "--bg-rgb": "248,247,244",
        "--border": "rgba(20,14,6,0.14)",
        "--border-light": "rgba(20,14,6,0.07)",
        "--text": "#150f06",
        "--text-muted": "rgba(21,15,6,0.5)",
        "--text-sub": "rgba(21,15,6,0.3)",
        "--accent": "#8a2d24",
        "--accent-rgb": "138,45,36",
      } as React.CSSProperties}
    >
      <DiaryHeader />
      {children}
    </div>
  );
}
