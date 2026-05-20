# 시스템 아키텍처 개요

> 아차청음사(ACC) 전체 구조를 한눈에 파악하기 위한 문서.

---

## 서비스 개요

아차청음사는 **친구들끼리 함께 음반을 들으며 평가를 기록하는 클럽 서비스**다.  
소규모 클로즈드 멤버십으로 시작해 향후 공개 서비스 전환을 목표로 하고 있다.

서비스의 핵심 흐름:
1. 멤버가 앨범을 추가한다 (Spotify에서 메타데이터 자동 가져옴)
2. 각자 1~8점 + 한줄평을 남긴다
3. 랭킹, 프로필, 멤버 간 취향 비교 등 다양한 뷰로 기록을 탐색한다

---

## 기술 스택

| 레이어 | 기술 | 비고 |
|--------|------|------|
| 프레임워크 | Next.js 16 (App Router) | 서버 컴포넌트 + 클라이언트 컴포넌트 혼용 |
| 데이터베이스 | Supabase (PostgreSQL) | Auth 포함. 초기에는 구글 시트를 쓰다가 전환 (ADR-001) |
| 스타일링 | Tailwind CSS + 인라인 스타일 | CSS 변수 기반 다크 테마. Tailwind는 반응형 처리용, 세부 스타일은 인라인 |
| 배포 | Vercel | main 브랜치 푸시 시 자동 빌드·배포 |
| 음악 메타데이터 | Spotify Web API | 커버 / 트랙리스트 / 장르. MusicBrainz → iTunes 거쳐 최종 전환 (ADR-002) |
| 레이트 리밋 | Upstash Redis | 분당 60회 일반 / 10회 Spotify. 서버리스 환경에서 in-memory 방식 불가 |
| 캐싱 | Next.js `unstable_cache` | 1시간 TTL + revalidateTag. DB 직접 쿼리의 응답 속도 개선용 (ADR-004) |

---

## 전체 데이터 흐름

```
사용자 브라우저
    │
    ├── 서버 컴포넌트 (SSR) ──→ Supabase DB (직접 쿼리)
    │       │                        │
    │       └── unstable_cache ←────┘ (1시간 캐시)
    │
    └── 클라이언트 컴포넌트 ──→ /api/* (Route Handler)
                                      │
                              ┌───────┼───────────┐
                          Supabase  Spotify API  Upstash Redis
                           (DB)    (메타데이터)   (레이트 리밋)
```

---

## 라우팅 구조

Next.js App Router를 사용한다. 각 폴더가 URL 경로에 대응하며, 서버 컴포넌트(데이터 패치)와 클라이언트 컴포넌트(인터랙션)를 분리하는 패턴을 사용한다.

### URL 맵

```
/                       홈 — 통계 히어로, 오늘의 인연, 최근 평가 피드
/albums                 음반고 — 전체 앨범 그리드 (무한 스크롤 + 필터)
/best                   청음감 — 명반 순위 (연도/장르/아티스트/통합)
/reviews                청음평 — 전체 한줄평 피드
/themes                 청음집 — 선곡집 + 테마 컬렉션
/members                청음인 — 멤버 목록 및 취향 비교
/board                  게시판 — 공지사항 / 문의판
/profile/:userId        프로필 — 개인 청음 기록 및 통계
/playlist/:id           선곡집 상세
/album/:id              앨범 페이지 (URL 직접 접근 시 전체 모달 기능)
/admin                  어드민 패널 (role=admin 전용)
/login, /signup         인증
/privacy, /terms        법률 문서
```

### Route Group 구조

`(main)` 그룹은 Header를 공유하는 페이지들을 묶는다.  
`@modal`은 Next.js의 Parallel Routes + Intercepting Routes 기능을 활용해,  
앨범 URL을 네비게이션으로 열면 모달로, 직접 접근하면 전체 페이지로 처리한다.

```
src/app/
├── (main)/           ← Header + 공통 레이아웃을 공유하는 그룹 (ADR-006)
│   ├── layout.tsx    ← Header 고정 (페이지 로딩 중에도 헤더 유지)
│   ├── page.tsx      ← 홈
│   ├── albums/       ← 음반고
│   ├── best/         ← 청음감 (랭킹)
│   ├── board/        ← 게시판
│   ├── members/      ← 청음인 (멤버 목록)
│   ├── reviews/      ← 청음평 (한줄평 피드)
│   ├── themes/       ← 청음집 (선곡집)
│   ├── playlist/[id]/
│   └── profile/[userId]/
│
├── @modal/           ← 병렬 라우트 (Intercepting Route)
│   └── (.)album/[id]/  ← /album/:id 를 모달로 가로채기
│
├── album/[id]/       ← URL 직접 접근 시 전체 페이지 앨범 뷰
├── admin/            ← 어드민 (헤더 없음)
├── login/, signup/   ← 인증 (헤더 없음)
└── layout.tsx        ← 루트: Context Providers 주입
```

---

## 컴포넌트 계층 구조

데이터 패치는 서버에서, 상태 관리와 인터랙션은 클라이언트에서 담당하는 구조다.  
전역 상태(로그인 유저, 유저 목록, 아바타 URL, 알림)는 Context로 주입한다.

