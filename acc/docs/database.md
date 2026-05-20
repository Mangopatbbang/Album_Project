# 데이터베이스 스키마

> Supabase (PostgreSQL) 전체 테이블 정의.  
> 실제 schema는 `supabase_schema.sql` 참고.

---

## 개요

아차청음사의 데이터는 크게 세 가지로 구성된다:

- **콘텐츠**: `albums` — 서비스의 핵심. 음반 정보와 Spotify 연동 메타데이터를 담는다.
- **사람**: `users` — 멤버 정보. Supabase Auth와 분리된 프로필 테이블.
- **활동**: `ratings`, `comments`, `watchlist`, `liked_tracks` 등 — 멤버들이 남기는 모든 기록.

초기에는 구글 시트 CSV를 파싱하고 멤버마다 컬럼을 추가하는 구조였으나,  
멤버 확장과 인증 관리의 한계로 Supabase로 전환했다 (ADR-001 참고).

---

## 테이블 관계도

```
albums ──────< ratings >─────── users
   │                               │
   │                           playlists
   │                               │
   └────────< playlist_entries >───┘
   
users ──────< watchlist >────── albums
users ──────< comments >─────── ratings
users ──────< notifications
users ──────< activity_logs
users ──────< reports

albums ──────< artist_aliases (artist 컬럼 기준)
```

---

## 핵심 테이블

---

### `albums` — 음반 카탈로그

서비스의 핵심 테이블. 앨범 한 장이 한 행이다.  
`artist` 컬럼은 Spotify 정식 영문명을 원본 그대로 저장하고, 한글명이 필요하면 `artist_aliases` 테이블을 조회한다.  
`tracklist`와 `track_durations`는 세미콜론(`;`)으로 구분된 문자열로 저장된다 — 예: `"노래1;노래2;노래3"` / `"210000;185000;230000"` (ms 단위).

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | TEXT | PK | UUID (자동 생성) |
| `title` | TEXT | NOT NULL | 앨범 제목 |
| `artist` | TEXT | NOT NULL | Spotify 정식 영문명 (원본 보존) |
| `artist_display` | TEXT | — | 계산값 (DB에는 없음, 앱 내 해상도) |
| `use_artist_variant` | BOOLEAN | — | true면 한글명 표시 |
| `extra_artists` | TEXT | — | 추가 아티스트 (세미콜론 구분) |
| `year` | TEXT | — | 발매 연도 (YYYY) |
| `release_date` | TEXT | — | 정확한 발매일 (YYYY-MM-DD) |
| `genre` | TEXT | — | 장르 (표준 목록 참고) |
| `region` | TEXT | — | `국내` / `해외` |
| `tracklist` | TEXT | — | 곡명 세미콜론 구분 |
| `track_durations` | TEXT | — | 재생시간 ms 세미콜론 구분 |
| `spotify_id` | TEXT | — | Spotify 앨범 ID |
| `soundcloud_url` | TEXT | — | SoundCloud 앨범 URL |
| `cover_url` | TEXT | — | 커버 이미지 URL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 입고 일시 |

**인덱스:**
- `artist` — 아티스트별 검색
- `genre` — 장르 필터
- `region` — 지역 필터

---

### `users` — 청음사 멤버

Supabase Auth의 인증 테이블과 별도로 운영되는 프로필 테이블이다.  
`id`는 사용자가 직접 선택한 username(예: `mangopatbbang`)이고, `auth_id`가 Supabase Auth UUID와 연결된다.  
이렇게 분리한 이유: Auth 테이블은 직접 수정이 불편하고, 표시명·아바타·자기소개 같은 프로필 데이터는 별도 관리가 편하기 때문.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | TEXT | PK | username (사용자 선택) |
| `display_name` | TEXT | NOT NULL | 표시 이름 |
| `emoji` | TEXT | NOT NULL | 이모지 (레거시, 현재는 아바타 사용) |
| `role` | TEXT | — | `admin` / `user` |
| `auth_id` | TEXT | — | Supabase Auth UUID |
| `avatar_url` | TEXT | — | 프로필 사진 URL |
| `onboarded` | BOOLEAN | — | 온보딩 완료 여부 |
| `bio` | TEXT | — | 자기소개 |
| `banned_at` | TIMESTAMPTZ | — | 영구정지 일시 |
| `ban_until` | TIMESTAMPTZ | — | 임시정지 만료 일시 |

**초기 삽입 데이터 (창립 멤버):**
```sql
('arkyteccc', 'arkyteccc', '🎧')
('mangopatbbang', 'mangopatbbang', '🥭')
('SJH', 'SJH', '🧊')
('wugibugi', 'wugibugi', '🐰')
```

