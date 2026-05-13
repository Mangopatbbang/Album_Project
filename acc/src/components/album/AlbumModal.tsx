"use client";

import { useEffect, useRef, useState } from "react";
import { AlbumWithRatings } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useUsers } from "@/context/UsersContext";
import { useUserAvatars } from "@/context/UserAvatarsContext";
import UserAvatar from "@/components/ui/UserAvatar";
import Link from "next/link";
import { scoreColor, SCORE_COLORS } from "@/lib/score";
import { apiFetch } from "@/lib/apiFetch";
import StoryCardPreviewModal from "@/components/album/StoryCardPreviewModal";
import AlbumEditModal from "@/components/album/AlbumEditModal";
import ArtistModal from "@/components/album/ArtistModal";
import SpotifyAttribution from "@/components/ui/SpotifyAttribution";
import AppleMusicLink from "@/components/ui/AppleMusicLink";
import YoutubeMusicLink from "@/components/ui/YoutubeMusicLink";
import { useToast } from "@/components/ui/Toast";
import { parseExtraArtistNames } from "@/lib/extraArtists";
import { koGenre, GENRE_COLOR } from "@/lib/bio";

const RATING_GUIDE_INTRO = "본인이 만든 창작물을 지인에게 들려준 경험이 있는가? '괜찮네' '좋네' 등의 반응으로는 그 작품의 완성도를 판단할 수 없다. 그러한 반응은 오히려 평작의 반응에 가까우며, 만든 사람의 기분을 생각해 예의를 차려준 표현에 가깝다. 각 티어의 이름은 그 앨범을 들었을 때 직관적으로 생기는 '리액션'에서 유래했다.";

