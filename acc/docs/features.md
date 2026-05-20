# 기능 목록 (Feature Inventory)

> 아차청음사에 현재 구현된 모든 기능을 페이지/컴포넌트 단위로 정리한 목록.  
> 신규 기능 추가 시 이 문서를 먼저 업데이트할 것.

---

## 서비스 구조 한눈에 보기

아차청음사는 크게 **6개의 메인 페이지**로 구성된다:

| 경로 | 이름 | 역할 |
|------|------|------|
| `/` | 홈 | 통계 + 오늘의 인연 + 최근 청음 피드 |
| `/albums` | 음반고 | 전체 앨범 목록 — 검색·필터·추가 |
| `/best` | 청음감 | 평점 기반 랭킹 — 통합·연도·장르·아티스트 |
| `/reviews` | 청음평 | 전체 한줄평 피드 |
| `/themes` | 청음집 | 멤버들이 만든 선곡집 |
| `/members` | 청음인 | 멤버 목록 + 취향 비교 |

그 외 `/profile/[userId]`(개인 청음 기록), `/board`(게시판), `/admin`(어드민)이 있다.

**앨범 모달**은 서비스 전반에 걸쳐 사용되는 핵심 UI다.  
어느 페이지에서든 앨범 클릭 시 열리며, 트랙리스트·점수·한줄평·멤버 평가·댓글 등 앨범에 관한 모든 정보를 담는다.

---

## 홈 `/`

서비스 진입 화면. 통계 수치로 서비스 규모를 보여주고, 오늘의 인연 앨범과 최근 청음 피드로 활동감을 전달한다.  
"오늘의 인연"은 날짜를 시드로 한 해시값으로 결정되어 하루 동안 고정된다 — 새로고침해도 바뀌지 않는다.

| 기능 | 컴포넌트 / 파일 | 설명 |
|------|----------------|------|
| 통계 히어로 | `(main)/page.tsx` | 총 앨범 수·평가 수 실시간 CountUp 애니메이션 |
| 오늘의 인연 | `HomeTodaySection.tsx` | KST 날짜 기반 FNV-1a 해시 → 결정적 랜덤 앨범, 하루 한 번만 바뀜 |
| 최근 청음 피드 | `HomeRecentFeed.tsx` | 최근 6개 평가 (아바타 + 점수 + 커버 미리보기) |
| 리뷰 티커 | `ReviewTicker.tsx` | 80개 한줄평 중 40개 무작위 가로 스크롤 자막 |
| 홈 검색바 | `HomeSearchBar.tsx` | 음반고로 이동하는 검색 입력 (Enter 시 /albums?search=…) |
| 모바일 빠른 접근 | `(main)/page.tsx` | 청음감·청음집·청음인 단축 링크 (모바일 전용, sm:hidden) |
| 모바일 로그인 힌트 | `MobileLoginHint.tsx` | 비로그인 시 로그인 안내 링크 |
| 모바일 로그아웃 버튼 | `HeroLogoutButton.tsx` | 히어로 우상단 로그아웃 (모바일 전용) |

---

## 음반고 `/albums`

청음사에 등록된 모든 앨범을 탐색하는 공간. 검색·장르·지역 필터와 9가지 정렬 옵션을 제공한다.  
앨범은 Spotify에서 검색해 추가하며, 커버 이미지·트랙리스트·발매일이 자동으로 가져와진다.  
무한 스크롤로 로드되고, 어느 앨범이든 클릭하면 앨범 모달이 열린다.