---

### `ratings` — 평점 및 한줄평

서비스에서 가장 많이 읽히는 테이블. 멤버 한 명이 앨범 한 장에 대해 남기는 모든 기록을 담는다.  
`(album_id, user_id)` UNIQUE 제약으로 한 앨범에 한 평점만 가능하며, 수정 시 upsert 패턴을 사용한다.  
`liked_by`와 `liked_tracks`는 쉼표/세미콜론으로 구분된 문자열 — 별도 테이블로 분리하지 않고 간결하게 저장한다.  
`private_note`는 본인만 열람 가능한 개인 메모 (API에서 본인 요청 시에만 포함).

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | SERIAL | PK | 자동 증가 |
| `album_id` | TEXT | FK → albums.id ON DELETE CASCADE | 앨범 참조 |
| `user_id` | TEXT | FK → users.id | 유저 참조 |
| `score` | INTEGER | CHECK (1 ≤ score ≤ 8) | 점수 |
| `one_line_review` | TEXT | CHECK (len ≤ 100) | 한줄평 |
| `private_note` | TEXT | CHECK (len ≤ 500) | 개인 메모 (본인만 열람) |
| `liked_by` | TEXT | — | 좋아요한 userId 쉼표 구분 |
| `liked_tracks` | TEXT | — | 좋아하는 곡 인덱스 세미콜론 구분 |
| `encounter_date` | DATE | — | "인연" 날짜 |
| `discovery_source` | TEXT | — | 발견 경로 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 최초 등록 |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | 마지막 수정 |
| — | UNIQUE | (album_id, user_id) | 앨범당 유저 1개 평점 |

**트리거:**
```sql
ratings_updated_at — BEFORE UPDATE 시 updated_at 자동 갱신
```

**점수 의미:**
| 점수 | 색상 | 의미 |
|------|------|------|
| 1 | 빨강 `#e05050` | — |
| 2 | 주황빨강 `#e07838` | — |
| 3 | 앰버 `#df9e30` | — |
| 4 | 노랑 `#c8c028` | — |
| 5 | 연두 `#80c040` | — |
| 6 | 초록 `#38b068` | — |
| 7 | 청록 `#30a0b8` | Glow 효과 시작 |
| 8 | 네온 라임 `#e8ff48` | 명반전 등록, 강한 Glow |

**명반전 제한:** 8점 최대 12장 (HOF_LIMIT_REACHED 시 409 반환)

---

### `artist_aliases` — 아티스트 별칭

Spotify API는 아티스트 이름을 영문 정식명으로만 반환한다.  
한국 아티스트는 한글명으로 표시하고 싶을 때 이 테이블에 매핑을 등록한다.  
`albums.use_artist_variant = true`인 앨범만 이 테이블을 조회해 한글명으로 표시한다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL PK | — |
| `spotify_name` | TEXT | Spotify 정식 영문명 |
| `variant_name` | TEXT | 한글명 또는 표시명 |

**활용:** `albums.use_artist_variant = true` 일 때 `artist_aliases`에서 `variant_name` 조회 → 표시

---

### `artist_search_aliases` — 검색용 별칭

검색창에서 "에픽하이"를 치면 "Epik High"가 나와야 하는 것처럼,  
검색 시에만 쓰이는 추가 매핑 테이블이다. `artist_aliases`와 달리 표시명과 무관하게 검색 매칭에만 사용된다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL PK | — |
| `spotify_name` | TEXT | 기준 이름 |
| `alias` | TEXT | 검색 시 매칭될 추가 이름 |

**활용:** 검색 시 `alias` 컬럼도 포함하여 검색 (공백 정규화 자동 적용)

---

### `artist_images` — 아티스트 사진

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL PK | — |
| `artist_name` | TEXT | Spotify 정식명 |
| `image_url` | TEXT | 사진 URL |
| `source` | TEXT | `spotify` / `manual` |

---