```
RootLayout (Context Providers 주입)
  ├── AuthContext
  ├── UsersContext
  ├── UserAvatarsContext
  └── NotificationsContext
       │
       └── (main)/layout.tsx
             ├── Header (네비게이션, 알림 벨, 검색바)
             ├── BottomNav (모바일 하단 탭)
             └── 각 page.tsx (서버 컴포넌트)
                   └── *Client.tsx (클라이언트 컴포넌트 — 인터랙션 담당)
```

### 서버 / 클라이언트 분리 패턴

대부분의 페이지가 이 패턴을 따른다:

```
page.tsx (서버 컴포넌트)
  - DB에서 데이터 fetch (unstable_cache 적용)
  - 데이터를 props로 전달
  └── PageClient.tsx (클라이언트 컴포넌트)
        - useState / useEffect / 인터랙션 처리
        - 필터, 정렬, 모달 상태 관리
```

---

## 주요 서비스 흐름

### 앨범 추가 흐름

```
사용자 검색 입력
  → AlbumAddModal
  → GET /api/spotify/tracks (Spotify 검색)
  → 후보 선택
  → POST /api/albums (DB 저장)
  → revalidateTag("all-albums-with-ratings")
  → 캐시 갱신
```

### 평점 등록 흐름

```
AlbumModal 점수 클릭
  → POST /api/ratings
  → 명반전 8점 제한 체크 (최대 12장)
  → DB upsert
  → rating_history 기록
  → revalidateTag 캐시 갱신
```

### 어드민 재생시간 백필 흐름

```
어드민 "재생시간 백필" 버튼
  → GET /api/admin/backfill-durations (전체 미백필 수 확인)
  → while (remaining > 0):
      POST /api/admin/backfill-durations (5개 배치)
      → 각 앨범 Spotify API 호출
      → 429 감지 시 retryAfter 반환
      → 클라이언트 카운트다운 후 재시도
```

---

## 캐시 전략

서버 컴포넌트는 DB를 직접 쿼리하지만, 매 요청마다 DB를 치면 느리다.  
`unstable_cache`로 응답을 1시간 캐싱하고, 데이터가 바뀌면 `revalidateTag`로 즉시 무효화한다.  
(ADR-004 참고)

### unstable_cache 태그 목록

| 태그 | 캐싱 대상 | TTL | 무효화 트리거 |
|------|-----------|-----|---------------|
| `all-albums-with-ratings` | 청음감 통계, 전체 순위 | 1시간 | 앨범/평점 추가·수정·삭제 |
| `profile-ratings` | 프로필, 청음인, 장르 통계 | 1시간 | 평점 추가·수정·삭제 |
| `all-member-ratings` | 멤버 전체 평가 통계 | 1시간 | 평점 추가·수정·삭제 |
| `all-users` | 유저 목록 | 5분 | 프로필 수정 |
| `user-avatar-urls` | 아바타 URL 맵 | 1시간 | 아바타 업로드 |
| `user-genre-emojis` | 유저별 상위 장르 | 1시간 | 평점 추가·삭제 |

### Supabase 1000행 제한 대응

Supabase PostgREST는 기본적으로 한 번의 쿼리에서 최대 1000행만 반환한다.  
전체 데이터를 읽어야 하는 통계·랭킹 쿼리에서 이 제한에 걸리면 데이터가 조용히 잘린다.  
(BUG-001 참고)

전체 데이터를 읽는 모든 쿼리는 페이지네이션 루프 필수:
```typescript
for (let page = 0; ; page++) {
  const { data } = await supabase
    .from("table")
    .select("...")
    .range(page * 1000, (page + 1) * 1000 - 1);
  if (!data || data.length === 0) break;
  all.push(...data);
  if (data.length < 1000) break;
}
```

---

## 인증 흐름

```
회원가입: Supabase Auth (email/pw) → users 테이블 레코드 생성
로그인: Supabase Auth → JWT 발급
API 요청: Authorization: Bearer {JWT} → validateUser() / validateAdmin()
어드민 확인: users.role === "admin"
밴 확인: users.banned_at IS NOT NULL 또는 users.ban_until > now()
```

---

## 외부 서비스 의존성

| 서비스 | 용도 | 제한 |
|--------|------|------|
| Spotify Web API | 앨범 검색, 커버, 트랙리스트, duration_ms | 분당 10회 (자체 제한) |
| Upstash Redis | 레이트 리밋 카운팅 | — |
| Supabase | DB + Auth + Storage (아바타) | max_rows 1000 (페이지네이션으로 우회) |
| Vercel | 서버리스 함수 | 실행 시간 제한 → 배치 5개 단위 |

---

## 아티스트 Display 시스템

```
앨범의 artist 필드 = Spotify 정식 영문명 (원본 보존)

표시명 결정 로직:
  use_artist_variant = true
    → artist_aliases 테이블에서 variant_name 조회 (한글명)
  use_artist_variant = false / null
    → artist 그대로 표시

검색 별칭:
  artist_search_aliases = 검색 시 매칭되는 추가 이름들
  "에픽하이" → "에픽 하이", "Epik High" 등 공백 정규화도 자동 적용
```

---

## 이벤트 트래킹

자체 구현 (Vercel Analytics 대체):

```typescript
trackPageView(path)                  // 페이지 조회
trackAlbumVisit(albumId)             // 앨범 모달 열기
trackSearch(query)                   // 검색어
trackFeatureClick(feature, value)    // 기능 버튼 클릭
```

모든 이벤트는 `activity_logs` / `track_logs` 테이블에 저장.  
어드민 데이터 탭에서 일자별 / 기능별로 조회 가능.
