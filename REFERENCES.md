# 레퍼런스 모음

> 수집일: 2026-05-18  
> 용도: 설계도 구현 전 공부/참고용

---

## 1. 디자인 레퍼런스 — 비슷한 서비스들

### Letterboxd (핵심 벤치마크)
우리 프로젝트가 가장 닮아야 할 서비스. 영화판 앨범 로그 앱.

**배울 것:**
- 피드에서 "리뷰가 재미있다"는 게 주요 유지 이유 → 소감 퀄리티가 곧 커뮤니티 생명력
- 활동 피드를 "Feed"로 통합 — 평점/리뷰/리스트를 한 곳에
- 프로필 페이지가 social-first여야 함 (현재 우리 프로필은 통계 중심)
- 리스트(=청음집) 기능이 핵심 참여 도구
- 텍스트 대비 접근성 주의 (dark mode에서 muted text 가독성 문제)

**케이스 스터디:**
- [Letterboxd UX Case Study (Design Interactive)](https://davisdesigninteractive.medium.com/letterboxd-a-ux-case-study-e0034805d48b)
- [Letterboxd Redesign — 정보 구조 개선 분석](https://medium.com/@mjess.ux/ui-ux-case-study-redesigning-letterboxds-web-and-app-87c180d414da)
  - 핵심: 검색 오타 교정, 커스터마이즈 가능한 활동 피드, 협업 리스트 기능
  - "For you" 추천 섹션 = 우리의 InsightSection과 유사한 개인화 방향

**Letterboxd 공식 업그레이드 로그:** [Journal — Upgrades](https://letterboxd.com/journal/upgrades/)

---

### "A Letterboxd for Music" — 블로그 글
[https://8sided.blog/a-letterboxd-for-music/](https://8sided.blog/a-letterboxd-for-music/)

우리 서비스가 하려는 것을 외부인 시점에서 쓴 글.

**핵심 인사이트:**
- Spotify 연동 의존 앱들을 거부하는 유저 있음 → 독립적 플랫폼 가치
- "발매일은 중요하지 않다, 언제든 어떤 앨범이든 논의 가능" → 시간 중립적 커뮤니티 강점
- Diary + Lists가 서비스의 뼈대 → 우리의 청음 기록 + 청음집
- 전문 비평가와 아마추어가 같은 공간에서 자유롭게 쓰는 문화 = 커뮤니티 활력

---

### RateYourMusic (RYM)
[https://www.jscalco.com/rate-your-music-app/](https://www.jscalco.com/rate-your-music-app/)

가장 오래된 음악 평가 커뮤니티. 2만~6만 개 이상의 앨범 평점 DB.

**배울 것 (반면교사 포함):**
- 정보 밀도가 너무 높음 → 우리는 미니멀하게 유지하는 게 차별점
- 장르 분류가 세밀함 → 우리 장르 필터 확장 시 참고
- 차트/랭킹 기능 → 나중에 "명반전" 고도화 시 참고

---

### Obscurify
[https://myobscurify.com/](https://myobscurify.com/)

Spotify 청취 기록 기반 취향 비주류 점수 측정 서비스.

**배울 것:**
- 0-100% "모호함 등급" — 상위 아티스트를 수백만 명 리스너와 비교한 수치
- 이게 우리 InsightSection "숨은 명반" (7점 이상이지만 미발견)의 서비스 레벨 버전
- 국가/전 세계 유저와 취향 비교 → 나중에 멤버 간 취향 유사도 점수 기능으로 발전 가능
- 장르별, 연대별, 무드별 분포 시각화 → 프로필 통계 고도화 참고

---

### musictaste.space
[https://musictaste.space/](https://musictaste.space/)

Spotify 기반 유저 간 취향 호환성 점수 측정.

**배울 것:**
- 아티스트/장르/청취 패턴으로 호환성 점수 생성
- "공유 가능한 프로필 페이지" → 우리도 프로필 URL 공유가 핵심
- 취향이 맞는 사람 찾기 = 우리 커뮤니티에서 "이견 앨범" 기능의 소셜 확장 방향

---

## 2. UX 케이스 스터디 — 읽을 것들

### Echo Music App (Tubik Studio)
[https://blog.tubikstudio.com/case-study-echo-designing-uxui/](https://blog.tubikstudio.com/case-study-echo-designing-uxui/)

소셜 뮤직 네트워크 UI/UX 풀 케이스 스터디.

**핵심 교훈:**
- "음악에서 사람들은 추가적인 노력을 원하지 않는다" → 단순성 최우선
- 블러 효과가 저해상도에서 가독성 문제 → 우리 AlbumModal 블러 배경 주의
- 소셜 피드 + 친구 스트림 구조 참고
- 사용자 테스트 후 과감하게 디자인 버림 → 우리도 구현 후 피드백 열어두기

### Letterboxd Usability Analysis
[https://medium.com/@hana.jimenez/letterboxd-usability-accessibility-ethics-and-delight-6be0321a112b](https://medium.com/@hana.jimenez/letterboxd-usability-accessibility-ethics-and-delight-6be0321a112b)

접근성, 윤리, 사용성, 즐거움 4축으로 분석한 글.

---

## 3. 기술 레퍼런스 — 구현할 때 필요한 것들

### Next.js 인터셉팅 라우트 (Phase 2 핵심)
**공식 문서:** [https://nextjs.org/docs/app/api-reference/file-conventions/intercepting-routes](https://nextjs.org/docs/app/api-reference/file-conventions/intercepting-routes)

**파일 구조 컨벤션:**
```
app/
  albums/                    ← 음반고 목록
    page.tsx
  @modal/                    ← 병렬 라우트 슬롯
    (.)album/                ← 인터셉팅 (같은 레벨)
      [id]/
        page.tsx             ← 모달 버전
    default.tsx              ← null 반환 (모달 없을 때)
  album/
    [id]/
      page.tsx               ← 전용 페이지 버전
  layout.tsx                 ← modal 슬롯 받아서 렌더링
```

**주의사항:**
- `(..)` 컨벤션은 파일시스템이 아닌 **라우트 세그먼트** 기준
- `@modal` 슬롯은 세그먼트로 안 쳐지므로 `(.)` 사용
- `default.tsx`에서 `null` 반환 필수 (모달 비활성 상태)

**튜토리얼들:**
- [Shareable Modals in Next.js](https://javascript-conference.com/blog/shareable-modals-nextjs/)
- [Medium — Using modals with parallel routes](https://medium.com/@bashaus/using-modals-in-next-js-with-parallel-routes-slots-route-groups-and-interceptors-0873e173c96d)
- [Next.js 14 Intercepting Routes (Builder.io)](https://www.builder.io/blog/nextjs-14-intercepting-routes)
- [Vercel 공식 예제 — nextgram](https://github.com/vercel-labs/nextgram)

---

### Supabase Full Text Search (Phase 3 — 소감 검색)
**공식 문서:** [https://supabase.com/docs/guides/database/full-text-search](https://supabase.com/docs/guides/database/full-text-search)

**핵심 구현 패턴:**
```sql
-- 1. generated column으로 검색 벡터 추가
alter table ratings
add column fts tsvector generated always as
  (to_tsvector('korean', coalesce(comment, ''))) stored;

-- 2. GIN 인덱스 생성
create index ratings_fts on ratings using gin (fts);

-- 3. 쿼리
select * from ratings
where fts @@ websearch_to_tsquery('korean', '검색어');
```

**주의:** PostgreSQL 기본 FTS는 한국어 토큰화 미지원 → `pg_trgm` (trigram) 방식 병행 고려
- `pg_trgm`: 부분 문자열 매칭, 오타 허용
- 또는 PGroonga 확장 (한국어 지원): [Supabase PGroonga 문서](https://supabase.com/docs/guides/database/extensions/pgroonga)

**참고 글:**
- [Skip Elasticsearch: Build Fast FTS in Supabase](https://dev.to/reclusivecoder/skip-elasticsearch-build-blazing-fast-full-text-search-right-in-supabase-58pf)

---

## 4. 사용자가 직접 공부하면 좋은 것들

### 필수 (Phase 2 전에)
1. **Next.js 인터셉팅 라우트 공식 문서** — 위 링크, 30분
2. **Vercel nextgram 예제 코드** — [github.com/vercel-labs/nextgram](https://github.com/vercel-labs/nextgram) — 실제 파일 구조 확인

### 선택 (관심 있으면)
3. **"A Letterboxd for Music" 블로그** — 우리 서비스와 완전히 같은 니즈 분석
4. **Letterboxd Redesign 케이스 스터디** — 정보 구조 개선 방향 참고
5. **Obscurify** — 직접 써보기 (취향 분석 UX 체험)

---

## 5. Supabase DB 변경 체크리스트 (Phase 3 전에)

Phase 3 구현 전에 Supabase 대시보드에서 직접 해두면 좋은 것:

- [ ] `profiles` 테이블에 `bio text` 컬럼 추가
- [ ] `playlists` 테이블에 `is_public boolean default true` 컬럼 추가
- [ ] `ratings` 테이블 `comment` 컬럼에 FTS 인덱스 추가 여부 결정
- [ ] `rating_history` 테이블 구조 확인 (초기 평점 기록 버그 수정 전)
