"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import LogoMark from "@/components/ui/LogoMark";

export default function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("로그인 처리 중...");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const run = async () => {
      const code = searchParams.get("code");
      const error = searchParams.get("error");
      const errorDesc = searchParams.get("error_description");
      const next = searchParams.get("next") ?? "/";

      if (error) {
        setIsError(true);
        setStatus(
          error === "access_denied"
            ? "로그인을 취소했어요"
            : (errorDesc ?? "로그인에 실패했어요")
        );
        setTimeout(() => router.replace("/login"), 2200);
        return;
      }

      if (!code) {
        router.replace("/login");
        return;
      }

      // PKCE code → session 교환
      const { data, error: exchangeError } = await supabaseBrowser.auth.exchangeCodeForSession(code);

      if (exchangeError || !data.session) {
        setIsError(true);
        setStatus("인증 처리에 실패했어요. 다시 시도해주세요.");
        setTimeout(() => router.replace("/login"), 2200);
        return;
      }

      const user = data.session.user;

      // 비밀번호 재설정 플로우
      if (next === "/auth/reset-password") {
        router.replace("/auth/reset-password");
        return;
      }

      // 기존 프로필 확인
      const profileRes = await fetch(`/api/users?authId=${user.id}`);
      const profileData = await profileRes.json();

      if (!profileData.profile) {
        // 소셜 신규 가입 → 프로필 자동 생성
        setStatus("프로필 생성 중...");

        const autoUsername = user.id.replace(/-/g, "").slice(0, 12);
        const displayName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.preferred_username ||
          user.email?.split("@")[0] ||
          "청음사 멤버";
        const avatarUrl =
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          null;

        const createRes = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            auth_id: user.id,
            username: autoUsername,
            display_name: displayName,
            emoji: "🎵",
            onboarded: false,
            avatar_url: avatarUrl,
          }),
        });

        if (!createRes.ok) {
          setIsError(true);
          setStatus("프로필 생성에 실패했어요. 잠시 후 다시 시도해주세요.");
          setTimeout(() => router.replace("/login"), 2200);
          return;
        }

        router.replace("/?welcome=1");
        return;
      }

      // 기존 유저
      router.replace(next);
    };

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        backgroundColor: "var(--bg)",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: 24,
      }}
    >
      <LogoMark height={44} />
      <p
        style={{
          color: isError ? "var(--error)" : "var(--text-muted)",
          fontSize: 14,
          textAlign: "center",
          maxWidth: 280,
          lineHeight: 1.6,
        }}
      >
        {status}
      </p>
      {!isError && (
        <div style={{ display: "flex", gap: 5 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "var(--accent)",
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      )}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(0.7); opacity: 0.4; }
          50% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
