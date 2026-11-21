# 백로그 통합

> 기준: 2026-11-21. 흩어져 있던 미룬 작업을 **한 곳에 전부** 모은 문서 — 이후 백로그는 여기서 관리한다.
> 상태는 모두 코드·DB와 대조해 확인한 값이다. 출처는 맨 아래 표 참고.

## 0. 한눈에 보기

| 구분 | 개수 | 핵심 |
|---|---|---|
| 🔴 보안·안정성 | 2 | 쓰기 API 레이트 리밋 미적용 다수, 문의 길이 제한 (Next 취약점은 2026-11-21 해결) |
| 🟠 공개 전환 직전 필수 | 3 | 이메일 인증·회원가입 제한(Supabase 대시보드 — 직접 설정), 가입 진입점 |
| 🟡 지금 할 수 있는 개선 | 24 | ESLint 위반 103건, 디자인 이슈 7, 8/29 점검 잔여 5(결정 2), admin 분리, AlbumModal 보류 구역 등 |
| ⏳ 조건 대기 | 12 + 스케일링 | 유저 수·이벤트·요청 트리거 |
| 💭 도입 미결정 기획 | 칭호 + 기획 21개 + 고충 3 | 결정 필요 |
| 👀 배포 후 화면 확인 | 18 | 2026-11-21 배포분 QA |
| ✅ 정리됨·현상 유지 | — | 기록용 |

---

## 1. 🔴 보안·안정성 — 지금 처리 권장

| # | 항목 | 상세 |
|---|---|---|
| S2 | 쓰기 API 레이트 리밋 미적용 | 쓰기 API 46개 중 적용: ratings(POST/PATCH/DELETE), inquiries·users POST(formLimiter, 2026-11-21). **미적용 유저 쓰기**: albums POST(입고)·`albums/[id]` DELETE, follows POST/DELETE, watchlist POST/DELETE, playlists POST·`playlists/[id]` PATCH, reports POST·`reports/album` POST, listening-logs POST/PATCH/DELETE, notifications PATCH/DELETE, users PATCH/DELETE, `users/avatar` POST. admin 전용은 불필요. `/api/track` POST는 페이지뷰마다 호출 → 일반 리밋 금지(필요 시 완화 리미터) |
| S3 | 문의 내용 길이 서버 제한 없음 | `/api/inquiries` POST — 클라이언트·서버 모두 길이 제한 없음 (2026-11-21 발견). 리밋·로그인은 적용됨 |

## 2. 🟠 공개 전환 직전 필수

| # | 항목 | 상세 |
|---|---|---|
| P1 | 이메일 인증 활성화 | Supabase → Authentication → Settings → "Enable email confirmations" (대시보드 설정 — 사용자가 직접) |
| P2 | 회원가입 제한 | Supabase → Authentication → Settings → "Disable sign-ups". 현재 누구나 `/signup` 가입 가능. 대안: 기획 J "초대 코드 시스템" |
| P3 | 가입 진입점 없음 (고충 I-4) | 비로그인 유저에게 가입 동선이 눈에 띄지 않음 — 공개 전환 직전 처리 |

## 3. 🟡 지금 할 수 있는 개선 (트리거 없음)

