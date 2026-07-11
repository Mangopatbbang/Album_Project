"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { openTutorial, RULES_PAGE_INDEX } from "@/components/ui/TutorialModal";

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

function FloatInput({ id, label, type = "text", value, onChange, autoComplete, required, hasError, placeholder }: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; autoComplete?: string;
  required?: boolean; hasError?: boolean; placeholder?: string;
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
        placeholder={active ? placeholder : ""}
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

function FloatPasswordInput({ id, label, value, onChange, autoComplete, minLength }: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; autoComplete?: string; minLength?: number;
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
        minLength={minLength}
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

function CustomCheckbox({ checked, onChange, children }: {
  checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode;
}) {
  return (
    <div onClick={() => onChange(!checked)} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
      <VisualCheckbox checked={checked} />
      <span style={{ fontSize: 13, color: "var(--text-sub)", lineHeight: 1.5, userSelect: "none" }}>
        {children}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", opacity: 0.7 }}>
      {children}
    </p>
  );
}

function HintText({ children, isError }: { children: React.ReactNode; isError?: boolean }) {
  return (
    <p style={{ fontSize: 11, color: isError ? "var(--error)" : "var(--text-muted)", marginTop: -4, paddingLeft: 2, lineHeight: 1.5 }}>
      {children}
    </p>
  );
}


export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const allAgreed = agreeTerms && agreePrivacy && agreeAge;

  const handleAllAgree = (v: boolean) => {
    setAgreeTerms(v);
    setAgreePrivacy(v);
    setAgreeAge(v);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirm) return setError("비밀번호가 일치하지 않습니다");

    setLoading(true);

    const { data: authData, error: authError } = await supabaseBrowser.auth.signUp({ email, password });

    if (authError || !authData.user) {
      setError(authError?.message ?? "회원가입에 실패했습니다");
      setLoading(false);
      return;
    }

    // username은 auth_id 앞 12자리로 자동 생성 (사용자에게 노출 안 됨)
    const autoUsername = authData.user.id.replace(/-/g, "").slice(0, 12);
    const nickname = displayName.trim() || email.split("@")[0];

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_id: authData.user.id,
        username: autoUsername,
        display_name: nickname,
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

    router.push("/?welcome=1");
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
            <FloatInput
              id="email" label="이메일" type="email"
              value={email} onChange={setEmail}
              autoComplete="email" required
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <FloatPasswordInput
                id="password" label="비밀번호"
                value={password} onChange={setPassword}
                autoComplete="new-password" minLength={6}
              />
              <HintText>6자 이상</HintText>
            </div>
            <FloatPasswordInput
              id="password-confirm" label="비밀번호 확인"
              value={passwordConfirm} onChange={setPasswordConfirm}
              autoComplete="new-password"
            />
          </div>

          {/* 프로필 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <SectionLabel>프로필</SectionLabel>

            {/* 닉네임 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <FloatInput
                id="display-name" label="닉네임 (선택)"
                value={displayName} onChange={setDisplayName}
                autoComplete="nickname"
                placeholder="예: 재즈 좋아하는 사람"
              />
              <HintText>
                {displayName
                  ? null
                  : <>비워두면 이메일 앞부분으로 설정돼요 · 나중에 변경 가능</>}
              </HintText>
            </div>
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
                href="/terms" target="_blank"
                onClick={e => e.stopPropagation()}
                style={{ color: "var(--accent)", textDecoration: "underline" }}
              >
                이용약관
              </Link>
              에 동의합니다{" "}
              <span style={{ color: "var(--text-muted)" }}>(필수)</span>
            </CustomCheckbox>
            <CustomCheckbox checked={agreePrivacy} onChange={setAgreePrivacy}>
              <Link
                href="/privacy" target="_blank"
                onClick={e => e.stopPropagation()}
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

          {error && <p style={{ color: "var(--error)", fontSize: 13 }}>{error}</p>}

          <button
            type="submit"
            disabled={loading || !allAgreed}
            style={{
              backgroundColor: "var(--accent)", color: "var(--bg)",
              fontWeight: 700, fontSize: 14, padding: "13px",
              borderRadius: 8, border: "none",
              cursor: (loading || !allAgreed) ? "default" : "pointer",
              opacity: (loading || !allAgreed) ? 0.7 : 1,
            }}
          >
            {loading ? "입문 중..." : "입문하기"}
          </button>
        </form>

        <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", marginTop: 24 }}>
          이미 청음사 식구인가요?{" "}
          <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>
            입장
          </Link>
        </p>
      </div>
    </div>
  );
}
