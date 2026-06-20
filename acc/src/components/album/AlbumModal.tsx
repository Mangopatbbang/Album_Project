"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlbumWithRatings } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useUsers } from "@/context/UsersContext";
import { useUserAvatars } from "@/context/UserAvatarsContext";
import UserAvatar from "@/components/ui/UserAvatar";
import Link from "next/link";
import { scoreColor, SCORE_COLORS } from "@/lib/score";
import { apiFetch } from "@/lib/apiFetch";
import { trackAlbumVisit, trackFeatureClick } from "@/lib/track";
import StoryCardPreviewModal from "@/components/album/StoryCardPreviewModal";
import DiaryEntryModal from "@/components/diary/DiaryEntryModal";
import AlbumEditModal from "@/components/album/AlbumEditModal";
import ArtistModal from "@/components/album/ArtistModal";
import SpotifyAttribution from "@/components/ui/SpotifyAttribution";
import AppleMusicLink from "@/components/ui/AppleMusicLink";
import { openTutorial, RULES_PAGE_INDEX } from "@/components/ui/TutorialModal";
import YoutubeMusicLink from "@/components/ui/YoutubeMusicLink";
import { useToast } from "@/components/ui/Toast";
import { parseExtraArtistNames } from "@/lib/extraArtists";
import { GENRE_COLOR } from "@/lib/bio";

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
  track_durations?: string | null;
  release_date?: string | null;
  region?: string | null;
  added_by?: string | null;
  ratings: RatingWithLikes[];
};

type Props = {
  album: AlbumWithRatings;
  onClose: () => void;
  onSaved?: (albumId: string, updatedAlbum?: AlbumWithRatings) => void;
  zIndex?: number;
  source?: string;
  isEncounter?: boolean;
};

