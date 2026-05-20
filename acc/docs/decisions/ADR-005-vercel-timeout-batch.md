# ADR-005: Vercel 서버리스 타임아웃 대응 — 배치 크기 조정

| 항목 | 내용 |
|------|------|
| **상태** | ✅ 결정됨 |
| **결정일** | 2026-03-30 |
| **영향 범위** | 어드민 마이그레이션 배치, 재생시간 백필 |

---

## 배경

어드민 페이지에서 Spotify 트랙리스트 마이그레이션을 배치로 처리할 때,  
**Vercel 서버리스 함수의 기본 실행 제한(10초)**에 걸려 타임아웃이 발생했다.

초기 배치 크기: 한 번에 **50개** 앨범 처리  
→ Spotify API 호출 × 50 = 타임아웃 초과

---

## 결정

배치 크기를 **50 → 5**로 줄이고, 프론트엔드에서 루프를 돌며 연속 호출하는 방식으로 전환한다.

```
[프론트엔드]
  while (remaining > 0) {
    POST /api/admin/backfill  // 5개씩 처리
    remaining = response.remaining
  }
```

어드민 UI에서 진행률(완료 N / 전체 M)과 로그를 실시간으로 표시한다.

---

## 이유

- Vercel Hobby/Pro 플랜 모두 서버리스 함수 실행 시간 제한 있음
- 배치 크기를 줄이면 한 요청당 처리 시간이 줄어 타임아웃 안전
- 루프는 클라이언트에서 돌기 때문에 실질적인 처리량은 동일
- 레이트 리밋(429) 등 에러 처리를 배치 단위로 세밀하게 할 수 있음

---

## 레이트 리밋 추가 대응 (2026-05-20)

Spotify 429 응답 시 무한 루프가 발생하는 버그 발견.  
→ 서버에서 `Retry-After` 헤더를 파싱해 클라이언트에 전달  
→ 클라이언트에서 카운트다운 표시 후 자동 재시도

```typescript
if (res.status === 429) {
  const retryAfter = parseInt(res.headers.get("Retry-After") ?? "10", 10);
  return NextResponse.json({ rateLimited: true, retryAfter });
}
```

---

## 결과 / 트레이드오프

| 장점 | 단점 |
|------|------|
| 타임아웃 없음 | 전체 완료까지 더 많은 HTTP 왕복 발생 |
| 레이트 리밋 세밀 대응 가능 | 브라우저 탭을 닫으면 중단됨 |
| UI에서 진행 상황 실시간 확인 | — |

---

## 관련 파일

- `src/app/api/admin/backfill-durations/route.ts`
- `src/app/api/migrate/spotify/route.ts`
- `src/app/admin/page.tsx` — 배치 루프 + 진행률 UI
