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



type SortKey = "latest" | "oldest" | "ratingDesc" | "ratingAsc" | "titleAsc";

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

export default function Home() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState<UserId>("arkyteccc");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [ratingMap, setRatingMap] = useState<Record<string, number>>({});
  // 🔹 선택된 앨범/유저가 바뀔 때 Supabase에서 해당 점수 GET
useEffect(() => {
  if (!selectedAlbumId || !activeUserId) return;

  const key = ratingKey(selectedAlbumId, activeUserId);

  async function loadRating() {
    try {
      const res = await fetch(
        `/api/ratings?albumId=${selectedAlbumId}&profileKey=${activeUserId}`
      );
      if (!res.ok) {
        console.warn("Failed to load rating");
        return;
      }

      const data = await res.json(); // { score: number | null }

      if (data && typeof data.score === "number") {
        setRatingMap((prev) => ({
          ...prev,
          [key]: data.score,
        }));
      }
    } catch (e) {
      console.error("GET rating error", e);
    }
  }

  loadRating();
}, [selectedAlbumId, activeUserId]);


  // 🔍 검색 / 필터 / 정렬 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("latest");
  const [ratingFilterUser, setRatingFilterUser] = useState<UserId | "all">(
    "all"
  );
  const [ratingFilterMin, setRatingFilterMin] = useState<number | null>(null);

  const resetFilters = () => {
    setSearchQuery("");
    setGenreFilter("all");
    setYearFilter("all");
    setSortKey("latest");
    setRatingFilterUser("all");
    setRatingFilterMin(null);
  };

  // 1) 앨범 데이터 fetch
  useEffect(() => {
    async function loadAlbums() {
      try {
        const res = await fetch(SHEET_CSV_URL);
        const text = await res.text();
        const rows = parseCsv(text);
        const mapped = mapAlbums(rows);
        setAlbums(mapped);
        if (mapped.length > 0) {
          setSelectedAlbumId(mapped[0].id);
        }
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

    // 검색
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.artist.toLowerCase().includes(q)
      );
    }

    // 장르 필터
    if (genreFilter !== "all") {
      list = list.filter((a) => a.genre === genreFilter);
    }

    // 연도 필터 (연도의 앞 4자리 기준)
    if (yearFilter !== "all") {
      list = list.filter((a) => {
        if (!a.year) return false;
        const m = a.year.match(/\d{4}/);
        return m ? m[0] === yearFilter : false;
      });
    }

    // 점수 필터
    if (ratingFilterUser !== "all" && ratingFilterMin != null) {
      list = list.filter((a) => {
        const { ratings } = getRatings(a);
        const r = ratings.find((x) => x.id === ratingFilterUser);
        return r ? r.value >= ratingFilterMin : false;
      });
    }

    // 정렬
    list.sort((a, b) => {
      if (sortKey === "latest" || sortKey === "oldest") {
        const da = parseDateFromYear(a.year) ?? -Infinity;
        const db = parseDateFromYear(b.year) ?? -Infinity;
        return sortKey === "latest" ? db - da : da - db;
      }
      if (sortKey === "titleAsc") {
        return a.title.localeCompare(b.title, "ko");
      }
      if (sortKey === "ratingDesc" || sortKey === "ratingAsc") {
        const aa = getRatings(a).avg ?? -Infinity;
        const bb = getRatings(b).avg ?? -Infinity;
        if (sortKey === "ratingDesc") {
          return bb - aa;
        } else {
          return aa - bb;
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
    ratingFilterUser,
    ratingFilterMin,
  ]);

  const displayAlbums = visibleAlbums.length > 0 ? visibleAlbums : albums;
  async function saveRating(albumId: string, userId: string, score: number) {
  await fetch("/api/ratings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ albumId, profileKey: userId, score }),
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

  // 가운데 카드용 트랙리스트 (세미콜론 기준 split)
  const tracklistItems =
    selectedAlbum?.tracklist
      ?.split(";")
      .map((t) => t.trim())
      .filter(Boolean) ?? [];

  const centerGlow = cardGlowClasses(highlightAvg ?? null);
  const centerBorder = centerBorderClasses(highlightAvg ?? null);

  return (
    <main className="h-screen bg-gradient-to-b from-black via-slate-950 to-black text-slate-50 flex flex-col">
      {/* 헤더 */}
      <section className="h-[20vh] min-h-[140px] flex items-center justify-center border-b border-slate-800/70 bg-black/40 backdrop-blur-md px-6">
        <div className="max-w-3xl mx-auto text-center space-y-2">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            팔만음감경 <span className="text-indigo-400">🎧</span>
          </h1>
          <p className="text-[13px] md:text-sm text-slate-300 leading-relaxed">
            우리끼리 듣고, 우리끼리 평가하는 앨범 기록장.
          </p>
          <p className="text-[11px] md:text-xs text-slate-500">
            외부 평점은 관심 없음.{" "}
            <span className="text-slate-200 font-semibold">우리 점수만 중요함.</span>
          </p>
        </div>
      </section>

      {/* 가운데 카드 영역 */}
      <section className="h-[40vh] min-h-[260px] border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-sm">
        <div className="h-full flex items-center justify-center px-6">
          <div
            className={`w-full max-w-6xl mx-auto rounded-2xl border bg-slate-900/70 shadow-[0_0_40px_rgba(15,23,42,0.8)] px-6 py-5 md:px-8 md:py-6 flex flex-col md:flex-row gap-6 md:gap-8 ${centerBorder} ${centerGlow}`}
          >
            {/* 앨범 커버 */}
            <div className="w-full md:w-56 flex-shrink-0">
              {selectedAlbum?.coverUrl ? (
                <img
                  src={selectedAlbum.coverUrl}
                  alt={selectedAlbum.title}
                  className="aspect-square w-full rounded-xl border border-slate-700 object-cover"
                />
              ) : (
                <div className="aspect-square w-full rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-xs text-slate-500">
                  앨범 커버
                  <br />
                  (cover_url 컬럼에 이미지 링크를 넣으면 나와요)
                </div>
              )}
            </div>

            {/* 정보 + 트랙리스트 + 유저탭 + 평 */}
            <div className="flex-1 flex flex-col gap-3">
              {selectedAlbum ? (
                <>
                  {/* 앨범 기본 정보 + 트랙리스트 */}
                  <div className="flex flex-col gap-2">
                    {/* 기본 정보 + 우측 아티스트 사진 & 평점 강조 */}
                    <div className="flex items-start justify-between gap-4">
                      {/* 왼쪽: 텍스트 정보 */}
                      <div className="space-y-1.5">
                        <h2 className="text-xl md:text-2xl font-semibold leading-relaxed">
                          {selectedAlbum.title}
                        </h2>
                        <p className="text-sm md:text-base text-slate-300">
                          {selectedAlbum.artist}
                        </p>
                        <p className="text-xs md:text-sm text-slate-400 mt-1 flex items-center flex-wrap gap-2">
                          {selectedAlbum.year && (
                            <span>{selectedAlbum.year}</span>
                          )}
                          {selectedAlbum.genre && (
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] md:text-xs font-medium border ${genreChipClasses(
                                selectedAlbum.genre
                              )}`}
                            >
                              {selectedAlbum.genre}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* 오른쪽: 아티스트 사진 + 큰 평균 평점 */}
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-3">
                          {/* 아티스트 사진 네모칸 */}
                          <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl border border-slate-700 bg-slate-950/80 overflow-hidden flex-shrink-0">
                            {selectedAlbum.artistPhotoUrl ? (
                              <img
                                src={selectedAlbum.artistPhotoUrl}
                                alt={selectedAlbum.artist}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">
                                아티스트
                                <br />
                                사진
                              </div>
                            )}
                          </div>

                          {/* 큰 평균 평점 (점 글자 제거) */}
                          {highlightAvg != null && (
                            <div
                              className={`rounded-full px-4 py-2 text-sm md:text-base font-semibold whitespace-nowrap border ${ratingChipClasses(
                                highlightAvg
                              )}`}
                            >
                              평균{" "}
                              <span className="text-lg md:text-xl align-middle">
                                {highlightAvg.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tracklist 라벨 (박스 밖) */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] md:text-xs text-slate-400">
                        Tracklist
                      </span>
                      {tracklistItems.length === 0 && (
                        <span className="text-[10px] text-slate-500">
                          (엑셀 tracklist 컬럼에 트랙을 세미콜론(;)으로 구분해 적으면 여기에 나옵니다)
                        </span>
                      )}
                    </div>

                    {/* 트랙리스트 박스 (고정 높이 + 스크롤) */}
                    <div className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-xs md:text-sm text-slate-200 min-h-[64px] max-h-24 overflow-y-auto flex-none">
                      {tracklistItems.length > 0 ? (
                        <ol className="space-y-0.5 list-decimal list-inside text-[11px] md:text-xs">
                          {tracklistItems.map((t, idx) => (
                            <li key={idx}>{t}</li>
                          ))}
                        </ol>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          아직 등록된 트랙리스트가 없습니다.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 유저 탭 */}
                  <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
                    {USERS.map((u) => {
                      const rating = highlightRatings.find(
                        (r) => r.id === u.id
                      )?.value;
                      const isActive = activeUserId === u.id;
                      const noteKey = selectedAlbum
                        ? `${selectedAlbum.id}:${u.id}`
                        : null;
                      const hasNote =
                        noteKey &&
                        notes[noteKey] &&
                        notes[noteKey].trim().length > 0;
                      const hasRating = rating !== undefined;
                      const hasContent = hasNote || hasRating;
                     


                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setActiveUserId(u.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 md:px-4 py-1.5 transition-colors ${
                            isActive
                              ? "border-sky-400 bg-sky-500/20 text-sky-100"
                              : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-sky-400/70 hover:bg-sky-500/10"
                          }`}
                        >
                          <span>{u.emoji}</span>
                          <span>{u.label}</span>
                          {rating !== undefined && (
                            <span
                              className={`font-semibold ${ratingTextClasses(
                                rating
                              )}`}
                            >
                              {rating}
                            </span>
                          )}
                          {hasContent && (
                            <span className="ml-0.5 inline-block w-2 h-2 rounded-[4px] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  


                  {/* 평점 입력 UI */}
<div className="flex items-center gap-2 mt-1 mb-1">
  <span className="text-xs text-slate-400">
    점수:
  </span>

  <div className="flex items-center gap-1">
    {[1,2,3,4,5,6,7,8].map((num) => {
      const selected = currentRating === num;
      return (
        <button
          key={num}
          onClick={() => {
            if (!selectedAlbum) return;
            saveRating(selectedAlbum.id, activeUserId, num);

            // local update
            const key = `${selectedAlbum.id}:${activeUserId}`;
            setRatingMap(prev => ({ ...prev, [key]: num }));
          }}
          className={`
            w-7 h-7 rounded-full border text-xs flex items-center justify-center
            transition
            ${selected
              ? "bg-sky-500 text-white border-sky-400"
              : "bg-slate-800 border-slate-600 text-slate-300 hover:border-sky-400"}
          `}
        >
          {num}
        </button>
      );
    })}
  </div>
</div>

                  {/* 평 작성 영역 */}
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>
                        {USERS.find((u) => u.id === activeUserId)?.label}의 평
                      </span>
                      <span className="opacity-70">
                        쓰는 즉시 저장 (localStorage)
                      </span>
                    </div>
                    <textarea
                      value={currentNote}
                      onChange={handleNoteChange}
                      placeholder="짧게 욕을 써도 되고, 진지한 평을 써도 되고."
                      className="mt-1 min-h-[60px] flex-1 w-full resize-none rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm md:text-[15px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/70"
                    />
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-400">
                  아직 선택된 앨범이 없어요. 아래 리스트에서 하나를 선택해보세요.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 아래 리스트: 이 영역만 스크롤 */}
      <section className="flex-1 overflow-y-auto">
        <div className="w-full px-7 md:px-8 py-4 md:py-6 space-y-4">
          {/* 필터 바 (sticky) */}
          <div className="sticky top-0 z-20">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 py-3 md:px-5 md:py-4 shadow-[0_0_20px_rgba(15,23,42,0.8)]">
              <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-slate-300">
                {/* 검색 (너무 길지 않게 폭 제한) */}
                <div className="flex-1 min-w-[160px] max-w-xs md:max-w-sm">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="제목 / 아티스트 검색"
                    className="w-full rounded-full border-2 border-slate-700 bg-slate-950 px-3 py-2 text-xs md:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/70"
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
                    className="rounded-full border-2 border-slate-700 bg-slate-950 px-3 py-1.5 text-[11px] md:text-xs focus:outline-none"
                  >
                    <option value="all">전체</option>
                    {genres.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 연도 필터 */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] md:text-xs text-slate-400">
                    연도
                  </span>
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="rounded-full border-2 border-slate-700 bg-slate-950 px-3 py-1.5 text-[11px] md:text-xs focus:outline-none"
                  >
                    <option value="all">전체</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 정렬 */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] md:text-xs text-slate-400">
                    정렬
                  </span>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="rounded-full border-2 border-slate-700 bg-slate-950 px-3 py-1.5 text-[11px] md:text-xs focus:outline-none"
                  >
                    <option value="latest">최신순</option>
                    <option value="oldest">오래된순</option>
                    <option value="ratingDesc">평균점수 높은순</option>
                    <option value="ratingAsc">평균점수 낮은순</option>
                    <option value="titleAsc">제목 가나다순</option>
                  </select>
                </div>

                {/* 점수 필터 */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] md:text-xs text-slate-400">
                    점수 필터
                  </span>
                  <select
                    value={ratingFilterUser}
                    onChange={(e) =>
                      setRatingFilterUser(e.target.value as UserId | "all")
                    }
                    className="rounded-full border-2 border-slate-700 bg-slate-950 px-3 py-1.5 text-[11px] md:text-xs focus:outline-none"
                  >
                    <option value="all">전체</option>
                    {USERS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={ratingFilterMin ?? ""}
                    onChange={(e) =>
                      setRatingFilterMin(
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    className="rounded-full border-2 border-slate-700 bg-slate-950 px-3 py-1.5 text-[11px] md:text-xs focus:outline-none"
                  >
                    <option value="">점수무관</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((v) => (
                      <option key={v} value={v}>
                        {v} 이상
                      </option>
                    ))}
                  </select>
                </div>

                {/* 초기화 버튼 */}
                <button
                  type="button"
                  onClick={resetFilters}
                  className="ml-auto inline-flex items-center gap-1 rounded-full border-2 border-slate-600 bg-slate-900 px-4 py-1.5 text-[11px] md:text-xs text-slate-200 hover:border-sky-400 hover:text-sky-200 hover:bg-sky-500/10"
                >
                  초기화
                </button>
              </div>
            </div>
          </div>

          {/* 리스트 */}
          {loading && albums.length === 0 && (
            <p className="text-slate-400 text-sm mt-4">불러오는 중...</p>
          )}

          {!loading && displayAlbums.length === 0 && (
            <p className="text-slate-400 text-sm mt-4">
              조건에 맞는 앨범이 없어요. 검색어/필터를 조정해보세요.
            </p>
          )}

          {displayAlbums.length > 0 && (
            <div className="mt-3 md:mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {displayAlbums.map((album) => {
                const key = album.id || `${album.title}-${album.artist}`;
                const { ratings, avg } = getRatings(album);
                const isSelected = selectedAlbum?.id === album.id;
                const glow = cardGlowClasses(avg ?? null);

                return (
                  <article
                    key={key}
                    onClick={() => setSelectedAlbumId(album.id)}
                    className={`group relative overflow-hidden rounded-2xl border 
                               cursor-pointer select-none
                               bg-slate-900/70 backdrop-blur-sm
                               transition-transform transition-shadow duration-200 hover:-translate-y-1 hover:scale-[1.02]
                               ${
                                 isSelected
                                   ? "border-sky-400"
                                   : "border-slate-800"
                               }
                               ${
                                 glow ||
                                 "shadow-[0_0_18px_rgba(15,23,42,0.6)]"
                               }`}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-gradient-to-br from-indigo-500 via-sky-400 to-emerald-400 pointer-events-none transition-opacity" />

                    <div className="relative p-4 md:p-5">
                      <div className="flex gap-4">
                        {/* 썸네일 */}
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl border border-slate-700 bg-slate-800/80 overflow-hidden flex-shrink-0">
                          {album.coverUrl ? (
                            <img
                              src={album.coverUrl}
                              alt={album.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] md:text-xs text-slate-500">
                              커버 없음
                            </div>
                          )}
                        </div>

                        {/* 내용 */}
                        <div className="flex-1 space-y-3">
                          {/* 상단 라벨 */}
                          <div className="flex items-center justify-between gap-3 text-[10px] md:text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              {album.year && (
                                <span className="rounded-full border border-slate-700 bg-slate-950/80 px-2 py-0.5 text-[10px] tracking-wide text-slate-300">
                                  {album.year}
                                </span>
                              )}
                              {album.genre && (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${genreChipClasses(
                                    album.genre
                                  )}`}
                                >
                                  {album.genre}
                                </span>
                              )}
                            </div>

                            {avg != null && (
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] md:text-[11px] font-semibold border ${ratingChipClasses(
                                  avg
                                )}`}
                              >
                                {avg.toFixed(1)}
                              </span>
                            )}
                          </div>

                          {/* 제목 / 아티스트 (여기만 잘림 허용) */}
                          <div className="space-y-1">
                            <h2 className="text-sm md:text-base font-semibold leading-snug line-clamp-2">
                              {album.title || (
                                <span className="text-slate-500">
                                  제목 없음
                                </span>
                              )}
                            </h2>
                            <p className="text-xs md:text-sm text-slate-300 leading-relaxed line-clamp-1">
                              {album.artist || (
                                <span className="text-slate-500">
                                  아티스트 정보 없음
                                </span>
                              )}
                            </p>
                          </div>

                          {/* 점수 요약: 이름/숫자 잘리지 않게 */}
                          {ratings.length > 0 && (
                            <div className="mt-1 grid grid-cols-2 gap-1.5 text-[10px] md:text-xs">
                              {ratings.map((r) => (
                                <div
                                  key={r.label}
                                  className="flex items-center justify-between rounded-lg bg-slate-950/70 border border-slate-800 px-2 py-1"
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
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