| 기능 | 컴포넌트 / 파일 | 설명 |
|------|----------------|------|
| 앨범 그리드 | `AlbumList.tsx` | 커버 + 제목 + 아티스트 + 평균 점수 카드 |
| 무한 스크롤 | `AlbumList.tsx` | Intersection Observer 기반, offset 30씩 추가 로드 |
| 검색 | `AlbumList.tsx` | 제목 / 아티스트 / extra_artists 통합 검색 |
| 장르 필터 | `AlbumList.tsx` + `FilterSelect.tsx` | 장르별 필터링 드롭다운 |
| 지역 필터 | `AlbumList.tsx` + `FilterSelect.tsx` | 국내 / 해외 |
| 정렬 | `AlbumList.tsx` + `FilterSelect.tsx` | 최신 입고·오래된 순·발매일·평균 점수 높은/낮은·제목·내 점수 등 9가지 |
| 미평가 필터 | `AlbumList.tsx` | 아직 점수를 안 준 앨범만 표시 (로그인 필요) |
| 앨범 카드 | `AlbumCard.tsx` | 커버 이미지, Glow 효과(7·8점), 점수 컬러 배지, 국내/해외 뱃지, 장르 뱃지 |
| 앨범 추가 | `AlbumAddModal.tsx` | Spotify 검색 → 후보 선택 → DB 저장 (로그인 필요) |
| 랜덤 버튼 | `RandomButton.tsx` | 회전 애니메이션 + 미평가 앨범 랜덤 이동 |
| FloatingActions | `FloatingActions.tsx` | 앨범 추가 + 랜덤 플로팅 버튼 |
| 앨범 모달 | `AlbumModal.tsx` | 클릭 시 슬라이드업(모바일)/fadeIn(데스크탑) 상세 모달 |
| Intercepting Route | `@modal/(.)album/[id]/` | URL 직접 접근 vs 네비게이션 클릭 분기 (모달 vs 전체 페이지) |

---

## 앨범 모달 `AlbumModal.tsx`

서비스 전체에서 가장 복잡한 단일 컴포넌트. 앨범에 관한 모든 정보와 인터랙션을 담는다.  
모바일에서는 하단에서 슬라이드업, 데스크탑에서는 중앙 페이드인으로 열린다.  
앨범 URL을 링크로 열면 Intercepting Route를 통해 모달로 처리되지만, URL을 직접 입력하면 전체 페이지로 열린다.

| 기능 | 설명 |
|------|------|
| 트랙리스트 | 곡명 목록 + 재생시간(mm:ss) 표시, 좋아요 토글 (트랙 행 클릭) |
| 점수 입력 | 1~8점 버튼, 선택 시 Glow 펄스 애니메이션 |
| 한줄평 | 최대 100자 입력 (글자 수 실시간 카운트) |
| 개인 메모 | 최대 500자, 본인만 열람 가능 |
| 인연 앨범 | "이 앨범과 인연이 있나요?" 체크박스 + 날짜 입력 + 발견 경로 |
| 다른 멤버 한줄평 | 점수 컬러 배지 + 아바타 + 텍스트, 좋아요 토글 |
| 댓글 | 한줄평에 달린 댓글 목록 + 작성 |
| SoundCloud 플레이어 | soundcloud_url 있을 시 내장 플레이어 표시 |
| Spotify Attribution | SpotifyAttribution.tsx로 Spotify 로고 + 링크 |
| 앨범 수정 (admin) | AlbumEditModal.tsx 연결 — 정보·커버·트랙리스트 수정 |
| 아티스트 모달 | 아티스트명 클릭 시 ArtistModal 열기 |
| 스토리카드 | StoryCard.tsx — SNS 공유용 카드 이미지 생성 |
| 찜 (watchlist) | 하트 버튼으로 찜 목록 추가/제거 |

---

## 아티스트 모달 `ArtistModal.tsx`

앨범 모달에서 아티스트명을 클릭하면 열린다. 해당 아티스트의 디스코그래피 전체와 멤버별 평균 점수를 한눈에 볼 수 있다. "이 아티스트 앨범들을 우리가 어떻게 평가했나"를 빠르게 조회하는 용도다.

| 기능 | 설명 |
|------|------|
| 아티스트 사진 | Spotify 또는 직접 등록한 사진 |
| 디스코그래피 | 해당 아티스트 모든 앨범 목록 (평균 점수 포함) |
| 장르 분포 | 파이/바 형태의 장르 분포 |
| 멤버별 평균 | 각 멤버가 이 아티스트에게 준 평균 점수 |

---

## 청음감 `/best`

평점 데이터 기반 랭킹 페이지. 통합·연도·장르·아티스트 4가지 뷰로 전환할 수 있다.  
7점 이상 앨범에는 청록/라임 Glow 효과가 적용되고, "미발견 명반" 섹션에서는 한 명만 들은 고점 앨범을 보여준다.

