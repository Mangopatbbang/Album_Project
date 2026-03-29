"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

const inputStyle = {
  width: "100%",
  backgroundColor: "var(--bg-card)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  borderRadius: 6,
  padding: "10px 14px",
  fontSize: 14,
  outline: "none",
};

const EMOJI_OPTIONS = ["🎵", "🎸", "🎹", "🥁", "🎷", "🎺", "🎻", "🎤", "🎧", "🎼", "🌊", "🔥", "⭐", "🌙", "🎬"];

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [emoji, setEmoji] = useState("🎵");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (username.length < 2) return setError("username은 2자 이상이어야 합니다");
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return setError("username은 영문, 숫자, _ 만 사용 가능합니다");

    setLoading(true);

    // 1. Supabase Auth 회원가입
    const { data: authData, error: authError } = await supabaseBrowser.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError(authError?.message ?? "회원가입에 실패했습니다");
      setLoading(false);
      return;
    }

    // 2. users 테이블에 프로필 생성
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_id: authData.user.id,
        username,
        display_name: displayName || username,
        emoji,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      // auth 계정은 만들어졌지만 프로필 생성 실패 — username 중복 등
      await supabaseBrowser.auth.signOut();
      setError(json.error ?? "프로필 생성에 실패했습니다");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh", display: "flex", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 440, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Link href="/">
            <p style={{ color: "var(--text)", fontWeight: 800, fontSize: 28, letterSpacing: "-0.04em" }}>
              아차청음사
            </p>
          </Link>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>청음사 입문</p>
        </div>

        <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="password"
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            minLength={6}
            required
          />
          <input
            type="text"
            placeholder="username (영문, 숫자, _)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="text"
            placeholder="표시 이름 (선택, 기본값: username)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={inputStyle}
          />

          {/* 이모지 선택 */}
          <div>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>이모지 선택</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  style={{
                    fontSize: 22,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: `2px solid ${emoji === e ? "var(--accent)" : "var(--border)"}`,
                    backgroundColor: emoji === e ? "var(--bg-elevated)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p style={{ color: "#e05c5c", fontSize: 13 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--bg)",
              fontWeight: 600,
              fontSize: 14,
              padding: "10px",
              borderRadius: 6,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
              marginTop: 4,
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
