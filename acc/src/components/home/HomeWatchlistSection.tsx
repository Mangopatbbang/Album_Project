"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import AlbumModal from "@/components/album/AlbumModal";
import { AlbumWithRatings } from "@/types";

type WatchlistAlbum = {
  id: string;
  title: string;
  artist: string;
  artist_display?: string;
  year?: string | null;
  genre?: string | null;
  cover_url?: string | null;
  spotify_id?: string | null;
};

type WatchlistItem = {
  album_id: string;
  albums: WatchlistAlbum;
};

const SHOW_COUNT = 5;

function CoverThumb({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {!loaded && <div className="skeleton-shimmer" style={{ position: "absolute", inset: 0, borderRadius: 4 }} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", opacity: loaded ? 1 : 0, transition: "opacity 0.2s" }}
      />
    </div>
  );
}

export default function HomeWatchlistSection() {
  const { profile } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithRatings | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    setLoading(true);
    fetch(`/api/watchlist?userId=${profile.id}`)
      .then((r) => r.json())
      .then((data) => { if (data.items) setItems(data.items); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile?.id]);

  const headerRow = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <h2 style={{ color: "var(--text)", fontWeight: 600, fontSize: 14, letterSpacing: "-0.02em" }}>
        나중에 들을 앨범
      </h2>
      {profile && (
        <Link
          href={`/profile/${profile.id}`}
          style={{ color: "var(--text-muted)", fontSize: 11 }}
          className="hover:text-[var(--accent)] transition-colors"
        >
          더 보기 →
        </Link>
      )}
    </div>
  );

  const cardStyle: React.CSSProperties = {
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "4px 14px",
    flex: 1,
  };

  if (!profile) {
    return (
      <>
        {headerRow}
        <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 120 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", lineHeight: 1.6 }}>
            로그인하면 나만의<br />청음 큐를 관리할 수 있어요
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {headerRow}
      <div style={cardStyle}>
        {loading ? (
          <p style={{ color: "var(--text-muted)", fontSize: 12, padding: "20px 0", textAlign: "center" }}>
            불러오는 중...
          </p>
        ) : items.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 12, padding: "20px 0", textAlign: "center", lineHeight: 1.7 }}>
            앨범 모달에서<br />
            <span style={{ fontWeight: 600, color: "var(--text-sub)" }}>+ 나중에</span> 버튼으로 추가해요
          </p>
        ) : (
          items.slice(0, SHOW_COUNT).map(({ album_id, albums }) => {
            const album: AlbumWithRatings = {
              ...albums,
              year: albums.year ?? undefined,
              genre: albums.genre ?? undefined,
              cover_url: albums.cover_url ?? undefined,
              spotify_id: albums.spotify_id ?? undefined,
              ratings: [],
              avg: undefined,
            };
            return (
              <div
                key={album_id}
                onClick={() => setSelectedAlbum(album)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 0",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                }}
                className="hover:opacity-75 active:opacity-65 transition-opacity"
              >
                <div style={{
                  flexShrink: 0, width: 38, height: 38,
                  borderRadius: 5, overflow: "hidden",
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                }}>
                  {albums.cover_url
                    ? <CoverThumb src={albums.cover_url} alt={albums.title} />
                    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>♪</div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "var(--text)", fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {albums.title}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {albums.artist_display ?? albums.artist}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedAlbum && (
        <AlbumModal
          album={selectedAlbum}
          onClose={() => setSelectedAlbum(null)}
          source="home_watchlist"
          onSaved={(albumId) => {
            setItems((prev) => prev.filter((i) => i.album_id !== albumId));
            setSelectedAlbum(null);
          }}
        />
      )}
    </>
  );
}
