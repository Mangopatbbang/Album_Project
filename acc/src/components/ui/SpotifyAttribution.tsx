"use client";

import { trackFeatureClick } from "@/lib/track";
import { SpotifyIcon } from "@/components/ui/StreamingIcons";

// Spotify 공식 브랜드 가이드라인 준수:
// - 아이콘 단독 최소 21px, 풀 로고(아이콘+워드마크) 최소 70px
// - 다크 배경에서 흰색 로고 사용 허용
// - 커버 아트 위 로고 배치 금지
// - 모든 메타데이터에 출처 링크 필수
// https://developer.spotify.com/documentation/design

type Props = {
  spotifyId?: string | null;
  size?: "sm" | "md";
};

export default function SpotifyAttribution({ spotifyId, size = "sm" }: Props) {
  if (!spotifyId) return null;

  const url = `https://open.spotify.com/album/${spotifyId}`;
  // sm: 아이콘 단독 (최소 21px), md: 아이콘 + 워드마크
  const iconSize = 21;
  const fontSize = 11;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => { e.stopPropagation(); trackFeatureClick("스포티파이_클릭"); }}
      title="Spotify에서 보기"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        textDecoration: "none",
        color: "rgba(255,255,255,0.5)",
        fontSize,
        lineHeight: 1,
        transition: "color 0.15s ease",
        flexShrink: 0,
      }}
      className="hover:!text-white/90"
    >
      {/* Spotify 공식 아이콘 — 변형 없이 그대로 (StreamingIcons.tsx) */}
      <SpotifyIcon size={iconSize} />
      {size === "md" && <span>Spotify</span>}
    </a>
  );
}
