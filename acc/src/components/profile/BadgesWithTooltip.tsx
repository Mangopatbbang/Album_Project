"use client";

import { useState } from "react";

const BADGE_CRITERIA: Record<string, string> = {
  "너그러운 귀": "평균 7.0점 이상",
  "균형잡힌 귀": "평균 6.2~6.9점",
  "까다로운 귀": "평균 5.5~6.1점",
  "냉철한 귀": "평균 5.4점 이하",
  "기록하는 청음인": "한줄소감 작성률 50% 이상 (10장+)",
  "명반 수집가": "8점 앨범 10장 이상",
};

function getBadgeCriteria(badge: string): string {
  // 정확히 일치하는 것 먼저
  if (BADGE_CRITERIA[badge]) return BADGE_CRITERIA[badge];
  // 패턴 매칭
  if (badge.endsWith("만 듣는 귀")) return "특정 장르 비중 45% 이상";
  if (badge.endsWith("청음인")) return "가장 많이 들은 장르";
  if (badge.endsWith("애청자")) return "동일 아티스트 3장+, 평균 6.0점 이상";
  if (badge.startsWith("명반 ") && badge.endsWith("장")) return "8점 앨범 3장 이상";
  return "";
}

export default function BadgesWithTooltip({ badges }: { badges: string[] }) {
  const [showLegend, setShowLegend] = useState(false);

  if (badges.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      {badges.map((badge) => (
        <span
          key={badge}
          title={getBadgeCriteria(badge)}
          style={{
            color: "var(--text-muted)",
            fontSize: 11,
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: "3px 10px",
            whiteSpace: "nowrap",
            cursor: "default",
          }}
        >
          {badge}
        </span>
      ))}
      <button
        onClick={() => setShowLegend((v) => !v)}
        title="칭호 기준 보기"
        style={{
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: "50%",
          width: 20,
          height: 20,
          color: "var(--text-muted)",
          fontSize: 11,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        ?
      </button>
      {showLegend && (
        <div
          style={{
            width: "100%",
            marginTop: 4,
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "12px 14px",
          }}
        >
          <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>
            칭호 기준
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {[
              ["너그러운 귀", "평균 7.0점 이상"],
              ["균형잡힌 귀", "평균 6.2~6.9점"],
              ["까다로운 귀", "평균 5.5~6.1점"],
              ["냉철한 귀", "평균 5.4점 이하"],
              ["[장르] 청음인", "가장 많이 들은 장르 보유 시"],
              ["[장르]만 듣는 귀", "특정 장르 45% 이상 집중 시"],
              ["[아티스트] 애청자", "동일 아티스트 3장 이상, 평균 6.0점+"],
              ["명반 N장", "8점 앨범 3장 이상"],
              ["명반 수집가", "8점 앨범 10장 이상"],
              ["기록하는 청음인", "한줄소감 작성률 50%+ (10장 이상 시)"],
            ].map(([name, desc]) => (
              <div key={name} style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "var(--accent)", fontSize: 11, whiteSpace: "nowrap", minWidth: 130 }}>{name}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