| 기능 | 컴포넌트 / 파일 | 설명 |
|------|----------------|------|
| 통합 랭킹 | `BestPageClient.tsx` | 평균 점수 기준 전체 앨범 순위 |
| 연도별 랭킹 | `BestPageClient.tsx` | 발매 연도별 TOP5 + 미발견 명반 바 |
| 장르별 랭킹 | `BestPageClient.tsx` | 장르별 TOP5 |
| 아티스트별 랭킹 | `BestPageClient.tsx` | 아티스트별 앨범 목록 + 평균 점수 정렬 |
| 미발견 명반 | `BestPageClient.tsx` | 한 명만 들은 고점 앨범 (HiddenGemsBar) |
| 뷰 전환 | `BestPageClient.tsx` | 통합/연도/장르/아티스트 탭 전환 |
| Glow 효과 | `BestPageClient.tsx` + `score.ts` | 7·8점 앨범 발광 테두리 |
| 메달 아이콘 | `BestPageClient.tsx` | 🥇🥈🥉 TOP3 표시 |

---

## 청음평 `/reviews`

멤버 전체의 한줄평을 모아보는 피드 페이지. 점수가 아닌 "한 줄로 남긴 감상"에 집중한다. 멤버들이 서로의 한줄평에 좋아요를 누르고 댓글을 달 수 있어, 청음 경험을 공유하는 소통 공간 역할을 한다. 한줄평 좋아요는 여러 사람이 동시에 눌러도 데이터가 깨지지 않도록 optimistic locking(5회 재시도)을 적용했다.

| 기능 | 컴포넌트 / 파일 | 설명 |
|------|----------------|------|
| 전체 한줄평 피드 | `ReviewsClient.tsx` | 최신 / 좋아요 순 정렬 |
| 검색 | `ReviewsClient.tsx` | 한줄평 내용 전문 검색 |
| 점수 범위 필터 | `ReviewsClient.tsx` | 최소~최대 점수 필터 |
| 무한 스크롤 | `ReviewsClient.tsx` | offset 기반 추가 로드 |
| 한줄평 좋아요 | `ReviewsClient.tsx` | 토글 버튼, Optimistic locking 5회 재시도 |
| 댓글 보기 | `ReviewsClient.tsx` | 한줄평 클릭 시 댓글 섹션 확장 |

---

## 청음집 `/themes`

멤버가 직접 큐레이팅한 선곡집을 모아보는 페이지. "출근길에 듣기 좋은 곡들", "비 오는 날 재즈" 같은 테마로 앨범의 특정 트랙들을 묶어서 공유할 수 있다. 선곡집 카드는 담긴 앨범 커버 4장을 2×2 콜라주로 자동 구성한다.

| 기능 | 컴포넌트 / 파일 | 설명 |
|------|----------------|------|
| 선곡집 목록 | `ThemesPageClient.tsx` | 최근 선곡집 10개 그리드 |
| 선곡집 생성 | `PlaylistEditor.tsx` | 앨범·트랙 선택 + 제목 + 공개 여부 설정 |
| 선곡집 상세 | `/playlist/[id]/page.tsx` | 선곡 목록 + 각 곡 코멘트 |
| 선곡집 수정 | `PlaylistEditor.tsx` | 소유자 전용 수정/삭제 |
| 공개·비공개 | `PlaylistVisibilityToggle.tsx` | 공개 여부 토글 |
| 커버 콜라주 | `ThemesPageClient.tsx` | 최대 4개 앨범 커버 2×2 그리드 |

---

## 청음인 `/members`

멤버 목록과 취향 비교 페이지. 각 멤버의 청음 수·평균 점수·점수 분포·상위 장르를 카드로 보여준다.  
"취향 유사도"는 두 멤버가 공통으로 들은 앨범에서 점수 차이의 평균(MAE)을 계산해 얼마나 취향이 비슷한지 수치화한다.

| 기능 | 컴포넌트 / 파일 | 설명 |
|------|----------------|------|
| 멤버 카드 | `members/page.tsx` | 아바타 + 청음 수 + 평균 + 점수 분포 미니 바 + 상위 장르 |
| 청음 수 랭킹 | `members/page.tsx` | 진행 바 형태의 청음 수 순위 |
| 평균 점수 랭킹 | `members/page.tsx` | 점수 컬러 바 형태의 평균 순위 |
| 취향 유사도 | `MembersSections.tsx` | 멤버 간 MAE(평균절대오차) 기반 취향 거리 행렬 |

