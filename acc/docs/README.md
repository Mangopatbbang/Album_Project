# 아차청음사 — 프로젝트 문서

## 핵심 문서

| 문서 | 설명 |
|------|------|
| [architecture.md](./architecture.md) | 시스템 아키텍처 — 기술 스택, 라우팅, 데이터 흐름, 캐시 전략 |
| [database.md](./database.md) | DB 스키마 — 전체 테이블 정의, 관계, 제약 조건 |
| [api-reference.md](./api-reference.md) | API 레퍼런스 — 전체 `/api/*` 엔드포인트 목록 |
| [design-system.md](./design-system.md) | 디자인 시스템 — 색상 변수, 타이포, 컴포넌트 패턴 |
| [features.md](./features.md) | 기능 목록 — 페이지/컴포넌트별 전체 기능 인벤토리 |

## 서비스 히스토리

| 문서 | 설명 |
|------|------|
| [changelog-service.md](./changelog-service.md) | 서비스 일지 — 멤버/데이터 현황, 마일스톤, 방향성 변화 |
| [troubleshooting.md](./troubleshooting.md) | 트러블슈팅 노트 — 실제 겪은 버그와 해결책 |
| [decisions/](./decisions/) | ADR — 기술 선택의 이유 기록 |

---

### ADR 목록

| 번호 | 제목 | 상태 |
|------|------|------|
| [ADR-001](./decisions/ADR-001-google-sheets-to-supabase.md) | 구글 시트 → Supabase 전환 | ✅ |
| [ADR-002](./decisions/ADR-002-musicbrainz-itunes-to-spotify.md) | 앨범 검색 API 변천사 (MusicBrainz → iTunes → Spotify) | ✅ |
| [ADR-003](./decisions/ADR-003-analytics.md) | Vercel Analytics → 자체 트래킹 전환 | ✅ |
| [ADR-004](./decisions/ADR-004-server-caching.md) | 서버사이드 캐싱 전략 (unstable_cache) | ✅ |
| [ADR-005](./decisions/ADR-005-vercel-timeout-batch.md) | Vercel 타임아웃 대응 — 배치 크기 조정 | ✅ |
| [ADR-006](./decisions/ADR-006-route-group.md) | (main) Route Group 도입 | ✅ |
