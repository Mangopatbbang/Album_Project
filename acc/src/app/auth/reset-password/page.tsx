"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";
import LogoMark from "@/components/ui/LogoMark";

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [focusPw, setFocusPw] = useState(false);
  const [focusConfirm, setFocusConfirm] = useState(false);

  useEffect(() => {
    // 세션이 있어야 비밀번호 재설정 가능
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionReady(true);
      } else {
        router.replace("/auth/forgot-password");
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 해요");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않아요");
      return;
    }

    setLoading(true);
    const { error } = await supabaseBrowser.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("same password")) {
        setError("이전과 다른 비밀번호를 사용해주세요");
      } else if (msg.includes("weak")) {
        setError("비밀번호를 더 복잡하게 만들어주세요");
      } else {
        setError("비밀번호 변경에 실패했어요. 다시 시도해주세요.");
      }
      return;
    }

    setDone(true);
    setTimeout(() => router.replace("/"), 2000);
  };

  if (!sessionReady) {
    return (
      <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>확인 중...</p>
      </div>
    );
  }

  const activePw = focusPw || password.length > 0;
  const activeConfirm = focusConfirm || confirm.length > 0;

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
            새 비밀번호 설정
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 5 }}>
            새로 사용할 비밀번호를 입력해주세요
          </p>
        </div>

        {done ? (
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "28px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <p style={{ color: "var(--text)", fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
              비밀번호가 변경됐어요
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              잠시 후 홈으로 이동합니다...
            </p>
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
            {/* 새 비밀번호 */}
            <div style={{ position: "relative" }}>
              <label
                htmlFor="password"
                style={{
                  position: "absolute", left: 14, zIndex: 1, pointerEvents: "none",
                  top: activePw ? 8 : "50%",
                  transform: activePw ? "none" : "translateY(-50%)",
                  fontSize: activePw ? 10 : 15,
                  color: focusPw ? "var(--accent)" : "var(--text-muted)",
                  fontWeight: activePw ? 600 : 400,
                  letterSpacing: activePw ? "0.04em" : 0,
                  transition: "top 0.15s ease, font-size 0.15s ease, color 0.15s ease",
                }}
              >
                새 비밀번호
              </label>
              <input
                id="password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusPw(true)}
                onBlur={() => setFocusPw(false)}
                required
                minLength={6}
                style={{
                  width: "100%",
                  backgroundColor: "var(--bg)",
                  border: `1px solid ${focusPw ? "var(--accent)" : "var(--border)"}`,
                  color: "var(--text)",
                  borderRadius: 8,
                  paddingTop: activePw ? 20 : 15,
                  paddingBottom: activePw ? 6 : 15,
                  paddingLeft: 14,
                  paddingRight: 44,
                  fontSize: 15,
                  outline: "none",
                  transition: "border-color 0.15s, padding 0.15s",
                  height: 52,
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                tabIndex={-1}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-muted)", padding: 4, display: "flex", alignItems: "center",
                }}
              >
                {showPw ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: -4, paddingLeft: 2 }}>6자 이상</p>

            {/* 비밀번호 확인 */}
            <div style={{ position: "relative" }}>
              <label
                htmlFor="confirm"
                style={{
                  position: "absolute", left: 14, zIndex: 1, pointerEvents: "none",
                  top: activeConfirm ? 8 : "50%",
                  transform: activeConfirm ? "none" : "translateY(-50%)",
                  fontSize: activeConfirm ? 10 : 15,
                  color: focusConfirm ? "var(--accent)" : "var(--text-muted)",
                  fontWeight: activeConfirm ? 600 : 400,
                  letterSpacing: activeConfirm ? "0.04em" : 0,
                  transition: "top 0.15s ease, font-size 0.15s ease, color 0.15s ease",
                }}
              >
                새 비밀번호 확인
              </label>
              <input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onFocus={() => setFocusConfirm(true)}
                onBlur={() => setFocusConfirm(false)}
                required
                style={{
                  width: "100%",
                  backgroundColor: "var(--bg)",
                  border: `1px solid ${
                    confirm.length > 0 && confirm !== password
                      ? "var(--error)"
                      : focusConfirm
                      ? "var(--accent)"
                      : "var(--border)"
                  }`,
                  color: "var(--text)",
                  borderRadius: 8,
                  paddingTop: activeConfirm ? 20 : 15,
                  paddingBottom: activeConfirm ? 6 : 15,
                  paddingLeft: 14,
                  paddingRight: 44,
                  fontSize: 15,
                  outline: "none",
                  transition: "border-color 0.15s, padding 0.15s",
                  height: 52,
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                tabIndex={-1}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-muted)", padding: 4, display: "flex", alignItems: "center",
                }}
              >
                {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {error && <p style={{ color: "var(--error)", fontSize: 12 }}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--bg)",
                fontWeight: 700,
                fontSize: 14,
                padding: "13px",
                borderRadius: 8,
                border: "none",
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.7 : 1,
                marginTop: 4,
              }}
            >
              {loading ? "변경 중..." : "비밀번호 변경"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
