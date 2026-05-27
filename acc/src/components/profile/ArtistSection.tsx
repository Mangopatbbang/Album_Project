"use client";

import { useState } from "react";
import { scoreColor } from "@/lib/score";
import ArtistModal from "@/components/album/ArtistModal";

type ArtistEntry = { artist: string; artist_display?: string; count: number; avg: string };

export default function ArtistSection({
  byCount,
  byAvg,
  maxCount,
  maxAvg,
}: {
  byCount: ArtistEntry[];
  byAvg: ArtistEntry[];
  maxCount: number;
  maxAvg: number;
}) {
  const [tab, setTab] = useState<"count" | "avg">("count");
  const [artistModal, setArtistModal] = useState<{ name: string; display: string } | null>(null);
  const list = tab === "count" ? byCount : byAvg;
  const maxVal = tab === "count" ? maxCount : maxAvg;

  return (
    <>
    <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>
          아티스트
        </p>
        <div style={{ display: "flex", gap: 4 }}>
          {(["count", "avg"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 4,
                border: "1px solid var(--border)",
                cursor: "pointer",
                backgroundColor: tab === t ? "var(--accent)" : "var(--bg-elevated)",
                color: tab === t ? "var(--bg)" : "var(--text-muted)",
                transition: "all 0.15s",
              }}
            >
              {t === "count" ? "장수" : "평점"}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map(({ artist, artist_display, count, avg }, i) => (
          <div key={artist}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                <span style={{ color: "var(--text-muted)", fontSize: 10, width: 12, flexShrink: 0 }}>{i + 1}</span>
                <span
                  onClick={() => setArtistModal({ name: artist, display: artist_display ?? artist })}
                  style={{ color: "var(--text-sub)", fontSize: 12, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}
                  className="hover:underline"
                >{artist_display ?? artist}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: scoreColor(avg), fontSize: 11, fontWeight: 600 }}>{avg}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{count}장</span>
              </div>
            </div>
            <div style={{ height: 3, backgroundColor: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(tab === "count" ? count : parseFloat(avg)) / maxVal * 100}%`,
                backgroundColor: "var(--accent)",
                borderRadius: 2,
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
    {artistModal && <ArtistModal artistName={artistModal.name} displayName={artistModal.display} onClose={() => setArtistModal(null)} />}
    </>
  );
}