### 코드 품질·구조
| # | 항목 | 상세 |
|---|---|---|
| Q1 | ESLint 위반 103건 | 2026-11-21 도입 첫 실행: 에러 86 / 경고 17 (27파일). `react/no-unescaped-entities` 50, `react-hooks/set-state-in-effect` 18, `react-hooks/immutability` 9, `react-hooks/exhaustive-deps` 6, `react-hooks/refs` 4, `react-hooks/preserve-manual-memoization` 3, `no-explicit-any` 1, `react-hooks/purity` 1, `no-unused-vars` 1, 불필요한 `eslint-disable` 주석 10. 따옴표 50건은 기계적, 훅 규칙 35건은 동작 영향 검토 필요 |
| Q2 | admin/page.tsx 탭별 분리 | 1,940줄·상태 75개. 탭 간 공유 상태(앨범 목록·신고 건수·통계·activeTab)는 부모로 올리고 탭별 파일 분리 |
| Q3 | AlbumModal 보류 구역 | 1~5단계 분리 완료(2092→1488줄). 남은 상단·닫기 행 / 내 평점 입력·메모·저장(~590줄)은 닫기·저장·isDirty와 얽힘 → 해당 구역 기능 작업 시 같이 검토. `docs/refactor/album-modal-split.md` |
| Q4 | `/api/comments` 정리 | 댓글 기능 비활성(2026-05-29): GET 호출처 없음, POST는 410 고정 → 라우트 정리 후보 |
| Q5 | 미사용 추천 API | `/api/profile/[userId]/recommendations` (2026-05-31 "UI 없음, 데이터 수집") — 화면 연결 or 삭제 결정 (기획 H와 연결) |
| Q6 | 빌드 workspace root 경고 | 상위 폴더 `album_project/package-lock.json`(마이그레이션 스크립트용, gitignore) 때문에 Next가 루트를 잘못 추론 — `turbopack.root` 지정 or 상위 lockfile 정리 |
| Q8 | Edge Runtime deprecated | Next 16.4 빌드 경고 — `app/@modal/(.)album/[id]/page.tsx`의 `runtime = "edge"`. 2026-07 모바일 앨범 모달 무한로딩 해결책으로 넣은 것이라 nodejs로 바꿀 때 모바일 인터셉트 모달 로딩 재검증 필요. 지금은 경고만, 동작 정상 |
| Q7 | IA 롤백 메모 정리 | 메모리 `project_ia_rollback` (2026-07 개편 전 커밋 `24ffab3` 롤백법) — 이후 수백 커밋이 쌓여 실질 롤백 불가, 정리 후보 |

### 8/29 전체 코드 점검 잔여 (36건 중 미처리 5건 — 나머지는 2026-10-11·11-21 처리 완료)
| # | 항목 | 상세 |
|---|---|---|
| R13 | **[결정 필요]** 점수 바 `avg / 7` | `community/page.tsx` 멤버 탭 평균 점수 바가 `(avg / 7) * 100` (최고점 8). 7점=풀바 의도면 유지, 실수면 `/ 8` |
| R18 | **[결정 필요]** 좋아요 저장 상태 공유 | AlbumModal `savingLike` 하나를 트랙 좋아요·소감 공감이 공유 → 한쪽 저장 중엔 다른 쪽도 막힘. 의도면 비활성 피드백 추가, 아니면 상태 분리 |
| R14 | `as any` 4곳 | `playlist/[id]/page.tsx` 3곳(PostgREST 타입 한계), `api/admin/albums` 1곳 — ESLint `no-explicit-any`와 겹침(Q1) |
| R5 | `lib/bio.ts` 파일명 ≠ 내용 | 장르 색상 등이 들어 있음 → `genres.ts` 등으로 개명 (import 8곳, 기능 영향 없음) |
| R25 | `SettingsModal` 파일명 ≠ 내용 | 컴포넌트명·파일명 정리 (import 2곳, 기능 영향 없음) |

