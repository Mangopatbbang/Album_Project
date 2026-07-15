"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function AuthSessionWatcher() {
  const { showToastWithAction } = useToast();
  const router = useRouter();
  const firedRef = useRef(false);

  useEffect(() => {
    const handler = async () => {
      if (firedRef.current) return;
      firedRef.current = true;
      setTimeout(() => { firedRef.current = false; }, 4000);

      // 세션 즉시 정리 → SIGNED_OUT → AuthContext 상태·캐시 클리어
      // 토스트가 뜨는 시점에 UI도 로그아웃 상태로 동시 전환
      await supabaseBrowser.auth.signOut();

      showToastWithAction(
        "세션이 만료됐어요. 다시 로그인해주세요.",
        "로그인 →",
        () => router.push("/login"),
      );
    };
    window.addEventListener("auth:session-expired", handler);
    return () => window.removeEventListener("auth:session-expired", handler);
  }, [showToastWithAction, router]);

  return null;
}
