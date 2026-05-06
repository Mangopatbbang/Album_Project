"use client";

type Props = {
  artist: string;
  title: string;
};

export default function YoutubeMusicLink({ artist, title }: Props) {
  const url = `https://music.youtube.com/search?q=${encodeURIComponent(`${artist} ${title}`)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="YouTube Music에서 검색"
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
      className="hover:!text-white/90"
    >
      {/* YouTube Music 아이콘 (play triangle in rounded square) */}
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="YouTube Music"
        style={{ flexShrink: 0 }}
      >
        <rect x="2" y="2" width="20" height="20" rx="5" fill="currentColor" opacity="0.15"/>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        <polygon points="10.5,10 10.5,14 14.5,12" fill="currentColor"/>
      </svg>
      <span>YT Music</span>
    </a>
  );
}
