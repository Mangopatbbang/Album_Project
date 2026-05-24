export type DiaryEntry = {
  id: string;
  listened_at: string;
  note: string | null;
  context: string[] | null;
  image_url: string | null;
  relistened: boolean;
  albums: {
    id: string;
    title: string;
    artist: string;
    cover_url: string | null;
  } | null;
};
