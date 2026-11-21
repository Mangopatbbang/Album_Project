"use client";

import { AppleMusicIcon } from "@/components/ui/StreamingIcons";

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
      className="hover:!text-white/90"
    >
      {/* Apple Music 아이콘 (music note in rounded square) — StreamingIcons.tsx */}
      <AppleMusicIcon size={21} />
      <span>Apple</span>
    </a>
  );
}
