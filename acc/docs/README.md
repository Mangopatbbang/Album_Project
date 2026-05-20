# 아차청음사 — 프로젝트 문서

## 프로젝트 소개

**아차청음사(ACC)**는 친구들끼리 함께 음악을 듣고 앨범 평가를 기록하는 **개인 음반 청음 클럽 서비스**다.

단순히 점수를 매기는 것을 넘어, 어떤 앨범을 들었는지·언제 인연이 됐는지·어떤 곡이 좋았는지를 기록하고 멤버끼리 취향을 비교할 수 있는 공간을 목표로 한다.

| 항목 | 내용 |
|------|------|
| **시작** | 2025년 12월 (창립 멤버 4명) |
| **현재** | 테스터 모집 중 (6명) |
| **목표** | 공개 서비스 전환 (10명+ 기준) |
| **스택** | Next.js 16 (App Router) + Supabase + Vercel |
| **URL** | Vercel main 브랜치 자동 배포 |

### 핵심 개념

- **점수 체계**: 1~8점. 8점은 "명반"으로 특별 취급 (최대 12장 제한)
- **청음사 용어**: 음반고(앨범 목록), 청음감(랭킹), 청음평(한줄평 피드), 청음집(선곡집), 청음인(멤버)
- **디자인 콘셉트**: 낡은 레코드 가게 분위기 — 필름 그레인 다크 테마, 베이지 강조색

---

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

ADR(Architecture Decision Record)은 "왜 이 기술을 선택했는가"를 남기는 기록이다.  
나중에 "왜 이렇게 됐지?"라는 질문이 생겼을 때 여기서 이유를 찾는다.

| 번호 | 제목 | 상태 |
|------|------|------|
| [ADR-001](./decisions/ADR-001-google-sheets-to-supabase.md) | 구글 시트 → Supabase 전환 | ✅ |
| [ADR-002](./decisions/ADR-002-musicbrainz-itunes-to-spotify.md) | 앨범 검색 API 변천사 (MusicBrainz → iTunes → Spotify) | ✅ |
| [ADR-003](./decisions/ADR-003-analytics.md) | Vercel Analytics → 자체 트래킹 전환 | ✅ |
| [ADR-004](./decisions/ADR-004-server-caching.md) | 서버사이드 캐싱 전략 (unstable_cache) | ✅ |
| [ADR-005](./decisions/ADR-005-vercel-timeout-batch.md) | Vercel 타임아웃 대응 — 배치 크기 조정 | ✅ |
| [ADR-006](./decisions/ADR-006-route-group.md) | (main) Route Group 도입 | ✅ |
