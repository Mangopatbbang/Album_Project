"use client";

import { useEffect, useState } from "react";
import { AlbumWithRatings, USERS } from "@/types";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { scoreColor } from "@/lib/score";

type FullAlbum = AlbumWithRatings & {
  tracklist?: string | null;
};

type Props = {
  album: AlbumWithRatings;
  onClose: () => void;
};

export default function AlbumModal({ album, onClose }: Props) {
  const { profile } = useAuth();
  const [full, setFull] = useState<FullAlbum | null>(null);
  const [myScore, setMyScore] = useState<number | null>(null);
  const [myReview, setMyReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  const toggleReview = (userId: string) => {
    setExpandedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  // 상세 데이터 fetch
  useEffect(() => {
    fetch(`/api/albums/${album.id}`)
      .then((r) => r.json())
      .then((data) => {
        setFull(data);
        // 내 기존 평점 불러오기
        if (profile) {
          const myRating = data.ratings?.find(
            (r: { user_id: string }) => r.user_id === profile.id
          );
          if (myRating) {
            setMyScore(myRating.score);
            setMyReview(myRating.one_line_review ?? "");
          }
        }
      });
  }, [album.id, profile]);

  // 배경 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ESC 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    if (!profile || myScore === null) return;
    setSaving(true);

    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        albumId: album.id,
        userId: profile.id,
        score: myScore,
        one_line_review: myReview || null,
      }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const data = full ?? album;
  const tracklist = full?.tracklist
    ? full.tracklist.split(";").map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.75)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          width: "100%",
          maxWidth: 680,
          maxHeight: "90vh",
          overflowY: "auto",
          animation: "modalIn 0.18s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 */}
        <div style={{ padding: "20px 24px 0", display: "flex", gap: 20 }}>
          {/* 커버 */}
          <div
            style={{
              width: 120,
              height: 120,
              flexShrink: 0,
              backgroundColor: "var(--bg-elevated)",
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid var(--border)",
            }}
          >
            {data.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.cover_url} alt={data.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "var(--text-muted)", fontSize: 32 }}>♪</span>
              </div>
            )}
          </div>

          {/* 앨범 정보 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <div>
                <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                  {data.title}
                </p>
                <p style={{ color: "var(--text-sub)", fontSize: 14, marginTop: 4 }}>
                  {data.artist}
                  {data.year && <span style={{ color: "var(--text-muted)" }}> · {data.year}</span>}
                </p>
              </div>
              <button
                onClick={onClose}
                style={{ color: "var(--text-muted)", fontSize: 20, lineHeight: 1, flexShrink: 0, cursor: "pointer", background: "none", border: "none" }}
              >
                ✕
              </button>
            </div>

            {data.genre && (
              <span style={{
                display: "inline-block",
                marginTop: 10,
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text-muted)",
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 4,
                border: "1px solid var(--border)",
              }}>
                {data.genre}
              </span>
            )}

            {/* 평균 점수 */}
            {data.avg && (
              <p style={{ color: scoreColor(data.avg), fontWeight: 700, fontSize: 22, marginTop: 10 }}>
                {data.avg}
                <span style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 400, marginLeft: 4 }}>/ 8</span>
              </p>
            )}
          </div>
        </div>

        <div style={{ height: 1, backgroundColor: "var(--border)", margin: "20px 0" }} />

        {/* 멤버 평점 */}
        <div style={{ padding: "0 24px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 12 }}>
            청음단 평점
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {USERS.map((user) => {
              const r = data.ratings.find((rt) => rt.user_id === user.id);
              const review = r?.one_line_review ?? "";
              const LIMIT = 36;
              const isLong = review.length > LIMIT;
              const isExpanded = expandedReviews.has(user.id);
              return (
                <div key={user.id} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  {/* 이모지 + 이름 */}
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{user.emoji}</span>
                  <span style={{ color: "var(--text-sub)", fontSize: 13, width: 110, flexShrink: 0 }}>{user.display_name}</span>

                  {r ? (
                    <>
                      {/* 점수 뱃지 */}
                      <span style={{
                        color: scoreColor(r.score),
                        fontWeight: 700,
                        fontSize: 15,
                        flexShrink: 0,
                        width: 18,
                        textAlign: "right",
                      }}>
                        {r.score}
                      </span>

                      {/* 한줄평 */}
                      {review && (
                        <span style={{ color: "var(--text-muted)", fontSize: 12, fontStyle: "italic", flex: 1, minWidth: 0 }}>
                          &ldquo;{isExpanded || !isLong ? review : review.slice(0, LIMIT)}
                          {isLong && !isExpanded && (
                            <button
                              onClick={() => toggleReview(user.id)}
                              style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 11, padding: "0 2px", textDecoration: "underline" }}
                            >
                              ...더보기
                            </button>
                          )}
                          {isLong && isExpanded && (
                            <button
                              onClick={() => toggleReview(user.id)}
                              style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 11, padding: "0 2px", textDecoration: "underline" }}
                            >
                              {" "}접기
                            </button>
                          )}
                          &rdquo;
                        </span>
                      )}
                    </>
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ height: 1, backgroundColor: "var(--border)", margin: "20px 0" }} />

        {/* 내 평점 입력 */}
        <div style={{ padding: "0 24px" }}>
          {profile ? (
            <>
              <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 12 }}>
                {profile.emoji} 나의 청음 점수
              </p>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {[1,2,3,4,5,6,7,8].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMyScore(n)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 6,
                      border: `1px solid ${myScore === n ? "var(--accent)" : "var(--border)"}`,
                      backgroundColor: myScore === n ? "var(--accent)" : "var(--bg-elevated)",
                      color: myScore === n ? "var(--bg)" : "var(--text-sub)",
                      fontWeight: myScore === n ? 700 : 400,
                      fontSize: 14,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <textarea
                placeholder="한줄 소감 (100자 이내)"
                value={myReview}
                onChange={(e) => setMyReview(e.target.value.slice(0, 100))}
                rows={2}
                style={{
                  width: "100%",
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  borderRadius: 6,
                  padding: "8px 12px",
                  fontSize: 13,
                  resize: "none",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{myReview.length}/100</span>
                <button
                  onClick={handleSave}
                  disabled={saving || myScore === null}
                  style={{
                    backgroundColor: saved ? "var(--bg-elevated)" : "var(--accent)",
                    color: saved ? "var(--text-sub)" : "var(--bg)",
                    fontWeight: 600,
                    fontSize: 13,
                    padding: "6px 16px",
                    borderRadius: 6,
                    cursor: myScore === null ? "default" : "pointer",
                    opacity: myScore === null ? 0.4 : 1,
                    transition: "all 0.2s",
                    border: "none",
                  }}
                >
                  {saved ? "저장됨 ✓" : saving ? "저장 중..." : "저장"}
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 8 }}>청음 기록을 남기려면 입문이 필요해요</p>
              <Link href="/login" style={{ color: "var(--accent)", fontSize: 13 }}>입문하기 →</Link>
            </div>
          )}
        </div>

        {/* 트랙리스트 */}
        {tracklist.length > 0 && (
          <>
            <div style={{ height: 1, backgroundColor: "var(--border)", margin: "20px 0" }} />
            <div style={{ padding: "0 24px 24px" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 12 }}>
                수록곡
              </p>
              <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {tracklist.map((track, i) => (
                  <li key={i} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: 11, width: 20, textAlign: "right", flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    <span style={{ color: "var(--text-sub)", fontSize: 13 }}>{track}</span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
