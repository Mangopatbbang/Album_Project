import { Playfair_Display } from "next/font/google";
import DiaryHeader from "@/components/diary/DiaryHeader";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-playfair",
});

export default function DiaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={playfair.variable}
      style={{
        "--bg": "#1C1917",
        "--bg-card": "#292524",
        "--bg-elevated": "#3C3330",
        "--bg-rgb": "28,25,23",
        "--border": "#44403C",
        "--text": "#FAFAF9",
        "--text-muted": "#A8A29E",
        "--text-sub": "#78716C",
        "--accent": "#D4A574",
        "--accent-rgb": "212,165,116",
      } as React.CSSProperties}
    >
      <DiaryHeader />
      {children}
    </div>
  );
}
