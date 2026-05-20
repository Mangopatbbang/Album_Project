# ADR-001: 구글 시트 → Supabase 전환

| 항목 | 내용 |
|------|------|
| **상태** | ✅ 결정됨 |
| **결정일** | 2026-01-14 |
| **영향 범위** | 전체 데이터 레이어 |

---

## 배경

초기 v0.1에서 앨범 데이터를 **구글 시트 CSV URL**로 불러오는 방식을 사용했다.

```
https://docs.google.com/spreadsheets/d/.../export?format=csv
```

당시 구조:
- 앨범 테이블에 `arkyteccc_rating`, `mangopatbbang_rating`, `SJH_rating`, `wugibugi_rating` 컬럼이 각각 존재
- 멤버가 늘어나면 컬럼을 추가해야 하는 구조
- 실시간 업데이트 불가 (CSV 재파싱 필요)
- 인증/권한 관리 불가

---

## 결정

Supabase를 메인 데이터베이스로 사용하고, 평점은 별도 `ratings` 테이블로 분리한다.

```sql
ratings (
  user_id, album_id, score, one_line_review, updated_at
)
```

---

## 이유

- **확장성**: 멤버가 추가돼도 스키마 변경 없이 행만 추가
- **인증 통합**: Supabase Auth로 로그인/권한 관리 일원화
- **실시간성**: 평점 즉시 반영 가능
- **API 레이어**: REST API 및 RPC 지원으로 서버사이드 연산 가능
- **무료 티어**: 소규모 팀에 충분한 용량

---

## 결과 / 트레이드오프

| 장점 | 단점 |
|------|------|
| 멤버 수 무관하게 스키마 고정 | 초기 마이그레이션 작업 필요 |
| 인증/권한 통합 관리 | Supabase 플랫폼 의존성 생김 |
| 실시간 업데이트 | 구글 시트처럼 비개발자가 직접 편집 불가 |

---

## 관련 파일

- `src/lib/supabase.ts`
- `src/lib/supabase-browser.ts`
- `supabase_schema.sql`
- `src/app/api/albums/route.ts`
