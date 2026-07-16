"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";
import LogoMark from "@/components/ui/LogoMark";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  const active = focused || email.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=/auth/reset-password`
        : "/auth/callback?next=/auth/reset-password";

    const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("rate limit") || msg.includes("Too many")) {
        setError("요청이 너무 많아요. 잠시 후 다시 시도해주세요.");
      } else {
        setError("메일 발송에 실패했어요. 이메일 주소를 확인해주세요.");
      }
      return;
    }

    setSent(true);
  };

  return (
    <div
      style={{
        backgroundColor: "var(--bg)",
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Link href="/" style={{ display: "inline-block" }}>
            <LogoMark height={44} />
          </Link>
          <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 20, letterSpacing: "-0.03em", marginTop: 12 }}>
            비밀번호 재설정
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 5, lineHeight: 1.6 }}>
            가입한 이메일 주소를 입력하면<br />재설정 링크를 보내드려요
          </p>
        </div>

        {sent ? (
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "28px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
            <p style={{ color: "var(--text)", fontWeight: 600, fontSize: 15, marginBottom: 8 }}>
              이메일을 확인해주세요
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
              <strong style={{ color: "var(--text)" }}>{email}</strong>으로<br />
              재설정 링크를 보냈어요.<br />
              메일함을 확인하고 링크를 클릭해주세요.
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 11, opacity: 0.7 }}>
              메일이 오지 않는다면 스팸함도 확인해보세요
            </p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              style={{
                marginTop: 20,
                color: "var(--accent)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                padding: 0,
              }}
            >
              다른 이메일로 다시 시도
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "28px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ position: "relative" }}>
              <label
                htmlFor="email"
                style={{
                  position: "absolute",
                  left: 14,
                  zIndex: 1,
                  pointerEvents: "none",
                  top: active ? 8 : "50%",
                  transform: active ? "none" : "translateY(-50%)",
                  fontSize: active ? 10 : 15,
                  color: focused ? "var(--accent)" : "var(--text-muted)",
                  fontWeight: active ? 600 : 400,
                  letterSpacing: active ? "0.04em" : 0,
                  transition: "top 0.15s ease, font-size 0.15s ease, color 0.15s ease",
                }}
              >
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                autoComplete="email"
                required
                style={{
                  width: "100%",
                  backgroundColor: "var(--bg)",
                  border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`,
                  color: "var(--text)",
                  borderRadius: 8,
                  paddingTop: active ? 20 : 15,
                  paddingBottom: active ? 6 : 15,
                  paddingLeft: 14,
                  paddingRight: 14,
                  fontSize: 15,
                  outline: "none",
                  transition: "border-color 0.15s, padding 0.15s",
                  height: 52,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {error && (
              <p style={{ color: "var(--error)", fontSize: 12 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--bg)",
                fontWeight: 700,
                fontSize: 14,
                padding: "13px",
                borderRadius: 8,
                border: "none",
                cursor: loading || !email ? "default" : "pointer",
                opacity: loading || !email ? 0.7 : 1,
                marginTop: 4,
              }}
            >
              {loading ? "발송 중..." : "재설정 메일 보내기"}
            </button>
          </form>
        )}

        <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", marginTop: 20 }}>
          <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>
            ← 로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
