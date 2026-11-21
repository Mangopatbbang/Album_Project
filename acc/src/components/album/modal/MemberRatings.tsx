"use client";

// AlbumModal — 청음단 평점(분포 바·멤버별 점수·소감·소감 공감) + 전체 평점 바텀시트
// AlbumModal에서 분리, 동작 동일.
// 소감 공감 상태(myLikedReviews·savingLike·shakingReviewId)는 부모의 handleToggleLikeReview가 바꾸므로 부모 소유.
// 바텀시트 열림 상태(ratingsSheetOpen)는 부모 effect가 참조하므로 부모 소유 — 여기서는 열기/닫기 콜백만 받는다.
// 소감 펼침·호버는 이 구역에서만 쓰여 여기서 소유.
import { useState } from "react";
import Link from "next/link";
import UserAvatar from "@/components/ui/UserAvatar";
import { scoreColor, SCORE_COLORS } from "@/lib/score";
import type { Rating, User } from "@/types";

type AvatarMap = Record<string, string | null>;

type MemberRatingsProps = {
  ratingScores: number[];
  visibleUsers: User[];
  hiddenCount: number;
  ratings: Rating[];
  users: User[];
  avatarMap: AvatarMap;
  profile: { id: string } | null;
  myLikedReviews: Set<string>;
  savingLike: boolean;
  shakingReviewId: string | null;
  onToggleLikeReview: (reviewerId: string) => void;
  onOpenSheet: () => void;
};

export default function MemberRatings({
  ratingScores, visibleUsers, hiddenCount, ratings, users, avatarMap, profile,
  myLikedReviews, savingLike, shakingReviewId, onToggleLikeReview, onOpenSheet,
}: MemberRatingsProps) {
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [hoveredReview, setHoveredReview] = useState<string | null>(null);

  const toggleReview = (userId: string) => {
    setExpandedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  return (
    <div className="px-5 sm:px-8">
      <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: ratingScores.length >= 3 ? 8 : 12 }}>
        청음단 평점
      </p>
      {ratingScores.length >= 3 && (() => {
        const dist = new Map<number, number>();
        for (const s of ratingScores) dist.set(s, (dist.get(s) ?? 0) + 1);
        const maxCount = Math.max(...dist.values());
        return (
          <div style={{ display: "flex", gap: 3, marginBottom: 16, alignItems: "flex-end" }}>
            {[1,2,3,4,5,6,7,8].map((s) => {
              const count = dist.get(s) ?? 0;
              const color = SCORE_COLORS[s];
              return (
                <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ width: "100%", height: 20, display: "flex", alignItems: "flex-end" }}>
                    <div style={{
                      width: "100%",
                      height: count > 0 ? Math.max(3, Math.round((count / maxCount) * 18)) + "px" : "2px",
                      backgroundColor: count > 0 ? color : "var(--border)",
                      borderRadius: "2px 2px 0 0",
                      opacity: count > 0 ? 0.75 : 0.25,
                    }} />
                  </div>
                  <span style={{ fontSize: 9, color: count > 0 ? color : "var(--text-muted)", opacity: count > 0 ? 0.8 : 0.35 }}>
                    {s}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })()}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visibleUsers.map((user) => {
          const r = ratings.find((rt) => rt.user_id === user.id);
          const review = r?.one_line_review ?? "";
          const LIMIT = 36;
          const isLong = review.length > LIMIT;
          const isExpanded = expandedReviews.has(user.id);
          const iLikedReview = myLikedReviews.has(user.id);
          const likedByUsers = users.filter((u) => r?.liked_by?.split(",").includes(u.id));
          const canLikeReview = !!profile && user.id !== profile.id && !!review;
          const showBlockedHeart = !profile && !!review;
          const showReviewHeart = canLikeReview && (hoveredReview === user.id || iLikedReview);
          return (
            <div
              key={user.id}
              style={{ display: "flex", alignItems: "center", gap: 10 }}
              onMouseEnter={() => setHoveredReview(user.id)}
              onMouseLeave={() => setHoveredReview(null)}
            >
              <span style={{ flexShrink: 0 }}><UserAvatar avatarUrl={avatarMap[user.id]} size={18} /></span>
              <Link href={`/profile/${user.id}`} style={{ color: "var(--text-sub)", fontSize: 13, flexShrink: 0, textDecoration: "none" }} className="w-[72px] sm:w-[110px] truncate hover:text-[var(--accent)] transition-colors">{user.display_name}</Link>

              {r ? (
                <>
                  <span style={{ color: scoreColor(r.score), fontWeight: 700, fontSize: 15, flexShrink: 0, width: 18, textAlign: "right" }}>
                    {r.score}
                  </span>

                  {review && (
                    <span style={{ color: "var(--text-muted)", fontSize: 12, fontStyle: "italic", flex: 1, minWidth: 0 }}>
                      &ldquo;{isExpanded || !isLong ? review : review.slice(0, LIMIT)}
                      {isLong && !isExpanded && (
                        <button onClick={() => toggleReview(user.id)} style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 11, padding: "0 2px", textDecoration: "underline" }}>
                          ...더보기
                        </button>
                      )}
                      {isLong && isExpanded && (
                        <button onClick={() => toggleReview(user.id)} style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 11, padding: "0 2px", textDecoration: "underline" }}>
                          {" "}접기
                        </button>
                      )}
                      &rdquo;
                    </span>
                  )}
                  {!review && <span style={{ flex: 1 }} />}

                  {/* 좋아요 누른 사람 아바타 */}
                  {likedByUsers.length > 0 && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                      {likedByUsers.map((u) => (
                        <Link key={u.id} href={`/profile/${u.id}`} style={{ display: "inline-flex", opacity: 0.85 }} className="hover:opacity-100 transition-opacity">
                          <UserAvatar avatarUrl={avatarMap[u.id]} size={14} />
                        </Link>
                      ))}
                    </span>
                  )}


                  {/* 리뷰 하트 */}
                  {(canLikeReview || showBlockedHeart) && (
                    <button
                      onClick={() => onToggleLikeReview(user.id)}
                      disabled={savingLike && !!profile}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: iLikedReview ? "var(--error)" : "var(--text-muted)",
                        fontSize: 13, flexShrink: 0,
                        transition: "opacity 0.15s, color 0.15s",
                        ...(shakingReviewId === user.id ? { animation: "shake 0.42s ease-in-out" } : {}),
                      }}
                      className={[
                        "p-2 -m-2 transition-colors",
                        iLikedReview ? "heart-pop" : "active:scale-90",
                        showBlockedHeart
                          ? (shakingReviewId === user.id ? "opacity-100" : "opacity-20 hover:opacity-40")
                          : (iLikedReview || showReviewHeart
                              ? "opacity-100"
                              : "opacity-0 sm:opacity-0 max-sm:opacity-30"),
                      ].join(" ")}
                    >
                      ♥
                    </button>
                  )}
                </>
              ) : (
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
              )}
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <button
          onClick={onOpenSheet}
          style={{
            marginTop: 8, background: "none",
            border: "1px solid var(--border)", borderRadius: 6,
            color: "var(--text-muted)", fontSize: 12,
            cursor: "pointer", padding: "4px 10px",
            transition: "border-color 0.15s, color 0.15s",
          }}
          className="hover:!border-[var(--text-sub)] hover:!text-[var(--text-sub)]"
        >
          + {hiddenCount}명 더보기
        </button>
      )}
    </div>
  );
}

