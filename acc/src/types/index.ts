export type UserId = "arkyteccc" | "mangopatbbang" | "SJH" | "wugibugi";

export type User = {
  id: UserId;
  display_name: string;
  emoji: string;
};

export type Album = {
  id: string;
  title: string;
  artist: string;
  year?: string;
  genre?: string;
  tracklist?: string;
  spotify_id?: string;
  cover_url?: string;
};

export type Rating = {
  id: number;
  album_id: string;
  user_id: UserId;
  score: number;
  one_line_review?: string;
  created_at: string;
  updated_at: string;
};

export type AlbumWithRatings = Album & {
  ratings: Rating[];
  avg?: string;
};

export const USERS: User[] = [
  { id: "arkyteccc", display_name: "arkyteccc", emoji: "🎧" },
  { id: "mangopatbbang", display_name: "mangopatbbang", emoji: "🥭" },
  { id: "SJH", display_name: "SJH", emoji: "🧊" },
  { id: "wugibugi", display_name: "wugibugi", emoji: "🐰" },
];
