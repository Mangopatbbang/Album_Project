export type User = {
  id: string;
  display_name: string;
  emoji: string;
};

export type Album = {
  id: string;
  title: string;
  artist: string;           // Spotify 기준 정식 명칭 (변경 불가 — admin 전용)
  artist_display?: string;  // UI 표시 이름 (variant 선택 시 한글명, 아니면 artist와 동일)
  use_artist_variant?: boolean;
  extra_artists?: string | null;
  year?: string;
  release_date?: string | null;
  genre?: string;
  tracklist?: string;
  spotify_id?: string;
  soundcloud_url?: string | null;
  cover_url?: string;
};

export type Rating = {
  id: number;
  album_id: string;
  user_id: string;
  score: number;
  one_line_review?: string;
  created_at: string;
  updated_at: string;
};

export type AlbumWithRatings = Album & {
  ratings: Rating[];
  avg?: string;
};
