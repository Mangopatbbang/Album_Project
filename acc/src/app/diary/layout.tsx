import { Playfair_Display, Lora } from "next/font/google";
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

export default function DiaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${playfair.variable} ${lora.variable}`}
      style={{
        "--bg": "#1C1917",
        "--bg-card": "#252220",
        "--bg-elevated": "#302B27",
        "--bg-rgb": "28,25,23",
        "--border": "#3C3733",
        "--text": "#F5F0EC",
        "--text-muted": "#9E9890",
        "--text-sub": "#625D58",
        "--accent": "#C4AA7C",
        "--accent-rgb": "196,170,124",
      } as React.CSSProperties}
    >
      <DiaryHeader />
      {children}
    </div>
  );
}
