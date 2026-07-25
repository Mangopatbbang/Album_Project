"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AlbumWithRatings } from "@/types";
import { preloadModal } from "@/lib/albumModalStore";
import { useUsers } from "@/context/UsersContext";
import { useAuth } from "@/context/AuthContext";
import { scoreColor, glowShadow, glowBorder } from "@/lib/score";
import SpotifyAttribution from "@/components/ui/SpotifyAttribution";
import ArtistModal from "@/components/album/ArtistModal";
import { useUserAvatars } from "@/context/UserAvatarsContext";
import UserAvatar from "@/components/ui/UserAvatar";

type Props = {
  album: AlbumWithRatings;
  onNavigate?: () => void;
};

export default function AlbumCard({ album, onNavigate }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [artistModal, setArtistModal] = useState<{ name: string; display: string } | null>(null);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const isNavigatingRef = useRef(false);
  const prevPathRef = useRef(pathname);
  const avatarMap = useUserAvatars();
  const { users } = useUsers();
  const { profile } = useAuth();

  // URL이 바뀌면 (모달 열림/닫힘) navigating 상태 리셋
  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      prevPathRef.current = pathname;
      isNavigatingRef.current = false;
      setIsNavigating(false);
    }
  }, [pathname]);

  const displayEntries = useMemo(() => {
    const ratedEntries = users
      .map((u) => ({ user: u, rating: album.ratings.find((r) => r.user_id === u.id) }))
      .filter((e): e is { user: typeof e.user; rating: NonNullable<typeof e.rating> } => e.rating != null);
    const mine = ratedEntries.filter((e) => e.user.id === profile?.id);
    const others = ratedEntries
      .filter((e) => e.user.id !== profile?.id)
      .sort((a, b) => b.rating.score - a.rating.score);
    return [...mine, ...others].slice(0, 5);
  }, [album.ratings, profile?.id, users]);

  const isNew = album.created_at
    ? Date.now() - new Date(album.created_at).getTime() < 24 * 60 * 60 * 1000
    : false;

  return (
    <>
    <button
      data-tour="album-card"
      aria-busy={isNavigating}
      onMouseEnter={() => router.prefetch(`/album/${album.id}`)}
      onTouchStart={() => router.prefetch(`/album/${album.id}`)}
      onClick={() => {
        if (isNavigatingRef.current) return;
        isNavigatingRef.current = true;
        setIsNavigating(true);
        // 클릭 시점에 album 데이터를 스토어에 저장 → 서버 컴포넌트 DB 쿼리 우회
        preloadModal(album.id, album);
        onNavigate?.();
        router.push(`/album/${album.id}`, { scroll: false });
      }}
      style={{
        backgroundColor: "var(--bg-card)",
        border: `1px solid ${glowBorder(album.avg)}`,
        textAlign: "left",
        width: "100%",
        boxShadow: glowShadow(album.avg),
        opacity: isNavigating ? 0.75 : 1,
        transition: "opacity 0.12s ease, transform 0.15s cubic-bezier(0.4,0,0.2,1)",
      }}
      className="group rounded-lg overflow-hidden hover:scale-[1.02] active:scale-[0.97] cursor-pointer"
    >
      {/* 커버 이미지 */}
      <div
        style={{ backgroundColor: "var(--bg-elevated)", aspectRatio: "1/1", position: "relative" }}
        className="w-full flex items-center justify-center overflow-hidden"
      >
        {album.cover_url && !imgError ? (
          <>
            {!imgLoaded && <div className="skeleton-shimmer" style={{ position: "absolute", inset: 0 }} />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={album.cover_url}
              alt={album.title}
              className="w-full h-full object-cover group-hover:scale-[1.05]"
              style={{ opacity: imgLoaded ? 1 : 0, transition: "opacity 0.25s ease, transform 0.35s ease" }}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span style={{ color: "var(--text-muted)", fontSize: 28 }}>♪</span>
            <span style={{ color: "var(--text-muted)" }} className="text-xs">커버 없음</span>
          </div>
        )}
        {isNew && (
          <span style={{
            position: "absolute", top: 6, left: 6,
            backgroundColor: "var(--accent)", color: "var(--bg)",
            fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
            padding: "2px 5px", borderRadius: 4,
            pointerEvents: "none",
          }}>NEW</span>
        )}
        {isNavigating && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 2,
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.35)",
          }}>
            <div
              className="animate-spin"
              style={{
                width: 22, height: 22, borderRadius: "50%",
                border: "2.5px solid rgba(255,255,255,0.18)",
                borderTopColor: "rgba(255,255,255,0.85)",
              }}
            />
          </div>
        )}
      </div>

      {/* 점수 컬러 바 */}
      <div style={{ height: 3, backgroundColor: "var(--bg-elevated)" }}>
        {album.avg && (
          <div
            style={{
              height: "100%",
              width: `${(parseFloat(album.avg) / 8) * 100}%`,
              backgroundColor: scoreColor(album.avg),
              boxShadow: parseFloat(album.avg) >= 7
                ? `0 0 6px ${scoreColor(album.avg)}`
                : "none",
              transition: "width 0.4s ease",
            }}
          />
        )}
      </div>

      {/* 정보 */}
      <div className="p-3 sm:p-3.5">
        <div className="flex items-baseline justify-between gap-1">
          <p
            style={{ color: "var(--text)", fontWeight: 500, fontSize: 13 }}
            className="truncate leading-snug min-w-0"
          >
            {album.title}
          </p>
          <span style={{ color: scoreColor(album.avg), fontWeight: 700, fontSize: 13, flexShrink: 0, visibility: album.avg ? "visible" : "hidden" }}>
            {album.avg}
          </span>
        </div>
        <p
          style={{ color: "var(--text-sub)", fontSize: 12 }}
          className="truncate mt-0.5 min-w-0"
        >
          <span
            className="hover:underline cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setArtistModal({ name: album.artist, display: album.artist_display ?? album.artist }); }}
          >
            {album.artist_display ?? album.artist}
          </span>
        </p>

        {/* 유저별 평점 + Spotify attribution */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {displayEntries.map(({ user, rating }) => (
              <span
                key={user.id}
                style={{ fontSize: 12, color: scoreColor(rating.score), display: "inline-flex", alignItems: "center", gap: 2 }}
              >
                <UserAvatar avatarUrl={avatarMap[user.id]} size={12} />{rating.score}
              </span>
            ))}
          </div>
          {album.soundcloud_url ? (
            <a
              href={album.soundcloud_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="SoundCloud에서 보기"
              style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", color: "rgba(255,85,0,0.55)", flexShrink: 0, transition: "color 0.15s", fontSize: 10, fontWeight: 800, letterSpacing: "0.03em" }}
              className="hover:!text-[#f50]"
            >
              SC
            </a>
          ) : (
            <SpotifyAttribution spotifyId={album.spotify_id} />
          )}
        </div>
      </div>
    </button>

    {artistModal && (
      <ArtistModal
        artistName={artistModal.name}
        displayName={artistModal.display}
        onClose={() => setArtistModal(null)}
        onAlbumClick={(a) => { setArtistModal(null); router.push(`/album/${a.id}`, { scroll: false }); }}
      />
    )}
    </>
  );
}
