import { DiaryEntry } from "@/types/diary";

function daysAgo(n: number): string {
  const d = new Date(Date.now() + 9 * 3600000 - n * 86400000);
  return d.toISOString().slice(0, 10);
}

export const SAMPLE_DIARY_ENTRIES: DiaryEntry[] = [
  {
    id: "sample-1",
    listened_at: daysAgo(0),
    note: "긴 하루 끝에 이어폰 꽂고 처음부터 끝까지 쭉 들었다. 요즘 이 앨범이 자꾸 생각난다. 음악이 이렇게 사람을 흔들 수 있다는 게 새삼 신기하다.",
    context: ["퇴근 후", "이어폰", "차분한", "감동적인"],
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
    note: "비 오는 날 카페에서. 창밖을 보면서 들으니 완전히 다른 앨범처럼 느껴졌다. 공간이 음악의 색을 바꾸는 것 같다.",
    context: ["카페", "비오는날", "감성적인", "집중"],
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
    context: ["산책", "맑은날", "가을"],
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
    note: "이 앨범을 처음 들었을 때가 생각났다. 그때의 나와 지금의 내가 같은 음악을 다르게 듣는다는 게 신기하다. 음악은 변하지 않지만 나는 변했다.",
    context: ["심야", "자취방", "그리운", "혼자"],
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
    note: "출퇴근 내내 반복 재생. 자꾸 반복하게 되는 앨범이 있는데 이게 그렇다.",
    context: ["출퇴근", "반복 청취", "에너지", "집중"],
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
