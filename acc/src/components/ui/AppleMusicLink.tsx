"use client";

type Props = {
  artist: string;
  title: string;
};

export default function AppleMusicLink({ artist, title }: Props) {
  const url = `https://music.apple.com/search?term=${encodeURIComponent(`${artist} ${title}`)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="Apple Music에서 검색"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        textDecoration: "none",
        color: "rgba(255,255,255,0.5)",
        fontSize: 11,
        lineHeight: 1,
        transition: "color 0.15s ease",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
    >
      {/* Apple Music 아이콘 (music note in rounded square) */}
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Apple Music"
        style={{ flexShrink: 0 }}
      >
        <rect x="2" y="2" width="20" height="20" rx="5" fill="currentColor" opacity="0.15"/>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M15.5 7.5v5.8a2 2 0 1 1-1.5-1.94V9.2L10 10.1v4.4a2 2 0 1 1-1.5-1.94V8.8L15.5 7.5z" fill="currentColor"/>
      </svg>
      <span>Apple</span>
    </a>
  );
}
