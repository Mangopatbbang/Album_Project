"use client";

import { useEffect, useRef, useState } from "react";
import { AlbumWithRatings, USERS } from "@/types";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { scoreColor, SCORE_COLORS } from "@/lib/score";
import { captureElement } from "@/lib/capture";
import AlbumEditModal from "@/components/album/AlbumEditModal";
import ArtistModal from "@/components/album/ArtistModal";
import SpotifyAttribution from "@/components/ui/SpotifyAttribution";
import AppleMusicLink from "@/components/ui/AppleMusicLink";
import YoutubeMusicLink from "@/components/ui/YoutubeMusicLink";
import { useToast } from "@/components/ui/Toast";

function formatReleaseDate(raw: string): string {
  // "2023-04-07" → "2023.04.07", "2023-04" → "2023.04", "2023" → "2023"
  return raw.replace(/-/g, ".");
}

type RatingWithLikes = {
  user_id: string;
  score: number;
  one_line_review: string | null;
  liked_tracks: string | null;
  liked_by: string | null;
};

type FullAlbum = Omit<AlbumWithRatings, "ratings"> & {
  tracklist?: string | null;
  release_date?: string | null;
  region?: string | null;
  added_by?: string | null;
  ratings: RatingWithLikes[];
};

type Props = {
  album: AlbumWithRatings;
  onClose: () => void;
  onSaved?: (albumId: string) => void;
  zIndex?: number;
};

// 세션 내 앨범 상세 캐시 (같은 앨범 재오픈 시 즉시 표시)
const albumCache = new Map<string, FullAlbum>();

