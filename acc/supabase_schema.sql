-- 앨범 테이블
CREATE TABLE albums (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  year TEXT,
  genre TEXT,
  tracklist TEXT,
  spotify_id TEXT,
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 유저 테이블
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  emoji TEXT NOT NULL
);

-- 평점 테이블
CREATE TABLE ratings (
  id SERIAL PRIMARY KEY,
  album_id TEXT REFERENCES albums(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  score INTEGER CHECK (score >= 1 AND score <= 8),
  one_line_review TEXT CHECK (CHAR_LENGTH(one_line_review) <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(album_id, user_id)
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ratings_updated_at
  BEFORE UPDATE ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 기본 유저 4명 삽입
INSERT INTO users (id, display_name, emoji) VALUES
  ('arkyteccc', 'arkyteccc', '🎧'),
  ('mangopatbbang', 'mangopatbbang', '🥭'),
  ('SJH', 'SJH', '🧊'),
  ('wugibugi', 'wugibugi', '🐰');
