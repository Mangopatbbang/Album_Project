"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlbumWithRatings, USERS } from "@/types";
import { scoreColor, glowBorder, glowShadow } from "@/lib/score";
import SpotifyAttribution from "@/components/ui/SpotifyAttribution";
import { useAuth } from "@/context/AuthContext";

type ArtistInfo = {
  label: string;
  debut_date: string;
  birth_date: string;
  country: string;
  note: string;
};

const EMPTY_INFO: ArtistInfo = { label: "", debut_date: "", birth_date: "", country: "", note: "" };

const INFO_FIELDS: { key: keyof ArtistInfo; label: string; placeholder: string }[] = [
  { key: "country",    label: "국적",    placeholder: "예) 대한민국" },
  { key: "debut_date", label: "데뷔",    placeholder: "예) 2012.05.05" },
  { key: "birth_date", label: "생년월일", placeholder: "예) 1995.03.01" },
  { key: "label",      label: "소속사",  placeholder: "예) HYBE" },
  { key: "note",       label: "메모",    placeholder: "자유롭게 기록" },
];

type Props = {
  artistName: string;        // API 조회용 spotify 정식 이름
  displayName?: string;      // 헤더 표시용 (variant 선택 시 한글명)
  onClose: () => void;
  onAlbumClick?: (album: AlbumWithRatings) => void;
};