---

## 프로필 `/profile/[userId]`

개인의 청음 기록 전체를 보는 공간. 본인 프로필과 타인 프로필 모두 접근 가능하다.  
통계 수치부터 캘린더 히트맵, 연도별 회고, 아티스트 섹션, 명반전(8점 앨범 갤러리)까지 가장 많은 섹션을 가진 페이지다.  
프로필 스냅샷 카드를 이미지로 다운로드해 SNS에 공유할 수 있다.

| 기능 | 컴포넌트 / 파일 | 설명 |
|------|----------------|------|
| 프로필 헤더 | `profile/[userId]/page.tsx` | 아바타 라이트박스, 표시명, 자기소개 |
| 청음 통계 | `profile/[userId]/page.tsx` | 총 청음 수, 평균 점수, 명반 수, 한줄평 수 |
| 점수 분포 차트 | `profile/[userId]/page.tsx` | 1~8점 막대 그래프 |
| 장르 분포 | `profile/[userId]/page.tsx` | 장르별 비율 + 컬러 배지 |
| 아티스트 섹션 | `ArtistSection.tsx` | 가장 많이 들은 아티스트, 평균 점수 |
| 명반전 (HOF) | `HallOfFameSection.tsx` | 8점 앨범 갤러리 |
| 최근 청음 | `RecentRatingsSection.tsx` | 최근 평가 앨범 목록 |
| 최근 한줄평 | `RecentRatingsSection.tsx` | 최근 작성 한줄평 |
| 인연 앨범 | `EncounterSection.tsx` | is_encounter=true 앨범 목록 + 인연 날짜 |
| 청음 캘린더 | `CalendarSection.tsx` | 히트맵 달력 (listening_logs 기반) |
| 청음 인사이트 | `InsightSection.tsx` | 연도별 회고, 총 재생시간, 통계 요약 |
| 찜 목록 | `WatchlistSection.tsx` | 찜한 앨범 목록 |
| 좋아하는 곡 | `LikedTracksButton.tsx` | liked_tracks 앨범 목록 모달 |
| 취향 비교 | `ComparisonSection.tsx` | 다른 멤버와의 공통 청음 + 점수 차이 |
| 청음 로그 | `ListeningLogsSection.tsx` | 날짜별 청음 기록 (listening_logs) |
| 프로필 편집 | `ProfileEditButton.tsx` | 표시명·자기소개·아바타 변경 (본인만) |
| 스토리카드 | `ProfileCaptureButton.tsx` | 프로필 스냅샷 카드 이미지 생성 |
| 유저 신고 | `ReportUserButton.tsx` | 다른 유저 신고 (로그인 필요) |
| 모바일 설정 | `MobileSettingsButton.tsx` | 모바일 설정 메뉴 (본인만) |

---

## 게시판 `/board`

공지사항과 문의 창구를 합친 단순한 게시판이다. 어드민이 공지를 올리면 멤버들이 읽고, 멤버들은 문의를 남길 수 있다. 공개 서비스 전환 이후 사용자와 소통하는 공식 채널로 활용할 예정이다.

| 기능 | 컴포넌트 / 파일 | 설명 |
|------|----------------|------|
| 공지사항 목록 | `BoardClient.tsx` | NEW 배지, 날짜, 내용 |
| 공지 상세 | `BoardClient.tsx` | 클릭 시 내용 확장 |
| 공지 작성/수정/삭제 | `BoardClient.tsx` | admin 전용 |
| 문의 목록 | `BoardClient.tsx` | admin만 조회 가능 |
| 문의 작성 | `BoardClient.tsx` | 로그인 유저 문의 접수 |

---

## 어드민 `/admin`

`role = "admin"` 유저만 접근 가능한 운영 패널이다. 데이터 품질 관리(커버·트랙리스트 보완), 아티스트 정보 관리(한글명·검색 별칭·사진), 신고 처리 등 서비스 운영에 필요한 모든 작업을 여기서 처리한다. 특히 Spotify API 레이트 리밋(429)에 대응하는 재생시간 백필 기능은 어드민이 직접 진행 상황을 보며 실행한다.