const RATING_GUIDE = [
  { score: 1, name: "이건 좀", desc: ["모호한 기획의도와 방향성, 앨범의 완성도가 심하게 떨어짐", "청자에 대한 기만 수준의 무책임한 망작"] },
  { score: 2, name: "음", desc: ["독창성과 완성도가 부족하여 좋은 반응을 하기 어려운 앨범", "창작자를 직접 만난다면 표정관리가 다소 필요할 앨범"] },
  { score: 3, name: "괜찮네", desc: ["적은 부분 좋은 포인트를 발견할 수 있는 앨범", "창작자를 직접 만났을 때 예의를 차릴 수 있는 정도의 앨범"] },
  { score: 4, name: "좋네", desc: ['"GOOD" 앨범 / 긍정적 반응을 할 수 있는 앨범', "일정 수준의 완성도와 개성이 담긴 앨범"] },
  { score: 5, name: "오", desc: ["아티스트 팬들의 기다림을 해소", "장르적 문법에 충실하면서 새로움을 제공", "추천할 만한 좋은 완성도와 짜임새"] },
  { score: 6, name: "워", desc: ["완성도 이상의 아이디어, 사운드, 표현력"] },
  { score: 7, name: "ㅠㅠ", desc: ["분기 최고의 앨범들, 탁월한 완성도", '"오직 그 앨범만의" 고유한 아이디어 & 사운드 or 서사', "아티스트와 장르 모두에게 기념비적인 앨범"] },
  { score: 8, name: "이게 뭐야", desc: ["이 점수를 줄 자격이 있는지 되묻게 되는 앨범", "인생을 통틀어 손에 꼽을 만큼만 허용해야 한다"] },
] as const;

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
  const { users } = useUsers();
  const avatarMap = useUserAvatars();
  const { showToast, showToastWithUndo } = useToast();
  const [full, setFull] = useState<FullAlbum | null>(null);
  const [myScore, setMyScore] = useState<number | null>(null);
  const [myReview, setMyReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [closing, setClosing] = useState(false);
  const [showCardPreview, setShowCardPreview] = useState(false);
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
  const [showAllRatings, setShowAllRatings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [tracklistExpanded, setTracklistExpanded] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);
  const pendingDeleteRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deletedScoreRef = useRef<number | null>(null);
  const deletedReviewRef = useRef<string>("");
  const initialReviewRef = useRef<string>("");
  const isDirtyRef = useRef(false);
  const touchStartY = useRef(0);

  const handleDeleteAlbum = async () => {
    if (!profile) return;
    if (!confirm("이 앨범을 삭제할까요? 모든 평점도 함께 삭제됩니다.")) return;
    setDeletingAlbum(true);
    const res = await apiFetch(`/api/albums/${album.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
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

  const doClose = () => {
    setClosing(true);
    setTimeout(onClose, 160);
  };

  const handleClose = () => {
    if (isDirtyRef.current) { setShowCloseConfirm(true); return; }
    doClose();
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
    await apiFetch("/api/ratings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        albumId: album.id,
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
    const res = await apiFetch("/api/ratings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId: album.id, reviewerId }),
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
            const reviewVal = myRating.one_line_review ?? "";
            setMyReview(reviewVal);
            initialReviewRef.current = reviewVal;
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

  // 소감 dirty 추적
  useEffect(() => {
    isDirtyRef.current = myReview.trim() !== "" && myReview !== initialReviewRef.current;
  }, [myReview]);

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
    await apiFetch("/api/watchlist", {
      method: adding ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId: album.id }),
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
      if (e.key === "Escape") {
        if (isDirtyRef.current) { setShowCloseConfirm(true); } else { setClosing(true); setTimeout(onClose, 160); }
        return;
      }
      if (e.key === "Backspace") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = () => {
    if (!profile || myScore === null) return;
    // 현재 상태 저장
    deletedScoreRef.current = myScore;
    deletedReviewRef.current = myReview;
    // 낙관적 업데이트
    setMyScore(null);
    setMyReview("");
    initialReviewRef.current = "";
    setMyLikedTracks(new Set());
    // undo 토스트 (5초)
    showToastWithUndo("평점을 삭제했어요", () => {
      if (pendingDeleteRef.current) { clearTimeout(pendingDeleteRef.current); pendingDeleteRef.current = null; }
      setMyScore(deletedScoreRef.current);
      setMyReview(deletedReviewRef.current);
      initialReviewRef.current = deletedReviewRef.current;
    });
    // 5초 후 실제 삭제
    pendingDeleteRef.current = setTimeout(async () => {
      pendingDeleteRef.current = null;
      setDeleting(true);
      await apiFetch("/api/ratings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId: album.id }),
      });
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
    }, 5000);
  };

  const handleSave = async () => {
    if (!profile) return;
    if (myScore === null) {
      showToast("점수를 먼저 선택해주세요", "info");
      return;
    }
    setSaving(true);

    const res = await apiFetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        albumId: album.id,
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
      apiFetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId: album.id }),
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

  const VISIBLE_COUNT = 4;
  const sortedUsers = [...users].sort((a, b) => {
    if (profile) {
      if (a.id === profile.id) return -1;
      if (b.id === profile.id) return 1;
    }
    const ra = ratings.find((r) => r.user_id === a.id);
    const rb = ratings.find((r) => r.user_id === b.id);
    const aLikes = ra?.liked_by ? ra.liked_by.split(",").filter(Boolean).length : 0;
    const bLikes = rb?.liked_by ? rb.liked_by.split(",").filter(Boolean).length : 0;
    if (aLikes !== bLikes) return bLikes - aLikes;
    if (ra && !rb) return -1;
    if (!ra && rb) return 1;
    return 0;
  });
  const visibleUsers = showAllRatings ? sortedUsers : sortedUsers.slice(0, VISIBLE_COUNT);
  const hiddenCount = Math.max(0, sortedUsers.length - VISIBLE_COUNT);

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
        justifyContent: "center",
        animation: closing ? "backdropOut 0.16s ease-in forwards" : "backdropIn 0.18s ease-out",
      }}
      className="items-end sm:items-center p-0 sm:p-8"
      onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === e.currentTarget; }}
      onMouseUp={(e) => { if (mouseDownOnBackdrop.current && e.target === e.currentTarget) handleClose(); mouseDownOnBackdrop.current = false; }}
    >
      <div
        ref={cardRef}
        style={{
          position: "relative",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          width: "100%",
          maxWidth: 760,
          overflowY: "auto",
          textAlign: "left",
          animation: closing ? "modalOut 0.16s ease-in forwards" : "modalIn 0.18s ease-out",
        }}
        className="rounded-t-2xl sm:rounded-xl max-h-[85dvh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY; }}
        onTouchEnd={(e) => {
          const delta = e.changedTouches[0].clientY - touchStartY.current;
          if (delta > 80 && (cardRef.current?.scrollTop ?? 0) < 5) handleClose();
        }}
      >
        {/* 모바일 드래그 핸들 */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-0">
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "var(--border-light)" }} />
        </div>

        {/* 닫기 버튼 전용 행 — 오버랩 없음 */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "10px 14px 0", gap: 8 }}>
          {showCloseConfirm && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, animation: "fadeUp 0.15s ease-out" }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>소감이 저장되지 않아요</span>
              <button onClick={doClose} style={{ fontSize: 11, color: "var(--error)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>닫기</button>
              <button onClick={() => setShowCloseConfirm(false)} style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>취소</button>
            </div>
          )}
          {!showCloseConfirm && (
            <button
              onClick={handleClose}
              style={{
                color: "var(--text-muted)", fontSize: 18, lineHeight: 1,
                cursor: "pointer", background: "none", border: "none",
                padding: "4px 8px", transition: "color 0.15s",
              }}
              className="touch-target hover:text-[var(--text)]"
            >
              ✕
            </button>
          )}
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
          <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 20, padding: "8px 20px 24px" }}>
          {/* 커버 */}
          <div
            style={{
              flexShrink: 0,
              backgroundColor: "var(--bg-elevated)",
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid var(--border)",
              width: 96,
              height: 96,
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
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "var(--text)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, fontSize: 17 }}>
                  {data.title}
                </p>
                <p style={{ color: "var(--text-sub)", fontSize: 14, marginTop: 4 }}>
                  <span
                    className="hover:underline cursor-pointer"
                    onClick={() => setArtistModal({ name: data.artist, display: data.artist_display ?? data.artist })}
                  >
                    {data.artist_display ?? data.artist}
                  </span>
                  {data.extra_artists && (() => {
                    const names = parseExtraArtistNames(data.extra_artists);
                    if (!names.length) return null;
                    // use_artist_variant ON + alias 없이 개별 이름 표시 중이면 중복 숨김
                    const individualDisplay = names.join(", ");
                    if (data.use_artist_variant && data.artist_display === individualDisplay) return null;
                    return (
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {" · "}{names.map((name, i) => (
                          <span key={name}>
                            <span className="hover:underline cursor-pointer" onClick={() => setArtistModal({ name, display: name })}>{name}</span>
                            {i < names.length - 1 && ", "}
                          </span>
                        ))}
                      </span>
                    );
                  })()}
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
                  {data.soundcloud_url && (
                    <a
                      href={data.soundcloud_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none", color: "rgba(255,85,0,0.7)", fontSize: 11, fontWeight: 600 }}
                      className="hover:!text-[#f50] transition-colors"
                    >
                      SoundCloud
                    </a>
                  )}
                  <AppleMusicLink artist={data.artist} title={data.title} />
                  <YoutubeMusicLink artist={data.artist} title={data.title} />
                </div>
              </div>

              {/* 액션 버튼: 데스크탑 오른쪽, 모바일 아래 */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
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
                    disabled={!full}
                    style={{
                      background: "none", cursor: full ? "pointer" : "not-allowed",
                      color: full ? "var(--text)" : "var(--text-muted)", fontSize: 12, lineHeight: 1,
                      padding: "2px 6px", borderRadius: 4,
                      border: "1px solid var(--border)",
                      opacity: full ? 1 : 0.4,
                    }}
                  >
                    {full ? "수정" : "로딩 중…"}
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
                {profile && myScore !== null && (
                  <button
                    onClick={() => setShowCardPreview(true)}
                    title="평가카드 만들기"
                    style={{
                      background: "none", border: "none",
                      cursor: "pointer", color: "var(--text)",
                      fontSize: 15, lineHeight: 1, padding: "2px 4px",
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><line x1="8.5" y1="2" x2="8.5" y2="4"/>
                    </svg>
                  </button>
                )}
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
                {data.genre && (() => {
                  const gDisplay = koGenre(data.genre);
                  const gColor = GENRE_COLOR[gDisplay] ?? "#94a3b8";
                  return (
                    <span style={{
                      backgroundColor: `${gColor}1a`,
                      color: gColor,
                      fontSize: 11,
                      padding: "3px 8px",
                      borderRadius: 4,
                      border: `1px solid ${gColor}40`,
                      fontWeight: 500,
                    }}>
                      {gDisplay}
                    </span>
                  );
                })()}
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
            {visibleUsers.map((user) => {
              const r = ratings.find((rt) => rt.user_id === user.id);
              const review = r?.one_line_review ?? "";
              const LIMIT = 36;
              const isLong = review.length > LIMIT;
              const isExpanded = expandedReviews.has(user.id);
              const iLikedReview = myLikedReviews.has(user.id);
              const likedByUsers = users.filter((u) => r?.liked_by?.split(",").includes(u.id));
              const canLikeReview = !!profile && !!ratings.find((rt) => rt.user_id === profile.id) && user.id !== profile.id && !!review;
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
                            "p-2 -m-2 transition-colors",
                            iLikedReview ? "heart-pop" : "active:scale-90",
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

          {!showAllRatings && hiddenCount > 0 && (
            <button
              onClick={() => setShowAllRatings(true)}
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

        <div style={{ height: 1, backgroundColor: "var(--border)", margin: "28px 0" }} />

        {/* 내 평점 입력 */}
        <div style={{ paddingLeft: 32, paddingRight: 32 }}>
          {profile ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: showGuide ? 10 : 12 }}>
                <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>
                  <UserAvatar avatarUrl={profile.avatar_url} size={14} /> 나의 청음 점수
                </p>
                <button
                  onClick={() => setShowGuide(v => !v)}
                  style={{
                    background: showGuide ? "var(--bg-elevated)" : "none",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    padding: "1px 6px",
                    cursor: "pointer",
                    color: showGuide ? "var(--text-sub)" : "var(--text-muted)",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    lineHeight: 1.6,
                    transition: "background 0.12s, color 0.12s",
                  }}
                >
                  기준 참고
                </button>
              </div>

              {showGuide && (
                <div style={{
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  marginBottom: 12,
                }}>
                  <p style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
                    color: "var(--text-muted)",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    display: "inline-block",
                    padding: "2px 7px",
                    marginBottom: 10,
                  }}>
                    참고용 — 이 기준은 강제되지 않습니다
                  </p>
                  <p style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 14, fontStyle: "italic" }}>
                    {RATING_GUIDE_INTRO}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {RATING_GUIDE.map(({ score, name, desc }) => {
                      const color = SCORE_COLORS[score];
                      return (
                        <div key={score} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{
                            flexShrink: 0,
                            width: 24, height: 24, borderRadius: 6,
                            backgroundColor: `${color}20`,
                            border: `1px solid ${color}50`,
                            color, fontSize: 11, fontWeight: 800,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {score}
                          </span>
                          <div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", display: "block", marginBottom: 2 }}>
                              {name}
                            </span>
                            {desc.map((line, i) => (
                              <span key={i} style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6, display: "block" }}>
                                {line}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
              {myScore === 8 && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", marginBottom: 8, animation: "fadeUp 0.18s ease-out" }}>
                  8점은 인생을 통틀어 손에 꼽을 앨범에만 허용하는 점수예요
                </p>
              )}
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
                {(tracklistExpanded ? tracklist : tracklist.slice(0, 9)).map((track, i) => {
                  const othersWhoLiked = users.filter((u) => {
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
                              "p-2 -m-2 transition-colors",
                              iLiked ? "heart-pop" : "active:scale-90",
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
                  className="hover:!border-[var(--text-sub)] hover:!text-[var(--text-sub)]"
                >
                  {tracklistExpanded ? "접기" : `+ ${tracklist.length - 9}곡 더보기`}
                </button>
              )}
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

      {showCardPreview && myScore !== null && (
        <StoryCardPreviewModal
          title={data.title}
          artist={data.artist_display ?? data.artist}
          coverUrl={data.cover_url}
          score={myScore}
          review={myReview || null}
          genre={data.genre ?? null}
          userName={profile?.display_name ?? profile?.id}
          spotifyId={data.spotify_id}
          likedTracks={[...myLikedTracks].sort((a, b) => a - b).map((i) => ({ index: i + 1, name: tracklist[i] })).filter((t) => t.name)}
          onClose={() => setShowCardPreview(false)}
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
