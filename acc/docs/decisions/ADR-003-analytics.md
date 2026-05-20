# ADR-003: Vercel Analytics → 자체 이벤트 트래킹 전환

| 항목 | 내용 |
|------|------|
| **상태** | ✅ 결정됨 |
| **결정일** | 2026-05-18 |
| **영향 범위** | 사용자 행동 추적, 어드민 데이터 탭 |

---

## 배경

사용자가 어떤 기능을 얼마나 사용하는지 파악하기 위해 **Vercel Analytics**를 도입했다.  
그러나 Vercel Analytics가 유료 플랜으로 전환되면서 지속 사용이 어렵게 됐다.

---

## 결정

Vercel Analytics를 제거하고, **Supabase `activity_logs` 테이블 기반 자체 트래킹**으로 전환한다.

```typescript
// 기능 클릭 추적
trackFeatureClick("청음감_지역필터", "국내");

// 페이지뷰 추적
trackPageView("/best");
```

추적 데이터는 어드민 데이터 탭에서 직접 조회한다.

---

## 이유

- **비용**: Vercel Analytics 유료 전환으로 소규모 팀에 부담
- **유연성**: 우리 서비스에 맞는 커스텀 이벤트 정의 가능
- **통합성**: 이미 사용 중인 Supabase에 데이터 축적 → 별도 대시보드 불필요
- **어드민 연동**: 어드민 데이터 탭에서 바로 확인 가능

---

## 결과 / 트레이드오프

| 장점 | 단점 |
|------|------|
| 완전 무료 | 직접 구현 및 유지보수 필요 |
| 커스텀 이벤트 자유롭게 정의 | Vercel처럼 자동 페이지뷰는 직접 삽입 필요 |
| Supabase 데이터와 조인 가능 | 고급 분석(퍼널, 코호트 등) 직접 구현해야 함 |

---

## 현재 추적 중인 이벤트

| 이벤트 | 설명 |
|--------|------|
| `page_view` | 페이지 접근 |
| `feature_click` | 기능 버튼 클릭 (탭, 필터 등) |
| `album_visit` | 앨범 모달 열기 |
| `rating_submit` | 평점 등록 |

---

## 관련 파일

- `src/lib/track.ts`
- `src/app/api/track/route.ts`
- `src/app/admin/AdminDataTab.tsx`
- `src/app/api/admin/analytics/route.ts`
