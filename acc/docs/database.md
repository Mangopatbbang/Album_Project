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
| `release_date` | TEXT | — | 발매일 (YYYY-MM-DD 또는 YYYY-MM 또는 YYYY) |
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

아티스트 모달에서 표시되는 사진을 저장하는 테이블이다. Spotify에서 자동으로 가져온 사진(`source = "spotify"`)과 어드민이 직접 URL을 등록한 사진(`source = "manual"`) 두 가지로 구분한다. 사진이 없는 아티스트는 모달에서 기본 플레이스홀더가 표시된다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL PK | — |
| `artist_name` | TEXT | Spotify 정식명 |
| `image_url` | TEXT | 사진 URL |
| `source` | TEXT | `spotify` / `manual` |

---

### `playlists` — 선곡집

멤버가 직접 큐레이팅한 선곡집의 메타데이터 테이블이다. 제목과 공개 여부만 여기에 저장하고, 실제 선곡 목록은 `playlist_entries`에 따로 관리한다. `is_public = false`인 선곡집은 소유자 본인만 볼 수 있다.

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

선곡집에 담긴 곡 한 항목이 한 행이다. 앨범 전체가 아닌 특정 트랙을 추천하는 구조라 `track_index`로 트랙을 특정한다. `order` 컬럼으로 선곡 순서를 관리한다. 앨범이 삭제되면 `album_id FK`를 통해 관련 항목도 정리된다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL PK | — |
| `playlist_id` | UUID FK → playlists.id | 선곡집 참조 |
| `album_id` | TEXT FK → albums.id | 앨범 참조 |
| `track_index` | INTEGER | 추천 트랙 인덱스 |
| `order` | INTEGER | 순서 |

---

### `watchlist` — 찜 목록

"아직 듣지 않았지만 나중에 들을 앨범"을 저장하는 테이블이다. 평점과 달리 점수 없이 앨범만 bookmark하는 가벼운 행위다. `UNIQUE (user_id, album_id)` 제약으로 중복 찜을 방지하고, 앱에서는 이 제약을 이용해 upsert 대신 insert/delete 토글로 처리한다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL PK | — |
| `user_id` | TEXT FK → users.id | — |
| `album_id` | TEXT FK → albums.id | — |
| `created_at` | TIMESTAMPTZ | — |
| — | UNIQUE (user_id, album_id) | 중복 방지 |

---

### `follows` — 팔로우 관계

유저 간 팔로우 관계를 저장하는 테이블. 청음록 소셜 탭의 팔로우 기능에 사용된다.  
`follower_id`가 `following_id`를 팔로우하는 단방향 관계이며, `UNIQUE(follower_id, following_id)` 제약과 자기 참조 방지 CHECK로 중복·자기팔로우를 막는다.  
`users.id`는 TEXT(username) 타입이므로 FK 컬럼도 TEXT를 사용해야 한다 — UUID 사용 시 타입 불일치 에러 발생.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL PK | — |
| `follower_id` | TEXT FK → users.id | 팔로우 하는 쪽 |
| `following_id` | TEXT FK → users.id | 팔로우 받는 쪽 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| — | UNIQUE (follower_id, following_id) | 중복 팔로우 방지 |
| — | CHECK (follower_id ≠ following_id) | 자기 팔로우 방지 |

**인덱스:**
- `follower_id` — 내가 팔로우하는 목록 조회
- `following_id` — 나를 팔로우하는 목록 조회

---

### `comments` — 평점 댓글

특정 멤버의 한줄평에 달린 댓글이다. `album_id`와 `reviewer_id`를 같이 들고 다니는 이유는, 댓글이 "앨범"이 아닌 "특정 앨범에 대한 특정 멤버의 평점"에 달리는 구조이기 때문이다. 댓글이 달리면 `reviewer_id` 유저에게 알림이 발송된다.

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

