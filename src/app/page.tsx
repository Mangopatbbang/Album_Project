"use client";

import {
  useEffect,
  useMemo,
  useState,
  ChangeEvent,
} from "react";


// --- 타입 정의 ---
type Album = {
  id: string;
  title: string;
  artist: string;
  year?: string;
  genre?: string;
  arkyteccc_rating?: number;
  mangopatbbang_rating?: number;
  SJH_rating?: number;
  wugibugi_rating?: number;
  comment?: string;
  link?: string;
  coverUrl?: string;          // 시트의 cover_url 컬럼
  artistPhotoUrl?: string;    // 시트의 artist_photo_url 컬럼 (옵션)
  tracklist?: string;         // 시트의 tracklist 컬럼 ("Intro; First Song; ...")
};

type UserId = "arkyteccc" | "mangopatbbang" | "SJH" | "wugibugi";

const USERS: { id: UserId; label: string; emoji: string }[] = [
  { id: "arkyteccc", emoji: "🎧", label: "arkyteccc" },
  { id: "mangopatbbang", emoji: "🥭", label: "mangopatbbang" },
  { id: "SJH", emoji: "🧊", label: "SJH" },
  { id: "wugibugi", emoji: "🐰", label: "wugibugi" },
];

const ratingKey = (albumId: string, userId: UserId) =>
  `${albumId}:${userId}`;

// --- 구글시트 CSV URL ---
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1Je8OwNdTSMNDxIE37wvZmkAGkNAHqwClTbLDR8aoWsk/export?format=csv&gid=0";

// --- CSV 파서 & 숫자 변환 헬퍼 ---
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const headerIndex = lines.findIndex((line) => line.startsWith("id,"));
  if (headerIndex === -1) return [];

  const header = lines[headerIndex].split(",").map((h) => h.trim());
  const dataLines = lines.slice(headerIndex + 1).filter((l) => l.length > 0);

  return dataLines.map((line) => {
    const cols = line.split(",");
    const obj: Record<string, string> = {};
    header.forEach((key, idx) => {
      obj[key] = (cols[idx] ?? "").trim();
    });
    return obj;
  });
}

function safeNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

function mapAlbums(rows: Record<string, string>[]): Album[] {
  return rows.map((row) => ({
    id: row["id"],
    title: row["title"],
    artist: row["artist"],
    year: row["year"] || undefined,
    genre: row["genre"] || undefined,
    arkyteccc_rating: safeNumber(row["arkyteccc_rating"]),
    mangopatbbang_rating: safeNumber(row["mangopatbbang_rating"]),
    SJH_rating: safeNumber(row["SJH_rating"]),
    wugibugi_rating: safeNumber(row["wugibugi_rating"]),
    comment: row["comment"] || undefined,
    link: row["link"] || undefined,
    coverUrl: row["cover_url"] || undefined,
    artistPhotoUrl: row["artist_photo_url"] || undefined,
    tracklist: row["tracklist"] || undefined,
  }));
}

// 연도 문자열을 Date로 대충 바꿔서 정렬에 쓰기
function parseDateFromYear(year?: string): number | null {
  if (!year) return null;
  const nums = year.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  const [y, m = "1", d = "1"] = nums;
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(dt.getTime())) return null;
  return dt.getTime();
}



type SortKey =
  | "latest"
  | "oldest"
  | "ratingDesc"
  | "ratingAsc"
  | "titleAsc"
  | "userRatingDesc"   // 현재 사용자 점수 높은순
  | "userRatingAsc";   // 현재 사용자 점수 낮은순
  


type RatingCategory =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "indigo"
  | "violet"
  | "special"; // 8점 이상

// 1~7점 → 빨주노초파남보, 8점 이상 → special
function ratingCategory(score: number): RatingCategory {
  const rounded = Math.round(score);
  if (rounded >= 8) return "special";
  const c = Math.min(7, Math.max(1, rounded)); // 1~7로 클램프
  switch (c) {
    case 1:
      return "red";
    case 2:
      return "orange";
    case 3:
      return "yellow";
    case 4:
      return "green";
    case 5:
      return "blue";
    case 6:
      return "indigo";
    case 7:
    default:
      return "violet";
  }
}

// 칩(배경+테두리) 색
function ratingChipClasses(score: number): string {
  const k = ratingCategory(score);
  switch (k) {
    case "red":
      return "bg-red-500/15 border-red-400/80 text-red-200";
    case "orange":
      return "bg-orange-500/15 border-orange-400/80 text-orange-200";
    case "yellow":
      return "bg-yellow-500/15 border-yellow-400/80 text-yellow-100";
    case "green":
      return "bg-green-500/15 border-green-400/80 text-green-100";
    case "blue":
      return "bg-blue-500/15 border-blue-400/80 text-blue-100";
    case "indigo":
      return "bg-indigo-500/15 border-indigo-400/80 text-indigo-100";
    case "violet":
      return "bg-violet-500/15 border-violet-400/80 text-violet-100";
    case "special":
    default:
      return "bg-fuchsia-500/25 border-cyan-300/90 text-fuchsia-100";
  }
}


// 숫자 텍스트 색
function ratingTextClasses(score: number): string {
  const k = ratingCategory(score);
  switch (k) {
    case "red":
      return "text-red-300";
    case "orange":
      return "text-orange-300";
    case "yellow":
      return "text-yellow-200";
    case "green":
      return "text-green-300";
    case "blue":
      return "text-blue-300";
    case "indigo":
      return "text-indigo-300";
    case "violet":
      return "text-violet-300";
    case "special":
    default:
      return "text-fuchsia-300";
  }
}