export default function AlbumModal({ album, onClose, onSaved, zIndex = 100, source, isEncounter }: Props) {
  const { profile } = useAuth();
  const { users } = useUsers();
  const avatarMap = useUserAvatars();
  const { showToast, showToastWithUndo, showToastWithAction } = useToast();
  const router = useRouter();
  const [full, setFull] = useState<FullAlbum | null>(null);
  const [myScore, setMyScore] = useState<number | null>(null);
  const [glowingScore, setGlowingScore] = useState<number | null>(null);
  const [pressedScore, setPressedScore] = useState<number | null>(null);
  const [pressedEvictScore, setPressedEvictScore] = useState<number | null>(null);

  const handleSetMyScore = (n: number) => {
    setMyScore(n);
    setGlowingScore(n);
    setTimeout(() => setGlowingScore(null), 400);
    isDirtyRef.current = n !== initialScoreRef.current || myReview !== initialReviewRef.current;
  };
  const [myReview, setMyReview] = useState("");
  const [myPrivateNote, setMyPrivateNote] = useState("");
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
  const [shakingTrackIdx, setShakingTrackIdx] = useState<number | null>(null);
  const [shakingReviewId, setShakingReviewId] = useState<string | null>(null);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [deletingAlbum, setDeletingAlbum] = useState(false);
  const [artistModal, setArtistModal] = useState<{ name: string; display: string } | null>(null);
  const [nestedAlbum, setNestedAlbum] = useState<AlbumWithRatings | null>(null);
  const [myHistory, setMyHistory] = useState<{ score: number; createdAt: string }[]>([]);
  const [ratingsSheetOpen, setRatingsSheetOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [tracklistExpanded, setTracklistExpanded] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDeleteAlbumConfirm, setShowDeleteAlbumConfirm] = useState(false);
  const [hofLimitAlbums, setHofLimitAlbums] = useState<{ id: string; title: string; artist: string; cover_url: string | null; updatedAt: string }[] | null>(null);
  const [evictAlbumId, setEvictAlbumId] = useState<string | null>(null);
  const [evictScore, setEvictScore] = useState<number | null>(null);
  const [evicting, setEvicting] = useState(false);
  const [coverLoaded, setCoverLoaded] = useState<"loaded" | "error" | false>(false);
  const [diaryOpen, setDiaryOpen] = useState(false);
  const coverImgRef = useRef<HTMLImageElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);
  const pendingDeleteRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deletedScoreRef = useRef<number | null>(null);
  const deletedReviewRef = useRef<string>("");
  const initialReviewRef = useRef<string>("");
  const initialScoreRef = useRef<number | null>(null);
  const isDirtyRef = useRef(false);
  const touchStartY = useRef(0);
  const isDraggingRef = useRef(false);
  const isMountedRef = useRef(true);

  const handleDeleteAlbum = () => {
    cardRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setShowDeleteAlbumConfirm(true);
  };

  const doDeleteAlbum = async () => {
    if (!profile) return;
    setShowDeleteAlbumConfirm(false);
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
    doClose();
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
    if (!profile) {
      setShakingTrackIdx(idx);
      showToastWithAction("로그인 후 이용할 수 있어요", "입문하기 →", () => router.push("/login"));
      setTimeout(() => setShakingTrackIdx(null), 420);
      return;
    }
    if (savingLike) return;
    const hasRating = ratings.find((r) => r.user_id === profile.id);
    if (!hasRating && myScore === null) return;
    const prev = new Set(myLikedTracks);
    const next = new Set(myLikedTracks);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setMyLikedTracks(next);
    setSavingLike(true);
    const res = await apiFetch("/api/ratings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        albumId: album.id,
        liked_tracks: next.size > 0 ? [...next].sort((a, b) => a - b).join(",") : null,
      }),
    });
    if (!res.ok) setMyLikedTracks(prev);
    setSavingLike(false);
  };

  const handleToggleLikeReview = async (reviewerId: string) => {
    if (!profile) {
      setShakingReviewId(reviewerId);
      showToastWithAction("로그인 후 이용할 수 있어요", "입문하기 →", () => router.push("/login"));
      setTimeout(() => setShakingReviewId(null), 420);
      return;
    }
    if (savingLike) return;
    const prev = new Set(myLikedReviews);
    const next = new Set(myLikedReviews);
    if (next.has(reviewerId)) next.delete(reviewerId); else next.add(reviewerId);
    setMyLikedReviews(next);
    const reviewLiked = next.has(reviewerId);
    showToast(reviewLiked ? "소감을 좋아요했어요 ♥" : "소감 좋아요를 취소했어요", "info");
    setSavingLike(true);
    const res = await apiFetch("/api/ratings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId: album.id, reviewerId }),
    });
    if (res.ok) {
      const data = await res.json();
      setFull((p) => p ? {
        ...p,
        ratings: p.ratings.map((r) =>
          r.user_id === reviewerId ? { ...r, liked_by: data.liked_by } : r
        ),
      } : p);
    } else {
      setMyLikedReviews(prev);
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

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // 캐시된 이미지는 onLoad가 React 핸들러 부착 전에 이미 발화 — 페인트 전 동기 확인으로 opacity-0 프레임 제거
  useLayoutEffect(() => {
    if (coverImgRef.current?.complete && coverImgRef.current.naturalWidth > 0) {
      setCoverLoaded("loaded");
    }
  }, []);

  // 즉시 초기값 세팅 — fetch 완료 전 점수 버튼 깜빡임 방지
  useEffect(() => {
    if (!profile) return;
    const existing = (album.ratings ?? []).find((r) => r.user_id === profile.id);
    if (existing) { setMyScore(existing.score); initialScoreRef.current = existing.score; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 상세 데이터 fetch
  useEffect(() => {
    const controller = new AbortController();
    if (source) trackAlbumVisit(album.id, source);
    fetch(`/api/albums/${album.id}`, { signal: controller.signal })
      .then((r) => { if (!r.ok) return null; return r.json(); })
      .then((data) => {
        if (!data || !Array.isArray(data.ratings)) return;
        setFull(data);
        if (profile) {
          const myRating = data.ratings?.find(
            (r: { user_id: string }) => r.user_id === profile.id
          );
          if (myRating) {
            setMyScore(myRating.score);
            initialScoreRef.current = myRating.score;
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
    return () => controller.abort();
  }, [album.id, profile]);

  // private_note · 평점이력 · 찜 여부 병렬 fetch
  useEffect(() => {
    if (!profile) return;
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([
      apiFetch(`/api/ratings?albumId=${album.id}&userId=${profile.id}`, { signal }),
      fetch(`/api/rating-history?userId=${profile.id}&albumId=${album.id}`, { signal }),
      fetch(`/api/watchlist/check?userId=${profile.id}&albumId=${album.id}`, { signal }),
    ])
      .then(([noteRes, histRes, watchRes]) =>
        Promise.all([
          noteRes.ok ? noteRes.json() : Promise.resolve(null),
          histRes.ok ? histRes.json() : Promise.resolve([] as { score: number; createdAt: string }[]),
          watchRes.json(),
        ])
      )
      .then(([noteData, histData, watchData]) => {
        const note = noteData as { ratings?: { private_note?: string | null }[] } | null;
        const hist = histData as { score: number; createdAt: string }[];
        const watch = watchData as { isWatchlisted?: boolean };
        if (note?.ratings?.length) setMyPrivateNote(note.ratings[0].private_note ?? "");
        if (Array.isArray(hist)) setMyHistory(hist);
        setIsWatchlisted(watch?.isWatchlisted ?? false);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [album.id, profile]);

  const handleToggleWatchlist = async () => {
    if (!profile) return;
    const adding = !isWatchlisted;
    setIsWatchlisted(adding);
    trackFeatureClick(adding ? "위시리스트_추가" : "위시리스트_제거");
    if (adding) {
      const hintKey = "acs_hint_bookmark_v1";
      if (typeof window !== "undefined" && !localStorage.getItem(hintKey)) {
        localStorage.setItem(hintKey, "1");
        showToast("나중에 들을 목록에 추가했어요 · 프로필 → 찜에서 확인해요", "info");
      } else {
        showToast("나중에 들을 목록에 추가했어요", "info");
      }
    } else {
      window.dispatchEvent(new CustomEvent("watchlist-removed", { detail: { albumId: album.id } }));
      showToast("목록에서 제거했어요", "info");
    }
    const res = await apiFetch("/api/watchlist", {
      method: adding ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId: album.id }),
    });
    if (!res.ok) setIsWatchlisted(!adding);
  };

  // 배경 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
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
    const originalFull = full;
    // 낙관적 full 계산
    let optimisticFull: FullAlbum | undefined;
    if (originalFull) {
      const newRatings = originalFull.ratings.filter((r) => r.user_id !== profile.id);
      const scores = newRatings.map((r) => r.score);
      const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : undefined;
      optimisticFull = { ...originalFull, ratings: newRatings, avg };
    }
    // 낙관적 업데이트
    setMyScore(null);
    setMyReview("");
    initialReviewRef.current = "";
    setMyLikedTracks(new Set());
    isDirtyRef.current = false;
    if (optimisticFull) setFull(optimisticFull);
    trackFeatureClick("평점_삭제");
    onSaved?.(album.id, optimisticFull as unknown as AlbumWithRatings | undefined);
    // undo 토스트 (5초)
    showToastWithUndo("이 인연을 지웠어요", () => {
      if (pendingDeleteRef.current) { clearTimeout(pendingDeleteRef.current); pendingDeleteRef.current = null; }
      setMyScore(deletedScoreRef.current);
      setMyReview(deletedReviewRef.current);
      initialReviewRef.current = deletedReviewRef.current;
      isDirtyRef.current = false;
      if (originalFull) setFull(originalFull);
      onSaved?.(album.id, originalFull as unknown as AlbumWithRatings | undefined);
    });
    // 5초 후 실제 삭제 — 모달이 닫혀도 API 호출은 반드시 실행
    pendingDeleteRef.current = setTimeout(async () => {
      pendingDeleteRef.current = null;
      await apiFetch("/api/ratings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId: album.id }),
      });
    }, 5000);
  };

  const afterSaveSuccess = async (freshData?: AlbumWithRatings) => {
    if (!isMountedRef.current) return;
    if (isWatchlisted) {
      apiFetch("/api/watchlist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ albumId: album.id }) });
      setIsWatchlisted(false);
      window.dispatchEvent(new CustomEvent("watchlist-removed", { detail: { albumId: album.id } }));
    }
    initialReviewRef.current = myReview;
    initialScoreRef.current = myScore;
    isDirtyRef.current = false;
    setSaved(true);
    onSaved?.(album.id, freshData);
    setTimeout(() => setSaved(false), 2000);
    if (profile) {
      fetch(`/api/rating-history?userId=${profile.id}&albumId=${album.id}`)
        .then((r) => r.ok ? r.json() : [])
        .then((d: { score: number; createdAt: string }[]) => setMyHistory(d))
        .catch(() => {});
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    if (myScore === null) { showToast("점수를 먼저 선택해주세요", "info"); return; }
    setSaving(true);

    const res = await apiFetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        albumId: album.id,
        score: myScore,
        one_line_review: myReview || null,
        private_note: myPrivateNote || null,
        ...(isEncounter ? { is_encounter: true } : {}),
        ...(source ? { discovery_source: source } : {}),
      }),
    });

    setSaving(false);

    if (res.status === 409) {
      const data = await res.json();
      if (data.code === "HOF_LIMIT_REACHED") {
        setHofLimitAlbums(data.albums);
        return;
      }
    }
    if (!res.ok) return;

    // 낙관적 업데이트: 서버 refetch 전에 바로 멤버 평점 목록에 반영
    const savedScore = myScore;
    const savedReview = myReview;
    const savedLikedTracks = myLikedTracks;
    const savedProfileId = profile.id;
    let optimisticFull: FullAlbum | undefined;
    setFull((prev) => {
      if (!prev) return prev;
      const existingLikedBy = prev.ratings.find((r) => r.user_id === savedProfileId)?.liked_by ?? null;
      const newRating: RatingWithLikes = {
        user_id: savedProfileId,
        score: savedScore,
        one_line_review: savedReview || null,
        liked_tracks: savedLikedTracks.size > 0 ? [...savedLikedTracks].sort((a, b) => a - b).join(",") : null,
        liked_by: existingLikedBy,
      };
      const alreadyRated = prev.ratings.some((r) => r.user_id === savedProfileId);
      const newRatings = alreadyRated
        ? prev.ratings.map((r) => (r.user_id === savedProfileId ? newRating : r))
        : [...prev.ratings, newRating];
      const scores = newRatings.map((r) => r.score);
      const avg = scores.length > 0
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
        : undefined;
      optimisticFull = { ...prev, ratings: newRatings, avg };
      return optimisticFull;
    });

    trackFeatureClick("평점_저장", String(myScore));
    const wasFirstRating = initialScoreRef.current === null;
    if (wasFirstRating && typeof window !== "undefined" && !localStorage.getItem("acs_hint_first_rating_v1")) {
      localStorage.setItem("acs_hint_first_rating_v1", "1");
      showToast("첫 청음 기록이에요! 평가가 쌓이면 취향 분석이 시작돼요");
    } else {
      showToastWithAction("청음을 기록했어요", "반응 보기 →", () => {
        doClose();
        router.push(`/reviews?albumId=${album.id}`);
      });
    }
    await afterSaveSuccess(optimisticFull as unknown as AlbumWithRatings | undefined);
  };

  const handleEvict = async () => {
    if (!profile || !evictAlbumId || evictScore === null) return;
    setEvicting(true);

    // 1. 밀어낼 앨범 점수 변경
    const evictRes = await apiFetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId: evictAlbumId, score: evictScore }),
    });

    if (!evictRes.ok) {
      setEvicting(false);
      showToast("점수 변경에 실패했어요. 다시 시도해주세요.", "info");
      return;
    }

    // 2. 현재 앨범 8점 저장
    const saveRes = await apiFetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId: album.id, score: myScore, one_line_review: myReview || null, private_note: myPrivateNote || null, ...(isEncounter ? { is_encounter: true } : {}), ...(source ? { discovery_source: source } : {}) }),
    });

    setEvicting(false);
    if (!saveRes.ok) {
      showToast("저장에 실패했어요. 다시 시도해주세요.", "info");
      return;
    }

    setHofLimitAlbums(null);
    setEvictAlbumId(null);
    setEvictScore(null);
    trackFeatureClick("평점_명반저장", "8");
    showToast("명반전에 추가됐어요");
    await afterSaveSuccess();
  };

  const data = full ?? album;
  const ratings = (data as FullAlbum).ratings ?? album.ratings ?? [];

  const VISIBLE_COUNT = 4;
  const sortedUsers = useMemo(() => [...users].sort((a, b) => {
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
  }), [users, ratings, profile]);
  const visibleUsers = sortedUsers.slice(0, VISIBLE_COUNT);
  const hiddenCount = Math.max(0, sortedUsers.length - VISIBLE_COUNT);

  const tracklist = full?.tracklist
    ? full.tracklist.split(";").map((t) => t.trim()).filter(Boolean)
    : [];

  const trackDurationsMs: number[] = full?.track_durations
    ? full.track_durations.split(";").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
    : [];
  const hasDurations = trackDurationsMs.length > 0 && trackDurationsMs.length === tracklist.length;

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

  const ratingScores = useMemo(() => ratings.map((r) => r.score).filter(Boolean), [ratings]);
  const controversyIndex = useMemo(() => {
    if (ratingScores.length < 3) return null;
    const mean = ratingScores.reduce((a, b) => a + b, 0) / ratingScores.length;
    const variance = ratingScores.reduce((a, b) => a + (b - mean) ** 2, 0) / ratingScores.length;
    return Math.sqrt(variance);
  }, [ratingScores]);

  const { trackPopularity, top3TrackIndices } = useMemo(() => {
    const popularity = new Map<number, number>();
    for (const r of ratings) {
      if (r.liked_tracks) {
        r.liked_tracks.split(",").map(Number).forEach((idx) => {
          popularity.set(idx, (popularity.get(idx) ?? 0) + 1);
        });
      }
    }
    const top3 = new Set(
      [...popularity.entries()]
        .filter(([, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([idx]) => idx)
    );
    return { trackPopularity: popularity, top3TrackIndices: top3 };
  }, [ratings]);

  return (
    <>
    <style>{`@keyframes savedPop { 0%{transform:scale(1)} 45%{transform:scale(1.07)} 100%{transform:scale(1)} }`}</style>
    <div
      ref={backdropRef}
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
          overscrollBehavior: "contain",
          textAlign: "left",
          animation: closing ? "modalOut 0.16s ease-in forwards" : "modalIn 0.18s ease-out",
        }}
        className="rounded-t-2xl sm:rounded-xl max-h-[85dvh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          if ((cardRef.current?.scrollTop ?? 0) > 5) return;
          touchStartY.current = e.touches[0].clientY;
          isDraggingRef.current = false;
        }}
        onTouchMove={(e) => {
          const card = cardRef.current;
          if (!card || (card.scrollTop ?? 0) > 5) return;
          const delta = e.touches[0].clientY - touchStartY.current;
          if (delta <= 0) return;
          isDraggingRef.current = true;
          card.style.animation = "none";
          card.style.transform = `translateY(${delta}px)`;
          card.style.transition = "none";
          // backdrop 투명도 드래그 깊이에 따라 연동 (최대 80px 기준)
          if (backdropRef.current) {
            const opacity = Math.max(0.1, 0.75 * (1 - delta / 240));
            backdropRef.current.style.backgroundColor = `rgba(0,0,0,${opacity})`;
          }
        }}
        onTouchEnd={(e) => {
          const card = cardRef.current;
          if (!card) return;
          const delta = e.changedTouches[0].clientY - touchStartY.current;
          if (isDraggingRef.current && delta > 80) {
            if (isDirtyRef.current) {
              // 미저장 내용 있으면 spring-back 후 확인창
              card.style.transition = "transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)";
              card.style.transform = "translateY(0)";
              if (backdropRef.current) {
                backdropRef.current.style.transition = "background-color 0.32s ease";
                backdropRef.current.style.backgroundColor = "rgba(0,0,0,0.75)";
              }
              setShowCloseConfirm(true);
            } else {
              // 드래그 현재 위치에서 이어서 내려가며 닫기
              card.style.transition = "transform 0.22s cubic-bezier(0.4, 0, 1, 1)";
              card.style.transform = "translateY(100%)";
              if (backdropRef.current) {
                backdropRef.current.style.transition = "background-color 0.22s ease";
                backdropRef.current.style.backgroundColor = "rgba(0,0,0,0)";
              }
              setTimeout(onClose, 220);
            }
          } else if (isDraggingRef.current) {
            // 80px 미만이면 spring-back
            card.style.transition = "transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)";
            card.style.transform = "translateY(0)";
            if (backdropRef.current) {
              backdropRef.current.style.transition = "background-color 0.32s ease";
              backdropRef.current.style.backgroundColor = "rgba(0,0,0,0.75)";
            }
          }
          isDraggingRef.current = false;
        }}
      >
        {/* 모바일 드래그 핸들 */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-0">
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "var(--border-light)" }} />
        </div>

        {/* 닫기 버튼 전용 행 — 오버랩 없음 */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "10px 14px 0", gap: 8 }}>
          {showDeleteAlbumConfirm && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, animation: "fadeUp 0.15s ease-out" }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>앨범과 모든 평점이 삭제돼요</span>
              <button onClick={doDeleteAlbum} style={{ fontSize: 11, color: "var(--error)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>삭제</button>
              <button onClick={() => setShowDeleteAlbumConfirm(false)} style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>취소</button>
            </div>
          )}
          {showCloseConfirm && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, animation: "fadeUp 0.15s ease-out" }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>소감이 저장되지 않아요</span>
              <button onClick={doClose} style={{ fontSize: 11, color: "var(--error)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>닫기</button>
              <button onClick={() => setShowCloseConfirm(false)} style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>취소</button>
            </div>
          )}
          {!showCloseConfirm && !showDeleteAlbumConfirm && (
            <>
              {/* 데스크탑 전용 액션 버튼 */}
              {profile && (
                <div className="hidden sm:flex items-center gap-1.5">
                  <button
                    onClick={() => setDiaryOpen(true)}
                    style={{
                      background: "none", cursor: "pointer",
                      color: "var(--text-muted)", fontSize: 12, lineHeight: 1,
                      padding: "4px 10px", borderRadius: 5,
                      border: "1px solid var(--border)",
                      transition: "all 0.15s", whiteSpace: "nowrap",
                    }}
                    className="hover:!border-[var(--accent)] hover:!text-[var(--accent)]"
                  >
                    ✎ 청음 기록
                  </button>
                  {(isWatchlisted || !ratings.find((r) => r.user_id === profile.id)) && (
                    <button
                      onClick={handleToggleWatchlist}
                      style={{
                        background: isWatchlisted ? "rgba(var(--accent-rgb), 0.08)" : "none",
                        cursor: "pointer",
                        color: isWatchlisted ? "var(--accent)" : "var(--text-muted)",
                        fontSize: 12, lineHeight: 1,
                        padding: "4px 10px", borderRadius: 5,
                        border: `1px solid ${isWatchlisted ? "var(--accent)" : "var(--border)"}`,
                        transition: "all 0.15s", whiteSpace: "nowrap",
                      }}
                    >
                      {isWatchlisted ? "나중에 ✓" : "+ 나중에"}
                    </button>
                  )}
                  {myScore !== null && (
                    <button
                      onClick={() => setShowCardPreview(true)}
                      title="카드 생성"
                      style={{
                        background: "none", cursor: "pointer",
                        color: "var(--text-muted)", lineHeight: 1,
                        padding: "4px 7px", borderRadius: 5,
                        border: "1px solid var(--border)",
                        transition: "all 0.15s", display: "flex", alignItems: "center",
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><line x1="8.5" y1="2" x2="8.5" y2="4"/>
                      </svg>
                    </button>
                  )}
                  {profile.role === "admin" && (
                    <button
                      onClick={() => setEditing(true)}
                      disabled={!full}
                      style={{
                        background: "none", cursor: full ? "pointer" : "not-allowed",
                        color: full ? "var(--text-muted)" : "var(--text-muted)", fontSize: 12, lineHeight: 1,
                        padding: "4px 10px", borderRadius: 5,
                        border: "1px solid var(--border)",
                        opacity: full ? 1 : 0.4, transition: "all 0.15s",
                      }}
                    >
                      {full ? "수정" : "…"}
                    </button>
                  )}
                  {(profile.role === "admin" || (full as FullAlbum)?.added_by === profile.id) && (
                    <button
                      onClick={handleDeleteAlbum}
                      disabled={deletingAlbum}
                      style={{
                        background: "none", cursor: deletingAlbum ? "default" : "pointer",
                        color: "var(--error)", fontSize: 12, lineHeight: 1,
                        padding: "4px 10px", borderRadius: 5,
                        border: "1px solid rgba(var(--error-rgb), 0.4)",
                        opacity: deletingAlbum ? 0.5 : 1, transition: "all 0.15s",
                      }}
                    >
                      {deletingAlbum ? "…" : "삭제"}
                    </button>
                  )}
                </div>
              )}
              {full && profile && profile.role !== "admin" && (full as FullAlbum)?.added_by !== profile.id && (
                <Link
                  href="/board"
                  onClick={doClose}
                  style={{
                    fontSize: 10, color: "var(--text-muted)", textDecoration: "none",
                    opacity: 0.6, whiteSpace: "nowrap", paddingRight: 2,
                  }}
                  className="hover:opacity-100 transition-opacity"
                >
                  정보 오류?
                </Link>
              )}
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
            </>
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
            className={data.cover_url && coverLoaded !== "loaded" && coverLoaded !== "error" ? "skeleton-shimmer" : ""}
          >
            {data.cover_url && coverLoaded !== "error" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={coverImgRef}
                src={data.cover_url}
                alt={data.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: coverLoaded === "loaded" ? 1 : 0, transition: "opacity 0.3s ease" }}
                onLoad={() => setCoverLoaded("loaded")}
                onError={() => setCoverLoaded("error")}
              />
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
                    const displayNames: string[] = (data as { extra_artists_display?: string[] }).extra_artists_display ?? names;
                    // use_artist_variant ON + alias 없이 개별 이름 표시 중이면 중복 숨김
                    const individualDisplay = displayNames.join(", ");
                    if (data.use_artist_variant && data.artist_display === individualDisplay) return null;
                    return (
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {" · "}{names.map((name, i) => (
                          <span key={name}>
                            <span className="hover:underline cursor-pointer" onClick={() => setArtistModal({ name, display: displayNames[i] ?? name })}>{displayNames[i] ?? name}</span>
                            {i < names.length - 1 && ", "}
                          </span>
                        ))}
                      </span>
                    );
                  })()}
                  {(full as FullAlbum)?.release_date && (
                    <span style={{ color: "var(--text-muted)", animation: "fadeIn 0.2s ease-out" }}>
                      {" · "}
                      {formatReleaseDate((full as FullAlbum).release_date!)}
                    </span>
                  )}
                </p>
                <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", rowGap: 4 }}>
                  <SpotifyAttribution spotifyId={data.spotify_id} size="md" />
                  {data.soundcloud_url && (
                    <a
                      href={data.soundcloud_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackFeatureClick("사운드클라우드_클릭")}
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
                    animation: "fadeIn 0.2s ease-out",
                  }}>
                    {(full as FullAlbum).region}
                  </span>
                )}
                {data.genre && (() => {
                  const gDisplay = data.genre;
                  const gColor = GENRE_COLOR[gDisplay] ?? "#94a3b8";
                  return (
                    <button
                      onClick={() => { doClose(); router.push(`/albums?genre=${encodeURIComponent(gDisplay)}`); }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${gColor}33`; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${gColor}1a`; }}
                      style={{
                        backgroundColor: `${gColor}1a`,
                        color: gColor,
                        fontSize: 11,
                        padding: "3px 8px",
                        borderRadius: 4,
                        border: `1px solid ${gColor}40`,
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "background-color 0.12s",
                      }}
                      title={`${gDisplay} 장르 앨범 보기`}
                    >
                      {gDisplay}
                    </button>
                  );
                })()}
              </div>
            )}

            {/* 액션 버튼 행 — 모바일 전용 */}
            {profile && (
              <div className="flex sm:hidden items-center gap-1.5 flex-wrap" style={{ marginTop: 10 }}>
                <button
                  onClick={() => setDiaryOpen(true)}
                  style={{
                    background: "none", cursor: "pointer",
                    color: "var(--text-sub)", fontSize: 13, lineHeight: 1,
                    padding: "6px 12px", borderRadius: 6,
                    border: "1px solid var(--border)",
                    transition: "all 0.15s", whiteSpace: "nowrap", fontWeight: 500,
                  }}
                >
                  ✎ 청음 기록
                </button>
                {(isWatchlisted || !ratings.find((r) => r.user_id === profile.id)) && (
                  <button
                    onClick={handleToggleWatchlist}
                    style={{
                      background: isWatchlisted ? "rgba(var(--accent-rgb), 0.08)" : "none",
                      cursor: "pointer",
                      color: isWatchlisted ? "var(--accent)" : "var(--text-sub)",
                      fontSize: 13, lineHeight: 1,
                      padding: "6px 12px", borderRadius: 6,
                      border: `1px solid ${isWatchlisted ? "var(--accent)" : "var(--border)"}`,
                      transition: "all 0.15s", whiteSpace: "nowrap", fontWeight: 500,
                    }}
                  >
                    {isWatchlisted ? "나중에 ✓" : "+ 나중에"}
                  </button>
                )}
                {myScore !== null && (
                  <button
                    onClick={() => setShowCardPreview(true)}
                    title="카드 생성"
                    style={{
                      display: "flex", alignItems: "center",
                      background: "none", cursor: "pointer",
                      color: "var(--text-sub)", lineHeight: 1,
                      padding: "6px 10px", borderRadius: 6,
                      border: "1px solid var(--border)",
                      transition: "all 0.15s",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><line x1="8.5" y1="2" x2="8.5" y2="4"/>
                    </svg>
                  </button>
                )}
                {profile.role === "admin" && (
                  <button
                    onClick={() => setEditing(true)}
                    disabled={!full}
                    style={{
                      background: "none", cursor: full ? "pointer" : "not-allowed",
                      color: full ? "var(--text-sub)" : "var(--text-muted)", fontSize: 13, lineHeight: 1,
                      padding: "6px 12px", borderRadius: 6,
                      border: "1px solid var(--border)",
                      opacity: full ? 1 : 0.4, fontWeight: 500, transition: "all 0.15s",
                    }}
                  >
                    {full ? "수정" : "로딩 중…"}
                  </button>
                )}
                {(profile.role === "admin" || (full as FullAlbum)?.added_by === profile.id) && (
                  <button
                    onClick={handleDeleteAlbum}
                    disabled={deletingAlbum}
                    style={{
                      background: "none", cursor: deletingAlbum ? "default" : "pointer",
                      color: "var(--error)", fontSize: 13, lineHeight: 1,
                      padding: "6px 12px", borderRadius: 6,
                      border: "1px solid rgba(var(--error-rgb), 0.4)",
                      opacity: deletingAlbum ? 0.5 : 1, fontWeight: 500, transition: "all 0.15s",
                    }}
                  >
                    {deletingAlbum ? "삭제 중…" : "삭제"}
                  </button>
                )}
              </div>
            )}

            {/* 평균 점수 */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <p style={{ fontWeight: 700, fontSize: 22, color: data.avg ? scoreColor(data.avg) : "var(--text-muted)" }}>
                {data.avg ?? "–"}
                <span style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 400, marginLeft: 4 }}>/ 8</span>
              </p>
              {controversyIndex !== null && (
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
                  color: controversyIndex >= 2 ? "#e05050" : controversyIndex >= 1.2 ? "#e0a030" : "var(--text-muted)",
                  opacity: 0.85,
                }}>
                  {controversyIndex >= 2 ? "논란" : controversyIndex >= 1.2 ? "의견 분분" : "합의"}
                  <span style={{ fontWeight: 400, opacity: 0.6, marginLeft: 3 }}>σ {controversyIndex.toFixed(1)}</span>
                </span>
              )}
            </div>
          </div>
          </div>{/* end 정보 row */}
        </div>{/* end 블러 wrapper */}

        <div style={{ height: 1, backgroundColor: "var(--border)", margin: "28px 0" }} />

        {/* 멤버 평점 */}
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
                            <Link key={u.id} href={`/profile/${u.id}`} onClick={doClose} style={{ display: "inline-flex", opacity: 0.85 }} className="hover:opacity-100 transition-opacity">
                              <UserAvatar avatarUrl={avatarMap[u.id]} size={14} />
                            </Link>
                          ))}
                        </span>
                      )}


                      {/* 리뷰 하트 */}
                      {(canLikeReview || showBlockedHeart) && (
                        <button
                          onClick={() => handleToggleLikeReview(user.id)}
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
              onClick={() => setRatingsSheetOpen(true)}
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

        {/* 전체 평점 바텀시트 */}
        {ratingsSheetOpen && (
          <div
            onClick={() => setRatingsSheetOpen(false)}
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
                  onClick={() => setRatingsSheetOpen(false)}
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
                        <Link href={`/profile/${user.id}`} onClick={() => setRatingsSheetOpen(false)} style={{ color: "var(--text-sub)", fontSize: 13, flexShrink: 0, textDecoration: "none", width: 80 }} className="truncate hover:text-[var(--accent)] transition-colors">{user.display_name}</Link>
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
        )}

        <div style={{ height: 1, backgroundColor: "var(--border)", margin: "28px 0" }} />

        {/* 내 평점 입력 */}
        <div className="px-5 sm:px-8">
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
                <button
                  onClick={() => openTutorial(RULES_PAGE_INDEX)}
                  style={{
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    padding: "1px 6px",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    lineHeight: 1.6,
                  }}
                >
                  규정집
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
                  const pressed = pressedScore === n;
                  return (
                    <button
                      key={n}
                      onClick={() => handleSetMyScore(n)}
                      onTouchStart={() => setPressedScore(n)}
                      onTouchEnd={() => setPressedScore(null)}
                      onTouchCancel={() => setPressedScore(null)}
                      className={["flex-1 sm:flex-none sm:w-9", glowingScore === n ? "score-glow" : ""].join(" ")}
                      style={{
                        height: 36,
                        borderRadius: 6,
                        border: selected ? `2px solid ${color}` : `1px solid ${color}44`,
                        backgroundColor: selected ? color : `${color}18`,
                        color: selected ? ([3,4,5,8].includes(n) ? "var(--bg)" : "#fff") : color,
                        fontWeight: selected ? 800 : 500,
                        fontSize: 14,
                        cursor: "pointer",
                        transition: "transform 0.15s cubic-bezier(0.34,1.56,0.64,1), background-color 0.12s, border-color 0.12s, color 0.12s, opacity 0.12s",
                        transform: pressed ? "scale(0.90)" : selected ? "scale(1.1)" : "scale(1)",
                        boxShadow: selected ? `0 0 10px ${color}55` : "none",
                        opacity: selected ? 1 : 0.65,
                        ["--glow" as string]: `${color}88`,
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
                placeholder="청음기 (100자 이내)"
                value={myReview}
                onChange={(e) => { const val = e.target.value.slice(0, 100); setMyReview(val); isDirtyRef.current = val !== initialReviewRef.current || (myScore !== null && myScore !== initialScoreRef.current); }}
                rows={2}
                style={{
                  width: "100%",
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  borderRadius: 6,
                  padding: "8px 12px",
                  fontSize: 16,
                  resize: "none",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              {/* 나만 보이는 메모 */}
              <textarea
                placeholder="나만 보이는 메모 (500자)"
                value={myPrivateNote}
                onChange={(e) => setMyPrivateNote(e.target.value.slice(0, 500))}
                rows={2}
                style={{
                  width: "100%",
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px dashed var(--border)",
                  color: "var(--text-muted)",
                  borderRadius: 6,
                  padding: "8px 12px",
                  fontSize: 16,
                  resize: "none",
                  outline: "none",
                  fontFamily: "inherit",
                  marginTop: 6,
                }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, marginBottom: 4 }}>
                <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
                  메모 {myPrivateNote.length}/500 · 나만 볼 수 있어요
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ color: myReview.length >= 80 ? "var(--error)" : "var(--text-muted)", fontSize: 11, visibility: myReview.length > 0 ? "visible" : "hidden" }}>{myReview.length}/100</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {ratings.find((r) => r.user_id === profile?.id) && (
                    <button
                      onClick={handleDelete}
                      style={{
                        backgroundColor: "transparent",
                        color: "var(--text)",
                        fontWeight: 400,
                        fontSize: 12,
                        padding: "6px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                        border: "1px solid var(--border)",
                        transition: "all 0.15s",
                      }}
                    >
                      삭제
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving || hofLimitAlbums !== null}
                    style={{
                      backgroundColor: saved ? "var(--bg-elevated)" : "var(--accent)",
                      color: saved ? "var(--text-sub)" : "var(--bg)",
                      fontWeight: 600,
                      fontSize: 13,
                      padding: "6px 16px",
                      borderRadius: 6,
                      cursor: saving || hofLimitAlbums !== null ? "default" : "pointer",
                      opacity: saving || hofLimitAlbums !== null ? 0.4 : 1,
                      transition: "background-color 0.3s, color 0.3s",
                      border: "none",
                      animation: saved ? "savedPop 0.5s ease-out" : undefined,
                    }}
                  >
                    {saved ? "✓ 기록됨" : saving ? "기록 중…" : "기록"}
                  </button>
                </div>
              </div>
              {/* 명반전 상한 초과 — 밀어내기 UI */}
              {hofLimitAlbums !== null && (
                <div style={{
                  marginTop: 12, padding: "16px",
                  backgroundColor: "rgba(var(--accent-rgb), 0.05)",
                  border: "1px solid rgba(var(--accent-rgb), 0.25)",
                  borderRadius: 10,
                  animation: "fadeUp 0.18s ease-out",
                }}>
                  <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 13, marginBottom: 3 }}>
                    명반전이 가득 찼어요 <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 11 }}>12 / 12</span>
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 14 }}>
                    밀어낼 앨범을 선택하고, 새로 줄 점수를 정해주세요.
                  </p>

                  {/* 명반전 12장 커버 그리드 */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                    {hofLimitAlbums.map((a) => {
                      const isSelected = evictAlbumId === a.id;
                      return (
                        <button
                          key={a.id}
                          onClick={() => { setEvictAlbumId(isSelected ? null : a.id); setEvictScore(null); }}
                          title={`${a.title} — ${a.artist}`}
                          style={{ padding: 0, background: "none", border: "none", cursor: "pointer", position: "relative" }}
                          className="active:scale-[0.92] transition-transform"
                        >
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                          <div style={{
                            width: 56, height: 56, borderRadius: 6, overflow: "hidden",
                            backgroundColor: "var(--bg-elevated)",
                            border: `2px solid ${isSelected ? "var(--error)" : "var(--border)"}`,
                            opacity: evictAlbumId && !isSelected ? 0.45 : 1,
                            transition: "border-color 0.15s, opacity 0.15s",
                          }}>
                            {a.cover_url
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img loading="lazy" src={a.cover_url} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "var(--text-muted)", fontSize: 18 }}>♪</span></div>
                            }
                          </div>
                          {isSelected && (
                            <div style={{
                              position: "absolute", inset: 0, borderRadius: 6,
                              backgroundColor: "rgba(var(--error-rgb), 0.18)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              pointerEvents: "none",
                            }}>
                              <span style={{ fontSize: 18, color: "var(--error)" }}>✕</span>
                            </div>
                          )}
                          </div>
                          <span style={{
                            fontSize: 11, color: isSelected ? "var(--error)" : "var(--text-muted)",
                            maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            opacity: evictAlbumId && !isSelected ? 0.45 : 1,
                            textAlign: "center", display: "block",
                          }}>{a.title}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* 선택된 앨범 이름 */}
                  {evictAlbumId && (() => {
                    const sel = hofLimitAlbums.find((a) => a.id === evictAlbumId);
                    if (!sel) return null;
                    const d = new Date(sel.updatedAt);
                    const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
                    return (
                      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
                        선택:{" "}
                        <span style={{ color: "var(--text)", fontWeight: 600 }}>{sel.title}</span>
                        <span style={{ color: "var(--text-muted)" }}> — {sel.artist}</span>
                        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{" "}· {dateStr} 평가</span>
                      </p>
                    );
                  })()}

                  {/* 밀어낸 앨범 새 점수 선택 */}
                  {evictAlbumId && (
                    <div style={{ marginBottom: 14 }}>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600, letterSpacing: "0.04em" }}>밀어낸 앨범에 줄 새 점수</p>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[1,2,3,4,5,6,7].map((n) => {
                          const color = SCORE_COLORS[n];
                          const sel = evictScore === n;
                          return (
                            <button
                              key={n}
                              onClick={() => setEvictScore(n)}
                              onTouchStart={() => setPressedEvictScore(n)}
                              onTouchEnd={() => setPressedEvictScore(null)}
                              onTouchCancel={() => setPressedEvictScore(null)}
                              style={{
                                flex: 1, height: 34, borderRadius: 6,
                                border: sel ? `2px solid ${color}` : `1px solid ${color}44`,
                                backgroundColor: sel ? color : `${color}18`,
                                color: sel ? ([3,4,5].includes(n) ? "var(--bg)" : "#fff") : color,
                                fontWeight: sel ? 800 : 500, fontSize: 13,
                                cursor: "pointer", transition: "transform 0.12s, background-color 0.12s, border-color 0.12s",
                                transform: pressedEvictScore === n ? "scale(0.90)" : sel ? "scale(1.08)" : "scale(1)",
                              }}
                            >
                              {n}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 확인 / 취소 */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => { setHofLimitAlbums(null); setEvictAlbumId(null); setEvictScore(null); }}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: 6,
                        backgroundColor: "transparent", border: "1px solid var(--border)",
                        color: "var(--text-muted)", fontSize: 13, cursor: "pointer",
                      }}
                    >
                      취소
                    </button>
                    <button
                      onClick={handleEvict}
                      disabled={!evictAlbumId || evictScore === null || evicting}
                      style={{
                        flex: 2, padding: "8px 0", borderRadius: 6,
                        backgroundColor: evictAlbumId && evictScore !== null ? "var(--accent)" : "var(--bg-elevated)",
                        border: "none",
                        color: evictAlbumId && evictScore !== null ? "var(--bg)" : "var(--text-muted)",
                        fontWeight: 600, fontSize: 13,
                        cursor: evictAlbumId && evictScore !== null && !evicting ? "pointer" : "not-allowed",
                        opacity: evicting ? 0.5 : 1,
                        transition: "all 0.15s",
                      }}
                    >
                      {evicting ? "저장 중…" : "확인"}
                    </button>
                  </div>
                </div>
              )}

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
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 8, lineHeight: 1.6 }}>
                이 앨범을 내 기록에 담으려면<br />입문이 필요해요
              </p>
              <Link href="/login" onClick={doClose} style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600 }}>입문하기 →</Link>
            </div>
          )}
        </div>

        {/* 청음 횟수 — 평점 기록 횟수 기준 */}
        {profile && myScore !== null && myHistory.length > 0 && (
          <div className="px-5 sm:px-8" style={{ marginBottom: 0 }}>
            <div style={{ height: 1, backgroundColor: "var(--border)", margin: "28px 0" }} />
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, color: "var(--text-muted)",
              border: "1px solid var(--border)", borderRadius: 6,
              padding: "5px 12px",
            }}>
              청음
              <span style={{ fontSize: 11, opacity: 0.65 }}>{myHistory.length}회</span>
            </span>
          </div>
        )}

        {/* 트랙리스트 skeleton — full 로드 전 자리 확보해서 레이아웃 점프 방지 */}
        {full === null && (
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

        {/* 트랙리스트 */}
        {full !== null && tracklist.length === 0 && (
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
                      onClick={() => { if (!profile || canLike) handleToggleLike(i); }}
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
        {/* 문의 링크 */}
        <div className="px-5 sm:px-8" style={{ textAlign: "center", paddingTop: 20, paddingBottom: 28 }}>
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

      {artistModal && createPortal(
        <ArtistModal
          artistName={artistModal.name}
          displayName={artistModal.display}
          onClose={() => setArtistModal(null)}
          onAlbumClick={(a) => { setArtistModal(null); setNestedAlbum(a); }}
          source="album_modal"
        />,
        document.body
      )}

      {nestedAlbum && createPortal(
        <AlbumModal
          album={nestedAlbum}
          onClose={() => setNestedAlbum(null)}
          onSaved={onSaved}
          zIndex={120}
          source="artist_modal"
        />,
        document.body
      )}

      {showCardPreview && myScore !== null && (
        <StoryCardPreviewModal
          title={data.title}
          artist={data.artist_display ?? data.artist}
          coverUrl={data.cover_url}
          score={myScore}
          avgScore={data.avg != null ? parseFloat(String(data.avg)) : null}
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
          isAdmin={profile?.role === "admin"}
          album={{
            id: album.id,
            title: data.title,
            artist: data.artist,
            use_artist_variant: data.use_artist_variant ?? false,
            extra_artists: data.extra_artists ?? null,
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

      {diaryOpen && (
        <DiaryEntryModal
          onClose={() => setDiaryOpen(false)}
          onSaved={() => setDiaryOpen(false)}
          initialAlbum={{
            id: album.id,
            title: album.title,
            artist: album.artist,
            cover_url: album.cover_url ?? null,
            score: myScore ?? 0,
          }}
        />
      )}
    </>
  );
}
