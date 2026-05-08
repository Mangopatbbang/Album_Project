import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { AuthProvider } from "@/context/AuthContext";
import { UserAvatarsProvider } from "@/context/UserAvatarsContext";
import { UsersProvider } from "@/context/UsersContext";
import SplashScreen from "@/components/ui/SplashScreen";
import BottomNav from "@/components/layout/BottomNav";
import FloatingActions from "@/components/ui/FloatingActions";
import TutorialModal from "@/components/ui/TutorialModal";
import SpotlightTour from "@/components/ui/SpotlightTour";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "아차청음사",
    template: "%s | 아차청음사",
  },
  description: "우물 안 개구리들의 음악 아카이브",
  openGraph: {
    title: "아차청음사",
    description: "우물 안 개구리들의 음악 아카이브",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-dvh flex flex-col pb-[72px] sm:pb-0">
        <AuthProvider>
          <UsersProvider>
          <UserAvatarsProvider>
          <ToastProvider>
            <SplashScreen />
            {children}
            <BottomNav />
            <FloatingActions />
            <SpotlightTour />
            <TutorialModal />
          </ToastProvider>
          </UserAvatarsProvider>
          </UsersProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
