# 트러블슈팅 노트

> 실제로 겪은 버그와 해결책 기록.  
> 비슷한 증상이 다시 나타나면 여기부터 확인할 것.

---

## 목차

- [BUG-001 Supabase max_rows 1000 한계](#bug-001-supabase-max_rows-1000-한계)
- [BUG-002 Spotify 레이트 리밋 무한 루프](#bug-002-spotify-레이트-리밋-무한-루프)
- [BUG-003 SSR 커버 이미지 하이드레이션 레이스 컨디션](#bug-003-ssr-커버-이미지-하이드레이션-레이스-컨디션)
- [BUG-004 AlbumModal/ArtistModal 중첩 backdrop 검정 현상](#bug-004-albummodal--artistmodal-중첩-backdrop-검정-현상)
- [BUG-005 iOS input 자동 줌인](#bug-005-ios-input-자동-줌인)
- [BUG-006 Supabase 1000행 제한 — 페이지네이션 누락](#bug-006-supabase-1000행-제한--페이지네이션-누락)
- [BUG-007 어드민 총 평점 카운트가 딱 1000으로 고정](#bug-007-어드민-총-평점-카운트가-딱-1000으로-고정)
- [BUG-008 iOS overscroll bounce 및 safe-area 누락](#bug-008-ios-overscroll-bounce-및-safe-area-누락)
- [BUG-009 모달 스크롤 잠금 중첩 버그](#bug-009-모달-스크롤-잠금-중첩-버그)
- [BUG-010 Spotify 검색 특수문자 깨짐](#bug-010-spotify-검색-특수문자-깨짐)

---

## BUG-001 Supabase max_rows 1000 한계

| 항목 | 내용 |
|------|------|
| **발견일** | 2026-03-30 (최초) / 2026-05-20 (어드민에서 재확인) |
| **심각도** | 🔴 높음 — 데이터 누락 |
| **상태** | ✅ 해결됨 |

**현상**  
전체 앨범 또는 평점을 가져올 때 1000개 이후 데이터가 무조건 잘린다.  
`.limit(9999)`를 써도 동일하게 1000개에서 잘린다.

**원인**  
Supabase PostgREST의 서버사이드 `max_rows` 기본값이 1000으로 설정되어 있음.  
클라이언트에서 `.limit()`을 아무리 크게 설정해도 서버가 1000개 이상은 반환하지 않는다.

**해결**  
페이지네이션 루프 방식으로 전체 데이터를 수집:
```typescript
for (let page = 0; ; page++) {
  const { data } = await supabase
    .from("ratings")
    .select("...")
    .range(page * 1000, (page + 1) * 1000 - 1);
  if (!data || data.length === 0) break;
  all.push(...data);
  if (data.length < 1000) break; // 마지막 페이지
}
```

카운트가 필요한 경우는 `{ count: "exact" }` 옵션 사용:
```typescript
const { count } = await supabase
  .from("ratings")
  .select("*", { count: "exact", head: true });
// count는 SQL COUNT(*)로 계산되어 max_rows 제한 없음
```

**재발 방지**  
- 전체 데이터를 읽는 모든 쿼리는 반드시 페이지네이션 루프 사용
- 카운트만 필요하면 `{ count: "exact", head: true }` 사용 (행 반환 없음)
- `.limit()`만 쓰는 쿼리는 1000개 초과 시 무조건 잘린다고 가정할 것

**관련 파일**  
`src/lib/stats.ts`, `src/app/api/admin/analytics/route.ts`

---

## BUG-002 Spotify 레이트 리밋 무한 루프

| 항목 | 내용 |
|------|------|
| **발견일** | 2026-05-20 |
| **심각도** | 🔴 높음 — 무한 로딩 |
| **상태** | ✅ 해결됨 |

**현상**  
어드민 재생시간 백필 실행 중 로딩이 끝나지 않고 무한히 돌았다.  
왜 멈췄는지, 언제 다시 시도하면 되는지 UI에서 전혀 알 수 없었다.

**원인**  
Spotify API 429 응답을 `!res.ok`로만 처리해 에러로 기록하고 다음 앨범으로 넘어갔다.  
배치 내 모든 앨범이 429이면 빈 배열을 반환 → 프론트엔드가 "아직 남았다"고 판단 → 즉시 재요청 → 무한 루프.

**해결**  
서버에서 429를 명시적으로 감지하고 `retryAfter`를 클라이언트에 전달:
```typescript
if (res.status === 429) {
  const retryAfter = parseInt(res.headers.get("Retry-After") ?? "10", 10);
  return NextResponse.json({ rateLimited: true, retryAfter });
}
```
클라이언트에서 카운트다운 표시 후 자동 재시도:
```typescript
if (data.rateLimited) {
  // "Spotify 레이트 리밋 — N초 후 재시도" 로그 표시
  // 1초마다 카운트다운
  await sleep(data.retryAfter * 1000);
  continue; // 루프 재시도
}
```

**재발 방지**  
- 외부 API 호출 배치에서 `!res.ok`로 퉁치지 말고 상태코드 별로 명시적 처리
- 429는 반드시 `Retry-After` 헤더 확인 후 대기
- 프론트엔드 루프에는 항상 "언제 다시 시도하는지" 표시 필요

**관련 파일**  
`src/app/api/admin/backfill-durations/route.ts`, `src/app/admin/page.tsx`

---

## BUG-003 SSR 커버 이미지 하이드레이션 레이스 컨디션

| 항목 | 내용 |
|------|------|
| **발견일** | 2026-05-18 |
| **심각도** | 🟡 중간 — 시각적 깜빡임 |
| **상태** | ✅ 해결됨 |

**현상**  
페이지 새로고침 시 커버 이미지가 잠깐 검은 사각형으로 보이다가 표시됐다.

**원인**  
SSR에서 `cover_url`이 있는 상태로 HTML을 렌더했지만,  
클라이언트 하이드레이션 시점에 이미지 로드 상태(`loaded`)가 `false`로 초기화되면서  
잠깐 폴백 스타일(`opacity: 0` 또는 검정 배경)이 표시됐다.

**해결**  
이미지 로드 실패 시에만 폴백(♪) 표시. 로드 전 상태는 투명 처리:
```tsx
<img
  src={cover_url}
  onError={() => setImgError(true)}
  style={{ opacity: imgError ? 0 : 1 }}
/>
{imgError && <span>♪</span>}
```

**관련 파일**  
`src/components/album/AlbumCard.tsx`, `src/components/album/AlbumModal.tsx`

---

## BUG-004 AlbumModal / ArtistModal 중첩 backdrop 검정 현상

| 항목 | 내용 |
|------|------|
| **발견일** | 2026-05-20 |
| **심각도** | 🟡 중간 — 시각적 버그 |
| **상태** | ✅ 해결됨 |

**현상**  
AlbumModal에서 아티스트 이름을 클릭해 ArtistModal을 열면,  
두 backdrop이 겹쳐 배경이 완전히 검게 됐다.

**원인**  
AlbumModal의 backdrop(`rgba(0,0,0,0.7)`)이 유지된 상태에서  
ArtistModal의 backdrop이 그 위에 추가로 쌓임.

**해결**  
ArtistModal을 열 때 AlbumModal을 먼저 닫거나,  
중첩 모달의 경우 상위 backdrop을 숨기는 처리 추가.

**관련 파일**  
`src/components/album/AlbumModal.tsx`, `src/components/album/ArtistModal.tsx`

---

## BUG-005 iOS input 자동 줌인

| 항목 | 내용 |
|------|------|
| **발견일** | 2026-05-18 |
| **심각도** | 🟡 중간 — 모바일 UX 저하 |
| **상태** | ✅ 해결됨 |

**현상**  
iOS Safari에서 input이나 textarea를 탭하면 페이지가 자동으로 줌인됐다.  
특히 모달 안의 폼 요소에서 자주 발생.

**원인**  
iOS Safari는 `font-size < 16px`인 input을 탭할 때 자동으로 줌인한다.  
이는 작은 텍스트 가독성을 위한 iOS 동작이며 CSS로 막을 수 없다.  
(`user-scalable=no` viewport 설정은 접근성 이유로 권장되지 않음)

**해결**  
모든 `input`, `textarea`, `select`의 `font-size`를 **최소 16px**로 통일:
```css
input, textarea, select {
  font-size: 16px; /* iOS 자동 줌 방지 */
}
```

**재발 방지**  
새로운 폼 요소 추가 시 font-size 16px 이상인지 확인할 것.

**관련 파일**  
`src/app/globals.css`, 각 폼 컴포넌트 인라인 스타일

---

## BUG-006 Supabase 1000행 제한 — 페이지네이션 누락

| 항목 | 내용 |
|------|------|
| **발견일** | 2026-03-30 |
| **심각도** | 🔴 높음 — 데이터 누락 |
| **상태** | ✅ 해결됨 |

> BUG-001과 동일한 근본 원인. 최초 발견 시점의 기록.

**현상**  
청음인 페이지, 청음감 통계에서 데이터가 일부 누락되어 순위가 부정확했다.

**원인**  
초기 구현에서 `.select()`를 페이지네이션 없이 단순 호출 → 1000개에서 잘림.

**해결**  
`src/lib/stats.ts`의 모든 전체 조회 쿼리에 `.range(page * 1000, (page+1) * 1000 - 1)` 루프 적용.

---

## BUG-007 어드민 총 평점 카운트가 딱 1000으로 고정

| 항목 | 내용 |
|------|------|
| **발견일** | 2026-05-20 |
| **심각도** | 🟡 중간 — 데이터 오표시 |
| **상태** | ✅ 해결됨 |

**현상**  
어드민 데이터 탭의 "총 평점" KPI가 정확히 1000으로 고정되어 있었다.

**원인**  
`ratings` 테이블을 `.limit(1000).select()` 후 `data.length`로 카운트 → 항상 1000.

**해결**  
`{ count: "exact", head: true }` 옵션으로 SQL `COUNT(*)`를 직접 사용:
```typescript
const { count } = await supabase
  .from("ratings")
  .select("*", { count: "exact", head: true });
// count = 실제 전체 행 수 (max_rows 무관)
```
동시에 데이터가 실제로 절삭되는 쿼리에는 `truncated_warning` 배너 추가.

**관련 파일**  
`src/app/api/admin/analytics/route.ts`, `src/app/admin/AdminDataTab.tsx`

---

## BUG-008 iOS overscroll bounce 및 safe-area 누락

| 항목 | 내용 |
|------|------|
| **발견일** | 2026-05-17 |
| **심각도** | 🟢 낮음 — 시각적 불편 |
| **상태** | ✅ 해결됨 |

**현상**  
- iOS에서 페이지 상단/하단 당기면 배경색이 맞지 않는 영역이 보였다.
- iPhone 홈 인디케이터 영역에 콘텐츠가 겹쳤다.

**원인**  
- `overscroll-behavior: none` 미적용 → bounce 시 배경 노출
- `padding-bottom: env(safe-area-inset-bottom)` 누락

**해결**
```css
/* globals.css */
body {
  overscroll-behavior: none;
}

/* 각 페이지 bottom padding */
padding: "40px 24px calc(80px + env(safe-area-inset-bottom))"
```

**재발 방지**  
새 페이지 추가 시 bottom padding에 `env(safe-area-inset-bottom)` 포함할 것.

---

## BUG-009 모달 스크롤 잠금 중첩 버그

| 항목 | 내용 |
|------|------|
| **발견일** | 2026-05-18 |
| **심각도** | 🟡 중간 — UX 버그 |
| **상태** | ✅ 해결됨 |

**현상**  
AlbumModal 위에 ArtistModal을 열었다가 ArtistModal만 닫으면  
배경 페이지 스크롤이 잠긴 상태로 유지됐다.

**원인**  
각 모달이 독립적으로 `document.body.style.overflow = "hidden"` / `""` 처리.  
ArtistModal이 닫힐 때 `overflow = ""`로 복원하면 AlbumModal이 설정한 잠금도 같이 해제됨.

**해결**  
잠금 카운터 방식으로 관리:
```typescript
// 모달 열릴 때: lockCount++, overflow hidden
// 모달 닫힐 때: lockCount--, lockCount === 0이면 overflow 복원
```

**관련 파일**  
`src/components/album/AlbumModal.tsx`, `src/components/album/ArtistModal.tsx`

---

## BUG-010 Spotify 검색 특수문자 깨짐

| 항목 | 내용 |
|------|------|
| **발견일** | 2026-04-08 |
| **심각도** | 🟡 중간 — 검색 실패 |
| **상태** | ✅ 해결됨 |

**현상**  
제목에 괄호`()`, 슬래시`/`, 콜론`:` 등이 포함된 앨범 검색 시 결과가 없거나 오검색됐다.

**원인**  
Spotify Search API의 Lucene 쿼리 문법에서 특수문자가 연산자로 해석됨.

**해결**  
검색어에서 Lucene 특수문자 이스케이프 처리:
```typescript
function sanitizeQuery(q: string) {
  return q.replace(/[+\-&|!(){}\[\]^"~*?:\\\/]/g, " ").trim();
}
```
또한 `album:` 필드 필터와 플레인텍스트 병렬 쿼리로 커버리지 확대.

**관련 파일**  
`src/lib/spotify.ts`, `src/app/api/spotify/tracks/route.ts`
