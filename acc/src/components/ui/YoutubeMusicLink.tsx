"use client";

import { YoutubeMusicIcon } from "@/components/ui/StreamingIcons";

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
      {/* YouTube Music 아이콘 (play triangle in rounded square) — StreamingIcons.tsx */}
      <YoutubeMusicIcon size={21} />
      <span>YT Music</span>
    </a>
  );
}