// 평균 점수에 따른 카드 바깥 글로우
function cardGlowClasses(avg: number | null): string {
  if (avg == null) return "";
  const k = ratingCategory(avg);
  switch (k) {
    case "red":
      return "shadow-[0_0_26px_rgba(248,113,113,0.5)]";
    case "orange":
      return "shadow-[0_0_26px_rgba(251,146,60,0.5)]";
    case "yellow":
      return "shadow-[0_0_26px_rgba(250,204,21,0.5)]";
    case "green":
      return "shadow-[0_0_26px_rgba(74,222,128,0.45)]";
    case "blue":
      return "shadow-[0_0_26px_rgba(59,130,246,0.5)]";
    case "indigo":
      return "shadow-[0_0_26px_rgba(79,70,229,0.5)]";
    case "violet":
      return "shadow-[0_0_26px_rgba(168,85,247,0.5)]";
    case "special":
    default:
      return "shadow-[0_0_32px_rgba(244,244,245,0.9)]";
  }
}

// 가운데 카드용 보더 색
function centerBorderClasses(avg: number | null): string {
  if (avg == null) return "border-slate-800";
  const k = ratingCategory(avg);
  switch (k) {
    case "red":
      return "border-red-500/70";
    case "orange":
      return "border-orange-500/70";
    case "yellow":
      return "border-yellow-400/70";
    case "green":
      return "border-green-500/70";
    case "blue":
      return "border-blue-500/70";
    case "indigo":
      return "border-indigo-500/70";
    case "violet":
      return "border-violet-500/70";
    case "special":
    default:
      return "border-fuchsia-400/90";
  }
}

// 장르별 칩 색상 (배경은 거의 검정, 테두리+텍스트만 컬러)
function genreChipClasses(genre: string): string {
  const g = genre.toLowerCase();

  if (g.includes("rock")) {
    return "bg-slate-950 border-rose-500/70 text-rose-300";
  }
  if (g.includes("pop")) {
    return "bg-slate-950 border-sky-500/70 text-sky-300";
  }
  if (g.includes("hip") || g.includes("rap")) {
    return "bg-slate-950 border-amber-500/70 text-amber-300";
  }
  if (g.includes("r&b") || g.includes("rnb")) {
    return "bg-slate-950 border-violet-500/70 text-violet-300";
  }
  if (g.includes("jazz")) {
    return "bg-slate-950 border-emerald-500/70 text-emerald-300";
  }
  if (g.includes("electro") || g.includes("edm") || g.includes("house")) {
    return "bg-slate-950 border-cyan-500/70 text-cyan-300";
  }
  if (g.includes("indie")) {
    return "bg-slate-950 border-fuchsia-500/70 text-fuchsia-300";
  }
  if (g.includes("metal")) {
    return "bg-slate-950 border-slate-500/80 text-slate-200";
  }
  // default
  return "bg-slate-950 border-slate-500/80 text-slate-200";
}

type AlbumMetadata = {
  tracks: string[];
  coverUrl: string | null;
  year: string | null;
  source?: string;
};

export default function Home() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState<UserId>("arkyteccc");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [ratingMap, setRatingMap] = useState<Record<string, number>>({});
  const [metadataMap, setMetadataMap] = useState<Record<string, AlbumMetadata>>({});
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  // 🔹 선택된 앨범/유저가 바뀔 때 Supabase에서 해당 점수 GET
  // ➕ Add Album
const [isAddModalOpen, setIsAddModalOpen] = useState(false);
const [isAdding, setIsAdding] = useState(false);
const [addForm, setAddForm] = useState({
  title: "",
  artist: "",
  genre: "",
  year: "",
});

useEffect(() => {
  if (!selectedAlbumId) return;

  // ✅ TS가 확실히 string으로 인식하도록 로컬 변수에 고정
  const albumId = selectedAlbumId;

  async function loadAllRatingsForAlbum() {
    try {
      const res = await fetch(
        `/api/ratings?albumId=${encodeURIComponent(albumId)}&mode=allForAlbum`
      );

      if (!res.ok) {
        console.warn("Failed to load all ratings for album");
        return;
      }

      const data = await res.json(); 
      // data: { ratings: [{ album_id, profile_key, score }, ...] }

      const next: Record<string, number> = {};

      for (const r of data.ratings ?? []) {
        if (typeof r?.score === "number") {
          // ✅ 핵심: ratingMap 키 포맷을 "albumId:userId"로 통일
          // album_id는 number로 오니까 String()으로 통일
          next[`${String(r.album_id)}:${r.profile_key}`] = r.score;
        }
      }

      setRatingMap((prev) => ({ ...prev, ...next }));
    } catch (e) {
      console.error("loadAllRatingsForAlbum error", e);
    }
  }

  loadAllRatingsForAlbum();
}, [selectedAlbumId]);

  // 🔍 검색 / 필터 / 정렬 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("latest");
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(true);
  
    const [onlyUnrated, setOnlyUnrated] = useState(false);


  const resetFilters = () => {
    setSearchQuery("");
    setGenreFilter("all");
    setYearFilter("all");
    setSortKey("latest");
    setOnlyUnrated(false);
  };

  // 1) 앨범 데이터 fetch
  // 1) 앨범 데이터 fetch (Supabase DB via /api/albums)
useEffect(() => {
  async function loadAlbums() {
    try {
      const res = await fetch("/api/albums");
      const json = await res.json();

      if (!res.ok) {
        console.error("Failed to load albums", json?.error);
        return;
      }

      // 서버에서 id는 string으로 내려주게 해둔 상태
      const mapped = (json.albums ?? []).map((a: any) => ({
        id: String(a.id),
        sheet_id: a.sheet_id ?? undefined,

        title: a.title ?? "",
        artist: a.artist ?? "",
        genre: a.genre ?? undefined,
        year: a.year ?? undefined,

        coverUrl: a.cover_url ?? undefined,
        tracklist: a.tracklist ?? undefined,
      }));

      setAlbums(mapped);
      if (mapped.length > 0) setSelectedAlbumId(mapped[0].id);
    } catch (e) {
      console.error("Failed to load albums", e);
    } finally {
      setLoading(false);
    }
  }

  loadAlbums();
}, []);