유저에게 발송되는 알림을 저장하는 테이블이다. 댓글(`comment`), 좋아요(`like`), 신고 처리 결과(`report_reviewed`), 제재 조치(`moderation_*`) 등 다양한 유형이 있다. `read = false`인 알림만 헤더 벨 아이콘에 카운트로 표시되고, 유저가 확인하면 `read = true`로 업데이트된다.

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

페이지 접근, 로그인, 앨범 추가 등 유저 행동을 기록하는 로그 테이블이다. 어드민 활동 로그 탭에서 "누가 언제 뭘 했는지" 이력을 조회할 때 쓴다. 비로그인 방문자도 `user_id = null`로 기록된다. 오래된 로그는 Vercel Cron으로 자동 정리된다.

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

`activity_logs`보다 더 세밀한 이벤트 데이터를 저장하는 테이블이다. Vercel Analytics를 대체하기 위해 자체 구현했다(ADR-003). 어떤 기능 버튼이 많이 클릭됐는지, 어떤 검색어가 많이 입력됐는지, 어떤 앨범이 많이 열렸는지를 기록한다. 어드민 데이터 탭의 차트와 테이블이 이 데이터를 시각화한다.

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

유저가 게시판에서 제출하는 문의를 저장하는 테이블이다. `category`는 "게시판 > 홈", "앨범 > 앨범명" 형태의 계층형 문자열로, 어디서 문의가 들어왔는지 맥락을 파악하는 데 쓴다. 어드민만 목록을 조회할 수 있고, 현재는 인앱 답변 기능은 없다.

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

유저가 다른 유저를 신고할 때 생성되는 레코드다. 어드민이 신고를 검토해 처리 결과(`status`)를 업데이트하면, 신고자와 피신고자 모두에게 관련 알림이 발송된다. 처리 가능한 조치는 기각(`dismissed`), 경고(`warned`), 7일·14일 임시 정지, 영구 정지(`banned_permanent`) 다섯 가지다.

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

평점이 수정될 때마다 이전 점수와 새 점수를 기록하는 이력 테이블이다. "처음에 5점 줬다가 나중에 7점으로 올렸다"는 기록이 남는다. 현재 UI에서 직접 보여주는 기능은 없지만, 향후 "취향 변화 추적" 같은 기능에 활용할 수 있는 기반 데이터다.

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

앨범에 붙이는 장르는 자유 입력이 아닌 아래 영문 목록에서 선택한다. 표준을 지켜야 장르 필터와 장르별 랭킹이 정확하게 동작하기 때문이다. `src/lib/bio.ts`의 `GENRE_COLOR` 맵이 각 장르에 고유한 색상을 할당한다.

```
Hip-Hop    R&B    Pop    Rock    Electronic
Folk    Alternative    Jazz    Country    OST    Compilation    Other
```

> 2026-05-28 DB 마이그레이션으로 구형 한국어 장르값(힙합, 락, 팝 등) 1,236개를 위 영문값으로 전환 완료.  
> `koGenre()` / `getRawGenreValues()` 변환 함수는 이 마이그레이션 후 삭제됨.  
> `GENRE_COLOR` 맵: `src/lib/bio.ts` 참고.

---

## 데이터 정합성 규칙

DB 레벨에서 강제하는 규칙들이다. 앱 코드가 잘못 작성되더라도 DB가 최후 방어선 역할을 한다. 일부는 DB CHECK 제약으로, 일부는 앱 레벨에서 409를 반환하는 방식으로 구현했다.

1. **앨범 삭제** → ratings, playlist_entries, watchlist 모두 CASCADE 삭제
2. **평점 unique** → album_id + user_id 쌍 중복 불가 (upsert 패턴)
3. **점수 범위** → CHECK (1 ≤ score ≤ 8) DB 레벨 강제
4. **한줄평 길이** → CHECK (CHAR_LENGTH ≤ 100) DB 레벨 강제
5. **명반전 제한** → 8점 최대 12장 (앱 레벨에서 체크, 409 반환)
6. **중복 찜** → watchlist UNIQUE (user_id, album_id)
