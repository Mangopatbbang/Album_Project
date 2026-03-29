"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

const containerStyle = {
  width: "100%",
  maxWidth: "400px",
  margin: "0 auto",
  padding: "0 24px",
};

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
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh", display: "flex", alignItems: "center" }}>
      <div style={containerStyle}>
        {/* 로고 */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Link href="/">
            <p style={{ color: "var(--text)", fontWeight: 800, fontSize: 28, letterSpacing: "-0.04em" }}>
              아차청음사
            </p>
          </Link>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>청음사 입문</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
          />

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
            {loading ? "입장 중..." : "입장"}
          </button>
        </form>

        <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", marginTop: 24 }}>
          아직 청음사 식구가 아닌가요?{" "}
          <Link href="/signup" style={{ color: "var(--accent)" }}>
            입문하기
          </Link>
        </p>
      </div>
    </div>
  );
}
