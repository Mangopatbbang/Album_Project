"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/apiFetch";

export default function OnboardingModal() {
  const { profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [dismissing, setDismissing] = useState(false);

  if (!profile || profile.onboarded !== false) return null;

  const handleFinish = async () => {
    setDismissing(true);
    await apiFetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboarded: true }),
    });
    await refreshProfile();
  };

  const steps = [
    {
      title: "아차청음사에 오신 것을 환영해요",
      body: (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ color: "var(--text-sub)", fontSize: 14, lineHeight: 1.7 }}>
            아차청음사는 음악 앨범 청음 기록을 남기는 공간이에요.<br />
            들은 앨범에 점수를 매기고, 소감을 공유하고,<br />
            다른 멤버의 취향을 탐색할 수 있어요.
          </p>
        </div>
      ),
    },
    {
      title: "평점은 1 – 8점 척도로",
      body: (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { score: "8", label: "이게 뭐야", desc: "기준을 뛰어넘은 경험" },
            { score: "7", label: "와", desc: "강렬한 인상을 남기는 앨범" },
            { score: "6", label: "오 좋다", desc: "확실히 추천할 수 있는 완성도" },
            { score: "5", label: "오", desc: "충분히 즐길 수 있는 좋은 앨범" },
            { score: "4", label: "좋네", desc: "긍정적으로 반응할 수 있는 앨범" },
            { score: "3", label: "괜찮네", desc: "무난하게 들을 수 있는 수준" },
            { score: "2", label: "음", desc: "완성도가 아쉬운 앨범" },
            { score: "1", label: "이건 좀", desc: "듣기 힘든 수준" },
          ].map(({ score, label, desc }) => (
            <div key={score} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ width: 16, fontSize: 13, fontWeight: 700, color: "var(--accent)", flexShrink: 0, textAlign: "right" }}>{score}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{desc}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "이제 시작해볼까요?",
      body: (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ color: "var(--text-sub)", fontSize: 14, lineHeight: 1.7 }}>
            앨범 목록에서 앨범을 눌러 평점을 남겨보세요.<br />
            소감 한 줄도 함께 남기면 더 풍성해져요.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6 }}>
            평점 가이드와 자세한 기준은 앨범 모달에서 언제든 확인할 수 있어요.
          </p>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 20px",
      }}
    >
      <div style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "32px 28px",
        maxWidth: 420,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}>
        {/* 스텝 인디케이터 */}
        <div style={{ display: "flex", gap: 5 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              height: 3, flex: 1, borderRadius: 2,
              backgroundColor: i <= step ? "var(--accent)" : "var(--border)",
              transition: "background-color 0.2s",
            }} />
          ))}
        </div>

        {/* 제목 */}
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", margin: 0 }}>
          {current.title}
        </h2>

        {/* 본문 */}
        <div>{current.body}</div>

        {/* 버튼 */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              style={{
                background: "none", border: "1px solid var(--border)", borderRadius: 8,
                color: "var(--text-muted)", fontSize: 13, padding: "8px 16px", cursor: "pointer",
              }}
            >
              이전
            </button>
          )}
          <button
            onClick={isLast ? handleFinish : () => setStep((s) => s + 1)}
            disabled={dismissing}
            style={{
              backgroundColor: "var(--accent)", border: "none", borderRadius: 8,
              color: "var(--bg)", fontSize: 13, fontWeight: 700, padding: "8px 20px",
              cursor: dismissing ? "not-allowed" : "pointer",
              opacity: dismissing ? 0.7 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {isLast ? "시작하기" : "다음"}
          </button>
        </div>
      </div>
    </div>
  );
}
