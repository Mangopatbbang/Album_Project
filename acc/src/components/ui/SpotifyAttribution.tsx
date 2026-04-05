"use client";

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
      onClick={(e) => e.stopPropagation()}
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
      onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
    >
      {/* Spotify 공식 아이콘 SVG — 변형 없이 그대로 */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Spotify"
        style={{ flexShrink: 0 }}
      >
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
      {size === "md" && <span>Spotify</span>}
    </a>
  );
}
