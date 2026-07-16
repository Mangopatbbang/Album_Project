"use client";

import { useState, useEffect } from "react";
import HomeControversialSection, { ControversialItem } from "./HomeControversialSection";
import { useAuth } from "@/context/AuthContext";
import AlbumModal from "@/components/album/AlbumModal";
import { AlbumWithRatings } from "@/types";

type WatchlistAlbum = {
  album_id: string;
  albums: {
    id: string;
    title: string;
    artist: string;
    artist_display?: string;
    cover_url: string | null;
  } | null;
};

function HomeWatchlistBack({ userId }: { userId: string }) {
  const [items, setItems] = useState<WatchlistAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithRatings | null>(null);

  useEffect(() => {
    fetch(`/api/watchlist?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setItems(data?.items ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  return (
    <>
      <div style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "4px 14px",
        flex: 1,
        overflowY: "auto",
        maxHeight: 360,
      }}>
        {loading ? (
          <>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
                <div className="skeleton-shimmer" style={{ width: 44, height: 44, borderRadius: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton-shimmer" style={{ width: "60%", height: 12, borderRadius: 3, marginBottom: 6 }} />
                  <div className="skeleton-shimmer" style={{ width: "40%", height: 10, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </>
        ) : items.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 12, padding: "20px 0", textAlign: "center", lineHeight: 1.7 }}>
            나중에 들을 앨범을<br />담아두면 여기에 나타나요
          </p>
        ) : (
          items.map((item, i) => {
            const album = item.albums;
            if (!album) return null;
            return (
              <div
                key={item.album_id}
                onClick={() => setSelectedAlbum({
                  id: album.id,
                  title: album.title,
                  artist: album.artist,
                  artist_display: album.artist_display,
                  cover_url: album.cover_url ?? undefined,
                  ratings: [],
                })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none",
                  cursor: "pointer",
                }}
                className="hover:opacity-75 active:opacity-65 transition-opacity"
              >
                {/* 커버 */}
                <div style={{
                  flexShrink: 0, width: 44, height: 44,
                  borderRadius: 6, overflow: "hidden",
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  position: "relative",
                }}>
                  {!loaded[album.id] && (
                    <div className="skeleton-shimmer" style={{ position: "absolute", inset: 0, borderRadius: 4 }} />
                  )}
                  {album.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={album.cover_url}
                      alt={album.title}
                      onLoad={() => setLoaded((p) => ({ ...p, [album.id]: true }))}
                      style={{ width: "100%", height: "100%", objectFit: "cover", opacity: loaded[album.id] ? 1 : 0, transition: "opacity 0.2s" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>♪</div>
                  )}
                </div>

                {/* 텍스트 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "var(--text)", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {album.title}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                    {album.artist_display ?? album.artist}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedAlbum && (
        <AlbumModal album={selectedAlbum} onClose={() => setSelectedAlbum(null)} source="home_watchlist" />
      )}
    </>
  );
}

export default function HomeFlipCard({ items }: { items: ControversialItem[] }) {
  const { profile } = useAuth();
  const [flipped, setFlipped] = useState(false);
  const [animating, setAnimating] = useState(false);

  const handleFlip = () => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setFlipped((v) => !v);
      setTimeout(() => setAnimating(false), 160);
    }, 160);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2
          style={{
            color: "#ffffff",
            fontWeight: 600,
            fontSize: 14,
            letterSpacing: "-0.02em",
            transition: "opacity 0.14s",
            opacity: animating ? 0 : 1,
          }}
        >
          {flipped ? "나중에 들을 앨범" : "갑론을박"}
        </h2>
        <button
          onClick={handleFlip}
          disabled={animating}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: 6,
            color: "rgba(255,255,255,0.55)",
            fontSize: 11,
            padding: "3px 9px",
            cursor: animating ? "default" : "pointer",
            letterSpacing: "0.01em",
            transition: "opacity 0.14s, color 0.15s, border-color 0.15s",
            opacity: animating ? 0 : 1,
          }}
          className="hover:!border-white/35 hover:!text-white/80"
        >
          {flipped ? "← 갑론을박" : "나중에 들을 앨범 →"}
        </button>
      </div>

      {/* 콘텐츠 — 뒤집기 애니메이션 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          transition: "transform 0.16s ease, opacity 0.16s ease",
          transform: animating
            ? "perspective(800px) rotateY(88deg)"
            : "perspective(800px) rotateY(0deg)",
          opacity: animating ? 0 : 1,
        }}
      >
        {flipped ? (
          profile ? (
            <HomeWatchlistBack userId={profile.id} />
          ) : (
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "4px 14px",
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <p style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", lineHeight: 1.7 }}>
                로그인하면 나중에 들을<br />앨범을 볼 수 있어요
              </p>
            </div>
          )
        ) : (
          <HomeControversialSection items={items} />
        )}
      </div>
    </div>
  );
}
