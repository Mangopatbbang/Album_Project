"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import LogoMark from "@/components/ui/LogoMark";
import { scoreColor } from "@/lib/score";

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

function FloatInput({ id, label, type = "text", value, onChange, autoComplete, required, hasError }: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; autoComplete?: string; required?: boolean; hasError?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;
  return (
    <div style={{ position: "relative" }}>
      <label htmlFor={id} style={{
        position: "absolute", left: 14, zIndex: 1, pointerEvents: "none",
        top: active ? 8 : "50%",
        transform: active ? "none" : "translateY(-50%)",
        fontSize: active ? 10 : 15,
        color: focused ? "var(--accent)" : "var(--text-muted)",
        fontWeight: active ? 600 : 400,
        letterSpacing: active ? "0.04em" : 0,
        transition: "top 0.15s ease, font-size 0.15s ease, color 0.15s ease",
      }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        required={required}
        style={{
          width: "100%",
          backgroundColor: "var(--bg-card)",
          border: `1px solid ${hasError ? "var(--error)" : focused ? "var(--accent)" : "var(--border)"}`,
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
  );
}

function FloatPasswordInput({ id, label, value, onChange, autoComplete }: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  const active = focused || value.length > 0;
  return (
    <div style={{ position: "relative" }}>
      <label htmlFor={id} style={{
        position: "absolute", left: 14, zIndex: 1, pointerEvents: "none",
        top: active ? 8 : "50%",
        transform: active ? "none" : "translateY(-50%)",
        fontSize: active ? 10 : 15,
        color: focused ? "var(--accent)" : "var(--text-muted)",
        fontWeight: active ? 600 : 400,
        letterSpacing: active ? "0.04em" : 0,
        transition: "top 0.15s ease, font-size 0.15s ease, color 0.15s ease",
      }}>
        {label}
      </label>
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        required
        style={{
          width: "100%",
          backgroundColor: "var(--bg-card)",
          border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`,
          color: "var(--text)",
          borderRadius: 8,
          paddingTop: active ? 20 : 15,
          paddingBottom: active ? 6 : 15,
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
        onClick={() => setShow(s => !s)}
        tabIndex={-1}
        style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-muted)", padding: 4, display: "flex", alignItems: "center",
        }}
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });

    if (error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div
        className="w-full max-w-[440px] md:max-w-[860px] md:flex overflow-hidden rounded-2xl"
        style={{ border: "1px solid var(--border)" }}
      >
        {/* 좌: 폼 */}
        <div style={{ backgroundColor: "var(--bg-card)" }} className="w-full md:w-[420px] md:flex-shrink-0 p-6 md:p-10">
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <Link href="/" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <LogoMark height={52} />
              <p style={{ color: "var(--text)", fontWeight: 800, fontSize: 24, letterSpacing: "-0.04em" }}>
                아차청음사
              </p>
            </Link>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>청음사 입문</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <FloatInput
              id="email" label="이메일" type="email"
              value={email} onChange={setEmail}
              autoComplete="email" required
            />
            <FloatPasswordInput
              id="password" label="비밀번호"
              value={password} onChange={setPassword}
              autoComplete="current-password"
            />

            {error && <p style={{ color: "var(--error)", fontSize: 13 }}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: "var(--accent)", color: "var(--bg)",
                fontWeight: 700, fontSize: 14, padding: "13px",
                borderRadius: 8, border: "none",
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.7 : 1, marginTop: 6,
              }}
            >
              {loading ? "입장 중..." : "입장"}
            </button>
          </form>

          <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", marginTop: 24 }}>
            아직 청음사 식구가 아닌가요?{" "}
            <Link href="/signup" style={{ color: "var(--accent)", fontWeight: 600 }}>
              입문하기
            </Link>
          </p>
        </div>

        {/* 우: 비주얼 패널 (데스크탑 전용) */}
        <div
          className="hidden md:flex flex-1 flex-col items-center justify-center"
          style={{
            background: "linear-gradient(145deg, var(--bg-elevated) 0%, rgba(232,213,163,0.05) 60%, var(--bg) 100%)",
            borderLeft: "1px solid var(--border)",
            padding: "56px 48px",
            textAlign: "center",
          }}
        >
          <LogoMark height={72} />
          <p style={{ color: "var(--text)", fontWeight: 800, fontSize: 26, marginTop: 24, letterSpacing: "-0.04em" }}>
            아차청음사
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 12, lineHeight: 1.9 }}>
            취향을 기록하고<br />청음을 나누는 곳
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 36 }}>
            {([1, 2, 3, 4, 5, 6, 7, 8] as const).map(n => (
              <div
                key={n}
                style={{
                  width: 9, height: 9, borderRadius: "50%",
                  backgroundColor: scoreColor(n),
                  opacity: 0.75,
                  boxShadow: `0 0 6px ${scoreColor(n)}60`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
