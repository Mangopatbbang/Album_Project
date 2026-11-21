# AlbumModal 분리 계획

> 작성 2026-11-21. 대상: `src/components/album/AlbumModal.tsx` (2092줄).
> 상태: **1~5단계 분리 완료 (2026-11-21)** — AlbumModal 2092 → 1488줄. 보류 구역(상단·닫기 행 / 내 평점 입력·메모·저장)은 미분리. 화면 QA는 아래 체크리스트로 진행 예정.

## 왜 조심하는가

- 모달을 여는 곳이 **27곳**, 모든 유저가 쓰는 핵심 UI다.
- 2026-06 이후 이 파일을 수정한 커밋 29개 중 **19개가 버그 수정** (유령 오버레이, 닫기 후 클릭 불가, 레이스, zIndex 등).
- 닫기·뒤로가기·스크롤 잠금·ESC가 effect 9개에 얽혀 있다.
- 자동 테스트가 없다 → 회귀는 사람이 눌러봐야만 발견된다.

## 원칙

1. **동작 변화 0** — 코드 위치만 옮긴다. 버그 수정·개선은 분리 커밋에 섞지 않는다.
2. **상태·effect·핸들러는 기본적으로 부모에 남긴다.** 특히 닫기(`doClose`/`handleClose`), 뒤로가기(`handleHistory`), 스크롤 잠금, ESC 처리는 절대 옮기지 않는다.
3. 자식으로 옮기는 상태는 **그 구역에서만 쓰이고, 부모 핸들러·effect가 건드리지 않는 것**만.
4. 한 단계 = 한 커밋. 단계마다 `tsc` + `next build` + 아래 체크리스트의 해당 항목 확인. 문제 시 그 커밋만 되돌린다.

---

## 1단계 결과: 구조 지도

선언 수: 상태 40 / ref 17 / 파생·memo 13 / 핸들러 13 / effect 9. 로직 L72–681, 화면(JSX) L682–2091.

| 구역 | 줄 | 읽는 상태 | 바꾸는 상태(핸들러 경유 포함) | 판정 |
|---|---|---|---|---|
| 래퍼(배경·컨테이너) | 682–776 (95) | closing | closing, showCloseConfirm | **부모 유지** — 닫기·드래그 |
| 드래그 핸들 + 닫기 행 | 777–900 (124) | 6개 | 7개 (삭제·위시리스트·편집·카드미리보기) | 보류 — 닫기 로직과 얽힘 |
| 상단(커버·정보·액션·평균) | 901–1145 (245) | 5개 | 7개 | 보류 — 위와 같은 상태 공유 |
| 멤버 평점 | 1146–1288 (143) | expandedReviews 외 4 | 리뷰 좋아요·접기 | **분리 가능** |
| 전체 평점 바텀시트 | 1289–1357 (69) | ratingsSheetOpen | ratingsSheetOpen | **분리 가능** (상태는 부모 — effect가 참조) |
| 내 평점 입력(본체) | 1358–1513 (156) | myScore 외 4 | 점수·한줄평·가이드 | 보류 — 핵심, myScore 7구역 공유 |
| └ 메모 + 기록/삭제 버튼 | 1514–1580 (67) | 6개 | 10개 (저장 경로 전체) | 보류 — 저장·닫기 확인(isDirty) 연결 |
| └ 명반전 밀어내기 UI | 1581–1725 (145) | evict 4종 | evict 4종 (handleEvict) | **분리 가능** (상태는 부모) |
| └ 평점 이력 타임라인 | 1726–1758 (33) | myHistory | — | **분리 가능** (읽기 전용) |
| 청음 횟수 | 1759–1774 (16) | myScore, myHistory | — | **분리 가능** (읽기 전용) |
| 트랙리스트(+skeleton) | 1775–1934 (160) | 8개 | 트랙 좋아요·펼침·재시도 | **분리 가능** |
| 신고·문의 링크 | 1935–2023 (89) | infoReport 3종 | infoReport 3종 | **분리 가능** (자체 완결) |
| 중첩 모달 포털 | 2024–2091 (68) | 7개 | 5개 | **부모 유지** |

**여러 구역이 공유하는 상태 (부모에 남김)**: myScore(7구역), full(6), isWatchlisted(4), myHistory(4), myReview(3), showCardPreview(3), editing(3), showCloseConfirm(3), saved·closing·myLikedTracks·savingLike·deletingAlbum·artistModal·ratingsSheetOpen·showDeleteAlbumConfirm·hofLimitAlbums(각 2).

**핸들러가 직접 바꾸는 상태 (구역 전용이어도 부모에 남김)**
- `handleToggleLike` → myLikedTracks, savingLike, **shakingTrackIdx**
- `handleToggleLikeReview` → full, myLikedReviews, savingLike, **shakingReviewId**
- `handleEvict` → **evictAlbumId, evictScore, evicting**, hofLimitAlbums

**자식으로 옮길 수 있는 상태**: tracklistExpanded·hoveredTrack(트랙리스트), expandedReviews+`toggleReview`·hoveredReview(멤버 평점), pressedEvictScore(밀어내기), infoReportOpen·infoReportDetail·infoReportSubmitting(신고).

---

## 분리 순서 (위험 낮은 순)

