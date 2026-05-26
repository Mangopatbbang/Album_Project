import { Playfair_Display, Lora, Song_Myung } from "next/font/google";
import { DiaryThemeProvider } from "@/components/diary/DiaryThemeProvider";
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
    <div className={`${playfair.variable} ${lora.variable} ${songMyung.variable}`}>
      <DiaryThemeProvider>
        <DiaryHeader />
        {children}
      </DiaryThemeProvider>
    </div>
  );
}