### 디자인 (출처: `docs/design-system.md` 미해결 이슈)
| # | 항목 |
|---|---|
| D1 | 음반고 "NEW" 뱃지 — 크림 채움+검정 글자라 스톡 흰/검처럼 보임 → 웜톤 칩 재디자인 (`AlbumCard.tsx`) |
| D2 | 홈 "갑론을박" 패널 — 왼쪽 카드와 높이 맞추며 생기는 빈 여백 |
| D3 | 청음감 — 섹션이 전부 같은 카드 톤이라 스크롤할수록 단조로움, 리듬 변화 필요 |
| D4 | `--text-muted`(#857468) on `--bg` 대비 ≈4.0:1 — WCAG AA(4.5:1) 미달, 작은 텍스트에 광범위 |
| D5 | 아이콘 전용 버튼 `aria-label` 부족 (전역 6건, AlbumModal 등 핵심 모달 0건) |
| D6 | (확인 필요) 청음록 섹션 헤더 스타일 3종·padding 방식 혼용 — 3탭 개편 후에도 남았는지 스크린샷 확인 |
| D7 | 어드민 별칭 NEW 뱃지 `#ffa500` 하드코딩 → `--warning` (우선순위 낮음) |

### 기타
| # | 항목 | 상세 |
|---|---|---|
| E1 | 앨범 모달 URL 공유 시 배경 검정 | changelog "기술 부채"에만 기록돼 있던 항목 — 현재도 재현되는지 확인 필요 |
| E2 | 미청음 + 취향 기반 정렬 없음 (고충 16) | 안 들은 앨범을 내 취향 순으로 보는 정렬 없음 |
| E3 | 온보딩 투어 재노출 | 2026-11-21 재작성. 기존 완료자는 저장 키(`acs_onboarding_v1`)가 그대로라 자동으로 다시 안 뜸 — ··· 메뉴 "튜토리얼 다시 보기"로만 확인 가능. 키 버전업할지 결정 |
| E4 | Figma Music Player Kit 반입 | fileKey `Hx4JNNp2YSQDXJDcxQNg0g` — Slider-albums 패턴 참고용, Figma API 월 6회 쿼터 |

## 4. ⏳ 조건 대기

### [이벤트 대기]
| 항목 | 트리거 | 상세 |
|---|---|---|
| ⚠️ 명반전 밀어내기 실사용 QA | 누군가 명반전 12장을 채우는 시점 | 아직 실사용 없음. 밀어낼 앨범 선택 → 새 점수 → 확인 → DB 정합성, 취소 후 재시도, 네트워크 실패. 2026-11-21 밀려난 앨범 한줄평 삭제 버그 수정됨 → 한줄평 유지도 확인 |

### [유저 수]
| 항목 | 트리거 | 상세 |
|---|---|---|
| J-2 마지막 방문 이후 새 피드 | 멤버 8명+ & 주간 소감 30개+ | localStorage 마지막 방문 시각 → 청음방/홈에 "N일 전 이후" 뱃지·필터 |
| J-1 음반고 카드 등록일 | J-2와 함께 | 현재 24시간 NEW 뱃지만 있음 → `created_at` 기반 "N일 전" |
| G-5 내가 입고한 앨범 | 입고 큐레이터형 유저 2명+ | 프로필 "내가 추가한 앨범" — `added_by` 필터 |
| E-4 내가 공감한 소감 모아보기 | 유저별 공감 50개+ | 소감 필터 "내가 공감한 것만" or 프로필 탭 |
| D-2 프로필 점수 필터 | 유저별 평가 50장+ | 본인 평가 목록 "X점만 보기" |
| B-4 미청음 빈 결과 안내 | 모든 앨범을 평가한 유저 발생 | 일반 안내("필터를 바꾸거나…")는 있음 — 미청음 전용 문구·해제 버튼만 없음 (`AlbumList.tsx` ~719) |
| H-1 유저 ID 미니 프로필 팝오버 | 커뮤니티 확장 + 유저 증가 | 데스크탑 700ms 호버 / 모바일 탭 → 아바타·닉네임·최근 청음·청음록 링크 |

### [요청 대기]
| 항목 | 트리거 | 상세 |
|---|---|---|
| F-6 내 평가 데이터 export | 공개 전환 후 유저 요청 | ratings 직렬화 CSV/JSON |
| D-1 점수 제출 후 한줄평 유도 | 한줄평 없는 평가 누적 N회+ | one-time 토스트 |

### 기능 (블로커 있음)
| 항목 | 블로커·트리거 | 상세 |
|---|---|---|
| Spotify 좋아요 트랙 → 빠른 평가 | **Spotify Extended Quota 심사 통과** (기본 25명 한도) | 계정 연동 → 좋아요 트랙 → spotify_id 매칭 → 인라인 평가. 진입 프로필 SpotifyImportCard, 토큰 users 테이블 암호화 저장 |
| 계정 비공개 모드 | "비공개로 쓰고 싶다"는 유저 발생 | `users.is_private` + 프로필 차단·청음인 목록 제외·앨범 모달 리뷰 제외. 백엔드+UI 동시 구현 필수 |

### 스케일링 (유저·앨범 증가 시) — 줄 번호는 기록 시점 기준, 작업 전 grep
**5~6명**
- `validAlbums` 청음감 진입 기준(`stats.ts`, ≥2명) → `max(2, ceil(N×0.5))`
- `getHiddenGems` 진입 기준(`stats.ts`, ≤2) — validAlbums와 함께
- `getUnanimous` 만장일치(`stats.ts`, count≥4) → `totalUsers ≤ 8 ? totalUsers : ceil(N×0.75)`
- 프로필 이견 앨범 `commCount < 2`, 개인 숨은 명반 `commCount ≤ 1`
- AlbumModal 인기 트랙 `count ≥ 2` → 비율 기준, 논쟁도 `< 3명이면 null`

**10명+**
- 멤버 탭 만장일치·취향충돌 `USERS.map()` 한 줄 나열 → 접기/이모지
- 취향 궁합 쌍 중첩 루프(4명=6쌍, 10명=45쌍) → 상위 N쌍 접기
- `comparison/route.ts` 공통 `≥3장 / commonCount ≥ 5` → 앨범 200개+ 시 `≥10`
- 프로필 비교 상위 3명 + 더보기

**앨범 수 증가**
- `stats.ts` 통합 랭킹 상위 50개 부족
- `api/ratings` 명반전 최대 12장 정책 재검토

**UI 레이아웃 (멤버 증가)**
- 멤버 그리드 `grid-cols-2` 고정 → 10명+ 재설계
- AlbumModal 멤버 평점 USERS 전체 순회 → 20명이면 과다
- ComparisonSection 상위 3명 제한 + 더보기
- 랭킹 "멤버 전체 vs 상위 N명" 개념 분리

**언제든 (낮은 우선순위)**
- `lib/bio.ts` 배지 조건(`topArtistCount ≥ 3`, `eightCount ≥ 3/10`) 재검토
- 프로필 아티스트 추천 `count ≥ 3` (유저 수 무관, 현행 유지 가능)

## 5. 💭 도입 미결정 기획

| 항목 | 상태 | 상세 위치 |
|---|---|---|
| 칭호 시스템 | 기획 완료, 도입 보류 (서비스 컨셉 적합성 판단 필요) | 메모리 `project_title_system_plan` |
| 고충 29 고인물 홈 경험 빈약 | 기획 보류 | 메모리 `project_personas` |
| 고충 B-2 인연 카드에서 위시리스트 직접 추가 | 기획 보류 (현재 모달 경유) | 〃 |
| 고충 B-6 "평가하기" 레이블 맥락 불일치 | 현상 유지 — B-2 보류와 연동 | 〃 |

**기능 기획안 21개** (상세: 메모리 `project_feature_planning`, 원래 27개 중 6개는 문서에서 빠져 내용 불명)

| 상태 | 항목 |
|---|---|
| ❌ 미구현 (6) | C 연간 청음 목표 · J 초대 코드 · 검색7 무드/컨텍스트 태그 · 검색8 청음감 정렬 고도화 · 아카이빙1 개인 모드 · 아카이빙9 개인 모드 대시보드 |
| 🟡 부분·대체·백엔드만 (8) | D 연말 Wrapped(admin 테스트) · H 취향 추천(API만) · I 앨범 추가 요청(게시판으로 대체) · 검색2 고급 필터(search·genre·score URL만) · 검색3 Wrapped 탐색판(=D) · 검색6 능동형 추천(=H) · 아카이빙2 속마음 기록(메모 입력만, 모아보기 없음) · 아카이빙7 연간 회고(=Wrapped) |
| ✅ 구현 (2) | B 소감 좋아요 확장 · 검색5 아티스트 디스코그래피(ArtistModal) |
| 🗑 구현 후 삭제·비활성 (5) | A 소감 댓글(비활성) · G 장문 청음일기 · 검색1 청음일기 · 아카이빙3 청음 다이어리 · 아카이빙5 청음 연대기 |

## 6. 👀 배포 후 화면 확인 (2026-11-21 배포분)

데스크탑·모바일 모두. AlbumModal 상세 체크리스트는 `docs/refactor/album-modal-split.md`.

- [ ] 앨범 입고 — Spotify 검색 동작
- [ ] 신규 가입 (auth_id 검증·폼 리밋 추가됨)
- [ ] 홈 갑론을박 카드 뒤집기 → 나중에 들을 앨범 표시
- [ ] PC 헤더 알림 — 댓글 알림이 💬 "댓글을 달았어요"로 표시
- [ ] 평가 변경 후 청음방 멤버 탭 통계 갱신
- [ ] 명반전 밀어내기 — 밀려난 앨범 한줄평 유지 (기회 있을 때)
- [ ] `/reviews`·`/members`·`/themes` 북마크 → 해당 탭으로 이동
- [ ] 프로필 청음집 링크 → 청음감 컬렉션 탭
- [ ] 앨범 모달 "소감 보기" → 그 앨범 소감만
- [ ] 어드민 아티스트 탭 별칭 추가
- [ ] AlbumModal — 트랙 하트·펼치기·인기 트랙
- [ ] AlbumModal — 멤버 소감 공감·더보기·전체 평점 바텀시트
- [ ] AlbumModal — 평점 이력·청음 횟수
- [ ] AlbumModal — 정보 오류 신고 제출
- [ ] 게시판 문의 작성 (로그인 상태 — 서버 로그인 확인 추가됨)
- [ ] 온보딩 투어 — ··· 메뉴 "튜토리얼 다시 보기"로 처음부터 끝까지 (로그인·비로그인 각각)
- [ ] 입고 모달·아티스트 모달 Spotify 아이콘 표시 (공용 아이콘으로 교체)
- [ ] 좋아하는 곡 — 다른 멤버 프로필에서 열림 (공개로 결정)

## 7. ✅ 정리됨·현상 유지 (기록용)

**해결 확인**
- Next.js 보안 취약점 → 16.2.1 → **16.4.6** 업그레이드 (2026-11-21, `npm audit` 0건). 16.2.1에 critical 6건(인증 없는 RCE 5: 이미지 최적화 AVIF/SVG·Windows 호스팅·`use cache`·`next/og` + Server Components DoS)·high·moderate 다수 — 16.2.x 패치로는 RCE 미해결이라 마이너 업그레이드. 간접 high 5(nanoid·postcss·sharp·source-map-js·ws)도 해소. 16.3+ 변경 확인: Partial Prefetching은 cacheComponents 전용(미사용), agentRules 기본 ON → `next dev`가 AGENTS.md 관리 블록 갱신(기존 블록 있음, 나머지 보존). 빌드·주요 페이지 11개·API 스모크 테스트 통과
- 마이그레이션 데이터 오염 (spotify_id 중복 9쌍, 2026-04) → 2026-11-21 DB 조회 중복 0건
- 비로그인 → 로그인 유도 UI 통일 (useBlockedAction) — 고충 I-1·I-2 포함
- 온보딩 투어 재작성, 공개 폼 리밋, Spotify 인라인 SVG 교체, 옛 라우트 정리, 죽은 코드 제거 (2026-11-21)
- 고충 31·H-1 홈 최근 피드 더보기 → 홈 피드 자체가 2026-07 IA 개편으로 제거돼 해당 없음

**현상 유지로 결정된 고충** (페르소나 QA): B-3 카드 내 평가 여부 강조 · D-3 청음감 진입 기준 · D-4 캘린더 점수 수정 이력 · D-5 빈 소셜 섹션 · J-3 청음평 한 주치 초과 · J-4 모달 닫은 후 스크롤 · J-5 연속 평가 마찰 · I-3 비로그인 오늘의 인연 필터 · I-5 비로그인 전 페이지 접근 · F-1 캘린더 날짜 이동 · E-1 공감 전달 여부 · E-5 타 프로필 공통 청음 수

---

## 출처

| 출처 | 반영 내용 |
|---|---|
| 메모리 `project_backlog` | 3장 일부, 4장 이벤트·유저 수·요청·기능, 2장 P1·P2, 1장 S2 (→ 이 문서로 이전) |
| 메모리 `project_scaling_reminder` | 4장 스케일링 전체 (→ 이 문서로 이전) |
| 메모리 `project_feature_planning` | 5장 기획 21개 상태 (상세 기획은 메모리에 유지) |
| 메모리 `project_title_system_plan` | 5장 칭호 시스템 |
| 메모리 `project_personas` | 2장 P3, 3장 E2, 5장 보류 고충, 7장 현상 유지 |
| 메모리 `project_current_status` | 3장 Q2·Q3, 6장 |
| 2026-08-29 전체 코드 점검 결과 (10-11 세션 기록) | 3장 R5·R13·R14·R18·R25 |
| 메모리 `reference_figma_music_player_kit`, `project_ia_rollback` | 3장 E4·Q7 |
| `docs/design-system.md` 미해결 이슈 | 3장 D1~D7 |
| `docs/changelog-service.md` 기술 부채 | 3장 E1 |
| 2026-11-21 점검 (npm audit·ESLint·레이트 리밋 실측·DB 조회·Next 업그레이드) | 1장 S2~S3, 3장 Q1·Q4~Q6·Q8·E3, 7장 |