const saveNotes = (next: Record<string, string>) => {
  setNotes(next); // 이제 상태만 관리, 저장은 Supabase가 담당
};
async function submitAddAlbum() {
  if (!addForm.title.trim() || !addForm.artist.trim()) return;

  setIsAdding(true);
  try {
    const res = await fetch("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: addForm.title,
        artist: addForm.artist,
        genre: addForm.genre || null,
        year: addForm.year || null,
      }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "failed");

    const a = json.album;

    const newAlbum = {
      id: String(a.id),
      sheet_id: a.sheet_id ?? undefined,
      title: a.title ?? "",
      artist: a.artist ?? "",
      genre: a.genre ?? undefined,
      year: a.year ?? undefined,
      coverUrl: a.cover_url ?? undefined,
      tracklist: a.tracklist ?? undefined,
    };

    // 1) 목록에 즉시 추가 + 선택
    setAlbums((prev) => [newAlbum, ...prev]);
    setSelectedAlbumId(newAlbum.id);

    // 2) 서버에서 자동으로 받아온 메타데이터가 있으면, 프론트 캐시에 즉시 반영
    if (json.metadata) {
      const tracks = Array.isArray(json.metadata.tracks) ? json.metadata.tracks : [];
      setMetadataMap((prev) => ({
        ...prev,
        [newAlbum.id]: {
          tracks,
          coverUrl: json.metadata.cover_url ?? null,
          year: json.metadata.year ?? null,
          source: json.metadata.source ?? "musicbrainz",
        },
      }));
    }

    // 3) 모달 닫기 + 폼 초기화
    setIsAddModalOpen(false);
    setAddForm({ title: "", artist: "", genre: "", year: "" });
  } catch (e) {
    console.error(e);
    alert((e as any)?.message ?? "앨범 추가 실패");
  } finally {
    setIsAdding(false);
  }
}



  // 장르 목록
  const genres = useMemo(() => {
    const set = new Set<string>();
    albums.forEach((a) => {
      if (a.genre) set.add(a.genre);
    });
    return Array.from(set).sort();
  }, [albums]);

  // 연도 필터용 목록 (연도의 앞 4자리만)
  const years = useMemo(() => {
    const set = new Set<string>();
    albums.forEach((a) => {
      if (a.year) {
        const m = a.year.match(/\d{4}/);
        if (m) set.add(m[0]);
      }
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a)); // 최신 연도 먼저
  }, [albums]);

  // 유저별 점수 + 평균
    // ratingMap에서 우선 읽고, 없으면 CSV에 있는 초기값 사용
  function getRatingValue(
    a: Album,
    userId: UserId,
    fallback?: number
  ): number | undefined {
    const key = ratingKey(a.id, userId);
    const v = ratingMap[key];
    if (typeof v === "number" && !Number.isNaN(v)) {
      return v;
    }
    return fallback;
  }

  // 유저별 점수 + 평균
  function getRatings(a: Album) {
    const arr = [
      {
        id: "arkyteccc" as UserId,
        emoji: "🎧",
        label: "arkyteccc",
        value: getRatingValue(a, "arkyteccc", a.arkyteccc_rating),
      },
      {
        id: "mangopatbbang" as UserId,
        emoji: "🥭",
        label: "mangopatbbang",
        value: getRatingValue(
          a,
          "mangopatbbang",
          a.mangopatbbang_rating
        ),
      },
      {
        id: "SJH" as UserId,
        emoji: "🧊",
        label: "SJH",
        value: getRatingValue(a, "SJH", a.SJH_rating),
      },
      {
        id: "wugibugi" as UserId,
        emoji: "🐰",
        label: "wugibugi",
        value: getRatingValue(a, "wugibugi", a.wugibugi_rating),
      },
    ].filter(
      (r) => typeof r.value === "number" && !Number.isNaN(r.value as number)
    ) as { id: UserId; emoji: string; label: string; value: number }[];

    const validValues = arr.map((r) => r.value);
    const avg =
      validValues.length > 0
        ? validValues.reduce((s, v) => s + v, 0) / validValues.length
        : null;

    return { ratings: arr, avg };
  }


  // 필터/정렬
    const visibleAlbums = useMemo(() => {
    let list = [...albums];

    // 🔍 검색
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.artist.toLowerCase().includes(q)
      );
    }

    // 🎧 장르 필터
    if (genreFilter !== "all") {
      list = list.filter((a) => a.genre === genreFilter);
    }

    // 📅 연도 필터 (연도의 앞 4자리 기준)
    if (yearFilter !== "all") {
      list = list.filter((a) => {
        if (!a.year) return false;
        const m = a.year.match(/\d{4}/);
        return m ? m[0] === yearFilter : false;
      });
    }

    // ⭐ 특정 유저 + 최소 점수 필터
        // ❗ 현재 선택된 사용자 기준으로, 아직 점수 안 준 앨범만 보기
    if (onlyUnrated && activeUserId) {
      list = list.filter((a) => {
        const { ratings } = getRatings(a);
        const mine = ratings.find((r) => r.id === activeUserId);
        // mine 이 없으면 → 이 유저 점수가 없는 앨범
        return !mine;
      });
    }


    // ❗ 현재 선택된 사용자 기준으로, 아직 점수 안 준 앨범만 보기
    if (onlyUnrated && activeUserId) {
      list = list.filter((a) => {
        const v = getRatingValue(a, activeUserId);
        // 숫자가 아니면 → 아직 점수 없음
        return typeof v !== "number" || Number.isNaN(v);
      });
    }

           // 정렬
    list.sort((a, b) => {
      // 📅 발매일 기준
      if (sortKey === "latest" || sortKey === "oldest") {
        const da = parseDateFromYear(a.year) ?? -Infinity;
        const db = parseDateFromYear(b.year) ?? -Infinity;
        return sortKey === "latest" ? db - da : da - db;
      }

      // ㄱㄴㄷ 제목순
      if (sortKey === "titleAsc") {
        return a.title.localeCompare(b.title, "ko");
      }

      // ⭐ 평균 점수 기준
      if (sortKey === "ratingDesc" || sortKey === "ratingAsc") {
        const aa = getRatings(a).avg ?? -Infinity;
        const bb = getRatings(b).avg ?? -Infinity;
        if (sortKey === "ratingDesc") {
          return bb - aa;
        } else {
          return aa - bb;
        }
      }

      // 👤 현재 사용자 점수 기준 정렬
      if (sortKey === "userRatingDesc" || sortKey === "userRatingAsc") {
        if (!activeUserId) return 0;

        const raAll = getRatings(a).ratings;
        const rbAll = getRatings(b).ratings;

        const mineA = raAll.find((r) => r.id === activeUserId)?.value;
        const mineB = rbAll.find((r) => r.id === activeUserId)?.value;

        if (sortKey === "userRatingDesc") {
          // 높은 점수 우선, 점수 없는 앨범은 맨 아래
          const va = typeof mineA === "number" ? mineA : -Infinity;
          const vb = typeof mineB === "number" ? mineB : -Infinity;
          return vb - va;
        } else {
          // 낮은 점수 우선, 점수 없는 앨범은 맨 아래
          const va = typeof mineA === "number" ? mineA : Infinity;
          const vb = typeof mineB === "number" ? mineB : Infinity;
          return va - vb;
        }
      }

      return 0;
    });



    return list;
  }, [
    albums,
    searchQuery,
    genreFilter,
    yearFilter,
    sortKey,
    onlyUnrated,   // ✅ 꼭 있어야 함
    activeUserId,  // ✅ 이것도
  ]);


  const displayAlbums = visibleAlbums.length > 0 ? visibleAlbums : albums;
