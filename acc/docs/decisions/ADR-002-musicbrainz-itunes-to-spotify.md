# ADR-002: 앨범 검색 API — MusicBrainz → iTunes → Spotify 전환

| 항목 | 내용 |
|------|------|
| **상태** | ✅ 결정됨 (Spotify) |
| **결정일** | 2026-04-08 (Spotify 최종 전환) |
| **영향 범위** | 앨범 추가, 커버 이미지, 트랙리스트 |

---

## 배경

앨범 추가 시 커버 이미지, 트랙리스트, 장르, 발매일을 자동으로 가져오는 기능이 필요했다.
총 세 번의 API 전환이 있었다.

---

## 변천사

### 1단계: MusicBrainz (2026-01-14)

```
MusicBrainz release 검색 → tracklist fetch
```

**문제점:**
- 커버 이미지 없음 (별도 Cover Art Archive API 필요)
- 응답 속도 느림
- 한국 앨범 데이터 부실

---

### 2단계: iTunes Search API (2026-03-28 ~ 2026-04-07)

```
iTunes Search API → 커버 + 메타데이터 자동 매핑
```

**장점:** 무료, 인증 불필요, 커버 이미지 포함  
**문제점:**
- 한국 미출시 앨범 검색 안 됨 (`storefront=KR` 한계)
- 마이너 앨범 누락 많음
- 트랙리스트 없음 (별도 Spotify API로 보완 필요)
- 발매일 정확도 낮음 → iTunes/Spotify 교차검증 도구를 임시로 만들었음

---

### 3단계: Spotify Search API (2026-04-08 ~ 현재)

```
Spotify Search → 커버 + 트랙리스트 + 발매일 + duration_ms 통합
```

**전환 이유:**
- 트랙리스트 + 커버 + 메타데이터를 단일 API에서 모두 제공
- 한국 미인증 앨범도 `market=KR` 제거 시 검색 가능
- `duration_ms` 활용 가능 (트랙 재생시간)
- 브랜드 가이드라인만 준수하면 무료 사용 가능

**추가 개선:**
- `album:` 필드 필터 + 플레인텍스트 병렬 쿼리로 커버리지 확대
- 특수문자 sanitize 추가
- limit 10 + 페이지네이션으로 30개 후보 수집

---

## 결과 / 트레이드오프

| | MusicBrainz | iTunes | Spotify |
|---|---|---|---|
| 커버 이미지 | ❌ | ✅ | ✅ |
| 트랙리스트 | ✅ | ❌ | ✅ |
| 재생시간 | ❌ | ❌ | ✅ |
| 한국 앨범 | 보통 | 보통 | ✅ |
| 인증 필요 | ❌ | ❌ | ✅ (OAuth) |
| 브랜드 규정 | ❌ | Apple 정책 | Spotify 가이드라인 |

---

## 관련 파일

- `src/lib/spotify.ts`
- `src/app/api/spotify/tracks/route.ts`
- `src/app/api/spotify/tracklist/route.ts`
- `src/app/api/migrate/spotify/route.ts`
