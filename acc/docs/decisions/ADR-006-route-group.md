# ADR-006: (main) Route Group 도입 — 로딩 중 헤더 유지

| 항목 | 내용 |
|------|------|
| **상태** | ✅ 결정됨 |
| **결정일** | 2026-05-19 |
| **영향 범위** | 전체 메인 페이지 레이아웃 |

---

## 배경

Next.js App Router에서 서버 컴포넌트 페이지가 데이터를 fetch하는 동안  
**헤더 네비게이션이 함께 사라지는 현상**이 있었다.

페이지 전환 시 헤더까지 로딩 상태로 빠져 UX가 끊기는 느낌이 들었다.

---

## 결정

메인 페이지들을 `(main)` route group으로 묶고, 해당 그룹의 `layout.tsx`에 `<Header />`를 배치한다.

```
src/app/
  (main)/
    layout.tsx     ← Header 여기에 고정
    best/page.tsx
    board/page.tsx
    albums/page.tsx
    ...
  login/page.tsx   ← Header 없음
  admin/page.tsx   ← Header 없음
```

---

## 이유

- Next.js App Router에서 route group `(name)`은 URL에 영향 없이 레이아웃만 공유
- 헤더를 상위 `layout.tsx` 대신 `(main)/layout.tsx`에 두면, 로그인/어드민 등 헤더 불필요 페이지는 자동 제외
- 페이지 데이터 fetch 중에도 헤더는 이미 렌더된 상태로 유지됨 → `loading.tsx` 스피너가 헤더 아래 영역에만 표시됨

---

## 결과 / 트레이드오프

| 장점 | 단점 |
|------|------|
| 페이지 전환 중 헤더 유지로 UX 연속성 개선 | 폴더 구조 한 depth 추가 |
| 로그인/어드민 등 특수 페이지 레이아웃 분리 쉬움 | 기존 import 경로 일부 수정 필요 |

---

## 관련 파일

- `src/app/(main)/layout.tsx`
- `src/app/(main)/best/page.tsx`
- `src/app/(main)/board/page.tsx`
- `src/components/layout/Header.tsx`
