"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { openTutorial } from "@/components/ui/TutorialModal";

export default function WelcomeOnboarding() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("welcome") !== "1") return;
    router.replace("/", { scroll: false });
    // 라우터 교체 후 한 프레임 뒤에 열어야 TutorialModal이 마운트된 상태
    const t = setTimeout(() => openTutorial(), 100);
    return () => clearTimeout(t);
  }, [searchParams, router]);

  return null;
}
