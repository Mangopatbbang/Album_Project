"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import AlbumModal from "@/components/album/AlbumModal";
import { AlbumWithRatings } from "@/types";
import SpotifyAttribution from "@/components/ui/SpotifyAttribution";

type WatchlistAlbum = {
  id: string;
  title: string;
  artist: string;
  year?: string | null;
  genre?: string | null;
  cover_url?: string | null;
  spotify_id?: string | null;
};

type WatchlistItem = {
  album_id: string;
  albums: WatchlistAlbum;
};

type Props = {
  userId: string; // 프로필 주인 ID
};

export default function WatchlistSection({ userId }: Props) {
  const { profile } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithRatings | null>(null);

  const isOwner = profile?.id === userId;
  const [popupOpen, setPopupOpen] = useState(false);
  const INITIAL_LIMIT = 5;

  useEffect(() => {
    if (!isOwner) return;
    fetch(`/api/watchlist?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.items) setItems(data.items);
      })
      .catch(() => {});
  }, [userId, isOwner]);

  if (!isOwner) return null;

  const handleRemove = async (albumId: string) => {
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, albumId }),
    });
    setItems((prev) => prev.filter((i) => i.album_id !== albumId));
  };

  return (
    <>
      <div style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "24px 28px",
      }}>
        <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>
          나중에 들을 앨범 <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({items.length})</span>
        </p>
        {items.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
            앨범 모달에서 &ldquo;+ 나중에&rdquo; 버튼으로 추가하세요
          </p>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.slice(0, INITIAL_LIMIT).map(({ album_id, albums }) => {
            // AlbumModal에 넘길 때 ratings/avg 기본값 추가
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
                style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "4px 0" }}
              >
                <button
                  onClick={() => setSelectedAlbum(album)}
                  style={{
                    width: 40, height: 40, flexShrink: 0,
                    borderRadius: 6, overflow: "hidden",
                    border: "1px solid var(--border)",
                    background: "var(--bg-elevated)",
                    cursor: "pointer", padding: 0,
                  }}
                >
                  {album.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontSize: 16 }}>♪</span>
                  )}
                </button>
                <button
                  onClick={() => setSelectedAlbum(album)}
                  style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {album.title}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
                    <p style={{ color: "var(--text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                      {album.artist}{album.year ? ` · ${album.year}` : ""}
                    </p>
                    <SpotifyAttribution spotifyId={album.spotify_id} />
                  </div>
                </button>
                <button
                  onClick={() => handleRemove(album_id)}
                  title="찜 해제"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-muted)", fontSize: 16, padding: "2px 4px",
                    flexShrink: 0, lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
        {items.length > INITIAL_LIMIT && (
          <button
            onClick={() => setPopupOpen(true)}
            style={{
              marginTop: 10,
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", fontSize: 12, fontWeight: 600,
              padding: "4px 0",
              textDecoration: "underline", textUnderlineOffset: 3,
            }}
          >
            더보기 +{items.length - INITIAL_LIMIT}
          </button>
        )}
      </div>

      {popupOpen && (
        <div
          onClick={() => setPopupOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              width: "100%", maxWidth: 480,
              maxHeight: "80dvh",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              animation: "modalIn 0.18s ease-out",
            }}
          >
            <div style={{
              padding: "18px 24px 14px",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ color: "var(--text)", fontWeight: 700, fontSize: 15 }}>나중에 들을 앨범</span>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{items.length}장</span>
              </div>
              <button
                onClick={() => setPopupOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, lineHeight: 1, padding: 4 }}
              >✕</button>
            </div>
            <div style={{ overflowY: "auto", padding: "8px 24px", display: "flex", flexDirection: "column", gap: 0 }}>
              {items.map(({ album_id, albums }) => {
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
                  <div key={album_id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                    <button
                      onClick={() => { setPopupOpen(false); setSelectedAlbum(album); }}
                      style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)", background: "var(--bg-elevated)", cursor: "pointer", padding: 0 }}
                    >
                      {album.cover_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ color: "var(--text-muted)", fontSize: 16 }}>♪</span>
                      }
                    </button>
                    <button
                      onClick={() => { setPopupOpen(false); setSelectedAlbum(album); }}
                      style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{album.title}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
                        <p style={{ color: "var(--text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                          {album.artist}{album.year ? ` · ${album.year}` : ""}
                        </p>
                        <SpotifyAttribution spotifyId={album.spotify_id} />
                      </div>
                    </button>
                    <button
                      onClick={() => handleRemove(album_id)}
                      title="찜 해제"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16, padding: "2px 4px", flexShrink: 0, lineHeight: 1 }}
                    >✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {selectedAlbum && (
        <AlbumModal
          album={selectedAlbum}
          onClose={() => setSelectedAlbum(null)}
          onSaved={(albumId) => {
            // 평점 저장 시 찜 목록에서 제거
            setItems((prev) => prev.filter((i) => i.album_id !== albumId));
            setSelectedAlbum(null);
          }}
        />
      )}
    </>
  );
}
