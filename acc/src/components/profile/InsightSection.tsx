"use client";

import { useState } from "react";
import AlbumModal from "@/components/album/AlbumModal";
import { AlbumWithRatings } from "@/types";
import { scoreColor } from "@/lib/score";

export type InsightAlbum = {
  id: string;
  title: string;
  artist: string;
  artist_display?: string;
  cover_url: string | null;
  score: number;
  commAvg: number;
  diff: number;
};

export type HiddenGemAlbum = {
  id: string;
  title: string;
  artist: string;
  artist_display?: string;
  cover_url: string | null;
  score: number;
};

type Props = {
  disagreeAlbums: InsightAlbum[];
  personalHiddenGems: HiddenGemAlbum[];
};

function toModal(a: { id: string; title: string; artist: string; artist_display?: string; cover_url: string | null }): AlbumWithRatings {
  return { id: a.id, title: a.title, artist: a.artist, artist_display: a.artist_display, cover_url: a.cover_url ?? undefined, ratings: [] };
}

export default function InsightSection({ disagreeAlbums, personalHiddenGems }: Props) {
  const [selected, setSelected] = useState<AlbumWithRatings | null>(null);

  if (disagreeAlbums.length === 0 && personalHiddenGems.length === 0) return null;

  return (
    <>
      {disagreeAlbums.length > 0 && (
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
          <div style={{ marginBottom: 14 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>이견 앨범</p>
            <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 3 }}>내 평가와 커뮤니티 평균이 2점 이상 차이나는 앨범</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {disagreeAlbums.map((a) => (
              <div
                key={a.id}
                onClick={() => setSelected(toModal(a))}
                style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                className="transition-opacity hover:opacity-80"
              >
                <div style={{ width: 36, height: 36, borderRadius: 4, overflow: "hidden", flexShrink: 0, backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  {a.cover_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={a.cover_url} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 12, color: "var(--text-muted)" }}>♪</span></div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "var(--text)", fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</p>
                  <p style={{ color: "var(--text-muted)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.artist_display ?? a.artist}</p>
                </div>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: scoreColor(a.score) }}>{a.score}점</p>
                  <p style={{ fontSize: 10, color: "var(--text-muted)" }}>평균 {a.commAvg.toFixed(1)}</p>
                </div>
                <div style={{ flexShrink: 0, width: 28, textAlign: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: a.diff > 0 ? "var(--accent)" : "#e05050" }}>
                    {a.diff > 0 ? "▲" : "▼"}{Math.abs(a.diff).toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {personalHiddenGems.length > 0 && (
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
          <div style={{ marginBottom: 14 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>내 숨은 명반</p>
            <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 3 }}>7점 이상이지만 아직 발굴되지 않은 앨범</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {personalHiddenGems.map((a) => (
              <div
                key={a.id}
                onClick={() => setSelected(toModal(a))}
                style={{ width: 52, flexShrink: 0, cursor: "pointer" }}
                className="transition-opacity hover:opacity-80"
              >
                <div style={{ width: 52, height: 52, borderRadius: 5, overflow: "hidden", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  {a.cover_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={a.cover_url} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 16, color: "var(--text-muted)" }}>♪</span></div>
                  }
                </div>
                <p style={{ color: scoreColor(a.score), fontSize: 10, fontWeight: 700, textAlign: "center", marginTop: 3 }}>{a.score}점</p>
                <p style={{ color: "var(--text)", fontSize: 9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>{a.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && <AlbumModal album={selected} onClose={() => setSelected(null)} source="profile_insight" />}
    </>
  );
}
