"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { openTutorial } from "@/components/ui/TutorialModal";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/apiFetch";
import AlbumModal from "@/components/album/AlbumModal";
import { AlbumWithRatings } from "@/types";
import FilterSelect from "@/components/ui/FilterSelect";
import AdminDataTab from "./AdminDataTab";

type SpotifyCandidate = {
  spotify_id: string;
  name: string;
  artist: string;
  cover_url: string;
  release_date: string;
};

type MigrateResult = {
  done: boolean;
  processed: number;
  success: number;
  notFound: number;
  remaining: number;
  nextOffset: number;
};

type AlbumRow = {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  spotify_id: string | null;
};

type Stats = {
  total: number;
  hasSpotify: number;
  hasCover: number;
  hasTracklist: number;
};

type ItunesMismatch = {
  id: string;
  title: string;
  artist: string;
  dbDate: string;
  itunesDate: string;
  fixed?: boolean;
};

type AliasRow = { spotify_name: string; variant_name: string };
type UnifiedRow = { spotify_name: string; variant_name: string | null; fuzzyGroup?: string; isNew?: boolean };

type LogRow = {
  id: number;
  created_at: string;
  user_id: string | null;
  action: string;
  album_id: string | null;
  album_title: string | null;
  album_artist: string | null;
  details: Record<string, unknown> | null;
};

type ReportRow = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  detail: string | null;
  status: string;
  created_at: string;
};

