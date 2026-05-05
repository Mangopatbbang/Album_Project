"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { scoreColor } from "@/lib/score";
import { ClickableAlbumRow } from "./MembersAlbumModal";
import SpotifyAttribution from "@/components/ui/SpotifyAttribution";
import UserAvatar from "@/components/ui/UserAvatar";

type UserRef = { id: string; display_name: string };

export type PairData = {
  a: UserRef;
  b: UserRef;
  commonCount: number;
  diff: number | null;
};

export type AlbumSectionData = {
  id: string;
  title: string;
  artist: string;
  artist_display: string;
  cover_url: string | null;
  spotify_id?: string | null;
  avg: number;
  variance?: number;
  userScores: { userId: string; score: number }[];
};

const PREVIEW = 4;

function SectionModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)",
        zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div style={{
        backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 14, width: "100%", maxWidth: 560, maxHeight: "80vh",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 15 }}>{title}</p>
          <button onClick={onClose} style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
        <div style={{ overflowY: "auto", padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function MoreButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        marginTop: 8, width: "100%", padding: "8px 0",
        backgroundColor: "transparent", border: "1px solid var(--border)",
        borderRadius: 8, color: "var(--text-muted)", fontSize: 12,
        cursor: "pointer", transition: "all 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget).style.borderColor = "var(--border-light)"; (e.currentTarget).style.color = "var(--text)"; }}
      onMouseLeave={(e) => { (e.currentTarget).style.borderColor = "var(--border)"; (e.currentTarget).style.color = "var(--text-muted)"; }}
    >
      더보기 ({count}개)
    </button>
  );
}

function PairRow({ pair, avatarMap }: { pair: PairData; avatarMap: Record<string, string | null> }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 16px", backgroundColor: "var(--bg-elevated)", borderRadius: 8,
    }}>
      <span style={{ color: "var(--text-sub)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}>
        <UserAvatar avatarUrl={avatarMap[pair.a.id]} size={18} />
        <Link href={`/profile/${pair.a.id}`} style={{ color: "inherit", textDecoration: "none" }} className="hover:text-[var(--accent)] transition-colors">{pair.a.display_name}</Link>
        <span style={{ opacity: 0.4 }}>×</span>
        <UserAvatar avatarUrl={avatarMap[pair.b.id]} size={18} />
        <Link href={`/profile/${pair.b.id}`} style={{ color: "inherit", textDecoration: "none" }} className="hover:text-[var(--accent)] transition-colors">{pair.b.display_name}</Link>
      </span>
      <div style={{ textAlign: "right" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 11 }}>공통 {pair.commonCount}장</p>
        {pair.diff !== null && (
          <p style={{ color: pair.diff < 1.0 ? "var(--accent)" : "var(--text-sub)", fontSize: 12, fontWeight: 600 }}>
            앨범당 {pair.diff.toFixed(2)}점 차이
          </p>
        )}
      </div>
    </div>
  );
}

function AlbumRow({ album }: { album: AlbumSectionData }) {
  return (
    <ClickableAlbumRow album={album}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 4, overflow: "hidden", flexShrink: 0, backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          {album.cover_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 14 }}>♪</span></div>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{album.title}</p>
          <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{album.artist_display}</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {album.userScores.map(({ userId, score }) => (
            <span key={userId} style={{ color: scoreColor(score), fontSize: 12, fontWeight: 700 }}>{score}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <SpotifyAttribution spotifyId={album.spotify_id} />
          <span style={{ color: scoreColor(album.avg), fontWeight: 700, fontSize: 14, width: 32, textAlign: "right" }}>
            {album.variance !== undefined
              ? <span style={{ color: "var(--text-muted)", fontSize: 11 }}>σ {Math.sqrt(album.variance).toFixed(1)}</span>
              : album.avg.toFixed(1)
            }
          </span>
        </div>
      </div>
    </ClickableAlbumRow>
  );
}

export function PairsSection({ pairs, avatarMap }: { pairs: PairData[]; avatarMap: Record<string, string | null> }) {
  const [showModal, setShowModal] = useState(false);
  const preview = pairs.slice(0, PREVIEW);
  const hidden = pairs.length - PREVIEW;

  return (
    <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px", marginBottom: 24 }}>
      <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>취향 궁합</p>
      <div style={{ display: "grid", gridTemplateColumns: pairs.length > 3 ? "repeat(2, 1fr)" : "1fr", gap: 12 }}>
        {preview.map((pair) => (
          <PairRow key={`${pair.a.id}-${pair.b.id}`} pair={pair} avatarMap={avatarMap} />
        ))}
      </div>
      {hidden > 0 && <MoreButton count={hidden} onClick={() => setShowModal(true)} />}
      {showModal && (
        <SectionModal title="취향 궁합 전체" onClose={() => setShowModal(false)}>
          {pairs.map((pair) => (
            <PairRow key={`${pair.a.id}-${pair.b.id}`} pair={pair} avatarMap={avatarMap} />
          ))}
        </SectionModal>
      )}
    </div>
  );
}

export function UnanimousSection({ albums }: { albums: AlbumSectionData[] }) {
  const [showModal, setShowModal] = useState(false);
  const preview = albums.slice(0, PREVIEW);
  const hidden = albums.length - PREVIEW;

  if (albums.length === 0) return null;
  return (
    <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px", marginBottom: 24 }}>
      <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 4 }}>만장일치 명반</p>
      <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 16 }}>전원이 청음한 앨범 · 평균 높은 순</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {preview.map((album) => <AlbumRow key={album.id} album={album} />)}
      </div>
      {hidden > 0 && <MoreButton count={hidden} onClick={() => setShowModal(true)} />}
      {showModal && (
        <SectionModal title="만장일치 명반 전체" onClose={() => setShowModal(false)}>
          {albums.map((album) => <AlbumRow key={album.id} album={album} />)}
        </SectionModal>
      )}
    </div>
  );
}

export function ControversialSection({ albums }: { albums: AlbumSectionData[] }) {
  const [showModal, setShowModal] = useState(false);
  const preview = albums.slice(0, PREVIEW);
  const hidden = albums.length - PREVIEW;

  if (albums.length === 0) return null;
  return (
    <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px" }}>
      <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 4 }}>취향 충돌</p>
      <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 16 }}>전원이 청음했지만 점수 차이가 큰 앨범</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {preview.map((album) => <AlbumRow key={album.id} album={album} />)}
      </div>
      {hidden > 0 && <MoreButton count={hidden} onClick={() => setShowModal(true)} />}
      {showModal && (
        <SectionModal title="취향 충돌 전체" onClose={() => setShowModal(false)}>
          {albums.map((album) => <AlbumRow key={album.id} album={album} />)}
        </SectionModal>
      )}
    </div>
  );
}
