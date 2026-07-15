import type { Metadata, Viewport } from "next";
import { Geist_Mono, Barlow_Condensed } from "next/font/google";
import localFont from "next/font/local";
import { AuthProvider } from "@/context/AuthContext";
import { UserAvatarsProvider } from "@/context/UserAvatarsContext";
import { UsersProvider } from "@/context/UsersContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import SplashScreen from "@/components/ui/SplashScreen";
import BottomNav from "@/components/layout/BottomNav";
import FloatingActions from "@/components/ui/FloatingActions";
import TutorialModal from "@/components/ui/TutorialModal";
import SpotlightTour from "@/components/ui/SpotlightTour";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import { ToastProvider } from "@/components/ui/Toast";
import PageViewTracker from "@/components/analytics/PageViewTracker";
import AuthSessionWatcher from "@/components/ui/AuthSessionWatcher";
import { supabaseServer } from "@/lib/supabase";
import type { User } from "@/types";
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

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  style: ["italic"],
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

async function getInitialData() {
  const [usersResult, avatarsResult] = await Promise.all([
    supabaseServer.from("users").select("id, display_name, emoji"),
    supabaseServer.from("users").select("id, avatar_url"),
  ]);
  const initialUsers: User[] = (usersResult.data ?? []) as User[];
  const initialAvatarMap: Record<string, string | null> = {};
  for (const row of (avatarsResult.data ?? []) as { id: string; avatar_url: string | null }[]) {
    initialAvatarMap[row.id] = row.avatar_url ?? null;
  }
  return { initialUsers, initialAvatarMap };
}

export default async function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal?: React.ReactNode;
}>) {
  const { initialUsers, initialAvatarMap } = await getInitialData();

  return (
    <html
      lang="ko"
      className={`${pretendard.variable} ${geistMono.variable} ${barlowCondensed.variable} h-full`}
    >
      <body className="min-h-dvh flex flex-col pb-[calc(72px+env(safe-area-inset-bottom))] sm:pb-0">
        {/* LogoMark 전역 그라디언트·필터 — 모든 LogoMark 인스턴스가 참조 */}
        <svg width="0" height="0" style={{ position: "absolute", overflow: "hidden" }} aria-hidden="true">
          <defs>
            <radialGradient id="lm-body" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#131109" />
              <stop offset="100%" stopColor="#070605" />
            </radialGradient>
            <radialGradient id="lm-spec" cx="28%" cy="22%" r="52%">
              <stop offset="0%"   stopColor="#ede8d8" stopOpacity=".24" />
              <stop offset="38%"  stopColor="#d8ceb0" stopOpacity=".07" />
              <stop offset="100%" stopColor="#000"    stopOpacity="0"   />
            </radialGradient>
            <radialGradient id="lm-vign" cx="50%" cy="50%" r="50%">
              <stop offset="52%"  stopColor="#000" stopOpacity="0"   />
              <stop offset="100%" stopColor="#000" stopOpacity=".88" />
            </radialGradient>
            <radialGradient id="lm-lbl" cx="46%" cy="40%" r="58%">
              <stop offset="0%"   stopColor="#2e2a1f" />
              <stop offset="100%" stopColor="#1a1812" />
            </radialGradient>
            <radialGradient id="lm-spd" cx="32%" cy="26%" r="68%">
              <stop offset="0%"   stopColor="#eedfb0" />
              <stop offset="50%"  stopColor="#b89040" />
              <stop offset="100%" stopColor="#6e4e18" />
            </radialGradient>
            <filter id="lm-grain" x="-5%" y="-5%" width="110%" height="110%"
              colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency=".80" numOctaves={3}
                seed={4} stitchTiles="stitch" result="noise" />
              <feColorMatrix type="saturate" values="0" in="noise" result="gray" />
              <feBlend in="SourceGraphic" in2="gray" mode="overlay" result="blended" />
              <feComposite in="blended" in2="SourceGraphic" operator="in" />
            </filter>
            {/* 스플래시 문짝 나무결 필터 */}
            <filter id="door-grain" x="-2%" y="-2%" width="104%" height="104%"
              colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency=".75 .052" numOctaves={6}
                seed={3} result="t" />
              <feColorMatrix in="t" type="matrix"
                values=".22 0 0 0 .07  .14 0 0 0 .04  .07 0 0 0 .015  0 0 0 9 -4.2"
                result="w" />
              <feBlend in="SourceGraphic" in2="w" mode="soft-light" />
            </filter>
            {/* 문짝 외곽(경첩) 어둠 / 이음새 따뜻한 빛 */}
            <linearGradient id="door-depth" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"  stopColor="#000" stopOpacity={0.40} />
              <stop offset="28%" stopColor="#000" stopOpacity={0.04} />
              <stop offset="86%" stopColor="#000" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="door-seam" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%"   stopColor="#c8a050" stopOpacity={0.18} />
              <stop offset="14%"  stopColor="#c8a050" stopOpacity={0.04} />
              <stop offset="100%" stopColor="transparent" stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>
        <AuthProvider>
          <UsersProvider initialUsers={initialUsers}>
          <UserAvatarsProvider initialAvatarMap={initialAvatarMap}>
          <NotificationsProvider>
          <ToastProvider>
            <SplashScreen />
            {children}
            {modal}
            <BottomNav />
            <FloatingActions />
            <SpotlightTour />
            <TutorialModal />
            <OnboardingModal />
            <PageViewTracker />
            <AuthSessionWatcher />
          </ToastProvider>
          </NotificationsProvider>
          </UserAvatarsProvider>
          </UsersProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