async function saveRating(albumId: string, userId: UserId, score: number) {
  // 1) UI 즉시 반영
  setRatingMap((prev) => ({
    ...prev,
    [`${albumId}:${userId}`]: score,
  }));

  // 2) 서버 저장
  await fetch("/api/ratings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ albumId, profileKey: userId, score }),
  });
}


async function deleteRating(albumId: string, userId: UserId) {
  // 1) UI 즉시 반영(삭제)
  setRatingMap((prev) => {
    const copy = { ...prev };
    delete copy[`${albumId}:${userId}`];
    return copy;
  });

  // 2) 서버 삭제
  await fetch("/api/ratings", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ albumId, profileKey: userId }),
  });
}




  const selectedAlbum = useMemo(() => {
    if (displayAlbums.length === 0) return undefined;
    if (selectedAlbumId) {
      const found = displayAlbums.find((a) => a.id === selectedAlbumId);
      if (found) return found;
    }
    return displayAlbums[0];
  }, [displayAlbums, selectedAlbumId]);

// 선택된 앨범이 바뀔 때 외부 메타데이터(MusicBrainz 등) 불러오기
  useEffect(() => {
    if (!selectedAlbum) return;

    const already = metadataMap[selectedAlbum.id];
    if (already) return; // 이 앨범은 이미 가져온 적 있으면 다시 호출 안 함

    const params = new URLSearchParams({
      albumId: selectedAlbum.id,
      title: selectedAlbum.title,
      artist: selectedAlbum.artist,
    });

    (async () => {
      try {
        const res = await fetch(`/api/metadata?${params.toString()}`);
        if (!res.ok) return;

        const data = await res.json();
        if (!data || data.found === false) return;

        const tracks: string[] = Array.isArray(data.tracks)
          ? data.tracks
              .filter((t: any) => typeof t === "string")
              .map((t: string) => t.trim())
              .filter(Boolean)
          : [];

        setMetadataMap((prev) => ({
          ...prev,
          [selectedAlbum.id]: {
            tracks,
            coverUrl: data.coverUrl ?? null,
            year: data.resolved?.year ?? null,
            source: data.source ?? "musicbrainz",
          },
        }));
      } catch (e) {
        console.error("metadata fetch error", e);
      }
    })();
  }, [selectedAlbum?.id, selectedAlbum?.title, selectedAlbum?.artist]);
// 선택된 앨범 + 활성 유저가 바뀔 때 서버에서 메모 불러오기
useEffect(() => {
  if (!selectedAlbum || !activeUserId) return;

  const key = `${selectedAlbum.id}:${activeUserId}`;

  // 이미 로컬에 있으면 서버 호출 안 함 (캐시)
  if (notes[key] !== undefined) return;

  (async () => {
    try {
      const res = await fetch(
        `/api/notes?albumId=${encodeURIComponent(
          selectedAlbum.id
        )}&profileKey=${encodeURIComponent(activeUserId)}`,
        { method: "GET" }
      );
      if (!res.ok) return;

      const data = await res.json();

      // { note: { content: "..." } } 형태 대응
      const content: string =
        typeof data?.note?.content === "string" ? data.note.content : "";

      const next = { ...notes, [key]: content };
      saveNotes(next);
    } catch (e) {
      console.error(e);
    }
  })();
}, [selectedAlbum?.id, activeUserId, notes]);


  // 평
  const currentNoteKey =
    selectedAlbum && activeUserId
      ? `${selectedAlbum.id}:${activeUserId}`
      : "";
  const currentNote = currentNoteKey ? notes[currentNoteKey] ?? "" : "";

    const handleNoteChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
  if (!currentNoteKey || !selectedAlbum) return;
  const value = e.target.value;

  // 1) 로컬 상태만 업데이트
  const next = { ...notes, [currentNoteKey]: value };
  saveNotes(next);

  // 2) Supabase로 비동기 저장
  fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      albumId: selectedAlbum.id,
      profileKey: activeUserId, // 🔴 여기 userId → profileKey
      content: value,
    }),
  }).catch((err) => console.error(err));
};