### `playlists` — 선곡집

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | — |
| `user_id` | TEXT FK → users.id | 소유자 |
| `title` | TEXT | 제목 |
| `is_public` | BOOLEAN | 공개 여부 |
| `created_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ | — |

---

### `playlist_entries` — 선곡집 항목

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL PK | — |
| `playlist_id` | UUID FK → playlists.id | 선곡집 참조 |
| `album_id` | TEXT FK → albums.id | 앨범 참조 |
| `track_index` | INTEGER | 추천 트랙 인덱스 |
| `order` | INTEGER | 순서 |

---

### `watchlist` — 찜 목록

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL PK | — |
| `user_id` | TEXT FK → users.id | — |
| `album_id` | TEXT FK → albums.id | — |
| `created_at` | TIMESTAMPTZ | — |
| — | UNIQUE (user_id, album_id) | 중복 방지 |

---

### `comments` — 평점 댓글

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL PK | — |
| `album_id` | TEXT | 대상 앨범 |
| `reviewer_id` | TEXT | 평점 작성자 |
| `author_id` | TEXT FK → users.id | 댓글 작성자 |
| `content` | TEXT | 내용 (최대 200자) |
| `created_at` | TIMESTAMPTZ | — |

---

### `notifications` — 알림

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | — |
| `user_id` | TEXT FK → users.id | 수신자 |
| `type` | TEXT | `comment` / `like` / `report_reviewed` / `moderation_warning` / `moderation_ban_temp` / `moderation_ban_permanent` |
| `from_user_id` | TEXT | 발신자 |
| `album_id` | TEXT | 관련 앨범 |
| `read` | BOOLEAN | 읽음 여부 |
| `created_at` | TIMESTAMPTZ | — |

---

### `activity_logs` — 사용자 활동 기록

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL PK | — |
| `user_id` | TEXT | 유저 (비로그인 시 null) |
| `action` | TEXT | 액션 유형 |
| `path` | TEXT | 접근 경로 |
| `device` | TEXT | 기기 유형 |
| `created_at` | TIMESTAMPTZ | — |

---

### `track_logs` — 분석 이벤트 로그

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL PK | — |
| `type` | TEXT | `page_view` / `album_visit` / `search` / `feature_click` 등 |
| `user_id` | TEXT | — |
| `album_id` | TEXT | album_visit 시 |
| `feature` | TEXT | feature_click 시 기능명 |
| `value` | TEXT | feature_click 시 값 |
| `path` | TEXT | 접근 경로 |
| `created_at` | TIMESTAMPTZ | — |

---

### `inquiries` — 문의사항

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL PK | — |
| `author_id` | TEXT FK → users.id | 작성자 |
| `author_name` | TEXT | 표시 이름 |
| `category` | TEXT | 분류 (`게시판 > 홈` 등 계층형) |
| `content` | TEXT | 내용 |
| `created_at` | TIMESTAMPTZ | — |

---

### `reports` — 신고

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL PK | — |
| `reporter_id` | TEXT FK → users.id | 신고자 |
| `target_user_id` | TEXT FK → users.id | 피신고자 |
| `reason` | TEXT | 신고 사유 |
| `status` | TEXT | `pending` / `dismissed` / `warned` / `banned_7d` / `banned_14d` / `banned_permanent` |
| `reviewed_by` | TEXT | 처리한 어드민 |
| `reviewed_at` | TIMESTAMPTZ | 처리 일시 |
| `created_at` | TIMESTAMPTZ | — |

---

### `rating_history` — 평점 변경 이력

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL PK | — |
| `album_id` | TEXT | — |
| `user_id` | TEXT | — |
| `old_score` | INTEGER | 이전 점수 |
| `new_score` | INTEGER | 새 점수 |
| `changed_at` | TIMESTAMPTZ | 변경 일시 |

---

### `listening_logs` — 청음 로그

"몇 월 며칠에 이 앨범을 들었다"는 날짜 기록. 프로필 페이지의 캘린더 히트맵에 사용된다.  
평점과 별개로 청음 날짜만 따로 기록하고 싶을 때 쓴다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL PK | — |
| `user_id` | TEXT FK → users.id | — |
| `album_id` | TEXT FK → albums.id | — |
| `listened_at` | DATE | 청음 날짜 |

---

## 장르 표준 목록

```
록 / 락    힙합    팝    R&B    재즈    클래식
일렉트로닉   포크    인디    소울    메탈    발라드
블루스    펑크    레게    컨트리    기타
```

> `src/lib/bio.ts`의 `GENRE_COLOR` 맵에 각 장르별 색상 정의.

---

## 데이터 정합성 규칙

1. **앨범 삭제** → ratings, playlist_entries, watchlist 모두 CASCADE 삭제
2. **평점 unique** → album_id + user_id 쌍 중복 불가 (upsert 패턴)
3. **점수 범위** → CHECK (1 ≤ score ≤ 8) DB 레벨 강제
4. **한줄평 길이** → CHECK (CHAR_LENGTH ≤ 100) DB 레벨 강제
5. **명반전 제한** → 8점 최대 12장 (앱 레벨에서 체크, 409 반환)
6. **중복 찜** → watchlist UNIQUE (user_id, album_id)
