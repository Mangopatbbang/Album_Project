import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
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
      className={`${pretendard.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-dvh flex flex-col sm:pb-0">
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
          </ToastProvider>
          </NotificationsProvider>
          </UserAvatarsProvider>
          </UsersProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