| 단계 | 새 컴포넌트 | 옮기는 줄 | 자식으로 이동하는 상태 | 부모가 넘길 props | 위험 |
|---|---|---|---|---|---|
| 1 | `AlbumInfoReport` | ~89 | infoReport 3종 전부 | album(id·제목), data | 최저 — 자체 완결, 부모 상태 무관 |
| 2 | `RatingHistoryTimeline` + `ListenCount` | ~49 | 없음 | myHistory, myScore | 최저 — 읽기 전용 |
| 3 | `AlbumTracklist` | ~160 | tracklistExpanded, hoveredTrack | full, fullError, onRetry, tracklist, myLikedTracks, savingLike, shakingTrackIdx, onToggleLike, top3TrackIndices, hasDurations, users, ratings | 낮음 |
| 4 | `HofEvictPanel` | ~145 | pressedEvictScore | hofLimitAlbums, evictAlbumId·setter, evictScore·setter, evicting, onEvict, onCancel | 중간 — 저장 흐름 일부 |
| 5 | `MemberRatings` + `RatingsSheet` | ~212 | expandedReviews+toggleReview, hoveredReview | ratings, visibleUsers, hiddenCount, sortedUsers, myLikedReviews, savingLike, shakingReviewId, onToggleLikeReview, ratingsSheetOpen·setter, zIndex | 중간 |
| 보류 | 상단·닫기 행 / 내 평점 입력·메모·저장 | ~590 | — | — | 높음 — 닫기·저장·isDirty와 얽힘. 이 구역을 건드리는 기능 작업이 생길 때 같이 검토 |

**예상 결과**: 1~5단계 완료 시 약 650줄이 자식 컴포넌트로 이동 → AlbumModal **약 1,450줄** + 컴포넌트 6~7개. (보류 구역까지 하면 1,000줄 안팎이지만 위험 대비 이득이 작아 권장하지 않음.)

---

## 0단계 결과: QA 체크리스트

분리 각 단계 후, 그리고 배포 후 확인. **데스크탑 + 모바일** 둘 다.

### A. 진입 경로 (유형별로 대표 1곳씩)

| 유형 | 대표 확인 위치 | 해당 컴포넌트 |
|---|---|---|
| 카드 클릭 → 인터셉트 모달 | 음반고 앨범 카드 | AlbumCard → `@modal/(.)album` |
| URL 직접 접근 | 주소창에 `/album/<id>` | StandaloneAlbumModal |
| 홈 인라인 | 홈 오늘의 인연·갑론을박·이번 주 청음 | HomeToday/Controversial/Weekly* |
| 페이지 내 직접 렌더 | 청음감 랭킹, 청음방 소감, 리뷰 티커, 랜덤 버튼 | BestPageClient, ReviewsClient, ReviewTicker, RandomButton |
| 프로필 섹션 | 청음록 명반전·최근 청음·나중에 들을 앨범·히트맵 | HallOfFame, RecentRatings, Watchlist, AnnualHeatmap 등 |
| 중첩 | 앨범 모달 → 아티스트 → 다른 앨범 / 좋아하는 곡 → 앨범 | ArtistModal, LikedTracksButton |
| 비로그인 | 로그아웃 상태로 위 아무 곳 | — |

### B. 공통 동작 (각 진입 유형에서)

- [ ] 열림 — 커버·정보·평균 점수·멤버 평점이 정상 표시
- [ ] 닫기 4경로: ✕ 버튼 / ESC / 배경 클릭 / 브라우저 뒤로가기 (모바일: 아래로 드래그)
- [ ] 닫은 뒤 원래 페이지 클릭·스크롤이 정상 (유령 오버레이 없음)
- [ ] 입력 중 닫기 → "저장 안 된 내용" 확인창
- [ ] 중첩 모달이 부모 위에 뜨고, 닫으면 부모 모달로 돌아옴

### C. 기능별

- [ ] 평가: 점수 선택 → 기록 / 수정 / 삭제
- [ ] 한줄평(100자), 나만 보이는 메모(500자)
- [ ] 평점 이력 타임라인 (2회 이상 평가한 앨범)
- [ ] 명반전 12장 상태에서 8점 → 밀어내기 → 밀려난 앨범 점수·**한줄평 유지**
- [ ] 트랙 좋아요 토글 (하트, 흔들림), 트랙리스트 펼치기, 인기 트랙 표시
- [ ] 멤버 소감 공감 토글, 긴 소감 펼치기, 전체 평점 바텀시트
- [ ] 나중에 들을 앨범 추가/해제
- [ ] 스토리카드 미리보기·저장, (어드민) 앨범 편집·삭제
- [ ] 정보 오류 신고 제출
- [ ] 비로그인: 평가·공감·위시리스트 누르면 로그인 유도

### 단계별 집중 확인

| 단계 | 반드시 볼 항목 |
|---|---|
| 1 신고 | C 정보 오류 신고 |
| 2 이력·횟수 | C 평점 이력, 청음 횟수 표시 |
| 3 트랙리스트 | C 트랙 좋아요·펼치기·인기 트랙, 로딩 skeleton·에러 재시도 |
| 4 밀어내기 | C 명반전 밀어내기 전체 흐름 |
| 5 멤버 평점 | C 공감·펼치기·바텀시트, B 바텀시트 열린 상태에서 닫기 |

---

## 진행 기록

- [x] 0단계 체크리스트 (2026-11-21)
- [x] 1단계 구조 지도 (2026-11-21)
- [x] 1 AlbumInfoReport — `14b72ba` (2092 → 2007줄)
- [x] 2 RatingHistoryTimeline + ListenCount — `62aae5f` (→ 1977)
- [x] 3 AlbumTracklist — `5fd37c6` (→ 1812)
- [x] 4 HofEvictPanel — `72ecf43` (→ 1681)
- [x] 5 MemberRatings + RatingsSheet — `d965d8e` (→ 1488)
- [x] 이동 검증: 단계별 삭제 줄 vs 새 파일 줄 공백 무시 대조 — 차이는 의도한 props·콜백 치환과 노출 조건 한 줄화뿐. tsc(--noUnusedLocals)·next build 통과
- [ ] 화면 QA (위 체크리스트) — 사용자가 서비스 이용하며 확인
