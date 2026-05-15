"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AlbumWithRatings } from "@/types";
import AlbumModal from "@/components/album/AlbumModal";
import { scoreColor } from "@/lib/score";
import { apiFetch } from "@/lib/apiFetch";

type ActivityItem = {
  score: number;
  one_line_review: string | null;
  updated_at: string;
  album_id: string;
  album_title: string;
  album_artist: string;
  album_artist_display: string;
  album_cover_url: string | null;
};

export default function HomeActivitySection() {
  const { profile, loading: authLoading } = useAuth();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [fetchDone, setFetchDone] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithRatings | null>(null);

  useEffect(() => {
    if (!profile) return;
    apiFetch("/api/home/activity")
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items ?? []);
        setFetchDone(true);
      })
      .catch(() => setFetchDone(true));
  }, [profile]);

  if (authLoading || !profile || !fetchDone || items.length === 0) return null;

  return (
    <>
      <section style={{ padding: "4px 24px 28px" }}>
        <h2
          style={{
            color: "var(--text)",
            fontWeight: 600,
            fontSize: 14,
            letterSpacing: "-0.02em",
            marginBottom: 12,
          }}
        >
          내 최근 활동
        </h2>
        <div
          style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 4,
            scrollbarWidth: "none",
          }}
          className="[&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() =>
                setSelectedAlbum({
                  id: item.album_id,
                  title: item.album_title,
                  artist: item.album_artist,
                  artist_display: item.album_artist_display,
                  cover_url: item.album_cover_url ?? undefined,
                  ratings: [],
                })
              }
              style={{
                flexShrink: 0,
                width: 76,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
              }}
              className="active:opacity-60 hover:opacity-80 transition-opacity"
            >
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 8,
                  overflow: "hidden",
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  marginBottom: 5,
                }}
              >
                {item.album_cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.album_cover_url}
                    alt={item.album_title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-muted)",
                      fontSize: 18,
                    }}
                  >
                    ♪
                  </div>
                )}
              </div>
              <p
                style={{
                  color: "var(--text)",
                  fontSize: 11,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  lineHeight: 1.3,
                }}
              >
                {item.album_title}
              </p>
              <p
                style={{
                  color: scoreColor(item.score),
                  fontSize: 11,
                  fontWeight: 700,
                  marginTop: 1,
                }}
              >
                ★ {item.score}
              </p>
            </button>
          ))}
        </div>
      </section>

      {selectedAlbum && (
        <AlbumModal
          album={selectedAlbum}
          onClose={() => setSelectedAlbum(null)}
          source="home_activity"
        />
      )}
    </>
  );
}