export default function AdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "albums" | "artists" | "migration" | "reports" | "data">("overview");

  // --- 활동 로그 ---
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsAction, setLogsAction] = useState<string>("");
  const [logsClearLoading, setLogsClearLoading] = useState(false);
  const [logAlbumModal, setLogAlbumModal] = useState<AlbumWithRatings | null>(null);

  async function loadLogs(action?: string) {
    setLogsLoading(true);
    const params = new URLSearchParams({ limit: "80" });
    if (action) params.set("action", action);
    const res = await adminFetch(`/api/admin/logs?${params}`);
    const data = await res.json();
    setLogs(data.logs ?? []);
    setLogsLoading(false);
  }

  async function handleClearLogs() {
    if (!confirm("15일 이전 로그를 모두 삭제할까요?")) return;
    setLogsClearLoading(true);
    const res = await adminFetch("/api/admin/logs", { method: "DELETE" });
    const data = await res.json();
    setLogsClearLoading(false);
    if (res.ok) {
      alert(`${data.deleted ?? 0}건 삭제됨`);
      if (logs !== null) loadLogs(logsAction || undefined);
    }
  }

  // --- 아티스트 사진 관리 ---
  const [artistPhotoList, setArtistPhotoList] = useState<string[] | null>(null);
  const [artistPhotoOverrides, setArtistPhotoOverrides] = useState<Record<string, string>>({});
  const [artistPhotoListLoading, setArtistPhotoListLoading] = useState(false);
  const [editingArtistPhoto, setEditingArtistPhoto] = useState<string | null>(null);
  const [artistPhotoInput, setArtistPhotoInput] = useState("");
  const [artistPhotoMsg, setArtistPhotoMsg] = useState("");

  async function loadArtistPhotoSection() {
    setArtistPhotoListLoading(true);
    const [r1, r2] = await Promise.all([
      adminFetch("/api/admin/artist-aliases?distinct=true"),
      adminFetch("/api/admin/artist-images"),
    ]);
    const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
    setArtistPhotoList(d1.artists ?? []);
    const overrideMap: Record<string, string> = {};
    for (const o of (d2.overrides ?? []) as { artist_name: string; image_url: string }[]) {
      overrideMap[o.artist_name] = o.image_url;
    }
    setArtistPhotoOverrides(overrideMap);
    setArtistPhotoListLoading(false);
  }

  async function handleSaveArtistPhoto(artistName: string) {
    if (!artistPhotoInput.trim()) return;
    const res = await adminFetch("/api/admin/artist-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artist_name: artistName, image_url: artistPhotoInput.trim() }),
    });
    if (res.ok) {
      setArtistPhotoOverrides((prev) => ({ ...prev, [artistName]: artistPhotoInput.trim() }));
      setArtistPhotoMsg(`✅ "${artistName}" 사진 저장됨`);
      setEditingArtistPhoto(null);
      setArtistPhotoInput("");
    } else {
      const d = await res.json();
      setArtistPhotoMsg(`❌ ${d.error}`);
    }
  }

  async function handleDeleteArtistPhoto(artistName: string) {
    const res = await adminFetch("/api/admin/artist-images", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artist_name: artistName }),
    });
    if (res.ok) {
      setArtistPhotoOverrides((prev) => { const n = { ...prev }; delete n[artistName]; return n; });
      setArtistPhotoMsg(`✅ "${artistName}" 오버라이드 삭제됨 (Spotify 자동으로 복귀)`);
      setEditingArtistPhoto(null);
      setArtistPhotoInput("");
    }
  }

  // --- 신고 관리 ---
  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsStatusFilter, setReportsStatusFilter] = useState<string>("pending");

  async function loadReports(status?: string) {
    setReportsLoading(true);
    const params = new URLSearchParams();
    if (status && status !== "all") params.set("status", status);
    const res = await adminFetch(`/api/admin/reports?${params}`);
    const data = await res.json();
    setReports(data.reports ?? []);
    setReportsLoading(false);
  }

  async function handleReportAction(reportId: string, action: "dismiss" | "warn" | "ban_7d" | "ban_14d" | "ban_permanent") {
    const confirmMessages: Record<string, string> = {
      warn: "경고를 발송하시겠습니까?",
      ban_7d: "7일 이용 정지 처리하시겠습니까?",
      ban_14d: "14일 이용 정지 처리하시겠습니까?",
      ban_permanent: "영구 이용 정지 처리하시겠습니까?",
    };
    if (confirmMessages[action] && !confirm(confirmMessages[action])) return;
    const res = await adminFetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, action }),
    });
    if (res.ok) loadReports(reportsStatusFilter !== "all" ? reportsStatusFilter : undefined);
  }

  async function handleUnban(userId: string) {
    if (!confirm(`@${userId} 밴을 해제하시겠습니까?`)) return;
    await adminFetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unbanUserId: userId }),
    });
    loadReports(reportsStatusFilter !== "all" ? reportsStatusFilter : undefined);
  }

  // --- 통계 ---
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsFilter, setStatsFilter] = useState<"no_spotify" | "no_cover" | "no_tracklist" | null>(null);
  const [statsAlbums, setStatsAlbums] = useState<AlbumRow[]>([]);
  const [statsAlbumsLoading, setStatsAlbumsLoading] = useState(false);

  async function loadStats() {
    setStatsLoading(true);
    const res = await adminFetch("/api/admin/stats");
    const data = await res.json();
    setStats(data);
    setStatsLoading(false);
    setStatsFilter(null);
    setStatsAlbums([]);
  }

  async function loadStatsAlbums(filter: "no_spotify" | "no_cover" | "no_tracklist") {
    if (statsFilter === filter) { setStatsFilter(null); setStatsAlbums([]); return; }
    setStatsFilter(filter);
    setStatsAlbumsLoading(true);
    const res = await adminFetch(`/api/admin/albums?filter=${filter}&limit=500`);
    const data = await res.json();
    setStatsAlbums(data.albums ?? []);
    setStatsAlbumsLoading(false);
  }

  // --- 아티스트 별칭 관리 ---
  const [aliases, setAliases] = useState<AliasRow[]>([]);
  const [aliasesLoading, setAliasesLoading] = useState(false);
  const [unaliasedArtists, setUnaliasedArtists] = useState<string[]>([]);
  const [unaliasedLoading, setUnaliasedLoading] = useState(false);
  const [unaliasedSearch, setUnaliasedSearch] = useState("");
  const [listMode, setListMode] = useState<"aliases" | "unaliased" | null>(null);
  const [newSpotifyName, setNewSpotifyName] = useState("");
  const [newVariantName, setNewVariantName] = useState("");
  const [aliasMsg, setAliasMsg] = useState("");
  const [editingAlias, setEditingAlias] = useState<string | null>(null); // spotify_name being edited
  const [editVariant, setEditVariant] = useState("");
  // 표시 이름 variant 통계
  const [variantStats, setVariantStats] = useState<Record<string, { total: number; using: number }>>({});

  // 검색 alias 확장 관리
  const [expandedAlias, setExpandedAlias] = useState<string | null>(null);
  const [searchAliasMap, setSearchAliasMap] = useState<Record<string, { id: number; alias: string }[]>>({});
  const [searchAliasInput, setSearchAliasInput] = useState("");
  const [searchAliasLoading, setSearchAliasLoading] = useState(false);
  const [searchAliasMsg, setSearchAliasMsg] = useState<Record<string, string>>({});
  // canonical name change (admin only)
  const [canonicalAlbumId, setCanonicalAlbumId] = useState("");
  const [canonicalArtist, setCanonicalArtist] = useState("");
  const [canonicalMsg, setCanonicalMsg] = useState("");

  // 통합 아티스트 테이블
  const [unifiedRows, setUnifiedRows] = useState<UnifiedRow[] | null>(null);
  const [unifiedLoading, setUnifiedLoading] = useState(false);
  const [unifiedPending, setUnifiedPending] = useState<Record<string, string>>({});
  const [unifiedSearch, setUnifiedSearch] = useState("");
  const [unifiedFilter, setUnifiedFilter] = useState<"all" | "aliased" | "unaliased">("all");
  const [unifiedSaving, setUnifiedSaving] = useState(false);
  const [unifiedMsg, setUnifiedMsg] = useState("");


  async function loadAliases() {
    if (listMode === "aliases") { setListMode(null); setAliases([]); return; }
    setAliasesLoading(true);
    setListMode("aliases");
    setUnaliasedArtists([]);
    const [res1, res2] = await Promise.all([
      adminFetch("/api/admin/artist-aliases"),
      adminFetch("/api/admin/artist-use-variant"),
    ]);
    const [d1, d2] = await Promise.all([res1.json(), res2.json()]);
    setAliases(d1.aliases ?? []);
    setVariantStats(d2.stats ?? {});
    setAliasesLoading(false);
  }

  async function loadUnaliased() {
    if (listMode === "unaliased") { setListMode(null); setUnaliasedArtists([]); return; }
    setUnaliasedLoading(true);
    setListMode("unaliased");
    setAliases([]);
    const res = await adminFetch("/api/admin/artist-aliases?unaliased=true");
    const data = await res.json();
    setUnaliasedArtists(data.artists ?? []);
    setUnaliasedLoading(false);
  }

  // 현재 열린 목록을 토글 없이 새로고침
  async function refreshCurrentList(mode: "aliases" | "unaliased" | null) {
    if (mode === "aliases") {
      const [res1, res2] = await Promise.all([
        adminFetch("/api/admin/artist-aliases"),
        adminFetch("/api/admin/artist-use-variant"),
      ]);
      const [d1, d2] = await Promise.all([res1.json(), res2.json()]);
      setAliases(d1.aliases ?? []);
      setVariantStats(d2.stats ?? {});
    } else if (mode === "unaliased") {
      const res = await adminFetch("/api/admin/artist-aliases?unaliased=true");
      const data = await res.json();
      setUnaliasedArtists(data.artists ?? []);
    }
  }

  async function handleAddAlias() {
    if (!newSpotifyName.trim() || !newVariantName.trim()) return;
    const res = await adminFetch("/api/admin/artist-aliases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spotify_name: newSpotifyName.trim(), variant_name: newVariantName.trim() }),
    });
    if (res.ok) {
      setAliasMsg(`✅ ${newSpotifyName} → ${newVariantName} 저장됨`);
      setNewSpotifyName(""); setNewVariantName("");
      await refreshCurrentList(listMode);
    } else {
      const d = await res.json();
      setAliasMsg(`❌ ${d.error}`);
    }
  }

  async function handleSaveEditAlias() {
    if (!editingAlias || !editVariant.trim()) return;
    const res = await adminFetch("/api/admin/artist-aliases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spotify_name: editingAlias, variant_name: editVariant.trim() }),
    });
    if (res.ok) {
      setAliasMsg(`✅ ${editingAlias} 수정됨`);
      setEditingAlias(null); setEditVariant("");
      await refreshCurrentList(listMode);
    } else {
      const d = await res.json();
      setAliasMsg(`❌ ${d.error}`);
    }
  }

  async function handleDeleteAlias(spotify_name: string) {
    if (!confirm(`"${spotify_name}" 별칭을 삭제할까요?`)) return;
    const res = await adminFetch("/api/admin/artist-aliases", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spotify_name }),
    });
    if (res.ok) {
      setAliasMsg(`✅ ${spotify_name} 삭제됨 (앨범 원래이름으로 복원)`);
      await refreshCurrentList(listMode);
    } else {
      const d = await res.json();
      setAliasMsg(`❌ ${d.error}`);
    }
  }

  async function handleSetVariant(spotify_name: string, use_variant: boolean) {
    const patchRes = await adminFetch("/api/admin/artist-use-variant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spotify_name, use_variant }),
    });
    const patchData = await patchRes.json();
    if (!patchRes.ok) {
      setAliasMsg(`❌ ${patchData.error ?? "오류 발생"}`);
      return;
    }
    if (patchData.updated === 0) {
      setAliasMsg(`⚠️ "${spotify_name}" — 일치하는 앨범 없음 (artist 필드 불일치 확인 필요)`);
    } else {
      setAliasMsg(`✅ ${spotify_name}: ${patchData.updated}개 앨범 ${use_variant ? "별칭" : "원래이름"}으로 변경`);
    }
    const res = await adminFetch("/api/admin/artist-use-variant");
    const data = await res.json();
    setVariantStats(data.stats ?? {});
  }

  function toggleSearchAliases(spotify_name: string) {
    setExpandedAlias(expandedAlias === spotify_name ? null : spotify_name);
    setSearchAliasInput("");
    setSearchAliasMsg((prev) => ({ ...prev, [spotify_name]: "" }));
  }

  async function handleAddSearchAlias(spotify_name: string) {
    if (!searchAliasInput.trim()) return;
    const res = await adminFetch("/api/admin/artist-search-aliases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spotify_name, alias: searchAliasInput.trim() }),
    });
    if (res.ok) {
      setSearchAliasInput("");
      // 목록 갱신
      const r2 = await adminFetch(`/api/admin/artist-search-aliases?artist=${encodeURIComponent(spotify_name)}`);
      const d2 = await r2.json();
      setSearchAliasMap((prev) => ({ ...prev, [spotify_name]: d2.aliases ?? [] }));
      setSearchAliasMsg((prev) => ({ ...prev, [spotify_name]: "" }));
    } else {
      const d = await res.json();
      setSearchAliasMsg((prev) => ({ ...prev, [spotify_name]: d.error }));
    }
  }

  async function handleDeleteSearchAlias(spotify_name: string, id: number) {
    const res = await adminFetch("/api/admin/artist-search-aliases", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const d = await res.json();
      setSearchAliasMsg((prev) => ({ ...prev, [spotify_name]: d.error ?? "삭제 실패" }));
      return;
    }
    setSearchAliasMap((prev) => ({
      ...prev,
      [spotify_name]: (prev[spotify_name] ?? []).filter((a) => a.id !== id),
    }));
  }

  async function handleCanonicalChange() {
    if (!canonicalAlbumId.trim() || !canonicalArtist.trim()) return;
    const res = await adminFetch("/api/admin/artist-canonical", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ album_id: canonicalAlbumId.trim(), artist: canonicalArtist.trim() }),
    });
    if (res.ok) {
      setCanonicalMsg(`✅ 앨범 ${canonicalAlbumId} 아티스트 → "${canonicalArtist}" 변경됨`);
      setCanonicalAlbumId(""); setCanonicalArtist("");
    } else {
      const d = await res.json();
      setCanonicalMsg(`❌ ${d.error}`);
    }
  }

  // 통합 아티스트 테이블
  function normalizeForFuzzy(name: string): string {
    return name.toLowerCase().replace(/[\s\(\)\-\.\',]/g, "").replace(/[^a-z0-9가-힣]/g, "");
  }

  async function loadUnifiedTable(markCurrentAsSeen = false) {
    const SEEN_KEY = "admin_seen_artists";
    const VIEW_KEY = "admin_new_artist_views";

    setUnifiedLoading(true);
    setUnifiedMsg("");
    setUnifiedFilter("all");
    setSearchAliasMsg({});

    // ↺ 클릭 시: NEW 아티스트 카운트 증가 → 5회 도달 시 자동 seen 처리
    if (markCurrentAsSeen && unifiedRows) {
      const seenEarly = new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[]);
      const vc: Record<string, number> = JSON.parse(localStorage.getItem(VIEW_KEY) ?? "{}");
      let changed = false;
      for (const r of unifiedRows) {
        if (!seenEarly.has(r.spotify_name)) {
          vc[r.spotify_name] = (vc[r.spotify_name] ?? 0) + 1;
          if (vc[r.spotify_name] >= 5) {
            seenEarly.add(r.spotify_name);
            delete vc[r.spotify_name];
            changed = true;
          }
        }
      }
      if (changed) localStorage.setItem(SEEN_KEY, JSON.stringify([...seenEarly]));
      localStorage.setItem(VIEW_KEY, JSON.stringify(vc));
    }

    const [r1, r2, r3, r4] = await Promise.all([
      adminFetch("/api/admin/artist-aliases?distinct=true"),
      adminFetch("/api/admin/artist-aliases"),
      adminFetch("/api/admin/artist-search-aliases?all=true"),
      adminFetch("/api/admin/artist-use-variant"),
    ]);
    const [d1, d2, d3, d4] = await Promise.all([r1.json(), r2.json(), r3.json(), r4.json()]);
    const allArtists: string[] = d1.artists ?? [];
    const aliasMap = new Map<string, string>((d2.aliases ?? []).map((a: AliasRow) => [a.spotify_name, a.variant_name]));

    // NEW 배지: 처음 로드면 전부 seen으로 저장(배지 없음), 이후엔 unseen만 NEW
    const seenRaw = localStorage.getItem(SEEN_KEY);
    let seenSet: Set<string>;
    if (!seenRaw) {
      seenSet = new Set(allArtists);
      localStorage.setItem(SEEN_KEY, JSON.stringify(allArtists));
    } else {
      seenSet = new Set(JSON.parse(seenRaw) as string[]);
    }

    const normGroups = new Map<string, string[]>();
    for (const a of allArtists) {
      const n = normalizeForFuzzy(a);
      if (!normGroups.has(n)) normGroups.set(n, []);
      normGroups.get(n)!.push(a);
    }

    const rows: UnifiedRow[] = allArtists.map((a) => ({
      spotify_name: a,
      variant_name: aliasMap.get(a) ?? null,
      fuzzyGroup: (normGroups.get(normalizeForFuzzy(a))?.length ?? 0) > 1 ? normalizeForFuzzy(a) : undefined,
      isNew: !seenSet.has(a),
    })).sort((a, b) => {
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      if (a.fuzzyGroup && !b.fuzzyGroup) return -1;
      if (!a.fuzzyGroup && b.fuzzyGroup) return 1;
      if (!a.variant_name && b.variant_name) return -1;
      if (a.variant_name && !b.variant_name) return 1;
      return a.spotify_name.localeCompare(b.spotify_name);
    });

    // 검색 alias 전체 pre-load
    const allSA: { id: number; spotify_name: string; alias: string }[] = d3.aliases ?? [];
    const newSAMap: Record<string, { id: number; alias: string }[]> = {};
    for (const sa of allSA) {
      if (!newSAMap[sa.spotify_name]) newSAMap[sa.spotify_name] = [];
      newSAMap[sa.spotify_name].push({ id: sa.id, alias: sa.alias });
    }
    setSearchAliasMap(newSAMap);
    setVariantStats(d4.stats ?? {});

    setUnifiedRows(rows);
    setUnifiedPending({});
    setExpandedAlias(null);
    setUnifiedLoading(false);
  }

  async function saveUnifiedPending() {
    const entries = Object.entries(unifiedPending).filter(([k, v]) => {
      const existing = unifiedRows?.find((r) => r.spotify_name === k)?.variant_name ?? "";
      return v.trim() !== existing;
    });
    if (!entries.length) return;
    setUnifiedSaving(true);
    let saved = 0;
    for (const [spotify_name, variant_name] of entries) {
      if (!variant_name.trim()) continue;
      const res = await adminFetch("/api/admin/artist-aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotify_name, variant_name: variant_name.trim() }),
      });
      if (res.ok) saved++;
    }
    setUnifiedSaving(false);
    setUnifiedMsg(`✅ ${saved}개 저장됨`);
    setUnifiedPending({});
    await loadUnifiedTable();
  }

  async function handleDeleteFromUnified(spotify_name: string) {
    if (!confirm(`"${spotify_name}" 별칭을 삭제할까요?`)) return;
    const res = await adminFetch("/api/admin/artist-aliases", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spotify_name }),
    });
    if (res.ok) {
      setUnifiedMsg(`✅ ${spotify_name} 삭제됨`);
      await loadUnifiedTable();
    } else {
      const d = await res.json();
      setUnifiedMsg(`❌ ${d.error}`);
    }
  }

  // --- 마이그레이션 (Spotify 전체) ---
  const [running, setRunning] = useState(false);
  const [migLog, setMigLog] = useState<string[]>([]);
  const [totalSuccess, setTotalSuccess] = useState(0);
  const [totalNotFound, setTotalNotFound] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const stopRef = useRef(false);

  // --- 트랙리스트 전용 마이그레이션 ---
  const [trackRunning, setTrackRunning] = useState(false);
  const [trackLog, setTrackLog] = useState<string[]>([]);
  const [trackRemaining, setTrackRemaining] = useState<number | null>(null);
  const trackStopRef = useRef(false);

  // --- 재생시간 백필 ---
  const [durRunning, setDurRunning] = useState(false);
  const [durLog, setDurLog] = useState<string[]>([]);
  const [durTotal, setDurTotal] = useState<number | null>(null);
  const [durDone, setDurDone] = useState(0);
  const [durRemaining, setDurRemaining] = useState<number | null>(null);
  const durStopRef = useRef(false);

  async function runTracklistMigration() {
    setTrackRunning(true);
    trackStopRef.current = false;
    setTrackLog([]);
    let offset = 0;
    let batchNum = 0;

    while (!trackStopRef.current) {
      batchNum++;
      setTrackLog((prev) => [...prev, `배치 ${batchNum} 처리 중...`]);
      try {
        const res = await fetch("/api/migrate/tracklist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offset }),
        });
        const data = await res.json();

        if (data.retryAfter) {
          const wait = data.retryAfter;
          setTrackLog((prev) => [...prev, `  ⚠️ rate limit — ${wait}초 대기 중...`]);
          await new Promise((r) => setTimeout(r, wait * 1000));
          continue; // offset 그대로 재시도
        }

        if (data.remaining !== null) setTrackRemaining(data.remaining);
        setTrackLog((prev) => [
          ...prev,
          `  ✓ ${data.success}개 성공, ${data.failed}개 실패 | 남은: ${data.remaining ?? "?"}개${data.firstError ? ` | ${data.firstError}` : ""}`,
        ]);

        if (data.done || data.processed === 0) {
          setTrackLog((prev) => [...prev, "✅ 트랙리스트 완료!"]);
          break;
        }

        offset = data.nextOffset;
        await new Promise((r) => setTimeout(r, 1000));
      } catch (e) {
        setTrackLog((prev) => [...prev, `❌ 오류: ${String(e)}`]);
        break;
      }
    }

    setTrackRunning(false);
  }

  async function runDurationBackfill() {
    setDurRunning(true);
    durStopRef.current = false;
    setDurLog([]);
    setDurDone(0);

    // 총 개수 먼저 확인
    try {
      const countRes = await apiFetch("/api/admin/backfill-durations");
      const countData = await countRes.json();
      const total = countData.remaining ?? 0;
      setDurTotal(total);
      setDurRemaining(total);
      if (total === 0) {
        setDurLog(["✅ 이미 모든 앨범에 재생시간이 있어요."]);
        setDurRunning(false);
        return;
      }
      setDurLog([`총 ${total}개 처리 시작...`]);
    } catch (e) {
      setDurLog([`❌ 오류: ${String(e)}`]);
      setDurRunning(false);
      return;
    }

    let batchNum = 0;
    while (!durStopRef.current) {
      batchNum++;
      try {
        const res = await apiFetch("/api/admin/backfill-durations", { method: "POST" });
        const data = await res.json();

        if (data.error) {
          setDurLog((prev) => [...prev, `❌ 서버 오류: ${data.error}`]);
          break;
        }

        if (data.rateLimited) {
          const wait = data.retryAfter ?? 10;
          setDurLog((prev) => [...prev, `⚠️ Spotify 레이트 리밋 — ${wait}초 대기 후 재시도...`]);
          for (let t = wait; t > 0 && !durStopRef.current; t--) {
            setDurLog((prev) => {
              const next = [...prev];
              next[next.length - 1] = `⚠️ Spotify 레이트 리밋 — ${t}초 후 재시도...`;
              return next;
            });
            await new Promise((r) => setTimeout(r, 1000));
          }
          if (!durStopRef.current) batchNum--;
          continue;
        }

        setDurDone((prev) => prev + (data.updated ?? 0));
        if (data.remaining !== null) setDurRemaining(data.remaining);

        const errNote = data.errors?.length ? ` · 오류 ${data.errors.length}건: ${data.errors[0]}` : "";
        setDurLog((prev) => [
          ...prev,
          `배치 ${batchNum}: ${data.updated}개 완료 · 남은: ${data.remaining ?? "?"}개${errNote}`,
        ]);

        if (data.done) {
          setDurLog((prev) => [...prev, "✅ 재생시간 백필 완료!"]);
          break;
        }
        await new Promise((r) => setTimeout(r, 800));
      } catch (e) {
        setDurLog((prev) => [...prev, `❌ 네트워크 오류: ${String(e)}`]);
        break;
      }
    }
    setDurRunning(false);
  }

  async function runMigration() {
    setRunning(true);
    stopRef.current = false;
    setMigLog([]);
    let offset = 0;
    let batchNum = 0;

    while (!stopRef.current) {
      batchNum++;
      setMigLog((prev) => [...prev, `배치 ${batchNum} 요청 중... (offset: ${offset})`]);
      try {
        const res = await fetch("/api/migrate/spotify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offset }),
        });
        const data: MigrateResult = await res.json();

        setTotalSuccess((s) => s + data.success);
        setTotalNotFound((n) => n + data.notFound);
        setRemaining(data.remaining);

        setMigLog((prev) => [
          ...prev,
          `  ✓ ${data.success}개 성공, ${data.notFound}개 미매칭 | 남은 앨범: ${data.remaining}개`,
        ]);

        if (data.done || data.processed === 0) {
          setMigLog((prev) => [...prev, "✅ 마이그레이션 완료!"]);
          break;
        }

        offset = data.nextOffset;
        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        setMigLog((prev) => [...prev, `❌ 오류: ${String(e)}`]);
        break;
      }
    }

    setRunning(false);
  }

  // --- 발매일 일괄 채우기 ---
  const [dateRunning, setDateRunning] = useState(false);
  const [dateLog, setDateLog] = useState<string[]>([]);
  const [dateRemaining, setDateRemaining] = useState<number | null>(null);
  const [dateStartBatch, setDateStartBatch] = useState(1);
  const dateStopRef = useRef(false);

  async function runDateBackfill(force = false) {
    setDateRunning(true);
    dateStopRef.current = false;
    const startOffset = (dateStartBatch - 1) * 30;
    setDateLog([force ? `⚡ 강제 전체 갱신 — 배치 ${dateStartBatch}(offset ${startOffset})부터 시작...` : `▶ 빈 항목만 채우기 — 배치 ${dateStartBatch}부터 시작...`]);
    let offset = startOffset;
    let batchNum = dateStartBatch - 1;

    while (!dateStopRef.current) {
      batchNum++;
      setDateLog((prev) => [...prev, `배치 ${batchNum} 처리 중...`]);
      try {
        const res = await adminFetch("/api/admin/backfill-release-dates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offset, force }),
        });
        const data = await res.json();
        if (data.error) {
          setDateLog((prev) => [...prev, `❌ 오류: ${data.error}`]);
          break;
        }
        if (data.remaining !== undefined) setDateRemaining(data.remaining);
        setDateLog((prev) => [...prev, `  ✓ ${data.success}개 성공, ${data.failed}개 실패 | 남은: ${data.remaining}개`]);
        if (data.done || data.processed === 0) {
          setDateLog((prev) => [...prev, "✅ 완료!"]);
          break;
        }
        offset = data.nextOffset;
        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        setDateLog((prev) => [...prev, `❌ 오류: ${String(e)}`]);
        break;
      }
    }
    setDateRunning(false);
  }

  // --- iTunes 발매일 비교 ---
  const [itunesRunning, setItunesRunning] = useState(false);
  const [itunesProgress, setItunesProgress] = useState({ current: 0, total: 0 });
  const [itunesMismatches, setItunesMismatches] = useState<ItunesMismatch[]>([]);
  const [itunesScope, setItunesScope] = useState<"2026" | "all">("2026");
  const itunesStopRef = useRef(false);

  async function runItunesCheck() {
    setItunesRunning(true);
    itunesStopRef.current = false;
    setItunesMismatches([]);
    setItunesProgress({ current: 0, total: 0 });

    // 1) 전용 엔드포인트로 DB 앨범 직접 조회 (release_date 포함)
    const res0 = await adminFetch(`/api/admin/albums-dates?scope=${itunesScope}`);
    const albums: { id: string; title: string; artist: string; release_date: string }[] = await res0.json();

    if (!albums.length) { setItunesRunning(false); return; }
    setItunesProgress({ current: 0, total: albums.length });

    // 2) iTunes 조회 및 비교
    const mismatches: ItunesMismatch[] = [];
    for (let i = 0; i < albums.length; i++) {
      if (itunesStopRef.current) break;
      const a = albums[i];
      setItunesProgress({ current: i + 1, total: albums.length });
      try {
        const res = await fetch(
          `/api/admin/itunes-date?artist=${encodeURIComponent(a.artist)}&title=${encodeURIComponent(a.title)}`
        );
        const data = await res.json();
        const itunesDate: string | null = data.date;
        if (!itunesDate) continue;
        if (itunesDate.slice(0, 4) !== a.release_date.slice(0, 4)) {
          mismatches.push({ id: a.id, title: a.title, artist: a.artist, dbDate: a.release_date, itunesDate });
          setItunesMismatches([...mismatches]);
        }
      } catch { /* skip */ }
      await new Promise((r) => setTimeout(r, 100));
    }

    setItunesRunning(false);
  }

  async function applyItunesDate(m: ItunesMismatch) {
    const res = await apiFetch(`/api/albums/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ release_date: m.itunesDate }),
    });
    if (res.ok) {
      setItunesMismatches((prev) => prev.map((x) => x.id === m.id ? { ...x, fixed: true } : x));
    }
  }

  // --- 커버 교정 ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchArtist, setSearchArtist] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [candidates, setCandidates] = useState<SpotifyCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [fixMsg, setFixMsg] = useState("");

  // --- 미리보기 ---
  const [preview, setPreview] = useState<{ candidate: SpotifyCandidate; tracks: string[]; loading: boolean } | null>(null);
  const [matchedAlbum, setMatchedAlbum] = useState<AlbumRow | null>(null);

  async function selectCandidate(c: SpotifyCandidate) {
    setPreview({ candidate: c, tracks: [], loading: true });
    try {
      const res = await fetch(`/api/spotify/tracklist?spotifyId=${c.spotify_id}`);
      const data = await res.json();
      setPreview({ candidate: c, tracks: data.tracks ?? [], loading: false });
    } catch {
      setPreview({ candidate: c, tracks: [], loading: false });
    }
  }

  // 앨범 목록 (커버 없거나 교정 필요한 것들)
  const [albums, setAlbums] = useState<AlbumRow[]>([]);
  const [albumsLoaded, setAlbumsLoaded] = useState(false);
  const [albumFilter, setAlbumFilter] = useState<"no_cover" | "no_spotify" | "all">("no_cover");

  async function loadAlbums() {
    setAlbumsLoaded(false);
    const res = await adminFetch(`/api/admin/albums?filter=${albumFilter}&limit=300`);
    const data = await res.json();
    setAlbums(data.albums ?? []);
    setAlbumsLoaded(true);
  }

  function selectAlbum(a: AlbumRow) {
    setAlbumId(a.id);
    setMatchedAlbum(a);
    setSearchQuery(a.title);
    setSearchArtist(a.artist);
    setCandidates([]);
    setFixMsg("");
  }

  async function searchSpotify() {
    setSearching(true);
    setCandidates([]);
    setFixMsg("");

    // DB에서 앨범 자동 검색 + Spotify 후보 동시
    const spotifyParams = new URLSearchParams();
    if (searchQuery) spotifyParams.set("title", searchQuery);
    if (searchArtist) spotifyParams.set("artist", searchArtist);

    const dbParams = new URLSearchParams({ filter: "all", limit: "500" });
    if (searchQuery) dbParams.set("title", searchQuery);

    const [spotifyRes, dbRes] = await Promise.all([
      fetch(`/api/migrate/spotify/search?${spotifyParams}`),
      adminFetch(`/api/admin/albums?${dbParams}`),
    ]);

    const spotifyData = await spotifyRes.json();
    setCandidates(spotifyData.results ?? []);

    if (dbRes.ok) {
      const dbData = await dbRes.json();
      const normalize = (s: string) => s.toLowerCase().replace(/[-_\s]+/g, " ").trim();
      const q = normalize(searchQuery);
      const a = normalize(searchArtist);
      const albums: AlbumRow[] = dbData.albums ?? [];
      // 제목 없이 아티스트만 검색하면 단일 매칭 불가 → 목록만 표시
      const match = q ? albums.find((album) => {
        const t = normalize(album.title);
        const ar = normalize(album.artist);
        const titleOk = t.length >= 3
          ? (t.includes(q) || (q.length >= 3 && q.includes(t)))
          : t === q;
        const artistOk = !a || ar.includes(a) || a.includes(ar);
        return titleOk && artistOk;
      }) : null;
      if (match) {
        setAlbumId(match.id);
        setMatchedAlbum(match);
        setFixMsg(`DB 앨범 자동 매칭: "${match.title}" (${match.artist}) [ID: ${match.id}]`);
      } else {
        setAlbumId("");
        setMatchedAlbum(null);
        setFixMsg("DB에서 앨범을 찾지 못했습니다. 목록에서 직접 선택하세요.");
      }
    }

    setSearching(false);
  }

  async function applyCandidate(c: SpotifyCandidate, tracks: string[]) {
    if (!albumId) { setFixMsg("앨범 ID를 먼저 입력하세요"); return; }
    setFixMsg("적용 중...");
    setPreview(null);

    const tracklist = tracks.length > 0 ? tracks.join("; ") : undefined;
    const res = await apiFetch(`/api/albums/${albumId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spotify_id: c.spotify_id, cover_url: c.cover_url, ...(tracklist ? { tracklist } : {}) }),
    });

    if (res.ok) {
      const data = await res.json();
      const savedTracklist = data.updatedRow?.[0]?.tracklist;
      setFixMsg(
        tracklist
          ? `✅ "${c.name}" 적용 완료 (트랙 ${tracks.length}곡) [ID: ${data.id}, DB저장: ${savedTracklist ? savedTracklist.split(";").length + "곡" : "실패"}]`
          : `⚠️ "${c.name}" 적용 완료 — 트랙리스트 없음 [ID: ${data.id}]`
      );
      setAlbums((prev) => prev.filter((a) => a.id !== albumId));
      setAlbumId("");
      setCandidates([]);
    } else {
      const errData = await res.json().catch(() => ({}));
      setFixMsg(`❌ 업데이트 실패: ${JSON.stringify(errData)}`);
    }
  }

  function adminFetch(url: string, init?: RequestInit) {
    return apiFetch(url, init);
  }

  if (authLoading) return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "var(--text-muted)", fontSize: 14 }}>로딩 중...</p>
    </div>
  );
  if (!profile || profile.role !== "admin") return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "var(--text-muted)", fontSize: 14 }}>접근 권한이 없습니다</p>
    </div>
  );

  const card: React.CSSProperties = { backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "28px 32px", marginBottom: 24 };
  const secTitle: React.CSSProperties = { color: "var(--text)", fontWeight: 700, fontSize: 15, marginBottom: 4 };
  const secDesc: React.CSSProperties = { color: "var(--text-muted)", fontSize: 12, marginBottom: 20, lineHeight: 1.6 };

  return (
    <>
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }} className="px-4 sm:px-6 pt-6 sm:pt-10 pb-10">
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* ── 헤더 ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link
              href="/"
              style={{
                display: "flex", alignItems: "center", gap: 5,
                color: "var(--text-muted)", fontSize: 12, fontWeight: 600,
                textDecoration: "none", padding: "5px 10px",
                border: "1px solid var(--border)", borderRadius: 7,
                backgroundColor: "var(--bg-elevated)",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              홈
            </Link>
            <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.03em" }}>Admin</p>
          </div>
          <button
            onClick={() => openTutorial()}
            style={{
              padding: "6px 14px", borderRadius: 8,
              backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
              color: "var(--text-sub)", fontSize: 12, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            이용 안내
          </button>
        </div>

        {/* ── 탭 바 ── */}
        <style>{`
          @media (max-width: 639px) {
            .admin-tab-bar { overflow-x: auto; }
            .admin-tab-btn { flex: 0 0 auto !important; padding: 8px 12px !important; white-space: nowrap; }
            .admin-card { padding: 16px !important; margin-bottom: 12px !important; }
          }
        `}</style>
        <div className="admin-tab-bar no-scrollbar" style={{ display: "flex", gap: 2, marginBottom: 28, backgroundColor: "var(--bg-elevated)", borderRadius: 10, padding: 4 }}>
          {([
            { key: "overview", label: "현황" },
            { key: "albums", label: "앨범 교정" },
            { key: "artists", label: "아티스트" },
            { key: "migration", label: "마이그레이션" },
            { key: "reports", label: "신고 관리" },
            { key: "data", label: "데이터" },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="admin-tab-btn"
              style={{
                flex: 1, padding: "8px 0", borderRadius: 7, border: "none", cursor: "pointer",
                fontWeight: activeTab === tab.key ? 700 : 500, fontSize: 13,
                backgroundColor: activeTab === tab.key ? "var(--bg-card)" : "transparent",
                color: activeTab === tab.key ? "var(--text)" : "var(--text-muted)",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ════ 현황 탭 ════ */}
        {activeTab === "overview" && (<>

          {/* DB 통계 */}
          <div style={card} className="admin-card">
            <p style={secTitle}>DB 현황</p>
            <p style={secDesc}>앨범 데이터 완성도를 확인합니다. 미완료 항목 클릭 시 해당 앨범 목록이 표시됩니다.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button
              onClick={loadStats}
              disabled={statsLoading}
              style={{
                padding: "5px 14px", borderRadius: 6, border: "1px solid var(--border)",
                cursor: statsLoading ? "not-allowed" : "pointer",
                backgroundColor: "var(--bg-elevated)", color: "var(--text-sub)", fontSize: 12, fontWeight: 600,
              }}
            >
              {statsLoading ? "로딩 중..." : "새로고침"}
            </button>
            </div>
          {stats ? (
            <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "전체 앨범", value: stats.total, sub: null, filterKey: null },
                { label: "Spotify 매칭", value: stats.hasSpotify, sub: stats.total - stats.hasSpotify, filterKey: "no_spotify" as const },
                { label: "커버 이미지", value: stats.hasCover, sub: stats.total - stats.hasCover, filterKey: "no_cover" as const },
                { label: "트랙리스트", value: stats.hasTracklist, sub: stats.total - stats.hasTracklist, filterKey: "no_tracklist" as const },
              ].map((s) => (
                <div
                  key={s.label}
                  onClick={() => s.filterKey && s.sub && s.sub > 0 && loadStatsAlbums(s.filterKey)}
                  style={{
                    backgroundColor: statsFilter === s.filterKey ? "var(--bg)" : "var(--bg-elevated)",
                    borderRadius: 8, padding: "14px 16px",
                    border: `1px solid ${statsFilter === s.filterKey ? "var(--accent)" : "var(--border)"}`,
                    cursor: s.filterKey && s.sub && s.sub > 0 ? "pointer" : "default",
                    transition: "border-color 0.15s",
                  }}
                >
                  <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 8 }}>
                    {s.label.toUpperCase()}
                  </p>
                  <p style={{ color: "var(--accent)", fontWeight: 700, fontSize: 22 }}>
                    {s.value}
                    <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 400, marginLeft: 3 }}>/ {stats.total}</span>
                  </p>
                  {s.sub !== null && s.sub > 0 && (
                    <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
                      미완료 <span style={{ color: "#e07070", fontWeight: 600 }}>{s.sub}</span>개
                      <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>↓</span>
                    </p>
                  )}
                  <div style={{ height: 3, backgroundColor: "var(--border)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${(s.value / Math.max(stats.total, 1)) * 100}%`,
                      backgroundColor: s.sub && s.sub > 0 ? "#e07070" : "var(--accent)",
                      borderRadius: 2,
                    }} />
                  </div>
                </div>
              ))}
            </div>
            {/* 미완료 목록 */}
            {statsFilter && (
              <div style={{ marginTop: 16, border: "1px solid var(--border)", borderRadius: 8, maxHeight: 240, overflowY: "auto" }}>
                {statsAlbumsLoading ? (
                  <p style={{ color: "var(--text-muted)", fontSize: 12, padding: "12px 16px" }}>로딩 중...</p>
                ) : statsAlbums.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: 12, padding: "12px 16px" }}>없음</p>
                ) : statsAlbums.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => { selectAlbum(a); setSearchQuery(a.title); setSearchArtist(a.artist); setActiveTab("albums"); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-elevated)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    {a.cover_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img loading="lazy" src={a.cover_url} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 3, border: "1px solid var(--border)", flexShrink: 0 }} />
                      : <div style={{ width: 32, height: 32, backgroundColor: "var(--bg-elevated)", borderRadius: 3, border: "1px solid var(--border)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 12 }}>♪</span></div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "var(--text)", fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</p>
                      <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{a.artist}</p>
                    </div>
                    <span style={{ color: "var(--text-muted)", fontSize: 10, flexShrink: 0 }}>교정 →</span>
                  </div>
                ))}
              </div>
            )}
            </>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>새로고침을 눌러 확인하세요</p>
          )}
        </div>

          {/* 활동 로그 */}
          <div style={card} className="admin-card">
            <p style={secTitle}>활동 로그</p>
            <p style={secDesc}>앨범 등록·수정·삭제와 평점 이력을 확인합니다. 15일 이전 로그는 주기적으로 정리하세요.</p>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
              <FilterSelect
                value={logsAction}
                onChange={setLogsAction}
                options={[
                  { value: "", label: "전체 액션" },
                  { value: "album_add", label: "앨범 등록" },
                  { value: "album_edit", label: "앨범 수정" },
                  { value: "album_delete", label: "앨범 삭제" },
                  { value: "rating_set", label: "평점 저장" },
                  { value: "rating_delete", label: "평점 삭제" },
                ]}
                title="액션 필터"
                style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border)", backgroundColor: "var(--bg-elevated)", color: "var(--text-sub)", fontSize: 12 }}
              />
              <button onClick={() => loadLogs(logsAction || undefined)} disabled={logsLoading} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid var(--border)", cursor: logsLoading ? "not-allowed" : "pointer", backgroundColor: "var(--bg-elevated)", color: "var(--text-sub)", fontSize: 12, fontWeight: 600 }}>
                {logsLoading ? "로딩 중..." : logs === null ? "불러오기" : "새로고침"}
              </button>
              <button onClick={handleClearLogs} disabled={logsClearLoading} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid var(--border)", cursor: logsClearLoading ? "not-allowed" : "pointer", backgroundColor: "var(--bg-elevated)", color: "#e05050", fontSize: 12, fontWeight: 600 }}>
                {logsClearLoading ? "삭제 중..." : "15일 이전 삭제"}
              </button>
            </div>
            {logs === null ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>불러오기를 눌러 확인하세요</p>
            ) : logs.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>로그 없음</p>
            ) : (
              <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ maxHeight: 480, overflowY: "auto" }}>
                  {logs.map((log) => {
                    const actionLabels: Record<string, { label: string; fg: string; bg: string }> = {
                      album_add:    { label: "앨범 등록", fg: "#4caf50", bg: "rgba(76,175,80,0.12)" },
                      album_edit:   { label: "앨범 수정", fg: "#2196f3", bg: "rgba(33,150,243,0.12)" },
                      album_delete: { label: "앨범 삭제", fg: "#e05050", bg: "rgba(224,80,80,0.12)" },
                      rating_set:   { label: "평점 저장", fg: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
                      rating_delete:{ label: "평점 삭제", fg: "#e07070", bg: "rgba(224,112,112,0.12)" },
                    };
                    const actionInfo = actionLabels[log.action] ?? { label: log.action, fg: "#888", bg: "rgba(128,128,128,0.1)" };
                    const ts = new Date(log.created_at);
                    const diffMs = Date.now() - ts.getTime();
                    const diffMin = Math.floor(diffMs / 60000);
                    const timeStr = diffMin < 1 ? "방금" : diffMin < 60 ? `${diffMin}분 전` : diffMin < 1440 ? `${Math.floor(diffMin / 60)}시간 전` : ts.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
                    return (
                      <div key={log.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                        <span style={{ flexShrink: 0, fontSize: 10, color: "var(--text-muted)", width: 72, paddingTop: 2 }}>{timeStr}</span>
                        <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, backgroundColor: actionInfo.bg, color: actionInfo.fg, width: 72, textAlign: "center" }}>{actionInfo.label}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {log.album_title && (
                            <p
                              style={{ fontSize: 12, color: "var(--text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: log.album_id ? "pointer" : "default" }}
                              onClick={() => {
                                if (!log.album_id) return;
                                setLogAlbumModal({ id: log.album_id, title: log.album_title!, artist: log.album_artist ?? "", ratings: [] });
                              }}
                            >
                              {log.album_id && <span style={{ color: "var(--text-muted)", fontSize: 10, marginRight: 4 }}>↗</span>}
                              {log.album_title}
                              {log.album_artist && <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: 6 }}>· {log.album_artist}</span>}
                              {log.details?.new_artist === true && (
                                <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, backgroundColor: "rgba(255,165,0,0.15)", color: "#ffa500", letterSpacing: "0.06em" }}>NEW ARTIST</span>
                              )}
                            </p>
                          )}
                          {Array.isArray(log.details?.missing) && (log.details.missing as string[]).length > 0 && (
                            <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                              미입력: {(log.details.missing as string[]).join(" · ")}
                            </p>
                          )}
                        </div>
                        <span style={{ flexShrink: 0, fontSize: 10, color: "var(--text-muted)", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.user_id ?? "–"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>)}

        {/* ════ 앨범 교정 탭 ════ */}
        {activeTab === "albums" && (<>

          {/* 커버 · Spotify 정보 교정 */}
          <div style={card} className="admin-card">
            <p style={secTitle}>커버 · Spotify 정보 교정</p>
            <p style={secDesc}>Spotify에서 앨범을 검색해 커버·트랙리스트·Spotify ID를 직접 연결합니다. 신규 앨범 입고 후 자동 매칭이 안 된 경우 사용하세요.</p>

            <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
              <FilterSelect
                value={albumFilter}
                onChange={(v) => setAlbumFilter(v as "no_cover" | "no_spotify" | "all")}
                options={[
                  { value: "no_cover", label: "커버 없는 앨범" },
                  { value: "no_spotify", label: "Spotify 미매칭" },
                  { value: "all", label: "전체 앨범" },
                ]}
                title="앨범 필터"
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", backgroundColor: "var(--bg-elevated)", color: "var(--text-sub)", fontSize: 12 }}
              />
              <button onClick={loadAlbums} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer", backgroundColor: "var(--bg-elevated)", color: "var(--text-sub)", fontSize: 12, fontWeight: 600 }}>
                목록 불러오기
              </button>
            </div>

            {albumsLoaded && albums.length > 0 && (
              <div style={{ border: "1px solid var(--border)", borderRadius: 8, marginBottom: 16, maxHeight: 200, overflowY: "auto" }}>
                {albums.map((a) => (
                  <div key={a.id} onClick={() => selectAlbum(a)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)", backgroundColor: albumId === a.id ? "var(--bg-elevated)" : "transparent" }}>
                    {a.cover_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img loading="lazy" src={a.cover_url} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 3 }} />
                      : <div style={{ width: 32, height: 32, backgroundColor: "var(--bg-elevated)", borderRadius: 3, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 12 }}>♪</span></div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "var(--text)", fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</p>
                      <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{a.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {albumsLoaded && albums.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 16 }}>해당 조건의 앨범 없음</p>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 8, marginBottom: 12 }}>
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") searchSpotify(); }} placeholder="앨범 제목" style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)", backgroundColor: "var(--bg-elevated)", color: "var(--text)", fontSize: 13 }} />
              <input value={searchArtist} onChange={(e) => setSearchArtist(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") searchSpotify(); }} placeholder="아티스트" style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)", backgroundColor: "var(--bg-elevated)", color: "var(--text)", fontSize: 13 }} />
              <button onClick={searchSpotify} disabled={searching || (!searchQuery && !searchArtist)} style={{ padding: "8px 14px", borderRadius: 6, border: "none", cursor: searching || (!searchQuery && !searchArtist) ? "not-allowed" : "pointer", backgroundColor: "var(--accent)", color: "var(--bg)", fontWeight: 600, fontSize: 13 }}>
                {searching ? "검색 중..." : "Spotify 검색"}
              </button>
            </div>

            <input value={albumId} onChange={(e) => setAlbumId(e.target.value)} placeholder="앨범 ID (목록에서 선택하거나 직접 입력)" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)", backgroundColor: "var(--bg-elevated)", color: "var(--text)", fontSize: 12, marginBottom: 16, boxSizing: "border-box" }} />

            {candidates.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginBottom: 12 }}>
                {candidates.map((c) => (
                  <div key={c.spotify_id} onClick={() => selectCandidate(c)} style={{ border: `1px solid ${preview?.candidate.spotify_id === c.spotify_id ? "var(--accent)" : "var(--border)"}`, borderRadius: 8, overflow: "hidden", cursor: "pointer", backgroundColor: "var(--bg-elevated)", transition: "border-color 0.15s" }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")} onMouseLeave={(e) => (e.currentTarget.style.borderColor = preview?.candidate.spotify_id === c.spotify_id ? "var(--accent)" : "var(--border)")}>
                    {c.cover_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img loading="lazy" src={c.cover_url} alt={c.name} style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
                      : <div style={{ width: "100%", aspectRatio: "1", backgroundColor: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><span>♪</span></div>
                    }
                    <div style={{ padding: 8 }}>
                      <p style={{ color: "var(--text)", fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                      <p style={{ color: "var(--text-muted)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.artist}</p>
                      <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 2 }}>{c.release_date?.slice(0, 4)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {preview && (
              <div style={{ border: `1px solid ${albumId ? "var(--border)" : "#e05050"}`, borderRadius: 10, backgroundColor: "var(--bg-elevated)", padding: 16, marginBottom: 12, display: "flex", gap: 16 }}>
                {preview.candidate.cover_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img loading="lazy" src={preview.candidate.cover_url} alt={preview.candidate.name} style={{ width: 100, height: 100, borderRadius: 6, objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }} />
                  : <div style={{ width: 100, height: 100, borderRadius: 6, backgroundColor: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)", flexShrink: 0 }}><span style={{ color: "var(--text-muted)", fontSize: 24 }}>♪</span></div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 14 }}>{preview.candidate.name}</p>
                  <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>{preview.candidate.artist} · {preview.candidate.release_date?.slice(0, 4)}</p>
                  <div style={{ marginTop: 10 }}>
                    {preview.loading ? (
                      <p style={{ color: "var(--text-muted)", fontSize: 11 }}>트랙리스트 불러오는 중...</p>
                    ) : preview.tracks.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px" }}>
                        {preview.tracks.map((t, i) => <span key={i} style={{ color: "var(--text-sub)", fontSize: 11 }}><span style={{ color: "var(--text-muted)", marginRight: 4 }}>{i + 1}</span>{t}</span>)}
                      </div>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: 11 }}>트랙리스트 없음</p>
                    )}
                  </div>
                  <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, border: `1px solid ${albumId ? "var(--border)" : "#e05050"}`, backgroundColor: "var(--bg)" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 6 }}>적용 대상 DB 앨범</p>
                    {matchedAlbum ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {matchedAlbum.cover_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img loading="lazy" src={matchedAlbum.cover_url} alt="" style={{ width: 36, height: 36, borderRadius: 4, objectFit: "cover", border: "1px solid var(--border)" }} />
                          : <div style={{ width: 36, height: 36, borderRadius: 4, backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 14 }}>♪</span></div>
                        }
                        <div>
                          <p style={{ color: "var(--text)", fontSize: 12, fontWeight: 600 }}>{matchedAlbum.title}</p>
                          <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{matchedAlbum.artist} · ID: {matchedAlbum.id}</p>
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: "#e05050", fontSize: 11 }}>⚠️ 위 목록에서 앨범을 먼저 선택하세요 (앨범 ID ≠ Spotify ID)</p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button onClick={() => applyCandidate(preview.candidate, preview.tracks)} disabled={preview.loading || !albumId} style={{ padding: "6px 16px", borderRadius: 6, border: "none", backgroundColor: "var(--accent)", color: "var(--bg)", fontWeight: 600, fontSize: 13, cursor: (preview.loading || !albumId) ? "not-allowed" : "pointer", opacity: (preview.loading || !albumId) ? 0.4 : 1 }}>적용</button>
                    <button onClick={() => setPreview(null)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>취소</button>
                  </div>
                </div>
              </div>
            )}

            {fixMsg && <p style={{ color: fixMsg.startsWith("✅") ? "var(--accent)" : fixMsg.startsWith("⚠️") ? "#df9e30" : "var(--text-muted)", fontSize: 13, marginTop: 8 }}>{fixMsg}</p>}
          </div>

          {/* 발매일 자동 채우기 */}
          <div style={card} className="admin-card">
            <p style={secTitle}>발매일 자동 채우기</p>
            <p style={secDesc}>Spotify에서 발매일을 가져옵니다. 빈 항목만 채우기를 권장하며, 강제 갱신은 수동 수정값을 덮어씁니다.</p>
            {dateRemaining !== null && <p style={{ color: "var(--text-sub)", fontSize: 13, marginBottom: 12 }}>남은 앨범: <span style={{ color: "var(--accent)", fontWeight: 600 }}>{dateRemaining}</span>개</p>}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <label style={{ color: "var(--text-muted)", fontSize: 12 }}>시작 배치 번호</label>
              <input type="number" min={1} value={dateStartBatch} onChange={(e) => setDateStartBatch(Math.max(1, Number(e.target.value)))} disabled={dateRunning} style={{ width: 72, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", backgroundColor: "var(--bg-elevated)", color: "var(--text)", fontSize: 13, textAlign: "center" }} />
              <span style={{ color: "var(--text-muted)", fontSize: 11 }}>→ offset {(dateStartBatch - 1) * 30}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <button onClick={() => runDateBackfill(false)} disabled={dateRunning} style={{ padding: "8px 20px", borderRadius: 6, border: "none", cursor: dateRunning ? "not-allowed" : "pointer", backgroundColor: dateRunning ? "var(--bg-elevated)" : "var(--accent)", color: dateRunning ? "var(--text-muted)" : "var(--bg)", fontWeight: 600, fontSize: 13 }}>
                {dateRunning ? "실행 중..." : "▶ 빈 항목만 채우기"}
              </button>
              <button onClick={() => { if (confirm("모든 앨범의 발매일을 Spotify에서 강제로 덮어씁니다. 계속할까요?")) runDateBackfill(true); }} disabled={dateRunning} style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid var(--border)", cursor: dateRunning ? "not-allowed" : "pointer", backgroundColor: "var(--bg-elevated)", color: "var(--text-sub)", fontWeight: 600, fontSize: 13 }}>⚡ 전체 강제 갱신</button>
              {dateRunning && <button onClick={() => { dateStopRef.current = true; }} style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer", backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)", fontWeight: 600, fontSize: 13 }}>■ 중지</button>}
            </div>
            {dateLog.length > 0 && <div style={{ backgroundColor: "var(--bg-elevated)", borderRadius: 8, padding: "12px 16px", maxHeight: 200, overflowY: "auto", fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace", display: "flex", flexDirection: "column", gap: 2 }}>{dateLog.map((line, i) => <span key={i}>{line}</span>)}</div>}
          </div>

          {/* iTunes 발매일 검증 */}
          <div style={card} className="admin-card">
            <p style={secTitle}>iTunes 발매일 검증</p>
            <p style={secDesc}>DB 발매연도와 iTunes를 비교해 불일치 항목을 확인하고 교정합니다. 2026년 앨범부터 확인하는 걸 권장합니다.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <FilterSelect
                value={itunesScope}
                onChange={(v) => { if (!itunesRunning) setItunesScope(v as "2026" | "all"); }}
                options={[
                  { value: "2026", label: "2026년 앨범만 (빠름)" },
                  { value: "all", label: "전체 앨범 (느림)" },
                ]}
                title="범위"
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", backgroundColor: "var(--bg-elevated)", color: "var(--text-sub)", fontSize: 12, opacity: itunesRunning ? 0.5 : 1, pointerEvents: itunesRunning ? "none" : "auto" }}
              />
              {!itunesRunning ? (
                <button onClick={runItunesCheck} style={{ padding: "7px 18px", borderRadius: 6, border: "none", cursor: "pointer", backgroundColor: "var(--accent)", color: "var(--bg)", fontWeight: 600, fontSize: 13 }}>▶ 조회 시작</button>
              ) : (
                <button onClick={() => { itunesStopRef.current = true; }} style={{ padding: "7px 18px", borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer", backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)", fontWeight: 600, fontSize: 13 }}>■ 중지</button>
              )}
              {itunesRunning && <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{itunesProgress.current} / {itunesProgress.total} 처리 중...</span>}
            </div>
            {itunesMismatches.length > 0 && (
              <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 130px 130px 72px", backgroundColor: "var(--bg-elevated)", padding: "8px 14px", borderBottom: "1px solid var(--border)" }}>
                  {["앨범", "아티스트", "현재 (DB)", "iTunes", ""].map((h, i) => <span key={i} style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em" }}>{h}</span>)}
                </div>
                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                  {itunesMismatches.map((m) => (
                    <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 130px 130px 72px", padding: "10px 14px", borderBottom: "1px solid var(--border)", backgroundColor: m.fixed ? "rgba(100,180,100,0.06)" : "transparent", alignItems: "center" }}>
                      <span style={{ color: m.fixed ? "var(--text-muted)" : "var(--text)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.artist}</span>
                      <span style={{ color: "#e06060", fontSize: 12, fontFamily: "monospace" }}>{m.dbDate}</span>
                      <span style={{ color: "#60c060", fontSize: 12, fontFamily: "monospace" }}>{m.itunesDate}</span>
                      {m.fixed ? <span style={{ color: "#60c060", fontSize: 11 }}>✓ 수정됨</span> : <button onClick={() => applyItunesDate(m)} style={{ padding: "3px 10px", borderRadius: 4, border: "1px solid var(--border)", cursor: "pointer", backgroundColor: "var(--bg-elevated)", color: "var(--text-sub)", fontSize: 11 }}>적용</button>}
                    </div>
                  ))}
                </div>
                <div style={{ padding: "10px 14px", backgroundColor: "var(--bg-elevated)", borderTop: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>불일치 {itunesMismatches.length}개 발견 · 미수정 {itunesMismatches.filter((m) => !m.fixed).length}개</span>
                  {itunesMismatches.some((m) => !m.fixed) && (
                    <button onClick={() => { if (confirm("불일치 항목을 전부 iTunes 날짜로 수정할까요?")) itunesMismatches.filter((m) => !m.fixed).forEach(applyItunesDate); }} style={{ marginLeft: 16, padding: "3px 12px", borderRadius: 4, border: "none", cursor: "pointer", backgroundColor: "var(--accent)", color: "var(--bg)", fontSize: 11, fontWeight: 600 }}>전체 적용</button>
                  )}
                </div>
              </div>
            )}
            {!itunesRunning && itunesProgress.total > 0 && itunesMismatches.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>✓ 불일치 항목 없음</p>}
          </div>
        </>)}

        {/* ════ 아티스트 탭 ════ */}
        {activeTab === "artists" && (<>

          {/* 표시 이름 (별칭) */}
          <div style={card} className="admin-card">
            <p style={secTitle}>표시 이름 (별칭)</p>
            <p style={secDesc}>Spotify 정식명을 한글명 등으로 표시하려면 여기서 매핑하세요. "별칭" 버튼을 켜면 앨범 카드와 검색에 한글명이 표시됩니다. 검색 alias는 추가 검색어입니다.</p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "flex-end" }}>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Spotify 정식명</p>
                <input value={newSpotifyName} onChange={(e) => setNewSpotifyName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddAlias(); }} placeholder="예: IU" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 6, padding: "7px 12px", fontSize: 13, width: 220 }} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>한글 / 별칭</p>
                <input value={newVariantName} onChange={(e) => setNewVariantName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddAlias(); }} placeholder="예: 아이유" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 6, padding: "7px 12px", fontSize: 13, width: 180 }} />
              </div>
              <button onClick={handleAddAlias} disabled={!newSpotifyName.trim() || !newVariantName.trim()} style={{ backgroundColor: "var(--accent)", border: "none", color: "var(--bg)", borderRadius: 6, padding: "7px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: (!newSpotifyName.trim() || !newVariantName.trim()) ? 0.4 : 1 }}>추가 / 저장</button>
              <button
                onClick={() => { if (unifiedRows !== null) { setUnifiedRows(null); } else { loadUnifiedTable(); } }}
                disabled={unifiedLoading}
                style={{ backgroundColor: unifiedRows !== null ? "var(--accent)" : "var(--bg-elevated)", border: `1px solid ${unifiedRows !== null ? "var(--accent)" : "var(--border)"}`, color: unifiedRows !== null ? "var(--bg)" : "var(--text-sub)", borderRadius: 6, padding: "7px 14px", fontSize: 13, cursor: "pointer" }}
              >
                {unifiedLoading ? "로딩..." : "아티스트 관리"}
              </button>
            </div>

            {aliasMsg && <p style={{ color: aliasMsg.startsWith("✅") ? "var(--accent)" : aliasMsg.startsWith("⚠️") ? "#e8a53a" : "#e05050", fontSize: 12, marginBottom: 12 }}>{aliasMsg}</p>}

            {unifiedRows !== null && (() => {
              let rows = unifiedRows;
              if (unifiedFilter === "aliased") rows = rows.filter((r) => r.variant_name);
              if (unifiedFilter === "unaliased") rows = rows.filter((r) => !r.variant_name);
              if (unifiedSearch.trim()) {
                const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
                const q = norm(unifiedSearch.trim());
                rows = rows.filter((r) =>
                  norm(r.spotify_name).includes(q) ||
                  norm(r.variant_name ?? "").includes(q) ||
                  (searchAliasMap[r.spotify_name] ?? []).some((sa) => norm(sa.alias).includes(q))
                );
              }
              const dirtyCount = Object.entries(unifiedPending).filter(([k, v]) => v.trim() !== (unifiedRows.find((r) => r.spotify_name === k)?.variant_name ?? "")).length;

              return (
                <div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <input
                      value={unifiedSearch}
                      onChange={(e) => setUnifiedSearch(e.target.value)}
                      placeholder="이름·표시명·검색alias 검색..."
                      style={{ flex: 1, minWidth: 120, padding: "5px 10px", borderRadius: 5, border: "1px solid var(--border)", backgroundColor: "var(--bg-elevated)", color: "var(--text)", fontSize: 12, outline: "none" }}
                    />
                    {(["all", "aliased", "unaliased"] as const).map((f) => (
                      <button key={f} onClick={() => setUnifiedFilter(f)} style={{ padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer", border: `1px solid ${unifiedFilter === f ? "var(--accent)" : "var(--border)"}`, backgroundColor: unifiedFilter === f ? "rgba(232,213,163,0.1)" : "transparent", color: unifiedFilter === f ? "var(--accent)" : "var(--text-muted)" }}>
                        {f === "all" ? `전체 ${unifiedRows.length}` : f === "aliased" ? `설정됨 ${unifiedRows.filter((r) => r.variant_name).length}` : `미설정 ${unifiedRows.filter((r) => !r.variant_name).length}`}
                      </button>
                    ))}
                    <button onClick={() => loadUnifiedTable(true)} disabled={unifiedLoading} title="새로고침 (현재 목록 확인 처리 후 갱신)" style={{ marginLeft: "auto", padding: "4px 9px", borderRadius: 5, fontSize: 13, cursor: "pointer", border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--text-muted)" }}>
                      {unifiedLoading ? "…" : "↺"}
                    </button>
                  </div>

                  <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", maxHeight: 500, overflowY: "auto" }}>
                    {/* 열 헤더 */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px 4px", backgroundColor: "var(--bg-elevated)", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ width: 6, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: "var(--text-muted)", width: 140, flexShrink: 0 }}>Spotify 원본명</span>
                      <span style={{ width: 10, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: "var(--text-muted)", width: 150, flexShrink: 0 }}>표시명</span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.6 }}>표시 모드 · 검색어</span>
                    </div>
                    {rows.length === 0 ? (
                      <p style={{ padding: "16px 14px", color: "var(--text-muted)", fontSize: 12 }}>항목 없음</p>
                    ) : rows.map((row, i) => {
                      const pendingVal = unifiedPending[row.spotify_name];
                      const displayVal = pendingVal !== undefined ? pendingVal : (row.variant_name ?? "");
                      const isDirty = pendingVal !== undefined && pendingVal.trim() !== (row.variant_name ?? "");
                      const suggestions = row.fuzzyGroup
                        ? unifiedRows.filter((r) => r.fuzzyGroup === row.fuzzyGroup && r.spotify_name !== row.spotify_name && r.variant_name).map((r) => r.variant_name!).filter((v, idx, arr) => arr.indexOf(v) === idx)
                        : [];
                      const vs = variantStats[row.spotify_name];
                      const isUsingVariant = vs ? vs.using > 0 : !!row.variant_name;
                      return (
                        <div key={row.spotify_name} style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none", backgroundColor: isDirty ? "rgba(232,213,163,0.04)" : "transparent" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", flexWrap: "wrap" }}>
                            {/* 상태 점 */}
                            <span style={{
                              width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                              backgroundColor: row.variant_name
                                ? (isUsingVariant ? "var(--accent)" : "#6b7280")
                                : (row.fuzzyGroup ? "#e8a53a" : "var(--border)"),
                            }} title={row.variant_name ? (isUsingVariant ? "별칭 표시 중" : "원본 표시 중") : row.fuzzyGroup ? "유사 아티스트 있음" : "미설정"} />
                            {/* Spotify 원본명 */}
                            <span style={{ width: 140, flexShrink: 0, display: "flex", alignItems: "center", gap: 4, overflow: "hidden" }}>
                              <span style={{ fontSize: 12, color: "var(--text-sub)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{row.spotify_name}</span>
                              {row.isNew && <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 4px", borderRadius: 2, backgroundColor: "rgba(255,165,0,0.2)", color: "#ffa500", letterSpacing: "0.06em", flexShrink: 0 }}>NEW</span>}
                            </span>
                            {/* 화살표 */}
                            <span style={{ color: "var(--border)", fontSize: 10, flexShrink: 0 }}>→</span>
                            {/* 표시명 입력 */}
                            <input
                              value={displayVal}
                              onChange={(e) => setUnifiedPending((prev) => ({ ...prev, [row.spotify_name]: e.target.value }))}
                              placeholder="표시명"
                              style={{ width: 150, flexShrink: 0, padding: "3px 8px", borderRadius: 4, border: `1px solid ${isDirty ? "var(--accent)" : "var(--border)"}`, backgroundColor: "var(--bg-elevated)", color: row.variant_name || isDirty ? "var(--text)" : "var(--text-muted)", fontSize: 12, outline: "none" }}
                            />
                            {/* 표시 모드 토글 (별칭 있을 때만) */}
                            {row.variant_name && pendingVal === undefined && (
                              <button
                                onClick={() => handleSetVariant(row.spotify_name, !isUsingVariant)}
                                style={{
                                  fontSize: 10, padding: "2px 9px", borderRadius: 10, cursor: "pointer", flexShrink: 0,
                                  border: `1px solid ${isUsingVariant ? "var(--accent)" : "var(--border)"}`,
                                  backgroundColor: isUsingVariant ? "rgba(232,213,163,0.12)" : "transparent",
                                  color: isUsingVariant ? "var(--accent)" : "var(--text-muted)",
                                  fontWeight: isUsingVariant ? 600 : 400,
                                }}
                                title={isUsingVariant ? "클릭하면 원본명으로 전환" : "클릭하면 별칭으로 전환"}
                              >
                                {isUsingVariant ? "별칭" : "원본"}
                              </button>
                            )}
                            {/* 검색 alias 칩 (인라인) */}
                            {(searchAliasMap[row.spotify_name] ?? []).map((sa) => (
                              <span key={sa.id} style={{ display: "inline-flex", alignItems: "center", gap: 3, backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "1px 5px 1px 7px", fontSize: 10, color: "var(--text-sub)", flexShrink: 0 }}>
                                {sa.alias}
                                <button onClick={() => handleDeleteSearchAlias(row.spotify_name, sa.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 11, lineHeight: 1, padding: 0 }}>×</button>
                              </span>
                            ))}
                            {/* 검색 alias 추가 */}
                            {expandedAlias === row.spotify_name ? (
                              <>
                                <input
                                  value={searchAliasInput}
                                  onChange={(e) => setSearchAliasInput(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") handleAddSearchAlias(row.spotify_name); if (e.key === "Escape") toggleSearchAliases(row.spotify_name); }}
                                  placeholder="검색어"
                                  autoFocus
                                  style={{ width: 90, padding: "2px 7px", borderRadius: 4, border: "1px solid var(--accent)", backgroundColor: "var(--bg-elevated)", color: "var(--text)", fontSize: 11, outline: "none", flexShrink: 0 }}
                                />
                                <button onClick={() => handleAddSearchAlias(row.spotify_name)} disabled={!searchAliasInput.trim()} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, border: "none", backgroundColor: "var(--accent)", color: "var(--bg)", cursor: "pointer", opacity: !searchAliasInput.trim() ? 0.4 : 1, flexShrink: 0 }}>추가</button>
                                <button onClick={() => toggleSearchAliases(row.spotify_name)} style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--text-muted)", cursor: "pointer", flexShrink: 0 }}>✕</button>
                              </>
                            ) : (
                              <button onClick={() => toggleSearchAliases(row.spotify_name)} style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, border: "1px dashed var(--border)", background: "none", color: "var(--text-muted)", cursor: "pointer", flexShrink: 0 }}>+ alias</button>
                            )}
                            {/* 오류 메시지 */}
                            {searchAliasMsg[row.spotify_name] && <span style={{ fontSize: 10, color: "#e05050", flexShrink: 0 }}>{searchAliasMsg[row.spotify_name]}</span>}
                            {/* 유사명 제안 */}
                            {suggestions.length > 0 && pendingVal === undefined && suggestions.map((s) => (
                              <button key={s} onClick={() => setUnifiedPending((prev) => ({ ...prev, [row.spotify_name]: s }))} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, border: "1px solid #e8a53a", background: "rgba(232,165,58,0.1)", color: "#e8a53a", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                                💡 {s}
                              </button>
                            ))}
                            {/* 삭제 */}
                            {row.variant_name && pendingVal === undefined && (
                              <button onClick={() => handleDeleteFromUnified(row.spotify_name)} style={{ marginLeft: "auto", flexShrink: 0, background: "none", border: "none", color: "#e05050", cursor: "pointer", fontSize: 11, padding: "0 4px" }}>삭제</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {dirtyCount > 0 && (
                    <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{dirtyCount}개 변경됨</span>
                      <button onClick={saveUnifiedPending} disabled={unifiedSaving} style={{ padding: "5px 16px", borderRadius: 6, border: "none", backgroundColor: "var(--accent)", color: "var(--bg)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        {unifiedSaving ? "저장 중..." : "변경사항 저장"}
                      </button>
                      <button onClick={() => setUnifiedPending({})} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>취소</button>
                    </div>
                  )}
                  {unifiedMsg && <p style={{ fontSize: 12, color: unifiedMsg.startsWith("✅") ? "var(--accent)" : "#e05050", marginTop: 8 }}>{unifiedMsg}</p>}
                </div>
              );
            })()}
          </div>

          {/* 아티스트 사진 관리 */}
          <div style={card} className="admin-card">
            <p style={secTitle}>아티스트 사진</p>
            <p style={secDesc}>Spotify 자동 매칭이 잘못된 아티스트의 사진을 직접 지정합니다. 오버라이드된 항목은 파란 테두리로 표시됩니다.</p>

            {artistPhotoList === null ? (
              <button
                onClick={loadArtistPhotoSection}
                disabled={artistPhotoListLoading}
                style={{ padding: "7px 18px", borderRadius: 6, border: "none", backgroundColor: "var(--accent)", color: "var(--bg)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                {artistPhotoListLoading ? "로딩..." : "사진 목록 불러오기"}
              </button>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    총 {artistPhotoList.length}명 · 오버라이드 {Object.keys(artistPhotoOverrides).length}건
                  </span>
                  <button
                    onClick={loadArtistPhotoSection}
                    style={{ fontSize: 11, padding: "3px 10px", borderRadius: 5, border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--text-muted)", cursor: "pointer" }}
                  >
                    새로고침
                  </button>
                </div>

                {artistPhotoMsg && (
                  <p style={{ fontSize: 12, color: artistPhotoMsg.startsWith("✅") ? "var(--accent)" : "#e05050", marginBottom: 12 }}>
                    {artistPhotoMsg}
                  </p>
                )}

                {/* 인라인 편집 패널 */}
                {editingArtistPhoto && (
                  <div style={{ border: "1px solid var(--accent)", borderRadius: 8, padding: "14px 16px", marginBottom: 16, backgroundColor: "rgba(var(--accent-rgb),0.04)" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>{editingArtistPhoto} — 사진 URL 수정</p>
                    {artistPhotoOverrides[editingArtistPhoto] && (
                      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img loading="lazy" src={artistPhotoOverrides[editingArtistPhoto]} alt="" style={{ width: 56, height: 56, borderRadius: 6, objectFit: "cover", border: "1px solid var(--border)" }} />
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>현재 오버라이드</span>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        value={artistPhotoInput}
                        onChange={(e) => setArtistPhotoInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveArtistPhoto(editingArtistPhoto); }}
                        placeholder="이미지 URL 붙여넣기..."
                        style={{ flex: 1, backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 6, padding: "7px 12px", fontSize: 12 }}
                      />
                      <button
                        onClick={() => handleSaveArtistPhoto(editingArtistPhoto)}
                        disabled={!artistPhotoInput.trim()}
                        style={{ padding: "7px 14px", borderRadius: 6, border: "none", backgroundColor: "var(--accent)", color: "var(--bg)", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: !artistPhotoInput.trim() ? 0.4 : 1 }}
                      >
                        저장
                      </button>
                      {artistPhotoOverrides[editingArtistPhoto] && (
                        <button
                          onClick={() => handleDeleteArtistPhoto(editingArtistPhoto)}
                          style={{ padding: "7px 12px", borderRadius: 6, border: "1px solid rgba(224,80,80,0.4)", backgroundColor: "transparent", color: "#e05050", fontSize: 12, cursor: "pointer" }}
                        >
                          삭제
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingArtistPhoto(null); setArtistPhotoInput(""); }}
                        style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8 }}>
                  {artistPhotoList.map((name) => (
                    <ArtistPhotoCard
                      key={name}
                      name={name}
                      overrideUrl={artistPhotoOverrides[name]}
                      isEditing={editingArtistPhoto === name}
                      onClick={() => {
                        if (editingArtistPhoto === name) { setEditingArtistPhoto(null); setArtistPhotoInput(""); return; }
                        setEditingArtistPhoto(name);
                        setArtistPhotoInput(artistPhotoOverrides[name] ?? "");
                        setArtistPhotoMsg("");
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 아티스트 정규명 직접 변경 */}
          <div style={{ ...card, borderColor: "rgba(192,57,43,0.35)" }} className="admin-card">
            <p style={secTitle}>아티스트 정규명 직접 변경</p>
            <p style={secDesc}>특정 앨범의 artist 원본값을 DB에서 직접 수정합니다. 별칭이 아닌 원본을 바꾸므로 신중하게 사용하세요.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>앨범 ID</p>
                <input value={canonicalAlbumId} onChange={(e) => setCanonicalAlbumId(e.target.value)} placeholder="album UUID" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 6, padding: "7px 12px", fontSize: 12, width: 300 }} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>새 Spotify 정식명</p>
                <input value={canonicalArtist} onChange={(e) => setCanonicalArtist(e.target.value)} placeholder="정확한 Spotify 아티스트명" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 6, padding: "7px 12px", fontSize: 12, width: 220 }} />
              </div>
              <button onClick={handleCanonicalChange} disabled={!canonicalAlbumId.trim() || !canonicalArtist.trim()} style={{ backgroundColor: "#c0392b", border: "none", color: "white", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: (!canonicalAlbumId.trim() || !canonicalArtist.trim()) ? 0.4 : 1 }}>변경</button>
            </div>
            {canonicalMsg && <p style={{ color: canonicalMsg.startsWith("✅") ? "var(--accent)" : "#e05050", fontSize: 12, marginTop: 8 }}>{canonicalMsg}</p>}
          </div>
        </>)}

        {/* ════ 마이그레이션 탭 ════ */}
        {activeTab === "migration" && (<>
          <div style={{ backgroundColor: "rgba(240,160,40,0.08)", border: "1px solid rgba(240,160,40,0.25)", borderRadius: 10, padding: "14px 20px", marginBottom: 24 }}>
            <p style={{ color: "#df9e30", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>초기 셋업용 도구</p>
            <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.5 }}>대량 앨범 입고 직후 1회 실행용입니다. 개별 앨범 교정은 "앨범 교정" 탭을 사용하세요.</p>
          </div>

          {/* Spotify 일괄 매칭 */}
          <div style={card} className="admin-card">
            <p style={secTitle}>Spotify 일괄 매칭</p>
            <p style={secDesc}>Spotify ID가 없는 앨범 전체에 커버·발매일을 자동으로 채웁니다. 신규 앨범을 대량 입고한 뒤 1회 실행하세요.</p>
            {remaining !== null && (
              <p style={{ color: "var(--text-sub)", fontSize: 13, marginBottom: 12 }}>
                남은 앨범: <span style={{ color: "var(--accent)", fontWeight: 600 }}>{remaining}</span>개 · 성공: <span style={{ color: "var(--accent)" }}>{totalSuccess}</span> · 미매칭: <span style={{ color: "var(--text-muted)" }}>{totalNotFound}</span>
              </p>
            )}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={runMigration} disabled={running} style={{ padding: "8px 20px", borderRadius: 6, border: "none", cursor: running ? "not-allowed" : "pointer", backgroundColor: running ? "var(--bg-elevated)" : "var(--accent)", color: running ? "var(--text-muted)" : "var(--bg)", fontWeight: 600, fontSize: 13 }}>
                {running ? "실행 중..." : "▶ 시작"}
              </button>
              {running && <button onClick={() => { stopRef.current = true; }} style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer", backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)", fontWeight: 600, fontSize: 13 }}>■ 중지</button>}
            </div>
            {migLog.length > 0 && <div style={{ backgroundColor: "var(--bg-elevated)", borderRadius: 8, padding: "12px 16px", maxHeight: 240, overflowY: "auto", fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace", display: "flex", flexDirection: "column", gap: 2 }}>{migLog.map((line, i) => <span key={i}>{line}</span>)}</div>}
          </div>

          {/* 트랙리스트 일괄 채우기 */}
          <div style={card} className="admin-card">
            <p style={secTitle}>트랙리스트 일괄 채우기</p>
            <p style={secDesc}>Spotify ID는 있지만 트랙리스트가 없는 앨범에 트랙 목록을 채웁니다. Spotify 일괄 매칭 후 실행하세요.</p>
            {trackRemaining !== null && <p style={{ color: "var(--text-sub)", fontSize: 13, marginBottom: 12 }}>남은 앨범: <span style={{ color: "var(--accent)", fontWeight: 600 }}>{trackRemaining}</span>개</p>}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={runTracklistMigration} disabled={trackRunning} style={{ padding: "8px 20px", borderRadius: 6, border: "none", cursor: trackRunning ? "not-allowed" : "pointer", backgroundColor: trackRunning ? "var(--bg-elevated)" : "var(--accent)", color: trackRunning ? "var(--text-muted)" : "var(--bg)", fontWeight: 600, fontSize: 13 }}>
                {trackRunning ? "실행 중..." : "▶ 시작"}
              </button>
              {trackRunning && <button onClick={() => { trackStopRef.current = true; }} style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer", backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)", fontWeight: 600, fontSize: 13 }}>■ 중지</button>}
            </div>
            {trackLog.length > 0 && <div style={{ backgroundColor: "var(--bg-elevated)", borderRadius: 8, padding: "12px 16px", maxHeight: 200, overflowY: "auto", fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace", display: "flex", flexDirection: "column", gap: 2 }}>{trackLog.map((line, i) => <span key={i}>{line}</span>)}</div>}
          </div>

          {/* 재생시간 백필 */}
          <div style={card} className="admin-card">
            <p style={secTitle}>재생시간 백필</p>
            <p style={secDesc}>Spotify ID는 있지만 재생시간 데이터가 없는 앨범에 트랙별 재생시간을 채웁니다. 트랙리스트 채우기 후 실행하세요.</p>
            {durTotal !== null && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--text-sub)" }}>
                    총 <span style={{ color: "var(--accent)", fontWeight: 600 }}>{durTotal}</span>개 중{" "}
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>{durDone}</span>개 완료
                    {durRemaining !== null && durRemaining > 0 && (
                      <span style={{ color: "var(--text-muted)" }}> · 남은: {durRemaining}개</span>
                    )}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {durTotal > 0 ? Math.round((durDone / durTotal) * 100) : 100}%
                  </span>
                </div>
                <div style={{ height: 6, backgroundColor: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 3,
                    backgroundColor: "var(--accent)",
                    width: `${durTotal > 0 ? Math.round((durDone / durTotal) * 100) : 100}%`,
                    transition: "width 0.3s ease",
                  }} />
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={runDurationBackfill} disabled={durRunning} style={{ padding: "8px 20px", borderRadius: 6, border: "none", cursor: durRunning ? "not-allowed" : "pointer", backgroundColor: durRunning ? "var(--bg-elevated)" : "var(--accent)", color: durRunning ? "var(--text-muted)" : "var(--bg)", fontWeight: 600, fontSize: 13 }}>
                {durRunning ? "실행 중..." : "▶ 시작"}
              </button>
              {durRunning && <button onClick={() => { durStopRef.current = true; }} style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer", backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)", fontWeight: 600, fontSize: 13 }}>■ 중지</button>}
            </div>
            {durLog.length > 0 && <div style={{ backgroundColor: "var(--bg-elevated)", borderRadius: 8, padding: "12px 16px", maxHeight: 200, overflowY: "auto", fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace", display: "flex", flexDirection: "column", gap: 2 }}>{durLog.map((line, i) => <span key={i}>{line}</span>)}</div>}
          </div>
        </>)}

        {/* ════ 신고 관리 탭 ════ */}
        {activeTab === "reports" && (<>
          {/* 필터 + 불러오기 */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
            {(["pending", "warned", "banned_7d", "banned_14d", "banned", "dismissed", "all"] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setReportsStatusFilter(s); loadReports(s !== "all" ? s : undefined); }}
                style={{
                  padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${reportsStatusFilter === s ? "var(--accent)" : "var(--border)"}`,
                  backgroundColor: reportsStatusFilter === s ? "var(--accent)" : "var(--bg-elevated)",
                  color: reportsStatusFilter === s ? "var(--bg)" : "var(--text-muted)",
                }}
              >
                {{ pending: "대기 중", warned: "경고", banned_7d: "7일밴", banned_14d: "14일밴", banned: "영구밴", dismissed: "기각됨", all: "전체" }[s]}
              </button>
            ))}
            {reports === null && !reportsLoading && (
              <button
                onClick={() => loadReports("pending")}
                style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", backgroundColor: "var(--accent)", color: "var(--bg)" }}
              >
                불러오기
              </button>
            )}
          </div>

          {reportsLoading && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>로딩 중...</p>}

          {reports !== null && !reportsLoading && reports.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>신고 내역이 없습니다.</p>
          )}

          {reports !== null && reports.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {reports.map((r) => (
                <div
                  key={r.id}
                  style={{
                    backgroundColor: "var(--bg-elevated)", borderRadius: 10,
                    border: `1px solid ${r.status === "pending" ? "rgba(224,80,80,0.3)" : "var(--border)"}`,
                    padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10,
                  }}
                >
                  {/* 헤더 행 */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        신고자 <span style={{ color: "var(--text)", fontWeight: 600 }}>@{r.reporter_id}</span>
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        피신고자 <span style={{ color: "#e05050", fontWeight: 600 }}>@{r.reported_user_id}</span>
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {new Date(r.created_at).toLocaleString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                      backgroundColor: r.status === "pending" ? "rgba(224,80,80,0.15)" : r.status === "reviewed" ? "rgba(var(--accent-rgb),0.15)" : "var(--bg-card)",
                      color: r.status === "pending" ? "#e05050" : r.status === "reviewed" ? "var(--accent)" : "var(--text-muted)",
                    }}>
                      {{ pending: "대기 중", reviewed: "처리됨", dismissed: "기각됨" }[r.status] ?? r.status}
                    </span>
                  </div>

                  {/* 사유 */}
                  <div>
                    <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 600, marginBottom: r.detail ? 4 : 0 }}>
                      {r.reason}
                    </p>
                    {r.detail && (
                      <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.detail}</p>
                    )}
                  </div>

                  {/* 액션 버튼 */}
                  {r.status === "pending" && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        onClick={() => handleReportAction(r.id, "dismiss")}
                        style={{ padding: "5px 12px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid var(--border)", backgroundColor: "var(--bg-card)", color: "var(--text-muted)" }}
                      >
                        기각
                      </button>
                      <button
                        onClick={() => handleReportAction(r.id, "warn")}
                        style={{ padding: "5px 12px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid rgba(224,160,48,0.5)", backgroundColor: "rgba(224,160,48,0.1)", color: "#e0a030" }}
                      >
                        경고
                      </button>
                      <button
                        onClick={() => handleReportAction(r.id, "ban_7d")}
                        style={{ padding: "5px 12px", borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "1px solid rgba(224,80,80,0.3)", backgroundColor: "rgba(224,80,80,0.07)", color: "#e05050" }}
                      >
                        7일 정지
                      </button>
                      <button
                        onClick={() => handleReportAction(r.id, "ban_14d")}
                        style={{ padding: "5px 12px", borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "1px solid rgba(224,80,80,0.5)", backgroundColor: "rgba(224,80,80,0.12)", color: "#e05050" }}
                      >
                        14일 정지
                      </button>
                      <button
                        onClick={() => handleReportAction(r.id, "ban_permanent")}
                        style={{ padding: "5px 12px", borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "1px solid rgba(224,80,80,0.7)", backgroundColor: "rgba(224,80,80,0.18)", color: "#e05050" }}
                      >
                        영구 정지
                      </button>
                    </div>
                  )}
                  {(r.status === "banned_7d" || r.status === "banned_14d" || r.status === "banned" || r.status === "warned") && (
                    <button
                      onClick={() => handleUnban(r.reported_user_id)}
                      style={{ alignSelf: "flex-start", padding: "5px 12px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid var(--border)", backgroundColor: "var(--bg-card)", color: "var(--text-muted)" }}
                    >
                      제재 해제
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>)}

        {/* ════ 데이터 탭 ════ */}
        {activeTab === "data" && <AdminDataTab />}

      </div>
    </div>
    {logAlbumModal && (
      <AlbumModal album={logAlbumModal} onClose={() => setLogAlbumModal(null)} zIndex={200} />
    )}
    </>
  );
}

function ArtistPhotoCard({
  name, overrideUrl, isEditing, onClick,
}: {
  name: string;
  overrideUrl?: string;
  isEditing: boolean;
  onClick: () => void;
}) {
  const [photo, setPhoto] = useState<string | null>(overrideUrl ?? null);
  const [fetchDone, setFetchDone] = useState(!!overrideUrl);

  useEffect(() => {
    setPhoto(overrideUrl ?? null);
    setFetchDone(!!overrideUrl);
  }, [overrideUrl]);

  const handleVisible = () => {
    if (fetchDone) return;
    setFetchDone(true);
    fetch(`/api/spotify/artist?name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((d) => { if (d.image_url) setPhoto(d.image_url); })
      .catch(() => {});
  };

  return (
    <button
      onClick={() => { handleVisible(); onClick(); }}
      onMouseEnter={handleVisible}
      style={{
        background: "none", padding: 0, cursor: "pointer", textAlign: "left",
        border: `2px solid ${isEditing ? "var(--accent)" : overrideUrl ? "rgba(var(--accent-rgb),0.5)" : "var(--border)"}`,
        borderRadius: 8, overflow: "hidden",
        transition: "border-color 0.15s",
      }}
    >
      <div style={{ width: "100%", aspectRatio: "1", backgroundColor: "var(--bg-elevated)", position: "relative", overflow: "hidden" }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img loading="lazy" src={photo} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "var(--border-light)", fontSize: 18 }}>♪</span>
          </div>
        )}
        {overrideUrl && (
          <div style={{
            position: "absolute", top: 4, right: 4,
            width: 8, height: 8, borderRadius: "50%",
            backgroundColor: "var(--accent)",
            boxShadow: "0 0 4px rgba(0,0,0,0.5)",
          }} />
        )}
      </div>
      <p style={{
        padding: "4px 5px", fontSize: 10, color: "var(--text-sub)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        lineHeight: 1.3,
      }}>
        {name}
      </p>
    </button>
  );
}