| 기능 | 설명 |
|------|------|
| 앨범 관리 | 커버 없는·Spotify 미연결 앨범 필터, 정보 수정 |
| 재생시간 백필 | Spotify API로 track_durations 일괄 보완 (5개 배치, 429 대응) |
| 발매일 백필 | Spotify API로 release_date 일괄 보완 |
| 아티스트 별칭 관리 | 한글명 alias 추가/수정/삭제 |
| 아티스트 검색 별칭 | 검색용 추가 이름 관리 |
| 아티스트 이미지 | Spotify 사진 자동 등록 또는 수동 URL 등록 |
| 아티스트 정식명 업데이트 | artist_canonical PATCH |
| 데이터 통계 | 총 앨범·평가 수, 일별 이벤트, 기능 클릭, 기기 분포 |
| 활동 로그 | 유저 행동 이력 조회 |
| 신고 관리 | 신고 목록 + 처리 (경고/정지/영구정지/기각) |

---

## 공통 UI 컴포넌트

여러 페이지에서 공유되는 재사용 컴포넌트들이다. `src/components/ui/`에 독립적인 UI 단위로 모여 있고, `src/components/layout/`에 전체 레이아웃을 구성하는 컴포넌트가 있다. 새로운 페이지를 만들 때는 여기서 먼저 쓸 수 있는 게 있는지 확인한다.

| 컴포넌트 | 위치 | 설명 |
|---------|------|------|
| Header | `layout/Header.tsx` | 로고, 탭 네비, 알림 벨, 검색, 로그인/아바타 |
| BottomNav | `layout/BottomNav.tsx` | 모바일 하단 탭 바 (홈/음반고/청음평/프로필) |
| Toast | `ui/Toast.tsx` | 성공·실패·로딩 알림 |
| Spinner | `ui/Spinner.tsx` | 로딩 인디케이터 |
| FilterSelect | `ui/FilterSelect.tsx` | 공통 필터 드롭다운 |
| UserAvatar | `ui/UserAvatar.tsx` | 아바타 이미지 (없을 시 이모지 폴백) |
| SpotifyAttribution | `ui/SpotifyAttribution.tsx` | Spotify 로고 + 링크 (ADR-002 준수) |
| SpotlightTour | `ui/SpotlightTour.tsx` | 신규 유저 기능 안내 투어 |
| TutorialModal | `ui/TutorialModal.tsx` | 온보딩 튜토리얼 모달 |
| SplashScreen | `ui/SplashScreen.tsx` | 앱 초기 로딩 스플래시 |
| SwipeNav | `ui/SwipeNav.tsx` | 모바일 스와이프 네비게이션 |
| ReportModal | `ui/ReportModal.tsx` | 신고 모달 (사유 선택) |
| CountUp | `ui/CountUp.tsx` | 숫자 카운트업 애니메이션 |
| MobileLoginHint | `ui/MobileLoginHint.tsx` | 비로그인 힌트 배너 |
| LoadingMessage | `ui/LoadingMessage.tsx` | 텍스트 로딩 메시지 |
| AppleMusicLink | `ui/AppleMusicLink.tsx` | Apple Music 외부 링크 버튼 |
| YoutubeMusicLink | `ui/YoutubeMusicLink.tsx` | YouTube Music 외부 링크 버튼 |
| PageHeader | `layout/PageHeader.tsx` | 페이지 제목 + 부제목 + 우측 슬롯 |
| OnboardingModal | `onboarding/OnboardingModal.tsx` | 첫 방문 온보딩 (Spotlight Tour 포함) |
| PageViewTracker | `analytics/PageViewTracker.tsx` | 클라이언트 페이지뷰 자동 트래킹 |

---

## 음악 외부 서비스 연동

앨범 메타데이터와 음악 재생은 외부 서비스에 의존한다. Spotify가 핵심으로, 앨범 검색부터 커버·트랙리스트·재생시간까지 모두 Spotify API에서 가져온다. SoundCloud는 앨범 단위 임베드 플레이어를 제공할 때 URL을 직접 저장하는 방식이다. Apple Music과 YouTube Music은 링크만 제공하고 재생은 해당 앱에서 한다.

| 서비스 | 기능 | 컴포넌트 / API |
|--------|------|---------------|
| Spotify | 앨범 검색, 커버 이미지, 트랙리스트, duration_ms | `/api/spotify/*` |
| Spotify | Spotify 링크 Attribution | `SpotifyAttribution.tsx` |
| SoundCloud | 앨범별 임베드 플레이어 URL 저장 | `SoundCloudAddModal.tsx` |
| Apple Music | 외부 링크 버튼 | `AppleMusicLink.tsx` |
| YouTube Music | 외부 링크 버튼 | `YoutubeMusicLink.tsx` |

