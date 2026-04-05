"use client";

import { useEffect, useRef, useState } from "react";
import { AlbumWithRatings, USERS } from "@/types";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { scoreColor } from "@/lib/score";
import { captureElement } from "@/lib/capture";
import AlbumEditModal from "@/components/album/AlbumEditModal";
import SpotifyAttribution from "@/components/ui/SpotifyAttribution";

type RatingWithLikes = {
  user_id: string;
  score: number;
  one_line_review: string | null;
  liked_tracks: string | null;
  liked_by: string | null;
};

type FullAlbum = Omit<AlbumWithRatings, "ratings"> & {
  tracklist?: string | null;
  ratings: RatingWithLikes[];
};

type Props = {
  album: AlbumWithRatings;
  onClose: () => void;
  onSaved?: (albumId: string) => void;
};

// 세션 내 앨범 상세 캐시 (같은 앨범 재오픈 시 즉시 표시)
const albumCache = new Map<string, FullAlbum>();

export default function AlbumModal({ album, onClose, onSaved }: Props) {
  const { profile } = useAuth();
  const [full, setFull] = useState<FullAlbum | null>(null);
  const [myScore, setMyScore] = useState<number | null>(null);
  const [myReview, setMyReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [closing, setClosing] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [editing, setEditing] = useState(false);
  const [myLikedTracks, setMyLikedTracks] = useState<Set<number>>(new Set());
  const [myLikedReviews, setMyLikedReviews] = useState<Set<string>>(new Set());
  const [hoveredTrack, setHoveredTrack] = useState<number | null>(null);
  const [hoveredReview, setHoveredReview] = useState<string | null>(null);
  const [savingLike, setSavingLike] = useState(false);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);

  const handleCapture = async () => {
    if (!cardRef.current || capturing) return;
    setCapturing(true);
    await captureElement(cardRef.current);
    setCapturing(false);
    setCaptured(true);
    setTimeout(() => setCaptured(false), 2000);
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 160);
  };

  const handleToggleLike = async (idx: number) => {
    if (!profile || savingLike) return;
    const hasRating = ratings.find((r) => r.user_id === profile.id);
    if (!hasRating) return;
    const next = new Set(myLikedTracks);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setMyLikedTracks(next);
    setSavingLike(true);
    await fetch("/api/ratings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        albumId: album.id,
        userId: profile.id,
        liked_tracks: next.size > 0 ? [...next].sort((a, b) => a - b).join(",") : null,
      }),
    });
    setSavingLike(false);
  };

  const handleToggleLikeReview = async (reviewerId: string) => {
    if (!profile || savingLike) return;
    const next = new Set(myLikedReviews);
    if (next.has(reviewerId)) next.delete(reviewerId); else next.add(reviewerId);
    setMyLikedReviews(next);
    setSavingLike(true);
    const res = await fetch("/api/ratings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId: album.id, reviewerId, likerId: profile.id }),
    });
    if (res.ok) {
      const data = await res.json();
      setFull((prev) => prev ? {
        ...prev,
        ratings: prev.ratings.map((r) =>
          r.user_id === reviewerId ? { ...r, liked_by: data.liked_by } : r
        ),
      } : prev);
    }
    setSavingLike(false);
  };

  const toggleReview = (userId: string) => {
    setExpandedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  // 상세 데이터 fetch (캐시 무효화 후 항상 fresh fetch)
  useEffect(() => {
    albumCache.delete(album.id);
    fetch(`/api/albums/${album.id}`, { cache: "no-store" })
      .then((r) => { if (!r.ok) return null; return r.json(); })
      .then((data) => {
        if (!data || !Array.isArray(data.ratings)) return;
        albumCache.set(album.id, data);
        setFull(data);
        if (profile) {
          const myRating = data.ratings?.find(
            (r: { user_id: string }) => r.user_id === profile.id
          );
          if (myRating) {
            setMyScore(myRating.score);
            setMyReview(myRating.one_line_review ?? "");
            if (myRating.liked_tracks) {
              setMyLikedTracks(new Set(myRating.liked_tracks.split(",").map(Number)));
            }
          }
          const likedReviews = new Set<string>();
          (data.ratings as RatingWithLikes[]).forEach((r) => {
            if (r.liked_by?.split(",").includes(profile.id)) {
              likedReviews.add(r.user_id);
            }
          });
          setMyLikedReviews(likedReviews);
        }
      })
      .catch(() => {});
  }, [album.id, profile]);

  // 찜 여부 fetch
  useEffect(() => {
    if (!profile) return;
    fetch(`/api/watchlist?userId=${profile.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.items) {
          setIsWatchlisted(data.items.some((i: { album_id: string }) => i.album_id === album.id));
        }
      })
      .catch(() => {});
  }, [album.id, profile]);

  const handleToggleWatchlist = async () => {
    if (!profile) return;
    const method = isWatchlisted ? "DELETE" : "POST";
    setIsWatchlisted(!isWatchlisted);
    await fetch("/api/watchlist", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profile.id, albumId: album.id }),
    });
  };

  // 배경 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ESC 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { handleClose(); return; }
      if (e.key === "Backspace") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async () => {
    if (!profile || myScore === null) return;
    setDeleting(true);
    await fetch("/api/ratings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId: album.id, userId: profile.id }),
    });
    setMyScore(null);
    setMyReview("");
    setMyLikedTracks(new Set());
    // 삭제 후 최신 데이터로 갱신 (캐시 무효화)
    albumCache.delete(album.id);
    const refreshed = await fetch(`/api/albums/${album.id}`, { cache: "no-store" });
    if (refreshed.ok) {
      const data = await refreshed.json();
      if (data && Array.isArray(data.ratings)) { albumCache.set(album.id, data); setFull(data); }
    } else {
      setFull(null);
    }
    setDeleting(false);
    onSaved?.(album.id);
  };

  const handleSave = async () => {
    if (!profile || myScore === null) return;
    setSaving(true);

    const res = await fetch("/api/ratings", {
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
    if (!res.ok) return;
    // 저장 후 최신 데이터로 갱신 (캐시 무효화)
    albumCache.delete(album.id);
    const refreshed = await fetch(`/api/albums/${album.id}`, { cache: "no-store" });
    if (refreshed.ok) {
      const data = await refreshed.json();
      if (data && Array.isArray(data.ratings)) { albumCache.set(album.id, data); setFull(data); }
    }
    // 평점 저장 시 찜 자동 해제
    if (isWatchlisted) {
      fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id, albumId: album.id }),
      });
      setIsWatchlisted(false);
    }
    setSaved(true);
    onSaved?.(album.id);
    setTimeout(() => setSaved(false), 2000);
  };

  const data = full ?? album;
  const ratings = (data as FullAlbum).ratings ?? album.ratings ?? [];
  const tracklist = full?.tracklist
    ? full.tracklist.split(";").map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <>
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.75)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: closing ? "backdropOut 0.16s ease-in forwards" : "backdropIn 0.18s ease-out",
      }}
      className="p-3 sm:p-6"
      onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === e.currentTarget; }}
      onMouseUp={(e) => { if (mouseDownOnBackdrop.current && e.target === e.currentTarget) handleClose(); mouseDownOnBackdrop.current = false; }}
    >
      <div
        ref={cardRef}
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          width: "100%",
          maxWidth: 680,
          maxHeight: "90vh",
          overflowY: "auto",
          animation: closing ? "modalOut 0.16s ease-in forwards" : "modalIn 0.18s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 */}
        <div className="flex gap-3 sm:gap-5 px-4 sm:px-6 pt-5">
          {/* 커버 */}
          <div
            style={{
              flexShrink: 0,
              backgroundColor: "var(--bg-elevated)",
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid var(--border)",
            }}
            className="w-[88px] h-[88px] sm:w-[120px] sm:h-[120px]"
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
                <p style={{ color: "var(--text)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }} className="text-base sm:text-xl">
                  {data.title}
                </p>
                <p style={{ color: "var(--text-sub)", fontSize: 14, marginTop: 4 }}>
                  {data.artist}
                  {data.year && <span style={{ color: "var(--text-muted)" }}> · {data.year}</span>}
                </p>
                <div style={{ marginTop: 6 }}>
                  <SpotifyAttribution spotifyId={data.spotify_id} size="md" />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {/* 찜하기 버튼: 로그인 + 미평가 시 */}
                {profile && !ratings.find((r) => r.user_id === profile.id) && (
                  <button
                    onClick={handleToggleWatchlist}
                    title={isWatchlisted ? "찜 해제" : "나중에 듣기"}
                    style={{
                      background: "none", cursor: "pointer",
                      color: isWatchlisted ? "var(--accent)" : "var(--text-muted)",
                      fontSize: 12, lineHeight: 1,
                      padding: "2px 6px", borderRadius: 4,
                      border: `1px solid ${isWatchlisted ? "var(--accent)" : "var(--border)"}`,
                      transition: "color 0.15s, border-color 0.15s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isWatchlisted ? "✓ 나중에" : "+ 나중에"}
                  </button>
                )}
                {profile?.role === "admin" && (
                  <button
                    onClick={() => setEditing(true)}
                    title="앨범 수정"
                    style={{
                      background: "none", cursor: "pointer",
                      color: "var(--text-muted)", fontSize: 12, lineHeight: 1,
                      padding: "2px 6px", borderRadius: 4,
                      border: "1px solid var(--border)",
                    }}
                  >
                    수정
                  </button>
                )}
                <button
                  onClick={handleCapture}
                  disabled={capturing}
                  title="이미지로 저장"
                  style={{
                    background: "none", border: "none", cursor: capturing ? "default" : "pointer",
                    color: captured ? "var(--accent)" : "var(--text-muted)",
                    fontSize: 15, lineHeight: 1, padding: "2px 4px",
                    transition: "color 0.2s", opacity: capturing ? 0.5 : 1,
                  }}
                >
                  {captured ? "✓" : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><line x1="8.5" y1="2" x2="8.5" y2="4"/>
                    </svg>
                  )}
                </button>
                <button
                  onClick={handleClose}
                  style={{ color: "var(--text-muted)", fontSize: 20, lineHeight: 1, cursor: "pointer", background: "none", border: "none" }}
                  className="touch-target"
                >
                  ✕
                </button>
              </div>
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
        <div className="px-4 sm:px-6">
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 12 }}>
            청음단 평점
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {USERS.map((user) => {
              const r = ratings.find((rt) => rt.user_id === user.id);
              const review = r?.one_line_review ?? "";
              const LIMIT = 36;
              const isLong = review.length > LIMIT;
              const isExpanded = expandedReviews.has(user.id);
              const iLikedReview = myLikedReviews.has(user.id);
              const likedByUsers = USERS.filter((u) => r?.liked_by?.split(",").includes(u.id));
              const canLikeReview = !!profile && !!ratings.find((rt) => rt.user_id === profile.id) && user.id !== profile.id && !!review;
              const showReviewHeart = canLikeReview && (hoveredReview === user.id || iLikedReview);
              return (
                <div
                  key={user.id}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                  onMouseEnter={() => setHoveredReview(user.id)}
                  onMouseLeave={() => setHoveredReview(null)}
                >
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{user.emoji}</span>
                  <Link href={`/profile/${user.id}`} style={{ color: "var(--text-sub)", fontSize: 13, flexShrink: 0, textDecoration: "none" }} className="w-[72px] sm:w-[110px] hover:text-[var(--accent)] transition-colors">{user.display_name}</Link>

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

                      {/* 좋아요 누른 사람 이모지 */}
                      {likedByUsers.length > 0 && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0, letterSpacing: "0.05em" }}>
                          {likedByUsers.map((u) => u.emoji).join("")}
                        </span>
                      )}

                      {/* 리뷰 하트 */}
                      {canLikeReview && (
                        <button
                          onClick={() => handleToggleLikeReview(user.id)}
                          disabled={savingLike}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: iLikedReview ? "#e05050" : "var(--text-muted)",
                            fontSize: 13, flexShrink: 0,
                            transition: "opacity 0.15s, color 0.15s",
                          }}
                          className={[
                            "p-2 -m-2 active:scale-90",
                            iLikedReview || showReviewHeart
                              ? "opacity-100"
                              : "opacity-0 sm:opacity-0 max-sm:opacity-30",
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
        </div>

        <div style={{ height: 1, backgroundColor: "var(--border)", margin: "20px 0" }} />

        {/* 내 평점 입력 */}
        <div className="px-4 sm:px-6">
          {profile ? (
            <>
              <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 12 }}>
                {profile.emoji} 나의 청음 점수
              </p>
              <div className="flex gap-1 sm:gap-1.5 mb-3">
                {[1,2,3,4,5,6,7,8].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMyScore(n)}
                    className="flex-1 h-8 sm:h-9"
                    style={{
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
                <div style={{ display: "flex", gap: 6 }}>
                  {ratings.find((r) => r.user_id === profile?.id) && (
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      style={{
                        backgroundColor: "transparent",
                        color: "var(--text-muted)",
                        fontWeight: 400,
                        fontSize: 12,
                        padding: "6px 10px",
                        borderRadius: 6,
                        cursor: deleting ? "default" : "pointer",
                        opacity: deleting ? 0.4 : 1,
                        border: "1px solid var(--border)",
                        transition: "all 0.15s",
                      }}
                    >
                      {deleting ? "삭제 중..." : "삭제"}
                    </button>
                  )}
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
            <div className="px-4 sm:px-6 pb-6">
              <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 12 }}>
                수록곡
              </p>
              <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                {tracklist.map((track, i) => {
                  const othersWhoLiked = USERS.filter((u) => {
                    if (u.id === profile?.id) return false;
                    const r = ratings.find((rt) => rt.user_id === u.id);
                    return r?.liked_tracks?.split(",").map(Number).includes(i);
                  });
                  const iLiked = myLikedTracks.has(i);
                  const hasMyRating = !!ratings.find((r) => r.user_id === profile?.id);
                  return (
                    <li
                      key={i}
                      style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0" }}
                      onMouseEnter={() => setHoveredTrack(i)}
                      onMouseLeave={() => setHoveredTrack(null)}
                    >
                      <span style={{ color: "var(--text-muted)", fontSize: 11, width: 20, textAlign: "right", flexShrink: 0 }}>
                        {i + 1}
                      </span>
                      {/* 트랙명 + 하트 인라인 */}
                      <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ color: iLiked ? "var(--text)" : "var(--text-sub)", fontSize: 13, fontWeight: iLiked ? 500 : 400 }}>
                          {track}
                        </span>
                        {profile && hasMyRating && (
                          <button
                            onClick={() => handleToggleLike(i)}
                            disabled={savingLike}
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: iLiked ? "#e05050" : "var(--text-muted)",
                              fontSize: 13, flexShrink: 0, lineHeight: 1,
                              transition: "opacity 0.15s, color 0.15s",
                            }}
                            className={[
                              "p-2 -m-2 active:scale-90",
                              iLiked || hoveredTrack === i
                                ? "opacity-100"
                                : "opacity-0 sm:opacity-0 max-sm:opacity-30",
                            ].join(" ")}
                          >
                            ♥
                          </button>
                        )}
                      </span>
                      {/* 좋아요 총 개수 */}
                      {(() => {
                        const total = othersWhoLiked.length + (iLiked ? 1 : 0);
                        return total > 0 ? (
                          <span style={{ color: "#e05050", fontSize: 11, flexShrink: 0, opacity: 0.8 }}>
                            ♥ {total}
                          </span>
                        ) : null;
                      })()}
                    </li>
                  );
                })}
              </ol>
            </div>
          </>
        )}
      </div>

    </div>

      {editing && (
        <AlbumEditModal
          album={{
            id: album.id,
            title: data.title,
            artist: data.artist,
            year: data.year ?? null,
            genre: data.genre ?? null,
            cover_url: data.cover_url ?? null,
            tracklist: full?.tracklist ?? null,
          }}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            const refreshed = await fetch(`/api/albums/${album.id}`, { cache: "no-store" });
            if (refreshed.ok) {
              const updated = await refreshed.json();
              if (updated && Array.isArray(updated.ratings)) setFull(updated);
            }
            onSaved?.(album.id);
          }}
        />
      )}
    </>
  );
}
