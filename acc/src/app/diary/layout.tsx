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
        "--bg": "#0C0E16",
        "--bg-card": "#12151F",
        "--bg-elevated": "#191C2C",
        "--bg-rgb": "12,14,22",
        "--border": "#22273A",
        "--text": "#E8ECFF",
        "--text-muted": "#7880A8",
        "--text-sub": "#424872",
        "--accent": "#8B9CF4",
        "--accent-rgb": "139,156,244",
      } as React.CSSProperties}
    >
      <DiaryHeader />
      {children}
    </div>
  );
}
