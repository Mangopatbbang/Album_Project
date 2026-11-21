"use client";

// AlbumModal — 트랙리스트 (로딩 skeleton / 에러 재시도 / 빈 목록 / 목록 + 트랙 좋아요)
// AlbumModal에서 분리, 동작 동일.
// 좋아요 상태(myLikedTracks·savingLike·shakingTrackIdx)는 부모의 handleToggleLike가 바꾸므로 부모 소유.
// 호버·펼침은 이 구역에서만 쓰여 여기서 소유.
import { useState } from "react";
import type { Rating } from "@/types";

const formatTrackDuration = (ms: number): string => {
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
};

const formatTotalDuration = (msArr: number[]): string => {
  const totalSec = Math.round(msArr.reduce((a, b) => a + b, 0) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분 ${s}초`;
};

type Props = {
  /** 상세 정보(full) 로드 완료 여부 */
  loaded: boolean;
  /** 상세 정보 로드 실패 여부 */
  loadError: boolean;
  onRetry: () => void;
  tracklist: string[];
  /** full.track_durations 원본 (세미콜론 구분 ms) */
  trackDurationsRaw: string | null | undefined;
  profile: { id: string } | null;
  users: { id: string }[];
  ratings: Rating[];
  myScore: number | null;
  myLikedTracks: Set<number>;
  savingLike: boolean;
  shakingTrackIdx: number | null;
  top3TrackIndices: Set<number>;
  onToggleLike: (idx: number) => void;
};

export default function AlbumTracklist({
  loaded, loadError, onRetry, tracklist, trackDurationsRaw, profile, users, ratings,
  myScore, myLikedTracks, savingLike, shakingTrackIdx, top3TrackIndices, onToggleLike,
}: Props) {
  const [hoveredTrack, setHoveredTrack] = useState<number | null>(null);
  const [tracklistExpanded, setTracklistExpanded] = useState(false);

  const trackDurationsMs: number[] = trackDurationsRaw
    ? trackDurationsRaw.split(";").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
    : [];
  const hasDurations = trackDurationsMs.length > 0 && trackDurationsMs.length === tracklist.length;

  return (
    <>
      {/* 트랙리스트 skeleton — full 로드 전 자리 확보해서 레이아웃 점프 방지 */}
      {!loaded && !loadError && (
        <>
          <div style={{ height: 1, backgroundColor: "var(--border)", margin: "28px 0" }} />
          <div className="px-5 sm:px-8">
            <div className="skeleton-shimmer" style={{ height: 11, width: 72, borderRadius: 4, marginBottom: 12 }} />
            {[0,1,2,3,4].map((i) => (
              <div key={i} className="skeleton-shimmer" style={{ height: 13, borderRadius: 4, marginBottom: 7 }} />
            ))}
          </div>
        </>
      )}
      {!loaded && loadError && (
        <>
          <div style={{ height: 1, backgroundColor: "var(--border)", margin: "28px 0" }} />
          <div className="px-5 sm:px-8" style={{ paddingBottom: 4 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>상세 정보를 불러오지 못했어요</p>
            <button
              onClick={onRetry}
              style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}
            >
              다시 시도
            </button>
          </div>
        </>
      )}

      {/* 트랙리스트 */}
      {loaded && tracklist.length === 0 && (
        <>
          <div style={{ height: 1, backgroundColor: "var(--border)", margin: "28px 0" }} />
          <div className="px-5 sm:px-8" style={{ paddingBottom: 0, animation: "fadeIn 0.2s ease-out" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 8 }}>수록곡</p>
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>트랙리스트 정보가 없어요</p>
          </div>
        </>
      )}
      {tracklist.length > 0 && (
        <>
          <div style={{ height: 1, backgroundColor: "var(--border)", margin: "28px 0" }} />
          <div className="px-5 sm:px-8" style={{ paddingBottom: 0, animation: "fadeIn 0.2s ease-out" }}>
            {/* 섹션 헤더 */}
            <div style={{ marginBottom: 12 }}>
              <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>
                수록곡 · {tracklist.length}곡{hasDurations ? ` · 총 ${formatTotalDuration(trackDurationsMs)}` : ""}
              </p>
              {profile && ratings.find((r) => r.user_id === profile.id) && myLikedTracks.size === 0 && (
                <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 3, opacity: 0.6 }}>
                  ♡ 탭하면 좋아하는 곡을 표시할 수 있어요
                </p>
              )}
            </div>
            <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 0 }}>
              {tracklist.map((track, i) => {
                const othersWhoLiked = users.filter((u) => {
                  if (u.id === profile?.id) return false;
                  const r = ratings.find((rt) => rt.user_id === u.id);
                  return r?.liked_tracks?.split(",").map(Number).includes(i);
                });
                const iLiked = myLikedTracks.has(i);
                const hasMyRating = myScore !== null || !!ratings.find((r) => r.user_id === profile?.id);
                const likeTotal = othersWhoLiked.length + (iLiked ? 1 : 0);
                const isRowHovered = hoveredTrack === i;
                const canLike = !!(profile && hasMyRating && !savingLike);
                return (
                  <li
                    key={i}
                    className={i >= 9 && !tracklistExpanded ? "hidden sm:flex" : "flex"}
                    onClick={() => { if (!profile || canLike) onToggleLike(i); }}
                    style={{
                      alignItems: "center", padding: "8px 6px",
                      borderRadius: 6,
                      backgroundColor: isRowHovered ? "var(--bg-elevated)" : "transparent",
                      transition: "background-color 0.12s",
                      cursor: !profile || canLike ? "pointer" : "default",
                    }}
                    onMouseEnter={() => setHoveredTrack(i)}
                    onMouseLeave={() => setHoveredTrack(null)}
                  >
                    {/* 번호 */}
                    <span style={{
                      color: top3TrackIndices.has(i) ? "var(--accent)" : "var(--text-muted)",
                      fontSize: 11, width: 22, textAlign: "right", flexShrink: 0,
                      fontWeight: top3TrackIndices.has(i) ? 700 : 400,
                      marginRight: 10,
                    }}>
                      {i + 1}
                    </span>
                    {/* 트랙명 */}
                    <span style={{
                      flex: 1, minWidth: 0,
                      color: iLiked ? "var(--text)" : "var(--text-sub)",
                      fontSize: 13, fontWeight: iLiked ? 500 : 400,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      marginRight: 10,
                    }}>
                      {track}
                    </span>
                    {/* 재생시간 */}
                    {hasDurations && (
                      <span style={{
                        color: "var(--text-muted)", fontSize: 11,
                        width: 36, textAlign: "right", flexShrink: 0,
                        fontVariantNumeric: "tabular-nums",
                        marginRight: 4,
                      }}>
                        {formatTrackDuration(trackDurationsMs[i])}
                      </span>
                    )}
                    {/* 하트 + 좋아요 수 (시각 표시만) */}
                    <span style={{
                      minWidth: 44, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3,
                    }}>
                      {likeTotal > 0 && (
                        <span style={{ fontSize: 11, color: "var(--error)", lineHeight: 1 }}>
                          {likeTotal}
                        </span>
                      )}
                      {(profile ? hasMyRating : true) && (
                        <span
                          className={iLiked ? "heart-pop" : ""}
                          style={{
                            fontSize: 14, lineHeight: 1,
                            color: iLiked ? "var(--error)" : "var(--text-muted)",
                            opacity: shakingTrackIdx === i
                              ? 1
                              : !profile
                                ? (isRowHovered ? 0.4 : 0.15)
                                : (iLiked ? 1 : isRowHovered ? 0.6 : 0.4),
                            transition: "opacity 0.15s, color 0.15s",
                            ...(shakingTrackIdx === i ? { animation: "shake 0.42s ease-in-out" } : {}),
                          }}
                        >
                          ♥
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
            {tracklist.length > 9 && (
              <button
                onClick={() => setTracklistExpanded((v) => !v)}
                style={{
                  marginTop: 8, background: "none",
                  border: "1px solid var(--border)", borderRadius: 6,
                  color: "var(--text-muted)", fontSize: 11,
                  cursor: "pointer", padding: "3px 10px",
                  transition: "border-color 0.15s, color 0.15s",
                }}
                className="sm:hidden hover:!border-[var(--text-sub)] hover:!text-[var(--text-sub)]"
              >
                {tracklistExpanded ? "접기" : `+ ${tracklist.length - 9}곡 더보기`}
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
