"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { openTutorial, RULES_PAGE_INDEX } from "@/components/ui/TutorialModal";

const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "var(--bg-card)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  borderRadius: 6,
  padding: "10px 14px",
  fontSize: 16,
  outline: "none",
};

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

function PasswordField({
  placeholder,
  value,
  onChange,
  autoComplete,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        style={{ ...inputStyle, paddingRight: 42 }}
        required
        minLength={6}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-muted)", padding: 4,
          display: "flex", alignItems: "center",
        }}
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function VisualCheckbox({ checked }: { checked: boolean }) {
  return (
    <div
      style={{
        width: 16, height: 16, borderRadius: 3, marginTop: 2, flexShrink: 0,
        border: `1.5px solid ${checked ? "var(--accent)" : "var(--border-light)"}`,
        backgroundColor: checked ? "var(--accent)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "border-color 0.12s, background-color 0.12s",
      }}
    >
      {checked && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path d="M1 3.5L3 5.5L8 1" stroke="var(--bg)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

function CustomCheckbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}
    >
      <VisualCheckbox checked={checked} />
      <span style={{ fontSize: 13, color: "var(--text-sub)", lineHeight: 1.5, userSelect: "none" }}>
        {children}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
      color: "var(--text-muted)", opacity: 0.7,
    }}>
      {children}
    </p>
  );
}

function HintText({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: -4, paddingLeft: 2 }}>
      {children}
    </p>
  );
}

function validateUsername(u: string): string | null {
  if (u.length === 0) return null;
  if (u.length < 2) return "2자 이상이어야 합니다";
  if (!/^[a-zA-Z0-9_]+$/.test(u)) return "영문, 숫자, _ 만 사용 가능합니다";
  return null;
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const allAgreed = agreeTerms && agreePrivacy && agreeAge;
  const usernameError = validateUsername(username);

  const handleAllAgree = (v: boolean) => {
    setAgreeTerms(v);
    setAgreePrivacy(v);
    setAgreeAge(v);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (usernameError) return setError(usernameError);
    if (password !== passwordConfirm) return setError("비밀번호가 일치하지 않습니다");

    setLoading(true);

    const { data: authData, error: authError } = await supabaseBrowser.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError(authError?.message ?? "회원가입에 실패했습니다");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_id: authData.user.id,
        username,
        display_name: displayName || username,
        emoji: "🎵",
        onboarded: false,
      }),
    });

    let json: { error?: string } = {};
    try { json = await res.json(); } catch { /* non-JSON */ }

    if (!res.ok) {
      await supabaseBrowser.auth.signOut();
      setError(json.error ?? "프로필 생성에 실패했습니다");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <div style={{ width: "100%", maxWidth: 440, margin: "0 auto", padding: "max(48px, 8vh) 24px 48px" }}>

        {/* 로고 */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Link href="/">
            <p style={{ color: "var(--text)", fontWeight: 800, fontSize: 28, letterSpacing: "-0.04em" }}>
              아차청음사
            </p>
          </Link>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>청음사 입문</p>
        </div>

        <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* 계정 정보 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <SectionLabel>계정 정보</SectionLabel>
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              autoComplete="email"
              required
            />
            <PasswordField
              placeholder="비밀번호"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            />
            <HintText>6자 이상</HintText>
            <PasswordField
              placeholder="비밀번호 확인"
              value={passwordConfirm}
              onChange={setPasswordConfirm}
              autoComplete="new-password"
            />
          </div>

          {/* 프로필 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <SectionLabel>프로필</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <input
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  ...inputStyle,
                  borderColor: usernameError ? "var(--error)" : "var(--border)",
                }}
                autoComplete="username"
                required
              />
              {usernameError
                ? <p style={{ fontSize: 11, color: "var(--error)", paddingLeft: 2 }}>{usernameError}</p>
                : <HintText>영문·숫자·_ 만 가능 · 로그인에 사용됩니다</HintText>
              }
            </div>
            <input
              type="text"
              placeholder="표시 이름 (선택 — 기본값: username)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={inputStyle}
              autoComplete="nickname"
            />
          </div>

          {/* 약관 동의 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionLabel>약관 동의</SectionLabel>
            <CustomCheckbox checked={allAgreed} onChange={handleAllAgree}>
              <span style={{ fontWeight: 600, color: "var(--text)" }}>전체 동의</span>
            </CustomCheckbox>
            <div style={{ height: 1, backgroundColor: "var(--border)" }} />
            <CustomCheckbox checked={agreeTerms} onChange={setAgreeTerms}>
              <Link
                href="/terms"
                target="_blank"
                onClick={(e) => e.stopPropagation()}
                style={{ color: "var(--accent)", textDecoration: "underline" }}
              >
                이용약관
              </Link>
              에 동의합니다{" "}
              <span style={{ color: "var(--text-muted)" }}>(필수)</span>
            </CustomCheckbox>
            <CustomCheckbox checked={agreePrivacy} onChange={setAgreePrivacy}>
              <Link
                href="/privacy"
                target="_blank"
                onClick={(e) => e.stopPropagation()}
                style={{ color: "var(--accent)", textDecoration: "underline" }}
              >
                개인정보처리방침
              </Link>
              에 동의합니다{" "}
              <span style={{ color: "var(--text-muted)" }}>(필수)</span>
            </CustomCheckbox>
            <CustomCheckbox checked={agreeAge} onChange={setAgreeAge}>
              만 14세 이상임을 확인합니다{" "}
              <span style={{ color: "var(--text-muted)" }}>(필수)</span>
            </CustomCheckbox>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              가입 전{" "}
              <button
                type="button"
                onClick={() => openTutorial(RULES_PAGE_INDEX)}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--accent)", fontSize: 11, textDecoration: "underline" }}
              >
                커뮤니티 규정집
              </button>
              을 확인해주세요.
            </p>
          </div>

          {error && (
            <p style={{ color: "var(--error)", fontSize: 13 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !allAgreed}
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--bg)",
              fontWeight: 600,
              fontSize: 14,
              padding: "10px",
              borderRadius: 6,
              border: "none",
              cursor: (loading || !allAgreed) ? "default" : "pointer",
              opacity: (loading || !allAgreed) ? 0.7 : 1,
            }}
          >
            {loading ? "입문 중..." : "입문하기"}
          </button>
        </form>

        <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", marginTop: 24 }}>
          이미 청음사 식구인가요?{" "}
          <Link href="/login" style={{ color: "var(--accent)" }}>
            입장
          </Link>
        </p>
      </div>
    </div>
  );
}