// 평점 계산 (유저 탭 바깥, 평점 UI 위)
const currentRating =
  selectedAlbum && activeUserId
    ? ratingMap[`${selectedAlbum.id}:${activeUserId}`] ??
      getRatingValue(selectedAlbum, activeUserId)
    : undefined;


   const highlightRatingsInfo = selectedAlbum
    ? getRatings(selectedAlbum)
    : { ratings: [], avg: null };

  const { ratings: highlightRatings, avg: highlightAvg } =
    highlightRatingsInfo;

  // 선택된 앨범에 대한 외부 메타데이터 (있으면 우선 사용)
  const metadataForSelected = selectedAlbum
    ? metadataMap[selectedAlbum.id]
    : undefined;

  // 트랙리스트: 외부 → 시트 순으로 사용
  const tracklistItems =
    (metadataForSelected?.tracks && metadataForSelected.tracks.length > 0
      ? metadataForSelected.tracks
      : selectedAlbum?.tracklist
          ?.split(";")
          .map((t) => t.trim())
          .filter(Boolean)) ?? [];

  // 상세 패널에서 사용할 최종 커버 URL (외부 > 시트 값)
  const selectedCoverUrl =
    (metadataForSelected?.coverUrl ?? null) || selectedAlbum?.coverUrl || null;

  const centerGlow = cardGlowClasses(highlightAvg ?? null);
  const centerBorder = centerBorderClasses(highlightAvg ?? null);


  return (
    <main className="h-screen bg-gradient-to-b from-black via-slate-950 to-black text-slate-50 flex flex-col overflow-hidden">
                  {/* 헤더 */}
      <section className="border-b border-slate-800/70 bg-black/40 backdrop-blur-md px-4 md:px-6 py-3 md:py-4">
        <div className="w-full max-w-6xl mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* 현재 사용자 선택 */}
          <div className="order-2 md:order-1 flex flex-col sm:flex-row sm:items-center gap-1.5 md:gap-2 text-[11px] md:text-sm text-slate-200">
            <span className="text-[11px] md:text-xs text-slate-400 whitespace-nowrap">
              현재 사용자
            </span>
            <div className="flex flex-wrap gap-1.5">
              {USERS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setActiveUserId(u.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 md:py-1.5 text-[11px] md:text-xs transition-colors ${
                    activeUserId === u.id
                      ? "border-sky-400 bg-sky-500/20 text-sky-100"
                      : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-sky-400/70 hover:bg-sky-500/10"
                  }`}
                >
                  <span>{u.emoji}</span>
                  <span>{u.label}</span>
                </button>
                
              ))}
            </div>
          </div>

          {/* 가운데: 타이틀 (모바일 상단) */}
          <div className="order-1 md:order-2 text-center md:flex-1">
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
              팔만음감경 <span className="text-indigo-400">🎧</span>
            </h1>
          </div>

          {/* 오른쪽: 균형 맞추기용 빈 영역 (데스크탑 전용) */}
          <div className="order-3 w-[80px] md:w-[120px] hidden md:block" />
        </div>
      </section>



      {/* 가운데 카드 영역 */}
      {/* 메인 레이아웃: 모바일=세로 / 데스크탑=좌우 */}
<section className="flex-1 min-h-0 flex flex-col md:flex-row">
  

  {/* ========================= */}
  {/*       왼쪽: 리스트        */}
  {/* ========================= */}
  <div className="flex-1 overflow-y-auto border-r border-slate-800/60 bg-black/30">

    {/* 아래 리스트 섹션 내용 전체 */}
    <div className="w-full px-4 md:px-8 py-2 md:py-6 space-y-3">

      {/* 필터 바 (sticky) */}
            {/* 필터 바 (sticky) */}
      <div className="sticky top-0 z-20">
        <div className="rounded-2xl border border-slate-800 bg-black/80 backdrop-blur-md px-4 py-3 md:px-5 md:py-4 shadow-[0_0_20px_rgba(15,23,42,0.8)]">
          {/* 모바일: 필터 토글 버튼 */}
          <button
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className="w-full flex items-center justify-between md:hidden text-[12px] text-slate-200"
          >
            <span>검색 / 필터</span>
            <span className="text-[11px] text-slate-400">
              {isFilterOpen ? "접기 ▲" : "열기 ▼"}
            </span>
          </button>

          {/* 실제 필터 내용 */}
          <div
            className={`mt-3 md:mt-0 space-y-3 ${
              isFilterOpen ? "block" : "hidden md:block"
            }`}
          >
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-slate-300">
              {/* 검색 */}
              <div className="flex-1 min-w-[160px] max-w-xs md:max-w-sm">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="제목 / 아티스트 검색"
                  className="w-full rounded-full border-2 border-slate-700 bg-slate-950 px-3 py-1.5 text-[11px] md:text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/70"
                />
              </div>

              {/* 장르 */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] md:text-xs text-slate-400">
                  장르
                </span>
                <select
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                  className="rounded-full border-2 border-slate-700 bg-slate-950 px-3 py-1.5 text-[11px] md:text-xs"
                >
                  <option value="all">전체</option>
                  {genres.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* 연도 / 정렬 */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] md:text-xs text-slate-400">
                  연도
                </span>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="rounded-full border-2 border-slate-700 bg-slate-950 px-3 py-1.5 text-[11px] md:text-xs"
                >
                  <option value="all">전체</option>
                  {Array.from(
                    new Set(
                      albums
                        .map((a) => a.year)
                        .filter((y): y is string => !!y)
                    )
                  )
                    .sort((a, b) => Number(b) - Number(a))
                    .map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] md:text-xs text-slate-400">
                  정렬
                </span>
                <select
                  value={sortKey}
                  onChange={(e) =>
                    setSortKey(e.target.value as SortKey)
                  }
                  className="rounded-full border-2 border-slate-700 bg-slate-950 px-3 py-1.5 text-[11px] md:text-xs"
                >
                  <option value="latest">최신순</option>
                  <option value="oldest">오래된순</option>
                  <option value="titleAsc">제목 A→Z</option>
                  
                  <option value="userRatingDesc">내 점수 높은 순</option>
                  <option value="userRatingAsc">내 점수 낮은 순</option>
                  
                </select>
              </div>
            </div>

            {/* 체크박스 + 초기화 */}
            <div className="flex items-center gap-3 text-[11px] md:text-xs text-slate-300">
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyUnrated}
                  onChange={(e) => setOnlyUnrated(e.target.checked)}
                  className="h-3 w-3 md:h-3.5 md:w-3.5 rounded border-slate-600 bg-slate-900 text-sky-400"
                />
                <span>아직 점수 안 준 것만</span>
              </label>

              <div className="ml-auto flex items-center gap-2">
  <button
    type="button"
    onClick={() => setIsAddModalOpen(true)}
    className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 hover:border-sky-400/70 hover:bg-sky-500/10"
  >
    ＋ 앨범 추가
  </button>

  <button
    type="button"
    onClick={resetFilters}
    className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 hover:border-sky-400/70 hover:bg-sky-500/10"
  >
    초기화
  </button>
</div>

            </div>
          </div>
        </div>
      </div>


            {/* 앨범 리스트 grid */}
      {visibleAlbums.length === 0 ? (
        <p className="text-slate-400 text-sm py-10">
          조건에 맞는 앨범이 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {visibleAlbums.map((a) => {
            const { ratings, avg } = getRatings(a);
            const glow = cardGlowClasses(avg ?? null);
            const isSelected = selectedAlbum?.id === a.id;

            const meta = metadataMap[a.id];
  const cardCoverUrl = meta?.coverUrl ?? a.coverUrl ?? null;

            return (
              <div
                key={a.id}
                onClick={() => setSelectedAlbumId(a.id)}
                className={`group relative cursor-pointer rounded-2xl border bg-slate-950/70 px-3 py-3 md:px-4 md:py-3 flex flex-col gap-1.5 transition-colors transition-shadow ${glow} ${
                  isSelected
                    ? "border-sky-400/90"
                    : "border-slate-800 hover:border-sky-500/70"
                }`}
              >
                {/* 커버 + 평균 평점 배지 (우측 상단) */}
<div className="relative mb-2">
  {cardCoverUrl ? (
    <img
      src={cardCoverUrl}
      alt={a.title}
      className="aspect-square w-full rounded-lg object-cover"
    />
  ) : (
    <div className="aspect-square w-full rounded-lg border border-slate-700 bg-slate-800/80 flex items-center justify-center text-[10px] md:text-xs text-slate-500">
      커버 없음
    </div>
  )}

                  {avg != null && (
                    <div
                      className={`absolute top-2 right-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] md:text-[11px] font-semibold border ${ratingChipClasses(
                        avg
                      )}`}
                    >
                      {avg.toFixed(1)}
                    </div>
                  )}
                </div>

                {/* 제목 / 아티스트 */}
                <p className="text-xs text-slate-300 truncate">{a.title}</p>
                <p className="text-[11px] text-slate-500 truncate">
                  {a.artist}
                </p>

                {/* 👤 모든 사용자 점수 (현재 사용자 포함) */}
                {ratings.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] md:text-xs">
                    {ratings.map((r) => {
                      const isMe = r.id === activeUserId;
                      return (
                        <div
                          key={r.id}
                          className={`flex items-center justify-between px-2 py-1 rounded-lg border bg-slate-950/60 border-slate-800 ${
                            isMe ? "border-sky-400 bg-sky-500/10" : ""
                          }`}
                        >
                          <span className="flex items-center gap-1 text-slate-300">
                            <span>{r.emoji}</span>
                            <span>{r.label}</span>
                          </span>
                          <span
                            className={`font-semibold ${ratingTextClasses(
                              r.value
                            )}`}
                          >
                            {r.value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}


    </div>
  </div>

  {/* ========================= */}
  {/*       오른쪽: 상세       */}
  {/* ========================= */}
  <div className="hidden md:block md:w-[40%] lg:w-[36%] xl:w-[32%] h-full bg-black/40 backdrop-blur-md border-l border-slate-800/60 p-4 overflow-y-auto min-h-0">
    <div
      className={`w-full max-w-xl mx-auto rounded-2xl border bg-slate-900/70 px-4 py-4 md:px-6 md:py-5 flex flex-col gap-4 ${centerBorder} ${centerGlow}`}
    >

      {/* ========== 앨범 상세 시작 ========== */}
                  {/* ========== 앨범 상세 시작 ========== */}
      {selectedAlbum ? (
        <>
          {/* 상단 평균 평점 뱃지 (우측 상단 작은 칩) */}
          {typeof highlightAvg === "number" && (
            <div className="self-end mb-2 px-3 py-1 rounded-full bg-slate-950/90 border border-slate-700 text-[11px] md:text-xs text-slate-100">
              평균{" "}
              <span className="font-semibold">
                {highlightAvg.toFixed(1)}
              </span>
            </div>
          )}

          {/* 🎧 Spotify 스타일 상단 영역 (커버 + 메타데이터) */}
          <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6">
            {/* 앨범 커버 */}
<div className="w-full md:w-40 lg:w-44 flex-shrink-0">
  {selectedCoverUrl ? (
  <img
    src={selectedCoverUrl}
    alt={selectedAlbum.title}
    className="w-full aspect-square rounded-xl border border-slate-700 object-cover"
  />
) : (
  <div className="w-full aspect-square rounded-xl border border-slate-700 bg-slate-800/80 flex items-center justify-center text-xs text-slate-500 text-center px-4">
    앨범 커버
    <br />
    (cover_url 컬럼에 이미지 링크를 넣으면 나와요)
  </div>
)}

</div>


            {/* 텍스트 메타 정보 */}
            <div className="flex-1 space-y-3">
              <div className="text-[10px] md:text-[11px] uppercase tracking-[0.18em] text-sky-400 font-semibold">
                Album
              </div>

              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
                {selectedAlbum.title}
              </h2>

              {/* 아티스트 / 연도 / 장르 + 아티스트 사진 (프로필처럼) */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  {selectedAlbum.artistPhotoUrl && (
                    <img
                      src={selectedAlbum.artistPhotoUrl}
                      alt={`${selectedAlbum.artist} 사진`}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-slate-700 object-cover"
                    />
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-sm md:text-base text-slate-200">
                    <span className="font-medium">{selectedAlbum.artist}</span>
                    {selectedAlbum.year && (
                      <span className="text-xs md:text-sm text-slate-400">
                        • {selectedAlbum.year}
                      </span>
                    )}
                    {selectedAlbum.genre && (
                      <span
                        className={`text-[10px] md:text-[11px] inline-flex items-center px-2 py-0.5 rounded-full border ${genreChipClasses(
                          selectedAlbum.genre
                        )}`}
                      >
                        {selectedAlbum.genre}
                      </span>
                    )}
                  </div>
                </div>

                {/* 남들 점수 요약 (유저별 칩) */}
                {highlightRatings.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] md:text-xs text-slate-300">
                    {highlightRatings.map((r) => (
                      <span
                        key={r.id}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${ratingChipClasses(
                          r.value
                        )}`}
                      >
                        <span>{r.emoji}</span>
                        <span>{r.label}</span>
                        <span className="font-semibold">{r.value}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 구분선 */}
          <div className="w-full h-px bg-slate-800/70 my-3 md:my-4" />

          {/* 점수 / 버튼 영역 */}
          <div className="space-y-2">
                      

          {/* 🎵 트랙리스트 */}
          {tracklistItems.length > 0 && (
            <div className="mt-3 space-y-1">
              <div className="text-[11px] md:text-xs font-semibold text-slate-400 uppercase tracking-[0.15em]">
                Tracklist
              </div>
              <ol className="max-h-40 overflow-y-auto pr-2 text-xs md:text-sm text-slate-200/90 space-y-0.5">
                {tracklistItems.map((track, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="w-4 text-right text-[11px] md:text-xs text-slate-500">
                      {idx + 1}
                    </span>
                    <span className="flex-1 truncate">{track}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

         

            {/* 점수 버튼 (1~8) */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[11px] md:text-xs text-slate-400">
                점수
              </span>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
                const selected =
                  getRatingValue(selectedAlbum, activeUserId) === num;
                return (
                  <button
                    key={num}
                    onClick={async () => {
                      if (!selectedAlbum) return;

                      const key = ratingKey(selectedAlbum.id, activeUserId);
                      const already = ratingMap[key];

                      if (already === num) {
                        // 같은 점수를 다시 누르면: 점수 삭제
                        await deleteRating(selectedAlbum.id, activeUserId);
                        setRatingMap((prev) => {
                          const next = { ...prev };
                          delete next[key];
                          return next;
                        });
                      } else {
                        // 새로운 점수 저장
                        await saveRating(selectedAlbum.id, activeUserId, num);
                        setRatingMap((prev) => ({
                          ...prev,
                          [key]: num,
                        }));
                      }
                    }}
                    className={`px-2.5 py-1 rounded-full border text-[11px] md:text-xs transition-colors ${
                      selected
                        ? "border-sky-400 bg-sky-500/20 text-sky-100"
                        : "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-sky-400/70 hover:bg-sky-500/10"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

                    {/* 메모 요약 + 팝업 열기 버튼 */}
          <div className="mt-3 border-t border-slate-800/60 pt-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                {USERS.find((u) => u.id === activeUserId)?.label}의 평
              </span>
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-sky-500/70 px-3 py-1 text-[11px] md:text-xs text-sky-200 bg-sky-500/10 hover:bg-sky-500/20"
              >
                ✍️ 평 쓰기 / 수정
              </button>
            </div>

            {/* 현재 작성된 평 요약 (3~4줄 정도 프리뷰) */}
            <div className="text-xs md:text-sm text-slate-300 whitespace-pre-line max-h-24 overflow-hidden">
              {currentNote ? (
                currentNote
              ) : (
                <span className="text-slate-500">
                  아직 작성한 평이 없습니다. 버튼을 눌러 평을 남겨보세요.
                </span>
              )}
            </div>
          </div>

        </>
      ) : (
        <div className="text-sm text-slate-400">
          왼쪽 리스트에서 앨범을 선택하세요.
        </div>
      )}
      {/* ========== 앨범 상세 끝 ========== */}

    </div>
  </div>

 {/* 모바일 전용 앨범 상세 오버레이 */}
  {selectedAlbum && selectedAlbumId && (
    <div className="fixed inset-0 z-30 bg-black/95 md:hidden">
      <div className="h-full overflow-y-auto px-4 py-5">
        {/* 상단 바: 제목 + 닫기 버튼 */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-slate-400">
            {USERS.find((u) => u.id === activeUserId)?.label}의 앨범 상세
          </span>
          <button
            type="button"
            onClick={() => setSelectedAlbumId(null)}
            className="inline-flex h-8 px-3 items-center justify-center rounded-full border border-slate-600 text-xs text-slate-200 hover:bg-slate-800"
          >
            닫기
          </button>
        </div>

        {/* 실제 상세 카드 */}
        <div
          className={`rounded-2xl border bg-slate-900/80 px-4 py-4 flex flex-col gap-4 ${centerBorder} ${centerGlow}`}
        >
          {/* 상단: 커버 + 타이틀/아티스트/장르 */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col items-start gap-3">
              {selectedAlbum.coverUrl ? (
                <img
                  src={selectedAlbum.coverUrl}
                  alt={selectedAlbum.title}
                  className="w-full aspect-square rounded-xl border border-slate-700 object-cover"
                />
              ) : (
                <div className="w-full aspect-square rounded-xl border border-slate-700 bg-slate-800/80 flex items-center justify-center text-xs text-slate-500 text-center px-4">
                  앨범 커버
                  <br />
                  (cover_url 컬럼에 이미지 링크를 넣으면 나와요)
                </div>
              )}

              <div className="w-full space-y-1">
                <div className="text-[10px] uppercase tracking-[0.18em] text-sky-400">
                  Album
                </div>
                <h2 className="text-2xl font-bold">{selectedAlbum.title}</h2>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-200">
                  <span className="font-medium">{selectedAlbum.artist}</span>
                  {selectedAlbum.year && (
                    <span className="text-xs text-slate-400">
                      · {selectedAlbum.year}
                    </span>
                  )}
                  {selectedAlbum.genre && (
                    <span
                      className={`text-[10px] inline-flex items-center px-2 py-0.5 rounded-full border ${genreChipClasses(
                        selectedAlbum.genre
                      )}`}
                    >
                      {selectedAlbum.genre}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 유저별 점수 칩 */}
            {highlightRatings.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300">
                {highlightRatings.map((r) => (
                  <span
                    key={r.id}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${ratingChipClasses(
                      r.value
                    )}`}
                  >
                    <span>{r.emoji}</span>
                    <span>{r.label}</span>
                    <span className="font-semibold">{r.value}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 트랙리스트 */}
          {tracklistItems.length > 0 && (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.15em]">
                Tracklist
              </div>
              <ol className="max-h-48 overflow-y-auto pr-1 text-xs text-slate-200 space-y-0.5">
                {tracklistItems.map((track, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="w-4 text-right text-[11px] text-slate-500">
                      {idx + 1}
                    </span>
                    <span className="flex-1 truncate">{track}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* 점수 & 버튼 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>
                {USERS.find((u) => u.id === activeUserId)?.label}의 점수:{" "}
                <span className="font-semibold text-sky-300">
                  {typeof currentRating === "number" ? currentRating : "-"}
                </span>
              </span>
              {selectedAlbum.link && (
                <a
                  href={selectedAlbum.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-sky-400 hover:text-sky-300 underline underline-offset-2"
                >
                  앨범 링크 열기
                </a>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-400">점수</span>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
                const selected = currentRating === num;
                return (
                  <button
                    key={num}
                    onClick={async () => {
                      if (!selectedAlbum) return;

                      const key = ratingKey(selectedAlbum.id, activeUserId);
                      const already = ratingMap[key];

                      if (already === num) {
                        // 같은 점수를 다시 누르면: 점수 삭제
                        await deleteRating(selectedAlbum.id, activeUserId);
                        setRatingMap((prev) => {
                          const next = { ...prev };
                          delete next[key];
                          return next;
                        });
                      } else {
                        // 새로운 점수 저장
                        await saveRating(selectedAlbum.id, activeUserId, num);
                        setRatingMap((prev) => ({
                          ...prev,
                          [key]: num,
                        }));
                      }
                    }}
                    className={`px-2.5 py-1 rounded-full border text-[11px] transition-colors ${
                      selected
                        ? "border-sky-400 bg-sky-500/20 text-sky-100"
                        : "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-sky-400/70 hover:bg-sky-500/10"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 평 프리뷰 + 팝업 열기 버튼 */}
          <div className="mt-3 border-t border-slate-800/60 pt-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>
                {USERS.find((u) => u.id === activeUserId)?.label}의 평
              </span>
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-sky-500/70 px-3 py-1 text-[11px] text-sky-200 bg-sky-500/10 hover:bg-sky-500/20"
              >
                ✍️ 평 쓰기 / 수정
              </button>
            </div>
            <div className="text-xs text-slate-300 whitespace-pre-line max-h-24 overflow-hidden">
              {currentNote ? (
                currentNote
              ) : (
                <span className="text-slate-500">
                  아직 작성한 평이 없습니다. 버튼을 눌러 평을 남겨보세요.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

</section>
  {/* ========================= */}
    {/*     평 작성 모달(팝업)    */}
    {/* ========================= */}
    {selectedAlbum && isNoteModalOpen && (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
        <div className="w-full max-w-lg mx-4 rounded-2xl bg-slate-950 border border-slate-700 shadow-[0_0_40px_rgba(15,23,42,0.9)] p-4 md:p-6">
          {/* 헤더 */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[11px] md:text-xs text-slate-400">
                {USERS.find((u) => u.id === activeUserId)?.label}의 평
              </p>
              <h2 className="text-sm md:text-base font-semibold text-slate-100">
                {selectedAlbum.title}
              </h2>
              <p className="text-[11px] md:text-xs text-slate-400">
                {selectedAlbum.artist}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNoteModalOpen(false)}
              className="ml-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          {/* textarea: 기존 handleNoteChange 그대로 사용 */}
          <div className="flex flex-col gap-2">
            <textarea
              value={currentNote}
              onChange={handleNoteChange}
              placeholder="짧게 욕을 써도 되고, 진지한 평을 써도 되고."
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs md:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/70"
              rows={8}
            />

            <div className="flex items-center justify-between text-[11px] md:text-xs text-slate-400">
              <span>쓰는 즉시 저장 (Supabase)</span>
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-600 px-3 py-1 text-[11px] md:text-xs text-slate-200 hover:bg-slate-800"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    {isAddModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">앨범 추가</h3>
        <button
          onClick={() => setIsAddModalOpen(false)}
          className="rounded-md px-2 py-1 text-slate-300 hover:bg-slate-800"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <input
          value={addForm.title}
          onChange={(e) => setAddForm((p) => ({ ...p, title: e.target.value }))}
          placeholder="Album title *"
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
        />
        <input
          value={addForm.artist}
          onChange={(e) => setAddForm((p) => ({ ...p, artist: e.target.value }))}
          placeholder="Artist *"
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
        />
        <input
          value={addForm.genre}
          onChange={(e) => setAddForm((p) => ({ ...p, genre: e.target.value }))}
          placeholder="Genre (optional)"
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
        />
        <input
          value={addForm.year}
          onChange={(e) => setAddForm((p) => ({ ...p, year: e.target.value }))}
          placeholder="Year (optional, e.g. 2017)"
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
        />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={() => setIsAddModalOpen(false)}
          className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900"
        >
          취소
        </button>
        <button
          onClick={submitAddAlbum}
          disabled={isAdding}
          className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
        >
          {isAdding ? "추가 중..." : "추가"}
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        추가 후 자동으로 커버/트랙을 검색해 채웁니다. (성공하면 즉시 반영)
      </p>
    </div>
  </div>
)}

    </main>
  );
}