export default function AlbumModal({ album, onClose, onSaved, zIndex = 100 }: Props) {
  const { profile } = useAuth();
  const { showToast } = useToast();
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
  const [deletingAlbum, setDeletingAlbum] = useState(false);
  const [artistModal, setArtistModal] = useState<{ name: string; display: string } | null>(null);
  const [nestedAlbum, setNestedAlbum] = useState<AlbumWithRatings | null>(null);
  const [myHistory, setMyHistory] = useState<{ score: number; createdAt: string }[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);

  const handleDeleteAlbum = async () => {
    if (!profile) return;
    if (!confirm("이 앨범을 삭제할까요? 모든 평점도 함께 삭제됩니다.")) return;
    setDeletingAlbum(true);
    const res = await fetch(`/api/albums/${album.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profile.id, role: profile.role }),
    });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error ?? "삭제 실패", "info");
      setDeletingAlbum(false);
      return;
    }
    showToast("앨범을 삭제했어요", "info");
    onSaved?.(album.id);
    handleClose();
  };

  const handleCapture = async () => {
    if (!cardRef.current || capturing) return;
    setCapturing(true);
    await captureElement(cardRef.current);
    setCapturing(false);
    setCaptured(true);
    showToast("이미지로 저장했어요", "info");
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
    const liked = !next.has(idx);
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
    showToast(liked ? "트랙을 좋아요했어요 ♥" : "트랙 좋아요를 취소했어요", "info");
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
    const reviewLiked = next.has(reviewerId);
    showToast(reviewLiked ? "소감을 좋아요했어요 ♥" : "소감 좋아요를 취소했어요", "info");
  };

  const toggleReview = (userId: string) => {
    setExpandedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  // 즉시 초기값 세팅 — fetch 완료 전 점수 버튼 깜빡임 방지
  useEffect(() => {
    if (!profile) return;
    const existing = (album.ratings ?? []).find((r) => r.user_id === profile.id);
    if (existing) setMyScore(existing.score);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // 평점 이력 fetch
  useEffect(() => {
    if (!profile) return;
    fetch(`/api/rating-history?userId=${profile.id}&albumId=${album.id}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: { score: number; createdAt: string }[]) => setMyHistory(data))
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
    const adding = !isWatchlisted;
    setIsWatchlisted(adding);
    await fetch("/api/watchlist", {
      method: adding ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profile.id, albumId: album.id }),
    });
    showToast(adding ? "나중에 들을 목록에 추가했어요" : "목록에서 제거했어요", "info");
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
    if (!confirm("평점을 삭제할까요?")) return;
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
    showToast("평점을 삭제했어요", "info");
    onSaved?.(album.id);
  };

  const handleSave = async () => {
    if (!profile) return;
    if (myScore === null) {
      showToast("점수를 먼저 선택해주세요", "info");
      return;
    }
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
    showToast("평점을 저장했어요");
    onSaved?.(album.id);
    setTimeout(() => setSaved(false), 2000);
    // 이력 갱신
    fetch(`/api/rating-history?userId=${profile.id}&albumId=${album.id}`)
      .then((r) => r.ok ? r.json() : [])
      .then((d: { score: number; createdAt: string }[]) => setMyHistory(d))
      .catch(() => {});
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
        zIndex,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: closing ? "backdropOut 0.16s ease-in forwards" : "backdropIn 0.18s ease-out",
      }}
      className="p-3 sm:p-8"
      onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === e.currentTarget; }}
      onMouseUp={(e) => { if (mouseDownOnBackdrop.current && e.target === e.currentTarget) handleClose(); mouseDownOnBackdrop.current = false; }}
    >
      <div
        ref={cardRef}
        style={{
          position: "relative",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          width: "100%",
          maxWidth: 760,
          maxHeight: "90vh",
          overflowY: "auto",
          textAlign: "left",
          animation: closing ? "modalOut 0.16s ease-in forwards" : "modalIn 0.18s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 전용 행 — 오버랩 없음 */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 14px 0" }}>
          <button
            onClick={handleClose}
            style={{
              color: "var(--text-muted)", fontSize: 18, lineHeight: 1,
              cursor: "pointer", background: "none", border: "none",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        {/* 상단: 블러 배경 + 커버 + 정보 */}
        <div style={{ position: "relative", overflow: "hidden" }}>
          {/* 블러 배경 */}
          {data.cover_url && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 0,
              backgroundImage: `url(${data.cover_url})`,
              backgroundSize: "cover", backgroundPosition: "center",
              filter: "blur(28px) saturate(1.4)",
              transform: "scale(1.1)",
              opacity: 0.18,
            }} />
          )}
          <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 20, padding: "8px 32px 24px" }}>
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
          {/* 모바일: paddingRight으로 ✕ 버튼 겹침 방지. 데스크탑: pr-0 */}
          <div style={{ flex: 1, minWidth: 0 }} className="pr-7 sm:pr-11">
            {/* 데스크탑: 제목/아티스트 왼쪽 + 버튼 오른쪽 (space-between) */}
            {/* 모바일: 제목/아티스트 위, 버튼 아래 (flex-col) */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-2">
              <div className="sm:flex-1 sm:min-w-0">
                <p style={{ color: "var(--text)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }} className="text-base sm:text-xl">
                  {data.title}
                </p>
                <p style={{ color: "var(--text-sub)", fontSize: 14, marginTop: 4 }}>
                  <span
                    className="hover:underline cursor-pointer"
                    onClick={() => setArtistModal({ name: data.artist, display: data.artist_display ?? data.artist })}
                  >
                    {data.artist_display ?? data.artist}
                  </span>
                  {data.extra_artists && (
                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {" · "}{data.extra_artists.split(";").map((a) => a.trim()).filter(Boolean).map((a, i, arr) => (
                        <span key={a}>
                          <span className="hover:underline cursor-pointer" onClick={() => setArtistModal({ name: a, display: a })}>{a}</span>
                          {i < arr.length - 1 && ", "}
                        </span>
                      ))}
                    </span>
                  )}
                  {((full as FullAlbum)?.release_date || data.year) && (
                    <span style={{ color: "var(--text-muted)" }}>
                      {" · "}
                      {(full as FullAlbum)?.release_date
                        ? formatReleaseDate((full as FullAlbum).release_date!)
                        : data.year}
                    </span>
                  )}
                </p>
                <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 8 }}>
                  <SpotifyAttribution spotifyId={data.spotify_id} size="md" />
                  <AppleMusicLink artist={data.artist} title={data.title} />
                  <YoutubeMusicLink artist={data.artist} title={data.title} />
                </div>
              </div>

              {/* 액션 버튼: 데스크탑 오른쪽, 모바일 아래 */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} className="mt-2 sm:mt-0">
                {profile && !ratings.find((r) => r.user_id === profile.id) && (
                  <button
                    onClick={handleToggleWatchlist}
                    style={{
                      background: "none", cursor: "pointer",
                      color: isWatchlisted ? "var(--accent)" : "var(--text)",
                      fontSize: 12, lineHeight: 1,
                      padding: "2px 6px", borderRadius: 4,
                      border: `1px solid ${isWatchlisted ? "var(--accent)" : "var(--border)"}`,
                      transition: "color 0.15s, border-color 0.15s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isWatchlisted ? "나중에 ✓" : "+ 나중에"}
                  </button>
                )}
                {profile?.role === "admin" && (
                  <button
                    onClick={() => setEditing(true)}
                    style={{
                      background: "none", cursor: "pointer",
                      color: "var(--text)", fontSize: 12, lineHeight: 1,
                      padding: "2px 6px", borderRadius: 4,
                      border: "1px solid var(--border)",
                    }}
                  >
                    수정
                  </button>
                )}
                {profile && (profile.role === "admin" || (full as FullAlbum)?.added_by === profile.id) && (
                  <button
                    onClick={handleDeleteAlbum}
                    disabled={deletingAlbum}
                    style={{
                      background: "none", cursor: deletingAlbum ? "default" : "pointer",
                      color: "var(--error)", fontSize: 12, lineHeight: 1,
                      padding: "2px 6px", borderRadius: 4,
                      border: "1px solid rgba(var(--error-rgb), 0.4)",
                      opacity: deletingAlbum ? 0.5 : 1,
                    }}
                  >
                    {deletingAlbum ? "삭제 중…" : "삭제"}
                  </button>
                )}
                <button
                  onClick={handleCapture}
                  disabled={capturing}
                  style={{
                    background: "none", border: "none", cursor: capturing ? "default" : "pointer",
                    color: captured ? "var(--accent)" : "var(--text)",
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
              </div>
            </div>

            {(data.genre || (full as FullAlbum)?.region) && (
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {(full as FullAlbum)?.region && (
                  <span style={{
                    backgroundColor: "rgba(var(--accent-rgb), 0.08)",
                    color: "var(--accent)",
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 4,
                    border: "1px solid rgba(var(--accent-rgb), 0.25)",
                  }}>
                    {(full as FullAlbum).region}
                  </span>
                )}
                {data.genre && (
                  <span style={{
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
              </div>
            )}

            {/* 평균 점수 */}
            <p style={{ fontWeight: 700, fontSize: 22, marginTop: 10, color: data.avg ? scoreColor(data.avg) : "var(--text-muted)" }}>
              {data.avg ?? "–"}
              <span style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 400, marginLeft: 4 }}>/ 8</span>
            </p>
          </div>
          </div>{/* end 정보 row */}
        </div>{/* end 블러 wrapper */}

        <div style={{ height: 1, backgroundColor: "var(--border)", margin: "28px 0" }} />

        {/* 멤버 평점 */}
        <div style={{ paddingLeft: 32, paddingRight: 32 }}>
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
                            color: iLikedReview ? "var(--error)" : "var(--text-muted)",
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

        <div style={{ height: 1, backgroundColor: "var(--border)", margin: "28px 0" }} />

        {/* 내 평점 입력 */}
        <div style={{ paddingLeft: 32, paddingRight: 32 }}>
          {profile ? (
            <>
              <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 12 }}>
                {profile.emoji} 나의 청음 점수
              </p>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {[1,2,3,4,5,6,7,8].map((n) => {
                  const color = SCORE_COLORS[n];
                  const selected = myScore === n;
                  return (
                    <button
                      key={n}
                      onClick={() => setMyScore(n)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        border: selected ? `2px solid ${color}` : `1px solid ${color}44`,
                        backgroundColor: selected ? color : `${color}18`,
                        color: selected ? (n === 8 ? "#111" : "#fff") : color,
                        fontWeight: selected ? 800 : 500,
                        fontSize: 14,
                        cursor: "pointer",
                        transition: "all 0.12s",
                        transform: selected ? "scale(1.1)" : "scale(1)",
                        boxShadow: selected ? `0 0 10px ${color}55` : "none",
                        opacity: selected ? 1 : 0.65,
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
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
                        color: "var(--text)",
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
                      {deleting ? "삭제 중…" : "삭제"}
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      backgroundColor: saved ? "var(--bg-elevated)" : "var(--accent)",
                      color: saved ? "var(--text-sub)" : "var(--bg)",
                      fontWeight: 600,
                      fontSize: 13,
                      padding: "6px 16px",
                      borderRadius: 6,
                      cursor: saving ? "default" : "pointer",
                      opacity: saving ? 0.4 : 1,
                      transition: "all 0.2s",
                      border: "none",
                    }}
                  >
                    {saved ? "저장됨" : saving ? "저장 중…" : "저장"}
                  </button>
                </div>
              </div>
              {/* 평점 이력 타임라인 */}
              {myHistory.length > 1 && (
                <div style={{ marginTop: 12, padding: "10px 12px", backgroundColor: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>평점 이력</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
                    {myHistory.map((h, i) => {
                      const d = new Date(h.createdAt);
                      const label = `${d.getFullYear().toString().slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
                      const isLast = i === myHistory.length - 1;
                      return (
                        <span key={h.createdAt + i} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(String(h.score)) }}>{h.score}</span>
                            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{label}</span>
                          </span>
                          {!isLast && <span style={{ color: "var(--text-muted)", fontSize: 11, margin: "0 6px", marginBottom: 10 }}>→</span>}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 8 }}>청음 기록을 남기려면 입문이 필요해요</p>
              <Link href="/login" style={{ color: "var(--accent)", fontSize: 13 }}>입문하기 →</Link>
            </div>
          )}
        </div>

        {/* 트랙리스트 */}
        {full !== null && tracklist.length === 0 && (
          <>
            <div style={{ height: 1, backgroundColor: "var(--border)", margin: "28px 0" }} />
            <div style={{ paddingLeft: 32, paddingRight: 32, paddingBottom: 0 }}>
              <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 8 }}>수록곡</p>
              <p style={{ color: "var(--text-muted)", fontSize: 12 }}>트랙리스트 정보가 없어요</p>
            </div>
          </>
        )}
        {tracklist.length > 0 && (
          <>
            <div style={{ height: 1, backgroundColor: "var(--border)", margin: "28px 0" }} />
            <div style={{ paddingLeft: 32, paddingRight: 32, paddingBottom: 0 }}>
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
                              color: iLiked ? "var(--error)" : "var(--text-muted)",
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
                      {/* 좋아요 수 */}
                      {(() => {
                        const total = othersWhoLiked.length + (iLiked ? 1 : 0);
                        return total > 0 ? (
                          <span style={{ color: "var(--error)", fontSize: 11, flexShrink: 0, opacity: 0.8 }}>
                            {total}
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
        {/* 문의 링크 */}
        <div style={{ textAlign: "center", padding: "20px 32px 28px" }}>
          <Link
            href="/board"
            onClick={handleClose}
            style={{ color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.02em" }}
            className="hover:text-[var(--text-sub)] transition-colors"
          >
            문제가 있나요? 문의하기 →
          </Link>
        </div>
      </div>

    </div>

      {artistModal && (
        <ArtistModal
          artistName={artistModal.name}
          displayName={artistModal.display}
          onClose={() => setArtistModal(null)}
          onAlbumClick={(a) => { setArtistModal(null); setNestedAlbum(a); }}
        />
      )}

      {nestedAlbum && (
        <AlbumModal
          album={nestedAlbum}
          onClose={() => setNestedAlbum(null)}
          onSaved={onSaved}
          zIndex={120}
        />
      )}

      {editing && (
        <AlbumEditModal
          album={{
            id: album.id,
            title: data.title,
            artist: data.artist,
            use_artist_variant: data.use_artist_variant ?? false,
            extra_artists: data.extra_artists ?? null,
            year: data.year ?? null,
            release_date: (full as FullAlbum)?.release_date ?? null,
            genre: data.genre ?? null,
            region: (full as FullAlbum)?.region ?? null,
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
