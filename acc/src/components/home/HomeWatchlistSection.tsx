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
  release_date?: string | null;
  genre?: string | null;
  cover_url?: string | null;
  spotify_id?: string | null;
};

type WatchlistItem = {
  album_id: string;
  albums: WatchlistAlbum;
};

const MOBILE_LIMIT = 5;

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

function AlbumRow({ album_id, albums, onSelect }: { album_id: string; albums: WatchlistAlbum; onSelect: (a: AlbumWithRatings) => void }) {
  const album: AlbumWithRatings = {
    ...albums,
    genre: albums.genre ?? undefined,
    cover_url: albums.cover_url ?? undefined,
    spotify_id: albums.spotify_id ?? undefined,
    ratings: [],
    avg: undefined,
  };
  return (
    <div
      key={album_id}
      onClick={() => onSelect(album)}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
      className="hover:opacity-75 active:opacity-65 transition-opacity"
    >
      <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 5, overflow: "hidden", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
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
}

export default function HomeWatchlistSection() {
  const { profile } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithRatings | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    setLoading(true);
    fetch(`/api/watchlist?userId=${profile.id}`)
      .then((r) => r.json())
      .then((data) => { if (data.items) setItems(data.items); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile?.id]);

  // 바텀시트 열릴 때 body scroll 잠금
  useEffect(() => {
    if (sheetOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [sheetOpen]);

  const cardStyle: React.CSSProperties = {
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "4px 14px",
    flex: 1,
    ...(isMobile ? {} : { maxHeight: 300, overflowY: "auto" }),
  };

  const headerRow = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <h2 style={{ color: "var(--text)", fontWeight: 600, fontSize: 14, letterSpacing: "-0.02em" }}>
        나중에 들을 앨범
      </h2>
      {items.length > 0 && (
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{items.length}장</span>
      )}
    </div>
  );

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

  const visibleItems = isMobile ? items.slice(0, MOBILE_LIMIT) : items;
  const overflow = isMobile ? items.length - MOBILE_LIMIT : 0;

  return (
    <>
      <style>{`
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>

      {headerRow}
      <div style={cardStyle}>
        {loading ? (
          <p style={{ color: "var(--text-muted)", fontSize: 12, padding: "20px 0", textAlign: "center" }}>불러오는 중...</p>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.7, marginBottom: 12 }}>
              앨범 상세에서 🔖 탭하면<br />여기 쌓여요
            </p>
            <Link href="/albums" style={{ color: "var(--accent)", fontSize: 11, fontWeight: 600 }}>
              음반고 둘러보기 →
            </Link>
          </div>
        ) : (
          <>
            {visibleItems.map(({ album_id, albums }) => (
              <AlbumRow key={album_id} album_id={album_id} albums={albums} onSelect={setSelectedAlbum} />
            ))}
            {overflow > 0 && (
              <button
                onClick={() => setSheetOpen(true)}
                style={{
                  width: "100%", background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-muted)", fontSize: 12, fontWeight: 600,
                  padding: "12px 0 4px", textAlign: "center",
                }}
              >
                더보기 +{overflow}
              </button>
            )}
          </>
        )}
      </div>

      {/* 모바일 바텀시트 */}
      {sheetOpen && (
        <div
          onClick={() => setSheetOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 300, backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              backgroundColor: "var(--bg-card)",
              borderRadius: "16px 16px 0 0",
              maxHeight: "75dvh",
              display: "flex", flexDirection: "column",
              animation: "sheetUp 0.22s cubic-bezier(0.32,0.72,0,1)",
              paddingBottom: "env(safe-area-inset-bottom, 20px)",
            }}
          >
            {/* 핸들 */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "var(--border)" }} />
            </div>
            {/* 헤더 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px 12px" }}>
              <span style={{ color: "var(--text)", fontWeight: 700, fontSize: 15 }}>나중에 들을 앨범</span>
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{items.length}장</span>
              <button
                onClick={() => setSheetOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, lineHeight: 1, padding: 4 }}
              >✕</button>
            </div>
            {/* 목록 */}
            <div style={{ overflowY: "auto", flex: 1, padding: "0 20px" }}>
              {items.map(({ album_id, albums }) => (
                <AlbumRow
                  key={album_id}
                  album_id={album_id}
                  albums={albums}
                  onSelect={(a) => { setSheetOpen(false); setSelectedAlbum(a); }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

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
