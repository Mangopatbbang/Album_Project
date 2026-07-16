# API 레퍼런스

> 모든 `/api/*` 엔드포인트 정리.  
> 인증이 필요한 엔드포인트는 `Authorization: Bearer {JWT}` 헤더 필요.

## 공통 규칙

**인증**: Supabase Auth에서 발급한 JWT를 `Authorization: Bearer {토큰}` 헤더로 전달.  
클라이언트 컴포넌트는 `supabase-browser.ts`를 통해 자동으로 토큰을 주입한다.

**권한 레벨**:
- 비로그인: GET(읽기) 전용
- 로그인: 본인 데이터 쓰기 (평점, 한줄평, 댓글, 찜 등)
- admin: `users.role = "admin"` — 어드민 전용 엔드포인트 접근 가능

**레이트 리밋**: Upstash Redis 기반. 일반 API 분당 60회, Spotify 연동 API 분당 10회.  
초과 시 `429 Too Many Requests` 반환.

**캐시 무효화**: 데이터를 변경하는 모든 POST/PATCH/DELETE 핸들러는 관련 `revalidateTag`를 호출해 서버 캐시를 즉시 갱신한다.

---

## 목차

- [앨범](#앨범)
- [평점](#평점)
- [한줄평 & 댓글](#한줄평--댓글)
- [선곡집](#선곡집)
- [유저](#유저)
- [찜 목록](#찜-목록)
- [팔로우](#팔로우)
- [좋아하는 곡](#좋아하는-곡)
- [알림](#알림)
- [게시판](#게시판)
- [신고](#신고)
- [Spotify / iTunes 연동](#spotify--itunes-연동)
- [트래킹](#트래킹)
- [어드민](#어드민)

---

## 앨범

서비스의 핵심 리소스인 앨범을 다루는 엔드포인트 그룹이다. 음반고 페이지의 무한 스크롤 목록 조회부터 앨범 추가·수정·삭제까지 담당한다. 앨범 추가는 보통 Spotify 검색 결과를 `POST /api/albums`로 저장하는 흐름으로 이루어진다. 수정·삭제는 admin 전용이다.

### `GET /api/albums`

앨범 목록 조회 (무한 스크롤 + 필터).

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `search` | string | 제목/아티스트/extra_artists 검색 |
| `genre` | string | 장르 필터 |
| `region` | string | `국내` / `해외` |
| `sort` | string | `newest` `oldest` `release_desc` `release_asc` `avg_desc` `avg_asc` `title` `my_desc` `my_asc` |
| `userId` | string | 정렬 기준 유저 (my_desc/asc 시 필수) |
| `unrated` | boolean | 미평가 앨범만 |
| `limit` | number | 페이지당 (기본 30, 최대 100) |
| `offset` | number | 페이지 오프셋 |

**응답:**
```json
{
  "items": AlbumWithRatings[],
  "total": number,
  "hasMore": boolean,
  "nextOffset": number
}
```

---

### `POST /api/albums`

새 앨범 추가. 로그인 필요.

**바디:**
```json
{
  "title": string,
  "artist": string,
  "year": string,
  "genre": string,
  "region": "국내" | "해외",
  "cover_url": string,
  "spotify_id": string,
  "release_date": string,
  "tracklist": string,
  "track_durations": string,
  "extra_artists": string,
  "soundcloud_url": string
}
```

**응답:** 생성된 Album 객체 (201)  
**에러:** 409 중복 앨범

---

### `GET /api/albums/[id]`

앨범 상세 조회 (ratings join 포함).

---

### `PATCH /api/albums/[id]`

앨범 정보 수정. **admin 전용.**

수정 가능 필드: `spotify_id`, `cover_url`, `tracklist`, `track_durations`, `title`, `artist`, `extra_artists`, `year`, `release_date`, `genre`, `region`, `use_artist_variant`

> `spotify_id` 제공 시 tracklist 자동 fetch.  
> `release_date` 제공 시 `year` 자동 동기화.

---

### `DELETE /api/albums/[id]`

앨범 삭제. **admin 전용.** (ratings, watchlist CASCADE 삭제)

---

### `GET /api/albums/random`

오늘의 인연 앨범 반환.  
FNV-1a 해시 기반 KST 날짜 시드 → 결정적 랜덤 (하루에 한 번만 바뀜).

---

### `GET /api/albums/artists`

아티스트 자동완성 목록.

| 파라미터 | 설명 |
|---------|------|
| `q` | 검색어 |

---

### `GET /api/albums/by-artist`

특정 아티스트의 모든 앨범.

| 파라미터 | 설명 |
|---------|------|
| `name` | Spotify 정식명 |

---

## 평점

멤버가 앨범에 남기는 점수·한줄평·개인 메모·인연 여부를 관리하는 엔드포인트 그룹이다. 한 멤버가 한 앨범에 평점을 하나만 남길 수 있기 때문에, 등록과 수정이 하나의 `POST`(upsert)로 처리된다. 좋아요 토글은 별도의 `PATCH`로 분리되어 있으며, 동시 요청에 대비한 optimistic locking이 적용된다.

### `GET /api/ratings`

평점 조회.

| 파라미터 | 설명 |
|---------|------|
| `albumId` | 앨범별 평점 |
| `userId` | 유저별 평점 |

> 자신의 `private_note`는 본인 요청 시에만 포함.

---

### `POST /api/ratings`

평점 등록/수정 (upsert). 로그인 필요.

```json
{
  "albumId": string,
  "score": number,             // 1-8
  "one_line_review": string,   // 최대 100자
  "is_encounter": boolean,     // 인연 앨범 여부
  "discovery_source": string,
  "private_note": string       // 최대 500자
}
```

**에러:** 409 명반전 한도 초과 (8점 12장 제한)

---

### `PATCH /api/ratings`

한줄평 좋아요 토글. 로그인 필요.

```json
{
  "albumId": string,
  "reviewerId": string   // 좋아요 대상 평점의 작성자
}
```

Optimistic locking (5회 재시도) 적용.

---

### `DELETE /api/ratings`

평점 삭제. 본인만 가능.

```json
{ "albumId": string }
```

---

## 한줄평 & 댓글

한줄평은 `ratings.one_line_review`에 저장된 데이터를 피드 형태로 조회하는 전용 엔드포인트다 — 별도 테이블이 아니다. 댓글은 특정 한줄평(평점)에 달리는 구조로, `albumId`와 `reviewerId` 조합으로 어떤 평점에 달린 댓글인지 특정한다.

### `GET /api/reviews`

전체 한줄평 피드.

| 파라미터 | 설명 |
|---------|------|
| `userId` | 특정 유저 한줄평만 |
| `albumId` | 특정 앨범 한줄평만 |
| `search` | 내용 검색 |
| `minScore` / `maxScore` | 점수 범위 |
| `sort` | `latest` / `most_liked` |
| `offset` | 페이지 오프셋 |

**응답:** ReviewItem[]

---

### `GET /api/comments`

특정 평점의 댓글 목록.

| 파라미터 | 설명 |
|---------|------|
| `albumId` | 앨범 ID |
| `reviewerId` | 평점 작성자 userId |

---

### `POST /api/comments`

댓글 작성. 로그인 필요.

```json
{
  "albumId": string,
  "reviewerId": string,
  "content": string   // 최대 200자
}
```

---

## 선곡집

멤버가 직접 큐레이팅한 선곡집을 관리하는 엔드포인트다. 선곡집 생성 시 제목, 공개 여부, 선곡 목록(앨범 + 트랙 인덱스)을 한번에 전송한다. 수정·삭제는 소유자만 가능하며, 비공개 선곡집은 소유자만 조회할 수 있다.

### `GET /api/playlists`

최근 선곡집 10개.

### `POST /api/playlists`

선곡집 생성. 로그인 필요.

```json
{
  "title": string,
  "entries": [{ "albumId": string, "trackIndex": number }],
  "is_public": boolean
}
```

### `GET/PATCH/DELETE /api/playlists/[id]`

선곡집 상세 조회 / 수정 / 삭제. 수정·삭제는 소유자만 가능.

---

## 유저

Supabase Auth와 별도로 운영하는 `users` 프로필 테이블의 CRUD 엔드포인트다. 회원가입 시 Auth 계정 생성 후 `POST /api/users`로 프로필 레코드를 추가하는 흐름이다. 프로필 수정(표시명, 아바타, 자기소개)은 본인만 가능하다.

### `GET /api/users`

전체 유저 목록.

### `POST /api/users`

프로필 생성 (회원가입 시).

```json
{
  "auth_id": string,
  "username": string,
  "display_name": string,
  "emoji": string
}
```

### `PATCH /api/users`

프로필 수정. 본인만 가능.

```json
{
  "display_name": string,
  "avatar_url": string,
  "bio": string,
  "onboarded": boolean
}
```

### `GET /api/user-avatars`

전체 유저 아바타 URL 맵 `Record<userId, url>` 반환.

### `POST /api/users/avatar`

아바타 이미지 업로드. Supabase Storage 사용.

---

## 찜 목록

"나중에 들을 앨범"을 저장하는 watchlist의 간단한 CRUD다. 추가와 삭제가 토글 방식으로 작동하며, 중복 추가 시 DB의 UNIQUE 제약이 방어한다.

### `GET /api/watchlist`

| 파라미터 | 설명 |
|---------|------|
| `userId` | 유저 찜 목록 |

### `POST /api/watchlist`

```json
{ "albumId": string }
```

### `DELETE /api/watchlist`

```json
{ "albumId": string }
```

---

## 팔로우

유저 간 팔로우 관계를 관리하는 엔드포인트 그룹. 청음록 소셜 탭에서 팔로우/언팔로우, 팔로워·팔로잉 수 조회, 팔로우 피드 열람에 사용된다.

### `GET /api/follows`

팔로워·팔로잉 수 및 팔로우 여부 조회. 공개 읽기 (비로그인 가능, `isFollowing`은 로그인 시에만 유효).

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `userId` | string | 조회할 유저 ID |

**응답:**
```json
{
  "followerCount": number,
  "followingCount": number,
  "isFollowing": boolean
}
```

---

### `POST /api/follows`

팔로우. 로그인 필요. 자기 자신 팔로우 불가.

**바디:**
```json
{ "targetId": string }
```

**응답:** 201  
**에러:** 400 (자기 팔로우), 409 (이미 팔로우 중)

---

### `DELETE /api/follows`

언팔로우. 로그인 필요.

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `targetId` | string | 언팔로우할 유저 ID (쿼리 파라미터) |

**응답:** 200

---

### `GET /api/follows/feed`

내가 팔로우한 유저들의 최근 평점 피드. 로그인 필요. 최대 40개.

**응답:**
```json
[
  {
    "album_id": string,
    "album_title": string,
    "album_artist_display": string,
    "album_cover_url": string | null,
    "score": number,
    "one_line_review": string | null,
    "updated_at": string,
    "user_id": string,
    "display_name": string,
    "avatar_url": string | null
  }
]
```

---

## 좋아하는 곡

앨범 내 특정 트랙에 좋아요를 표시하는 기능이다. `ratings.liked_tracks` 컬럼에 트랙 인덱스 목록이 세미콜론 구분 문자열로 저장된다. 앨범 모달에서 트랙 행 전체를 클릭하면 토글된다.

### `GET /api/liked-tracks`

| 파라미터 | 설명 |
|---------|------|
| `userId` | 유저 좋아하는 곡 목록 |

### `POST /api/liked-tracks`

트랙 좋아요 토글.

```json
{
  "albumId": string,
  "trackIndex": number
}
```

---

## 알림

### `GET /api/notifications`

| 파라미터 | 설명 |
|---------|------|
| `userId` | 수신 알림 목록 |

### `PATCH /api/notifications`

읽음 처리.

```json
{ "id": string }   // 특정 알림 | {} 전체 읽음
```

---

## 게시판

### `GET /api/notices`

공지사항 목록.

### `POST /api/notices`

공지 작성. **admin 전용.**

### `PATCH /api/notices/[id]`

공지 수정 / NEW 배지 토글. **admin 전용.**

### `DELETE /api/notices/[id]`

공지 삭제. **admin 전용.**

### `GET /api/inquiries`

문의 목록. **admin 전용.**

### `POST /api/inquiries`

문의 작성. 로그인 필요.

```json
{
  "content": string,
  "author_id": string,
  "author_name": string,
  "category": string   // "게시판 > 홈", "앨범 > 앨범명" 등
}
```

---

## 신고

### `POST /api/reports`

유저 신고. 로그인 필요.

```json
{
  "target_user_id": string,
  "reason": string
}
```

### `GET /api/admin/reports`

신고 목록. **admin 전용.**

### `PATCH /api/admin/reports/[id]`

신고 처리. **admin 전용.**

```json
{
  "status": "dismissed" | "warned" | "banned_7d" | "banned_14d" | "banned_permanent"
}
```

---

## Spotify / iTunes 연동

앨범 추가와 메타데이터 보완에 사용하는 Spotify API 래퍼 엔드포인트들이다. Spotify API는 OAuth 토큰이 필요하기 때문에 클라이언트에서 직접 호출하지 않고 이 서버 엔드포인트를 거친다. Upstash Redis로 분당 10회로 레이트 리밋을 자체 제한해 Spotify 계정이 차단되는 것을 방지한다.

### `GET /api/spotify/tracks`

Spotify 앨범 검색 및 트랙 정보 조회.

| 파라미터 | 설명 |
|---------|------|
| `title` | 앨범 제목 |
| `artist` | 아티스트명 |

**응답:**
```json
{
  "tracklist": string,       // 세미콜론 구분
  "track_durations": string, // ms 세미콜론 구분
  "cover_url": string,
  "spotify_id": string
}
```

### `GET /api/spotify/tracklist`

특정 Spotify 앨범 트랙리스트.

| 파라미터 | 설명 |
|---------|------|
| `spotify_id` | Spotify 앨범 ID |

### `GET /api/spotify/artist`

아티스트 정보 조회.

### `GET /api/spotify/artist-hint`

아티스트명 자동완성 힌트.

### `GET /api/migrate/spotify/search`

어드민 마이그레이션용 Spotify 후보 검색.

### `GET /api/migrate/tracklist`

트랙리스트 백필 (잘못된 spotify_id 자동 정리).

---

## 트래킹

자체 구현 분석 시스템의 이벤트 수집 엔드포인트다. Vercel Analytics가 유료화되면서 대체하기 위해 만들었다(ADR-003). 클라이언트에서 페이지 조회, 앨범 방문, 검색, 기능 클릭 등의 이벤트가 발생하면 `POST /api/track`으로 로그를 남긴다.

### `POST /api/track`

이벤트 기록.

```json
{
  "type": "page_view" | "album_visit" | "search" | "feature_click",
  "path": string,
  "albumId": string,
  "feature": string,
  "value": string,
  "userId": string
}
```

---

## 어드민

`role = "admin"` 유저만 접근 가능한 운영 전용 엔드포인트 그룹이다. 데이터 품질 보완(백필), 아티스트 정보 관리, 신고 처리, 통계 조회 등이 포함된다. 특히 백필 API는 Vercel 서버리스 함수의 실행 시간 제한에 걸리지 않도록 한 번에 5개씩 배치로 처리하며, Spotify 429 응답 시 `retryAfter`를 반환해 클라이언트가 카운트다운 후 재시도할 수 있도록 설계했다(ADR-005 참고).

> 모든 어드민 API는 `role = "admin"` 인증 필요.

### `GET /api/admin/analytics`

사용자 활동 대시보드 데이터.  
총 앨범 수, 총 평점 수(COUNT(*)), 일별 이벤트, 기능별 클릭, 기기 분포.

### `GET /api/admin/logs`

활동 로그 목록.

### `GET /api/admin/albums`

어드민용 앨범 목록.

| 파라미터 | 설명 |
|---------|------|
| `no_cover` | 커버 없는 앨범만 |
| `no_spotify` | Spotify 미연결 앨범만 |

### `GET /api/admin/stats`

서비스 전체 통계.

### `GET /api/admin/backfill-durations`

재생시간 미백필 앨범 수 조회.

**응답:** `{ "remaining": number }`

### `POST /api/admin/backfill-durations`

재생시간 백필 배치 실행 (5개씩).

**응답:**
```json
{
  "updated": number,
  "remaining": number,
  "done": boolean,
  "rateLimited": boolean,    // Spotify 429 시
  "retryAfter": number       // 대기 초
}
```

### `POST /api/admin/backfill-release-dates`

발매일 백필 배치.

### `GET/POST/DELETE /api/admin/artist-aliases`

아티스트 별칭 (한글명) 관리.

### `GET/POST/DELETE /api/admin/artist-search-aliases`

검색용 별칭 관리.

### `GET/POST/DELETE /api/admin/artist-images`

아티스트 이미지 관리.

### `PATCH /api/admin/artist-canonical`

아티스트 정식명 업데이트.

### `PATCH /api/admin/artist-use-variant`

`use_artist_variant` 일괄 전환.

### `GET /api/cron/cleanup-logs`

오래된 로그 자동 정리 (Vercel Cron).