export default function ArtistModal({ artistName, displayName, onClose, onAlbumClick }: Props) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [albums, setAlbums] = useState<AlbumWithRatings[]>([]);
  const [avgScore, setAvgScore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [closing, setClosing] = useState(false);

  const [artistImage, setArtistImage] = useState<string | null>(null);
  const [genres, setGenres] = useState<string[]>([]);

  const [info, setInfo] = useState<ArtistInfo | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<ArtistInfo>(EMPTY_INFO);
  const [saving, setSaving] = useState(false);

  const mouseDownOnBackdrop = useRef(false);

  useEffect(() => {
    setFetchError(false);
    setInfo(null);
    setEditMode(false);

    fetch(`/api/albums/by-artist?name=${encodeURIComponent(artistName)}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setAlbums(d.albums ?? []); setAvgScore(d.avg); })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));

    fetch(`/api/spotify/artist?name=${encodeURIComponent(artistName)}`)
      .then((r) => r.ok ? r.json() : { image_url: null, genres: [] })
      .then((d) => {
        if (d.image_url) setArtistImage(d.image_url);
        if (d.genres?.length) setGenres(d.genres.slice(0, 4));
      })
      .catch(() => {});

    fetch(`/api/artist-info?name=${encodeURIComponent(artistName)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setInfo(d);
          setEditValues({
            label:      d.label      ?? "",
            debut_date: d.debut_date ?? "",
            birth_date: d.birth_date ?? "",
            country:    d.country    ?? "",
            note:       d.note       ?? "",
          });
        } else {
          setEditValues(EMPTY_INFO);
        }
      })
      .catch(() => {});
  }, [artistName]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 180);
  };

  const handleEditOpen = () => {
    setEditValues(
      info
        ? { label: info.label ?? "", debut_date: info.debut_date ?? "", birth_date: info.birth_date ?? "", country: info.country ?? "", note: info.note ?? "" }
        : EMPTY_INFO
    );
    setEditMode(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/artist-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artist_name: artistName, ...editValues }),
      });
      if (!res.ok) throw new Error();
      setInfo({ ...editValues });
      setEditMode(false);
    } catch {
      alert("저장 실패. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  // 표시할 항목만 필터 (값 있는 것)
  const visibleFields = INFO_FIELDS.filter(
    (f) => info && info[f.key]
  );

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-4"
      style={{ zIndex: 110, backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === e.currentTarget; }}
      onMouseUp={(e) => { if (mouseDownOnBackdrop.current && e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="rounded-xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          width: "min(960px, 100%)",
          maxHeight: "88dvh",
          animation: closing ? "modalOut 0.18s ease forwards" : "modalIn 0.22s ease",
        }}
      >
        {/* 닫기 버튼 */}
        <div className="flex justify-end px-6 pt-5 shrink-0">
          <button
            onClick={handleClose}
            style={{ color: "var(--text-muted)", fontSize: 20, lineHeight: 1 }}
            className="hover:opacity-70 transition-opacity"
          >
            ✕
          </button>
        </div>

        {/* 아티스트 정보 영역 */}
        <div className="px-6 pb-5 shrink-0">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            {/* 아티스트 사진 */}
            <div style={{
              width: 72, height: 72, borderRadius: 10, flexShrink: 0,
              backgroundColor: "var(--bg-elevated)",
              border: artistImage ? "none" : "1px dashed var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
            }}>
              {artistImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={artistImage} alt={displayName ?? artistName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ color: "var(--border-light)", fontSize: 22 }}>♪</span>
              )}
            </div>

            {/* 이름 + 통계 + 장르 + 상세정보 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* 이름 + 편집 버튼 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ color: "var(--text)", fontWeight: 800, fontSize: 22, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                  {displayName ?? artistName}
                </h2>
                {isAdmin && !editMode && (
                  <button
                    onClick={handleEditOpen}
                    title="정보 편집"
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--text-muted)", padding: 2, lineHeight: 1,
                    }}
                    className="hover:opacity-60 transition-opacity"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* 청음사 통계 */}
              {!loading && (
                <div style={{ display: "flex", gap: 10, marginTop: 5, flexWrap: "wrap" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    앨범 <span style={{ color: "var(--text-sub)", fontWeight: 600 }}>{albums.length}</span>장
                  </span>
                  {avgScore && (
                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      평균 <span style={{ color: scoreColor(avgScore), fontWeight: 700 }}>{avgScore}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Spotify 장르 태그 */}
              {genres.length > 0 && (
                <div style={{ display: "flex", gap: 4, marginTop: 7, flexWrap: "wrap" }}>
                  {genres.map((g) => (
                    <span key={g} style={{
                      fontSize: 10, fontWeight: 600,
                      color: "var(--text-secondary)",
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      padding: "2px 6px",
                      letterSpacing: "0.02em",
                    }}>
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* 수동 상세정보 — 뷰 모드 */}
              {!editMode && visibleFields.length > 0 && (
                <div style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  columnGap: 10,
                  rowGap: 3,
                }}>
                  {visibleFields.map((f) => (
                    <React.Fragment key={f.key}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {f.label}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                        {info![f.key]}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* 수동 상세정보 — 편집 모드 */}
              {editMode && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 8, rowGap: 6 }}>
                    {INFO_FIELDS.map((f) => (
                      <React.Fragment key={f.key}>
                        <label style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center", whiteSpace: "nowrap" }}>
                          {f.label}
                        </label>
                        <input
                          value={editValues[f.key]}
                          onChange={(e) => setEditValues((v) => ({ ...v, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          style={{
                            fontSize: 11,
                            color: "var(--text)",
                            backgroundColor: "var(--bg-elevated)",
                            border: "1px solid var(--border)",
                            borderRadius: 5,
                            padding: "4px 8px",
                            outline: "none",
                            width: "100%",
                          }}
                        />
                      </React.Fragment>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
                    <button
                      onClick={() => setEditMode(false)}
                      disabled={saving}
                      style={{
                        fontSize: 12, padding: "5px 12px", borderRadius: 6, cursor: "pointer",
                        background: "none", border: "1px solid var(--border)", color: "var(--text-muted)",
                      }}
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        fontSize: 12, padding: "5px 12px", borderRadius: 6, cursor: saving ? "not-allowed" : "pointer",
                        backgroundColor: "var(--accent)", border: "none", color: "var(--bg)", fontWeight: 700,
                        opacity: saving ? 0.6 : 1,
                      }}
                    >
                      {saving ? "저장 중…" : "저장"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 구분선 */}
        <div style={{ height: 1, backgroundColor: "var(--border)" }} />

        {/* 앨범 그리드 */}
        <div className="overflow-y-auto px-6 pt-4 pb-8">
          {loading ? (
            <div className="flex justify-center py-16">
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>불러오는 중…</span>
            </div>
          ) : fetchError ? (
            <div className="flex justify-center py-16">
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>불러오기 실패 — 잠시 후 다시 시도해주세요</span>
            </div>
          ) : albums.length === 0 ? (
            <div className="flex justify-center py-16">
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>등록된 앨범이 없습니다</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {albums.map((album) => (
                <ArtistAlbumCard
                  key={album.id}
                  album={album}
                  onClick={onAlbumClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalIn  { from { opacity:0; transform:scale(0.95) translateY(8px) } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes modalOut { from { opacity:1; transform:scale(1) translateY(0) } to { opacity:0; transform:scale(0.95) translateY(8px) } }
      `}</style>
    </div>
  );
}

function ArtistAlbumCard({
  album,
  onClick,
}: {
  album: AlbumWithRatings;
  onClick?: (album: AlbumWithRatings) => void;
}) {
  return (
    <button
      onClick={() => onClick?.(album)}
      style={{
        backgroundColor: "var(--bg-elevated)",
        border: `1px solid ${glowBorder(album.avg)}`,
        textAlign: "left",
        width: "100%",
        boxShadow: glowShadow(album.avg),
        cursor: onClick ? "pointer" : "default",
      }}
      className="rounded-lg overflow-hidden transition-opacity hover:opacity-80 active:opacity-60"
    >
      {/* 커버 — 정사각형 */}
      <div
        style={{ backgroundColor: "var(--bg-card)", aspectRatio: "1/1" }}
        className="w-full flex items-center justify-center overflow-hidden"
      >
        {album.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover" />
        ) : (
          <span style={{ color: "var(--text-muted)", fontSize: 20 }}>♪</span>
        )}
      </div>

      {/* 점수 바 */}
      <div style={{ height: 2, backgroundColor: "var(--bg-card)" }}>
        {album.avg && (
          <div
            style={{
              height: "100%",
              width: `${(parseFloat(album.avg) / 10) * 100}%`,
              backgroundColor: scoreColor(album.avg),
              boxShadow: parseFloat(album.avg) >= 7 ? `0 0 4px ${scoreColor(album.avg)}` : "none",
              transition: "width 0.4s ease",
            }}
          />
        )}
      </div>

      {/* 정보 */}
      <div style={{ padding: "7px 8px 8px" }}>
        {/* 제목 + 평균점수 */}
        <div className="flex items-baseline justify-between gap-1">
          <p
            style={{ color: "var(--text)", fontWeight: 500, fontSize: 11, lineHeight: 1.3 }}
            className="truncate"
          >
            {album.title}
          </p>
          {album.avg && (
            <span style={{ color: scoreColor(album.avg), fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
              {album.avg}
            </span>
          )}
        </div>

        {/* 연도 + 장르 */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
            {album.year ?? album.release_date?.slice(0, 4) ?? ""}
          </span>
          {album.genre && (
            <span style={{
              fontSize: 9, color: "var(--text-muted)", backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)", borderRadius: 3, padding: "0px 4px",
              lineHeight: 1.6, flexShrink: 0, maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {album.genre}
            </span>
          )}
        </div>

        {/* 유저별 평점 */}
        <div className="flex items-center gap-0.5 flex-wrap mt-1">
          {USERS.map((user) => {
            const r = album.ratings.find((rt) => rt.user_id === user.id);
            if (!r) return null;
            return (
              <span key={user.id} style={{ fontSize: 9.5, color: scoreColor(r.score) }}>
                {user.emoji}{r.score}
              </span>
            );
          })}
        </div>
      </div>
    </button>
  );
}
