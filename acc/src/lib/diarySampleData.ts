import { DiaryEntry } from "@/types/diary";

function daysAgo(n: number): string {
  return new Date(Date.now() + 9 * 3600000 - n * 86400000).toISOString().slice(0, 10);
}

export const SAMPLE_DIARY_ENTRIES: DiaryEntry[] = [
  {
    id: "sample-1",
    listened_at: daysAgo(0),
    note: "생각보다 훨씬 좋다.",
    context: ["퇴근 후", "이어폰", "차분한"],
    image_url: null,
    relistened: false,
    albums: {
      id: "sample-album-1",
      title: "CHROMAKOPIA",
      artist: "Kendrick Lamar",
      cover_url: null,
    },
  },
  {
    id: "sample-2",
    listened_at: daysAgo(1),
    note: "한 번에 다 듣진 못했다. 나중에 다시.",
    context: ["카페", "집중"],
    image_url: null,
    relistened: true,
    albums: {
      id: "sample-album-2",
      title: "Blonde",
      artist: "Frank Ocean",
      cover_url: null,
    },
  },
  {
    id: "sample-3",
    listened_at: daysAgo(2),
    note: null,
    context: ["산책", "맑은날"],
    image_url: null,
    relistened: false,
    albums: {
      id: "sample-album-3",
      title: "folklore",
      artist: "Taylor Swift",
      cover_url: null,
    },
  },
  {
    id: "sample-4",
    listened_at: daysAgo(14),
    note: "처음 들었을 때랑 좀 다르게 들린다.",
    context: ["심야", "혼자"],
    image_url: null,
    relistened: false,
    albums: {
      id: "sample-album-4",
      title: "LILAC",
      artist: "IU",
      cover_url: null,
    },
  },
  {
    id: "sample-5",
    listened_at: daysAgo(35),
    note: "출근길에 계속 틀었다.",
    context: ["출퇴근", "반복 청취"],
    image_url: null,
    relistened: true,
    albums: {
      id: "sample-album-5",
      title: "GNX",
      artist: "Kendrick Lamar",
      cover_url: null,
    },
  },
];
