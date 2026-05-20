# ADR-004: 서버사이드 캐싱 전략 — unstable_cache 채택

| 항목 | 내용 |
|------|------|
| **상태** | ✅ 결정됨 |
| **결정일** | 2026-03-31 (최초) / 2026-05-17 (확장) |
| **영향 범위** | 청음감, 청음인, 프로필, 통계 계산 |

---

## 배경

청음감(Best), 청음인 등 **매번 전체 앨범 + 평점을 DB에서 읽어 통계를 계산**하는 페이지들이 있었다.
요청마다 수백~수천 행을 조회하고 정렬/집계하는 연산이 발생하여 레이턴시가 높았다.

---

## 결정

Next.js `unstable_cache`를 사용해 **서버 메모리에 1시간 캐싱**하고,  
데이터 변경 시 `revalidateTag()`로 캐시를 즉시 무효화한다.

```typescript
export const fetchAllAlbumsWithRatings = unstable_cache(
  _fetchAllAlbumsWithRatings,
  ["all-albums-with-ratings"],
  { tags: ["all-albums-with-ratings"], revalidate: 3600 }
);

// 평점 추가/수정 시
revalidateTag("all-albums-with-ratings");
```

---

## 이유

- **`unstable_cache` 선택 이유**: Next.js App Router에서 서버 컴포넌트와 자연스럽게 통합됨. SWR/React Query는 클라이언트 캐시라 SSR에 부적합.
- **1시간 TTL**: 음악 감상 기록 서비스 특성상 수 분 이내 갱신이 필수는 아님. 단, 평점 등록 시 즉시 revalidate로 정합성 유지.
- **tag 기반 무효화**: 앨범/평점이 바뀐 경우에만 정확히 해당 캐시만 무효화 가능.

---

## 캐시 태그 목록

| 태그 | 대상 | revalidate 트리거 |
|------|------|-------------------|
| `all-albums-with-ratings` | 청음감, 통계 | 평점 추가/수정/삭제, 앨범 추가/수정 |
| `profile-ratings` | 프로필, 청음인 | 평점 추가/수정/삭제 |
| `all-users` | 유저 목록 | 프로필 수정 |
| `user-avatar-urls` | 아바타 URL | 아바타 업로드 |

---

## 결과 / 트레이드오프

| 장점 | 단점 |
|------|------|
| 페이지 로드 속도 대폭 향상 | `unstable_cache`는 아직 공식 안정 API 아님 |
| Supabase 쿼리 횟수 절감 | 캐시 서버 재시작 시 초기 cold start 느림 |
| revalidateTag로 실시간 정합성 유지 | Vercel 배포 환경에서만 캐시 공유됨 (로컬 개발은 매번 새로 fetch) |

---

## 관련 파일

- `src/lib/stats.ts` — fetchAllAlbumsWithRatings, fetchProfileRatings 등
- `src/app/api/ratings/route.ts` — revalidateTag 호출
- `src/app/api/albums/route.ts` — revalidateTag 호출
