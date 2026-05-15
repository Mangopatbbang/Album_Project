"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import SoundCloudAddModal from "@/components/album/SoundCloudAddModal";
import { apiFetch } from "@/lib/apiFetch";

const GENRES = [
  "Hip-Hop", "R&B", "Pop", "Rock",
  "Electronic", "Folk", "Alternative", "Jazz", "Country", "OST", "Compilation", "Other",
];

const REGIONS = ["국내", "해외"] as const;

type SpotifyCandidate = {
  spotify_id: string;
  cover_url: string;
  name: string;
  artist: string;
  extra_artists: string;
  release_date: string | null;
};

type ArtistHint = {
  name: string;
  followers: number;
  image: string | null;
};

type DuplicateAlbum = {
  id: string;
  title: string;
  artist: string;
  cover_url?: string | null;
};

type Props = {
  onClose: () => void;
  onAdded: () => void;
  initialSearch?: string;
};

function CandidateItem({ c, selected, onSelect }: { c: SpotifyCandidate; selected: SpotifyCandidate | null; onSelect: (c: SpotifyCandidate) => void }) {
  const isSelected = selected?.spotify_id === c.spotify_id;
  return (
    <div
      onClick={() => onSelect(c)}
      style={{
        flexShrink: 0, width: 80, cursor: "pointer",
        opacity: selected && !isSelected ? 0.4 : 1,
        transition: "opacity 0.15s",
      }}
    >
      <div style={{
        width: 80, height: 80, borderRadius: 6, overflow: "hidden",
        border: `2px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
        backgroundColor: "var(--bg-elevated)", transition: "border-color 0.15s",
      }}>
        {c.cover_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={c.cover_url} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 20 }}>♪</span></div>
        }
      </div>
      <p style={{
        color: isSelected ? "var(--accent)" : "var(--text-muted)",
        fontSize: 10, marginTop: 4, lineHeight: 1.3,
        overflow: "hidden", display: "-webkit-box",
        WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
      }}>{c.name}</p>
      <p style={{ color: "var(--text-muted)", fontSize: 9, marginTop: 2, opacity: 0.7 }}>{c.artist}</p>
    </div>
  );
}

export default function AlbumAddModal({ onClose, onAdded, initialSearch }: Props) {
  const { showToast } = useToast();
  const { profile } = useAuth();
  const [title, setTitle] = useState(initialSearch ?? "");
  const [artist, setArtist] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [genre, setGenre] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [tracklist, setTracklist] = useState("");

  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [candidates, setCandidates] = useState<SpotifyCandidate[]>([]);
  const [showCandidatePopup, setShowCandidatePopup] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<SpotifyCandidate | null>(null);
  const [loadingTracklist, setLoadingTracklist] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateAlbum[]>([]);
  const [artistHints, setArtistHints] = useState<ArtistHint[]>([]);
  const [spotifyId, setSpotifyId] = useState<string | null>(null);
  const [extraArtists, setExtraArtists] = useState<string>("");
  const [region, setRegion] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [oneLineReview, setOneLineReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showSoundCloud, setShowSoundCloud] = useState(false);
  const [addedAlbumId, setAddedAlbumId] = useState<string | null>(null);
  const [aliasCheckDone, setAliasCheckDone] = useState(false);
  const [aliasExists, setAliasExists] = useState(false);
  const [aliasSuggestions, setAliasSuggestions] = useState<string[]>([]);
  const [aliasInput, setAliasInput] = useState("");
  const [aliasSaving, setAliasSaving] = useState(false);
  const [aliasSaved, setAliasSaved] = useState(false);

  const backdropRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);
  const dupCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // 제목+아티스트 입력 시 중복 체크 (debounce 500ms)
  const checkDuplicates = (titleVal: string, artistVal: string, coverUrlVal?: string) => {
    if (dupCheckRef.current) clearTimeout(dupCheckRef.current);
    setDuplicates([]);
    if (titleVal.trim().length < 2) return;
    dupCheckRef.current = setTimeout(async () => {
      const q = new URLSearchParams({ search: titleVal.trim() });
      const res = await fetch(`/api/albums?${q}&limit=10`);
      const data = await res.json();
      const titleLower = titleVal.trim().toLowerCase();
      const artistLower = artistVal.trim().toLowerCase();
      const matches = (data.items ?? []).filter((a: DuplicateAlbum) => {
        const exactTitle = a.title.toLowerCase() === titleLower;
        const exactArtist = artistLower.length < 2 || a.artist.toLowerCase() === artistLower;
        const coverMatch = !!coverUrlVal && !!a.cover_url && a.cover_url === coverUrlVal;
        return (exactTitle && exactArtist) || coverMatch;
      });
      setDuplicates(matches.slice(0, 3));
    }, 500);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSearchDone(false);
    setCandidates([]);
    setSelectedCandidate(null);
    checkDuplicates(val, artist);
  };

  const handleSpotifySearch = async () => {
    if (!title.trim() && !artist.trim()) return;
    setSearching(true);
    setSearchDone(false);
    setNotFound(false);
    setSearchError("");
    setCandidates([]);
    setArtistHints([]);
    setShowCandidatePopup(false);
    setSelectedCandidate(null);
    setError("");

    let data: { results?: SpotifyCandidate[]; error?: string; message?: string };
    try {
      const q = new URLSearchParams({ title: title.trim(), artist: artist.trim() });
      const res = await fetch(`/api/migrate/spotify/search?${q.toString()}`);
      data = await res.json();
    } catch {
      setSearching(false);
      setSearchDone(true);
      setSearchError("네트워크 오류: 검색 요청에 실패했습니다.");
      return;
    }

    setSearching(false);
    setSearchDone(true);

    if (data.error) {
      setSearchError(data.message ?? "Spotify 검색 오류가 발생했습니다.");
      return;
    }

    if (!data.results?.length) {
      setNotFound(true);
      // 아티스트명이 있으면 Spotify 실제 등록명 힌트 fetch
      if (artist.trim()) {
        fetch(`/api/spotify/artist-hint?artist=${encodeURIComponent(artist.trim())}`)
          .then((r) => r.json())
          .then((d) => setArtistHints(d.hints ?? []))
          .catch(() => {});
      }
      return;
    }

    const results = data.results!;

    // 제목+아티스트가 정확히 일치하는 결과 자동 선택
    const titleLower = title.trim().toLowerCase();
    const artistLower = artist.trim().toLowerCase();
    const exactMatch =
      results.find(
        (r) => r.name.toLowerCase() === titleLower && r.artist.toLowerCase() === artistLower
      ) ??
      results.find((r) => r.name.toLowerCase() === titleLower);

    if (exactMatch) {
      await handleSelectCandidate(exactMatch);
    } else {
      setCandidates(results);
    }
  };

  // 아티스트 필드 blur 시 아직 연결 안 됐으면 자동 검색
  const handleArtistBlur = () => {
    if (!spotifyId && !searching && !searchDone && title.trim() && artist.trim()) {
      handleSpotifySearch();
    }
  };

  const handleSelectCandidate = async (c: SpotifyCandidate) => {
    setSelectedCandidate(c);
    setTitle(c.name);
    setArtist(c.artist);
    setExtraArtists(c.extra_artists ?? "");
    setCoverUrl(c.cover_url);
    if (c.release_date) setReleaseDate(c.release_date);
    setSpotifyId(c.spotify_id);
    checkDuplicates(c.name, c.artist, c.cover_url); // Spotify 정확한 제목 + 커버 URL로 중복 재검사
    setLoadingTracklist(true);

    const trackRes = await fetch(`/api/spotify/tracks?id=${c.spotify_id}`);
    const trackData = await trackRes.json();
    setTracklist(trackData.tracklist ?? "");
    setLoadingTracklist(false);
  };

  const trackCount = tracklist.trim()
    ? tracklist.split(";").map((t) => t.trim()).filter(Boolean).length
    : null;
  const isSingle = trackCount !== null && trackCount <= 2;

  const handleSubmit = async () => {
    if (!title.trim() || !artist.trim()) {
      setError("제목과 아티스트는 필수입니다.");
      return;
    }
    if (isSingle) {
      setError("싱글 앨범은 등록할 수 없습니다. (수록곡 3개 이상)");
      return;
    }
    if (!spotifyId && !confirm("Spotify 연결 없이 등록하면 커버/트랙리스트가 없을 수 있어요. 그래도 등록할까요?")) {
      showToast("Spotify 검색 후 연결해주세요", "info");
      return;
    }
    setSaving(true);
    setError("");

    const res = await apiFetch("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        artist: artist.trim(),
        extra_artists: extraArtists || null,
        year: releaseDate ? releaseDate.slice(0, 4) : null,
        release_date: releaseDate || null,
        genre: genre || null,
        region: region || null,
        cover_url: coverUrl || null,
        tracklist: tracklist || null,
        spotify_id: spotifyId || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "저장 실패");
      setSaving(false);
      return;
    }

    const data = await res.json();

    if (score !== null) {
      await apiFetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId: data.id, score, one_line_review: oneLineReview || undefined }),
      });
    }

    setSaving(false);
    showToast(`${title} 입고 완료`);
    onAdded();
    setAddedAlbumId(data.id);

    const normFn = (s: string) => s.toLowerCase().replace(/[\s\(\)\-\.\',]/g, "").replace(/[^a-z0-9가-힣]/g, "");
    const artistNorm = normFn(artist.trim());
    Promise.all([
      apiFetch(`/api/admin/artist-aliases?artist=${encodeURIComponent(artist.trim())}`).then((r) => r.json()),
      apiFetch("/api/admin/artist-aliases").then((r) => r.json()),
    ]).then(([aliasData, allData]) => {
      if (aliasData.alias) {
        setAliasExists(true);
      } else {
        const suggestions: string[] = (allData.aliases ?? [])
          .filter((a: { spotify_name: string; variant_name: string }) =>
            normFn(a.spotify_name) === artistNorm || normFn(a.variant_name) === artistNorm
          )
          .map((a: { variant_name: string }) => a.variant_name)
          .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i);
        setAliasSuggestions(suggestions);
      }
      setAliasCheckDone(true);
    }).catch(() => {
      setAliasCheckDone(true);
    });
  };


  const inputStyle = {
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: 6,
    padding: "10px 14px",
    fontSize: 13,
    outline: "none",
    width: "100%",
  };

  const labelStyle = {
    color: "var(--text-muted)",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    marginBottom: 6,
    display: "block" as const,
  };

  // alias 체크 완료 후 alias 있으면 바로 닫기
  useEffect(() => {
    if (addedAlbumId && aliasCheckDone && aliasExists) onClose();
  }, [addedAlbumId, aliasCheckDone, aliasExists, onClose]);

  if (addedAlbumId && aliasCheckDone && !aliasExists) {
    return (
      <div
        style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)",
          zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}
      >
        <div style={{
          backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 14, width: "100%", maxWidth: 440,
          display: "flex", flexDirection: "column", gap: 16,
        }} className="p-5 sm:p-8">
          <div>
            <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 17, marginBottom: 4 }}>입고 완료</p>
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
              <span style={{ color: "#e8a53a" }}>⚠</span> &ldquo;{artist}&rdquo; 표시 이름이 없어요
            </p>
          </div>
          {aliasSaved ? (
            <p style={{ color: "var(--accent)", fontSize: 12 }}>✅ 표시 이름 설정 완료</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {aliasSuggestions.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {aliasSuggestions.map((s) => (
                    <button key={s} onClick={() => setAliasInput(s)} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 10, border: "1px solid #e8a53a", background: "rgba(232,165,58,0.1)", color: "#e8a53a", cursor: "pointer" }}>
                      💡 {s}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  placeholder={`${artist} 표시 이름 (예: 한글명)`}
                  style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", backgroundColor: "var(--bg-elevated)", color: "var(--text)", fontSize: 12, outline: "none" }}
                />
                <button
                  onClick={async () => {
                    if (!aliasInput.trim()) return;
                    setAliasSaving(true);
                    await apiFetch("/api/admin/artist-aliases", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ spotify_name: artist.trim(), variant_name: aliasInput.trim() }),
                    });
                    setAliasSaving(false);
                    setAliasSaved(true);
                  }}
                  disabled={!aliasInput.trim() || aliasSaving}
                  style={{ padding: "7px 14px", borderRadius: 6, border: "none", backgroundColor: "var(--accent)", color: "var(--bg)", fontSize: 12, fontWeight: 600, cursor: !aliasInput.trim() || aliasSaving ? "not-allowed" : "pointer", opacity: !aliasInput.trim() || aliasSaving ? 0.5 : 1 }}
                >
                  {aliasSaving ? "..." : "설정"}
                </button>
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", fontSize: 12, textDecoration: "underline", textDecorationStyle: "dotted",
            }}
          >나중에</button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div
      ref={backdropRef}
      onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === backdropRef.current; }}
      onMouseUp={(e) => { if (mouseDownOnBackdrop.current && e.target === backdropRef.current) onClose(); mouseDownOnBackdrop.current = false; }}
      style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)",
        zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{
        backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 14, width: "100%", maxWidth: 720, maxHeight: "90vh",
        overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", gap: 24,
      }} className="p-5 sm:p-8">
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 18 }}>음반 입고</p>
          <button onClick={onClose} style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 20 }} className="touch-target">×</button>
        </div>

        {/* 입고 워크플로 안내 — Spotify 연결 전에만 표시 */}
        {!selectedCandidate && (
          <div style={{
            padding: "12px 14px", borderRadius: 8,
            backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <p style={{ color: "var(--text-sub)", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 2 }}>입고 방법</p>
            {[
              ["1", "아티스트명과 음반 제목 입력 → Spotify 검색"],
              ["2", "결과 목록에서 앨범 선택 → 커버·트랙리스트·제목·아티스트 자동 입력"],
              ["3", "제목은 한글로 바꾸고 싶으면 자유롭게 수정 가능"],
              ["4", "발매일이 iTunes/Spotify 간 다를 경우 둘 중 하나 선택"],
              ["5", "장르와 국내/해외는 직접 선택 (필수 아님)"],
            ].map(([n, text]) => (
              <div key={n} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{
                  color: "var(--accent)", fontSize: 10, fontWeight: 700,
                  minWidth: 14, lineHeight: "18px",
                }}>{n}</span>
                <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: "18px" }}>{text}</p>
              </div>
            ))}
          </div>
        )}

        {/* 제목 + 아티스트 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>TITLE *</label>
            <input
              style={inputStyle}
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSpotifySearch(); }}
              placeholder="예: GNX, MTTE, 기상도"
            />
            {/* 중복 경고 */}
            {duplicates.length > 0 && (
              <div style={{
                marginTop: 8, padding: "10px 12px", borderRadius: 6,
                backgroundColor: "rgba(var(--error-rgb),0.08)", border: "1px solid rgba(var(--error-rgb),0.3)",
              }}>
                <p style={{ color: "var(--error)", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
                  이미 입고된 음반입니다
                </p>
                {duplicates.map((d) => (
                  <p key={d.id} style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    · {d.title} — {d.artist}
                  </p>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>ARTIST * (Spotify 정식명)</label>
            <input
              style={inputStyle}
              value={artist}
              onChange={(e) => { setArtist(e.target.value); setSearchDone(false); checkDuplicates(title, e.target.value); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSpotifySearch(); }}
              onBlur={handleArtistBlur}
              placeholder="예: Kendrick Lamar, NewJeans, 이소라"
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <button
              onClick={handleSpotifySearch}
              disabled={searching || (!title.trim() && !artist.trim())}
              style={{
                backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-light)",
                color: "var(--text-sub)", borderRadius: 6, padding: "8px 16px", fontSize: 13,
                cursor: searching || (!title.trim() && !artist.trim()) ? "not-allowed" : "pointer",
                opacity: searching || (!title.trim() && !artist.trim()) ? 0.5 : 1,
              }}
            >
              {searching ? "검색 중..." : "Spotify에서 검색"}
            </button>
            <a
              href="https://open.spotify.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 5, textDecoration: "none" }}
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="#1DB954" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Data provided by Spotify</span>
            </a>
          </div>

          {searchError && (
            <p style={{ color: "var(--error)", fontSize: 12, marginTop: 4 }}>
              ⚠ {searchError}
            </p>
          )}

          {searchDone && notFound && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                Spotify에서 찾지 못했습니다. 아티스트 영문명이 다를 수 있어요.
              </p>
              {artistHints.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600 }}>
                    혹시 이 아티스트를 찾으셨나요?
                  </p>
                  {artistHints.map((h) => (
                    <button
                      key={h.name}
                      type="button"
                      onClick={() => { setArtist(h.name); setArtistHints([]); setNotFound(false); setSearchDone(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        background: "var(--bg-elevated)", border: "1px solid var(--border)",
                        borderRadius: 6, padding: "6px 10px", cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {h.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={h.image} alt={h.name} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      )}
                      <div>
                        <p style={{ color: "var(--text)", fontSize: 12, fontWeight: 600 }}>{h.name}</p>
                        <p style={{ color: "var(--text-muted)", fontSize: 10 }}>팔로워 {h.followers.toLocaleString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 후보 목록 */}
          {candidates.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600 }}>
                  검색 결과 — 앨범을 선택하세요
                </p>
                {candidates.length > 5 && (
                  <button
                    onClick={() => setShowCandidatePopup(true)}
                    style={{ color: "var(--text-muted)", fontSize: 11, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                  >
                    더보기 ({candidates.length}개 전체)
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {candidates.slice(0, 5).map((c) => <CandidateItem key={c.spotify_id} c={c} selected={selectedCandidate} onSelect={handleSelectCandidate} />)}
              </div>
              {loadingTracklist && (
                <p style={{ color: "var(--text-muted)", fontSize: 11 }}>수록곡 불러오는 중...</p>
              )}
            </div>
          )}

          {/* 전체 후보 팝업 */}
          {showCandidatePopup && (
            <div
              onClick={() => setShowCandidatePopup(false)}
              style={{
                position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)",
                zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
                padding: 16,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: 14, width: "100%", maxWidth: 600, maxHeight: "80vh",
                  overflowY: "auto", display: "flex", flexDirection: "column", gap: 16,
                  padding: 24,
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 15 }}>검색 결과 전체 ({candidates.length}개)</p>
                  <button onClick={() => setShowCandidatePopup(false)} style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>×</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 12 }}>
                  {candidates.map((c) => (
                    <CandidateItem
                      key={c.spotify_id}
                      c={c}
                      selected={selectedCandidate}
                      onSelect={(candidate) => { handleSelectCandidate(candidate); setShowCandidatePopup(false); }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 커버 미리보기 + URL */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{
            width: 96, height: 96, flexShrink: 0, borderRadius: 8, overflow: "hidden",
            backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {coverUrl
              ? <img src={coverUrl} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />  // eslint-disable-line @next/next/no-img-element
              : <span style={{ color: "var(--text-muted)", fontSize: 28 }}>♪</span>
            }
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>COVER URL</label>
            <input
              style={inputStyle}
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="자동 입력 또는 직접 붙여넣기"
            />
          </div>
        </div>

        {/* 발매일 + 장르 + 국내/해외 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label style={labelStyle}>RELEASE DATE</label>
            <input
              style={inputStyle}
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={labelStyle}>장르</label>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={genre} onChange={(e) => setGenre(e.target.value)}>
                <option value="">선택 안함</option>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>국내 / 해외</label>
              <div style={{ display: "flex", gap: 6, height: 36 }}>
                {REGIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRegion(region === r ? "" : r)}
                    style={{
                      flex: 1, borderRadius: 6, border: "1px solid",
                      borderColor: region === r ? "var(--accent)" : "var(--border)",
                      backgroundColor: region === r ? "rgba(var(--accent-rgb), 0.12)" : "var(--bg-elevated)",
                      color: region === r ? "var(--accent)" : "var(--text-muted)",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 트랙리스트 */}
        <div>
          <label style={labelStyle}>수록곡</label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: "vertical", fontFamily: "inherit" }}
            value={tracklist}
            onChange={(e) => setTracklist(e.target.value)}
            placeholder="자동 입력 또는 직접 입력 (트랙은 ; 로 구분)"
          />
        </div>

        {/* 평점 (선택) */}
        <div>
          <label style={labelStyle}>SCORE (선택)</label>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScore(score === s ? null : s)}
                style={{
                  flex: "1 1 36px", height: 40, borderRadius: 8,
                  border: `1px solid ${score === s ? "var(--accent)" : "var(--border)"}`,
                  backgroundColor: score === s ? "rgba(var(--accent-rgb),0.12)" : "var(--bg-elevated)",
                  color: score === s ? "var(--accent)" : "var(--text)",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.12s",
                }}
              >{s}</button>
            ))}
          </div>
          {score !== null && (
            <input
              value={oneLineReview}
              onChange={(e) => setOneLineReview(e.target.value.slice(0, 100))}
              placeholder="한줄평 (선택, 최대 100자)"
              style={{ ...inputStyle, marginTop: 8 }}
            />
          )}
        </div>

        {isSingle && (
          <div style={{
            padding: "10px 12px", borderRadius: 6,
            backgroundColor: "rgba(var(--error-rgb),0.08)", border: "1px solid rgba(var(--error-rgb),0.3)",
          }}>
            <p style={{ color: "var(--error)", fontSize: 12, fontWeight: 600 }}>
              싱글은 등록할 수 없어요
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
              수록곡이 {trackCount}개입니다. 3개 이상인 앨범만 등록 가능해요.
            </p>
          </div>
        )}

        {error && <p style={{ color: "var(--error)", fontSize: 12 }}>{error}</p>}

        {/* 버튼 */}
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={() => setShowSoundCloud(true)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", fontSize: 10, opacity: 0.5,
              padding: 0, textDecoration: "underline", textDecorationStyle: "dotted",
            }}
          >
            SoundCloud 앨범 입고하기
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{
              backgroundColor: "transparent", border: "1px solid var(--border)",
              color: "var(--text)", borderRadius: 6, padding: "8px 20px", fontSize: 13, cursor: "pointer",
            }}>취소</button>
            <button onClick={handleSubmit} disabled={saving || duplicates.length > 0 || isSingle} style={{
              backgroundColor: "var(--accent)", border: "none", color: "var(--bg)",
              borderRadius: 6, padding: "8px 20px", fontSize: 13, fontWeight: 600,
              cursor: saving || duplicates.length > 0 || isSingle ? "not-allowed" : "pointer",
              opacity: saving || duplicates.length > 0 || isSingle ? 0.4 : 1,
            }}>
              {saving ? "입고 중..." : "입고"}
            </button>
          </div>
        </div>
      </div>
    </div>

    {showSoundCloud && (
      <SoundCloudAddModal
        onClose={() => setShowSoundCloud(false)}
        onAdded={() => { setShowSoundCloud(false); onAdded(); onClose(); }}
      />
    )}
    </>
  );
}