---

## 인증 & 권한

Supabase Auth 기반의 이메일/비밀번호 인증을 사용한다. 로그인하면 JWT가 발급되고 클라이언트 전역 `AuthContext`에 유저 정보가 저장된다. 비로그인 상태에서는 읽기만 가능하고 평점·댓글·추가 등 모든 쓰기 작업은 막힌다. 어드민(`role = "admin"`)만 접근 가능한 API는 서버에서 별도로 권한을 검증한다. 밴된 유저는 밴 유형에 따라 쓰기가 차단된다.

| 기능 | 설명 |
|------|------|
| 이메일/비밀번호 회원가입 | Supabase Auth + users 테이블 레코드 생성 |
| 로그인 | JWT 발급, AuthContext 전역 상태 |
| 비로그인 제한 | 평점·한줄평·댓글·추가 등 쓰기 작업 차단 |
| admin 권한 | `users.role = "admin"` 확인, 어드민 API 보호 |
| 밴 처리 | `banned_at` (영구) / `ban_until` (임시) 확인 후 쓰기 차단 |

---

## 알림 시스템

내 활동에 반응이 생겼을 때(댓글, 좋아요) 또는 어드민 조치가 내려졌을 때(경고, 정지) 알림이 생성된다. 헤더의 알림 벨 아이콘에 미읽음 수가 뱃지로 표시된다. 알림을 클릭하면 관련 앨범이나 한줄평으로 이동하며 읽음 처리된다.

| 알림 유형 | 트리거 |
|-----------|--------|
| `comment` | 내 한줄평에 댓글 달렸을 때 |
| `like` | 내 한줄평에 좋아요 눌렸을 때 |
| `report_reviewed` | 내 신고가 처리됐을 때 |
| `moderation_warning` | 경고 처치 받았을 때 |
| `moderation_ban_temp` | 임시 정지됐을 때 |
| `moderation_ban_permanent` | 영구 정지됐을 때 |

알림 읽음 처리: 개별 / 전체 일괄.  
헤더 알림 벨에 미읽음 수 배지 표시.

---

## 이벤트 트래킹

Vercel Analytics가 유료로 전환되면서 자체 트래킹 시스템을 구현했다(ADR-003 참고). 어떤 페이지가 많이 조회됐는지, 어떤 앨범이 자주 열렸는지, 어떤 기능 버튼이 많이 클릭됐는지를 `activity_logs`와 `track_logs` 테이블에 기록한다. 어드민 데이터 탭에서 일자별·기능별로 조회할 수 있어 서비스 사용 패턴을 파악하는 데 쓴다.

자체 구현 분석 시스템 (Vercel Analytics 대체, ADR-003 참고):

| 이벤트 | 함수 | 설명 |
|--------|------|------|
| 페이지뷰 | `trackPageView(path)` | 경로별 조회 수 |
| 앨범 방문 | `trackAlbumVisit(albumId)` | 모달 열기 횟수 |
| 검색 | `trackSearch(query)` | 검색어 기록 |
| 기능 클릭 | `trackFeatureClick(feature, value)` | 버튼/탭 클릭 |

어드민 데이터 탭에서 일자별·기능별 조회 가능.

---

## 스토리카드 & 공유

청음 기록을 SNS에 공유할 수 있는 이미지 생성 기능이다. 앨범 스토리카드는 특정 앨범에 대한 감상을 인스타그램 스토리 형식으로 내보낼 수 있고, 프로필 캡처는 내 전체 청음 통계를 한 장의 이미지로 만들어준다. html2canvas 기반으로 DOM을 직접 캡처하는 방식을 쓴다.

| 기능 | 컴포넌트 | 설명 |
|------|---------|------|
| 앨범 스토리카드 | `StoryCard.tsx` + `StoryCardPreviewModal.tsx` | 앨범 커버 + 점수 + 한줄평 SNS 카드 이미지 |
| 프로필 캡처 | `ProfileCaptureButton.tsx` | 프로필 통계 스냅샷 이미지 다운로드 |