type RatingsSheetProps = {
  sortedUsers: User[];
  ratings: Rating[];
  avatarMap: AvatarMap;
  /** AlbumModal의 zIndex — 시트는 그 위(+50/+51)에 뜬다 */
  zIndex: number;
  onClose: () => void;
};

// 노출 조건(ratingsSheetOpen)은 부모가 판단한다.
export function RatingsSheet({ sortedUsers, ratings, avatarMap, zIndex, onClose }: RatingsSheetProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        backgroundColor: "rgba(0,0,0,0.55)",
        zIndex: zIndex + 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0,
          backgroundColor: "var(--bg-elevated)",
          borderTop: "1px solid var(--border)",
          borderRadius: "16px 16px 0 0",
          maxHeight: "75dvh",
          display: "flex", flexDirection: "column",
          zIndex: zIndex + 51,
          animation: "sheetIn 0.26s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px", flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "var(--border-light)" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 20px 12px", flexShrink: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.07em", textTransform: "uppercase", margin: 0 }}>
            청음단 평점 전체 ({sortedUsers.length}명)
          </p>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, lineHeight: 1, padding: "0 4px" }}
          >
            ×
          </button>
        </div>
        <div style={{ overflowY: "auto", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 20px" }}>
            {sortedUsers.map((user) => {
              const r = ratings.find((rt) => rt.user_id === user.id);
              const review = r?.one_line_review ?? "";
              return (
                <div key={user.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ flexShrink: 0, marginTop: 2 }}><UserAvatar avatarUrl={avatarMap[user.id]} size={18} /></span>
                  <Link href={`/profile/${user.id}`} onClick={onClose} style={{ color: "var(--text-sub)", fontSize: 13, flexShrink: 0, textDecoration: "none", width: 80 }} className="truncate hover:text-[var(--accent)] transition-colors">{user.display_name}</Link>
                  {r ? (
                    <>
                      <span style={{ color: scoreColor(r.score), fontWeight: 700, fontSize: 15, flexShrink: 0, width: 18, textAlign: "right" }}>{r.score}</span>
                      {review && (
                        <span style={{ color: "var(--text-muted)", fontSize: 12, fontStyle: "italic", flex: 1, lineHeight: 1.5 }}>
                          &ldquo;{review}&rdquo;
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
      </div>
    </div>
  );
}
