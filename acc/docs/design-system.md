# 디자인 시스템

> 아차청음사의 시각적 기준 — **디자인 관련 단일 문서.** 새 UI를 만들거나 스타일을 고칠 때, "미적으로 어때" 류 리뷰 전에 이 파일을 먼저 읽을 것.
> 2026-11-21: 기존 `acc/DESIGN.md`(10/11 작성, 규칙·원칙·미해결 이슈)를 이 문서로 통합했다.

**운영 루프** — 코드만 보고 미적 판단을 추측하지 말 것. 스크린샷·레퍼런스(`docs/references.md`)·Figma로 판단 → 결론을 이 문서에 기록 → 다음 작업은 이 문서 기준으로 진행. 새 교정이 생기면 반드시 여기에 갱신해야 루프가 이어진다.

---

## 배경

아차청음사의 디자인은 **"오래된 레코드 가게"** 분위기를 의도적으로 추구한다.
밝고 화려한 스트리밍 서비스 UI와 반대 방향 — 어둡고 낡은 느낌, 조도 낮은 공간, 손때 묻은 앨범 재킷.

점수 체계가 1~8점이고 8점 앨범이 "명반"으로 특별한 의미를 갖기 때문에,
점수에 따라 색상과 glow가 달라지는 시각적 시스템이 디자인의 핵심이다.
8점 앨범은 네온 라임으로 튀어나오고, 나머지는 온도감 있는 색상 스펙트럼으로 구분된다.

---

## 컨셉

**필름 그레인 다크 테마** — 낡은 레코드, 조도 낮은 음반 가게의 분위기.
베이지 계열 강조색과 네온 라임(8점) 포인트 색의 대비.

---

## 시각 원칙

- **발광 희소성 원칙** — glow/네온 효과는 진짜 특별한 곳에만 (명반전 8점, 청음감 Hero·상위권). 나머지는 차분하게. 아무 데나 glow 넣으면 효과가 죽는다.
- **중요도 = 시각 강도** — 명반전 그리드(글로우) vs 나중에 들을 앨범 리스트(수수함)처럼, 중요하지 않은 콘텐츠는 의도적으로 조용하게 둘 것.
- **버튼 위계** — 주요 액션은 `--accent` 채움, 보조 액션은 아웃라인만. 한 그룹에 채워진 버튼 2개 이상 두지 않기.
- **새 배지/칩** — 웜톤 팔레트(`--accent`/`--warning`/`--error`) 안에서 디자인. 단, 크림색(`--accent`) 채움 + 거의 검정 글자 조합은 작은 크기에서 **스톡 흰/검 뱃지처럼 읽힌다** (음반고 NEW 뱃지 사례, 스크린샷으로 확인) — 작은 칩은 반투명 배경 + 컬러 텍스트(지역 뱃지 패턴) 쪽을 우선 검토.

---

## 색상 변수 (CSS Custom Properties)

`globals.css`에 선언된 토큰만 사용한다. 새 색이 필요하면 **토큰을 먼저 추가하고** 쓸 것 — 하드코딩 금지. 컴포넌트 인라인 스타일에서 `"var(--accent)"` 형태로 직접 참조한다.

```css
/* 배경 계층 */
--bg:           #181614   /* 최하단 배경 */
--bg-card:      #242220   /* 카드, 모달 내부 */
--bg-elevated:  #2e2b28   /* 인풋, 호버 시 강조 */

/* 강조색 — 주요 CTA, 강조에만 절제해서 */
--accent:       #e8d5a3   /* 베이지 — 버튼, 링크, 하이라이트 */
--accent-rgb:   232,213,163

/* 텍스트 계층 */
--text:         #f0ece4   /* 주 텍스트 */
--text-sub:     #a89880   /* 보조 텍스트 */
--text-muted:   #857468   /* 흐린 텍스트, 레이블 — 대비 미달 이슈 있음(아래) */

/* 보더 */
--border:       #363028   /* 일반 구분선 */
--border-light: #4a4038   /* 강조 구분선 */

/* 상태 */
--error:        #e05050   /* 에러/위험/제재 */
--error-rgb:    224,80,80
--warning:      #e0a030   /* 경고/주의 (2026-10 추가 — #e0a030/#e8a53a/#df9e30 혼용 통합) */
--warning-rgb:  224,160,48

/* 특수 */
--color-sunday:   #e05050 /* 일요일 */
--color-saturday: #7799cc /* 토요일 */
--color-foreign:  #6b9ef0 /* 해외 앨범 뱃지 */
```

**하드코딩 허용 예외** (토큰화 불필요):
- `lib/score.ts`의 `SCORE_COLORS` — 1~8점 팔레트는 별개의 의미 체계. error/warning과 값이 우연히 겹쳐도 연동 금지
- `LogoMark.tsx`의 SVG `stroke`/`fill` 속성 — HTML attribute라 `var()`가 style 객체만큼 안정적이지 않음
- `ReportModal.tsx`의 `var(--error, #e05050)` — CSS 폴백 패턴, 정상
- 스트리밍 서비스 브랜드색 (Spotify `#1DB954`, Apple `#FC3C44`, YouTube `#FF0000`) — 공식값 그대로

---

## 점수 색상 시스템

점수에 따라 색상이 달라진다. `src/lib/score.ts` 참고.
**낮음=빨강, 높음=라임**의 직관적 매핑. 7점부터 glow가 시작되어 8점에서 가장 강렬해진다.
평균 점수의 티어는 `Math.floor` 기준 — 평균 7.5는 7점 티어(청록)로 표시 (2026-10-11 확정).

| 점수 | 색상 | Hex | 느낌 |
|------|------|-----|------|
| 1 | 빨강 | `#e05050` | — |
| 2 | 주황빨강 | `#e07838` | — |
| 3 | 앰버 | `#df9e30` | — |
| 4 | 노랑 | `#c8c028` | — |
| 5 | 연두 | `#80c040` | — |
| 6 | 초록 | `#38b068` | — |
| 7 | 청록 | `#30a0b8` | Glow 효과 시작 |
| 8 | 네온 라임 | `#e8ff48` | 명반, 강한 Glow |

### Glow 효과

7점 이상 앨범에 테두리 + 박스 그림자 glow. **발광 희소성 원칙에 따라 주인공 영역에만 적용** — 청음감 연도별/장르별/아티스트별/발굴 대기처럼 보조 목록에는 쓰지 않고 `var(--border)` + `var(--text-sub)` 점수로 둔다.

```typescript
// glowBorder(score)
score >= 8: rgba(232,255,72, 0.95)   // 라임
score >= 7: rgba(48,160,184, 0.80)   // 청록
기본값: var(--border)

// glowShadow(score)
score >= 8: 0 0 10px rgba(232,255,72,0.5), 0 0 20px rgba(232,255,72,0.2)
score >= 7: 0 0 8px rgba(48,160,184,0.45), 0 0 16px rgba(48,160,184,0.2)
기본값: none
```

---

## 타이포그래피

텍스트 계층은 크기와 굵기의 조합으로 만든다. `--text`(주), `--text-sub`(보조), `--text-muted`(흐린) 세 단계로 시각적 위계를 잡는다.

### 신규 코드 스케일 (2026-10 확정)

실측 결과 기존 코드는 8~38px 사이 거의 모든 정수가 쓰이고 있었다(스케일 없음). 기존 코드를 전부 고칠 필요는 없지만, **새로 작성하는 코드는 아래 6단계 중에서 고를 것.**

| 용도 | px |
|---|---|
| 메타 정보 (타임스탬프, 카운트), 레이블/배지 | 10 |
| 보조 텍스트 (캡션, 아티스트명) | 12 |
| 본문 기본, 카드 제목 | 14 |
| 강조 본문 / 소제목, 섹션 헤더 | 16 |
| 섹션 타이틀, 페이지 타이틀 | 20 |
| 통계 숫자 (일반) | 24 |

**예외**: Barlow Condensed 이탤릭 대형 점수/통계 숫자(워터마크, 프로필 AVG/TOTAL 등)는 스케일 대상 아님 — 32~210px 자유. 단 이 폰트는 반드시 점수·통계류에만.
**예외**: `input`/`textarea`는 16px 이상 (iOS 자동 줌 방지, 아래 iOS 항목).

### 기존 코드 관용값 (참고용, 2026-06 기술)

| 용도 | 크기 | 굵기 |
|------|------|------|
| 페이지 타이틀 | 22px | 700 |
| 섹션 헤더 | 16px | 700 |
| 카드 제목 | 13px | 500 |
| 카드 서브 | 11px | 400 |
| 레이블/배지 | 11px | 600 |
| 마이크로 텍스트 | 9–10px | 400–600 |

**자간:** 섹션 헤더 등 강조 레이블은 `letter-spacing: 0.06em` ~ `0.1em`.

---

## Radius 스케일

실측 결과 2~22px까지 거의 전부 쓰이고 있었다. 새 코드는:

| 용도 | px |
|---|---|
| 뱃지/태그 (작은 요소) | 4~6 |
| 버튼/인풋 | 6~8 |
| 카드 | 10~12 |
| 모달/시트 (큰 패널) | 14 |
| 완전 원형(필/아바타) | 999 또는 `50%` |

---

## 간격 규칙

간격은 일관성을 위해 정해진 값에서만 선택한다. 모바일 하단 패딩이 특이한 이유는 iPhone의 홈 인디케이터 바를 피하기 위해서다 — `env(safe-area-inset-bottom)`을 빼면 콘텐츠가 홈바 밑으로 숨는다.

- 페이지 패딩: `40px 24px`
- 모바일 하단 여백: `calc(80px + env(safe-area-inset-bottom))` — iOS 홈바 대응
- 카드 패딩: `16px 20px` ~ `20px 24px`
- 섹션 간격: `48px`
- 항목 간격: `8px` ~ `16px`

---

## 애니메이션

애니메이션은 "반응감"을 위한 것이지 장식이 아니다. 모달 열림, 토스트 등장, 좋아요 팝 같은 사용자 행동의 피드백으로 쓰인다. 지속시간은 의도적으로 짧게 유지한다 — 0.2초 이하의 빠른 반응으로 UI가 민첩하게 느껴지도록. 모달 애니메이션은 모바일에서 "하단에서 올라오는" 네이티브 앱 패턴을 적용했고, 데스크탑에서는 scale + opacity의 클래식 팝업 방식을 쓴다.

### @keyframes 목록

| 이름 | 용도 | 지속시간 |
|------|------|---------|
| `fadeIn` | 요소 페이드인 (opacity 0→1) | 0.15–0.2s |
| `fadeUp` | 페이지 진입 (opacity + translateY) | 0.3s |
| `modalIn` | 모달 열기 (scale 0.96→1, opacity) | 0.2s |
| `modalOut` | 모달 닫기 | 0.15s |
| `toastIn` | 토스트 등장 | 0.2s |
| `toastOut` | 토스트 퇴장 | 0.2s |
| `scoreGlow` | 점수 버튼 pulse glow | 2s infinite |
| `hofPop` | 명반전 팝 (spring) | 0.4s |
| `heartPop` | 좋아요 팝 | 0.3s |
| `shimmer` | 스켈레톤 로딩 | 1.5s infinite |
| `staggerFadeUp` | 리스트 순차 등장 | — |
| `navBounce` | 하단 네비 바운스 | 0.3s |
| `navDropIn` | 헤더 네비 드롭다운 (Header.tsx 인라인 정의) | 0.14s |
| `backdropIn` | 모달 배경 페이드인 | 0.18s |
| `backdropOut` | 모달 배경 페이드아웃 (닫기 애니메이션) | 0.16s |
| `slideUpPanel` | BottomNav 알림 패널 슬라이드업 | 0.22s |
| `slideDownPanel` | BottomNav 알림 패널 슬라이드다운 (닫기) | 0.16s |
| `rotationSpin` | 랜덤 버튼 회전 | 0.5s |
| `splashIn` | 스플래시 로고·텍스트 페이드업 | 0.9s |
| `lineGrow` | 스플래시 중앙 금색 세로선 grow | 0.7s |
| `lineFade` | 스플래시 세로선 페이드아웃 (문 열릴 때) | 0.15s |
| `doorLeftOpen` | 스플래시 왼쪽 문 rotateY(-90deg) | 2s |
| `doorRightOpen` | 스플래시 오른쪽 문 rotateY(90deg) | 2s |
| `lightBloom` | 스플래시 문 열릴 때 중앙 빛 번짐 | 1.4s |

### 모달 애니메이션 분기

```css
/* 데스크탑 */
@media (min-width: 640px) {
  modalIn: scale(0.96) → scale(1) + opacity 0→1
}

/* 모바일 */
@media (max-width: 639px) {
  modalIn: translateY(100%) → translateY(0)  /* 하단에서 올라옴 */
}
```

### 모달 닫기 애니메이션 패턴

모든 모달/패널은 열기(In)와 동일하게 닫기(Out) 애니메이션을 갖는다.
`onClose`를 직접 호출하지 않고 `closing` state → 160ms 대기 → `onClose` 순서로 처리한다.

```typescript
const [closing, setClosing] = useState(false);
const doClose = () => { setClosing(true); setTimeout(onClose, 160); };

// 배경 dimmer
animation: closing ? "backdropOut 0.16s ease-in forwards" : "backdropIn 0.18s ease-out"

// 모달 본체
animation: closing ? "modalOut 0.16s ease-in forwards" : "modalIn 0.18s ease-out"
```

`onClose` 대신 항상 `doClose()`를 호출한다 — ESC, backdrop 클릭, ✕ 버튼, 취소 버튼 모두.

---

## 컴포넌트 패턴

자주 쓰이는 스타일의 기준값이다. 새 컴포넌트를 만들 때 여기서 복사해 시작한다. CSS 클래스 대신 인라인 스타일 객체를 쓰는 이유는 TypeScript 타입 안전성과 동적 값(점수 컬러, 조건부 스타일) 처리가 편하기 때문이다.
> 아래 값 중 일부(13px, 11px 등)는 신규 타이포 스케일 이전 값이다. 새로 만들 때는 스케일 값으로 맞출 것.

### 카드 스타일

```typescript
const cardStyle = {
  backgroundColor: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
};
```

### 인풋 스타일

```typescript
const inputStyle = {
  backgroundColor: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 16,   // iOS 자동 줌 방지 최소값
  outline: "none",
  width: "100%",
};
```

### 레이블 스타일

```typescript
const labelStyle = {
  color: "var(--text-muted)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.06em",
  display: "block",
  marginBottom: 6,
};
```

### 버튼 — 기본 (accent)

```typescript
{
  backgroundColor: "var(--accent)",
  border: "none",
  color: "var(--bg)",
  borderRadius: 6,
  padding: "7px 20px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
}
```

### 버튼 — 세컨더리

```typescript
{
  background: "none",
  border: "1px solid var(--border)",
  color: "var(--text-muted)",
  borderRadius: 4,
  fontSize: 11,
  padding: "4px 10px",
}
```

---

## 반응형 브레이크포인트

모바일과 데스크탑을 동시에 지원하지만, **기본값은 데스크탑**이고 `sm:` 클래스로 데스크탑을 명시하는 방식을 쓴다.
모바일 작업을 할 때는 `sm:` 접두사만 사용하고, 데스크탑 기본값은 절대 건드리지 않는다.
Tailwind의 기본 브레이크포인트: `sm: = 640px`

| 클래스 패턴 | 의미 |
|-------------|------|
| `sm:hidden` | 모바일에서만 표시 (≥640px 이상이면 hidden) |
| `hidden sm:block` | 데스크탑에서만 표시 (640px 미만이면 hidden) |
| `sm:flex` | 데스크탑에서 flex, 모바일에서는 기본값 그대로 |
| `text-[12px] sm:text-[11px]` | 모바일 12px / 데스크탑 11px |

> **규칙:** 모바일 작업 시 `sm:` 클래스만 사용. 데스크탑 기본값은 절대 변경 금지.

---

## 장르 색상

각 장르에 고정된 강조색. `src/lib/bio.ts`의 `GENRE_COLOR` 맵을 참조한다.
장르 뱃지·바 차트·프로필 분포 차트 등에서 일관된 색상으로 표시된다.

```typescript
{
  "록": "#e06050",
  "락": "#e06050",
  "팝": "#e8a030",
  "힙합": "#c8b030",
  "R&B": "#40b870",
  "재즈": "#3898c0",
  "클래식": "#8070e0",
  "일렉트로닉": "#20c0c0",
  "포크": "#a09060",
  "인디": "#d06090",
  "소울": "#d07040",
  "메탈": "#909090",
  // ...
}
```

---

## 뱃지 / 태그 패턴

### 지역 뱃지

```typescript
// 국내
{ color: "var(--accent)", backgroundColor: "rgba(232,213,163,0.12)", border: "1px solid rgba(232,213,163,0.25)" }

// 해외
{ color: "var(--color-foreign)", backgroundColor: "rgba(107,158,240,0.12)", border: "1px solid rgba(107,158,240,0.25)" }
```

### 장르 뱃지

```typescript
// GENRE_COLOR[genre] 사용, 배경은 10-15% 투명도
{ color: genreColor, backgroundColor: `${genreColor}1a`, border: `1px solid ${genreColor}33` }
```

### NEW 배지 (현재 코드 — 재디자인 대상)

```typescript
// AlbumCard.tsx — 커버 좌상단 오버레이
{ backgroundColor: "var(--accent)", color: "var(--bg)", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", padding: "2px 5px", borderRadius: 4 }
```
토큰은 맞지만 화면에서 스톡 흰/검 뱃지처럼 보인다 → 시각 원칙 "새 배지/칩" 참고, 미해결 이슈에 등록됨.

---

## 스켈레톤 UI

데이터 로드 전 콘텐츠 자리를 미리 잡아두는 플레이스홀더.
레이아웃이 갑자기 팽창하는 "레이아웃 점프"를 방지하기 위해 사용한다.
실제 콘텐츠와 동일한 높이·너비로 만들고, 로드 완료 시 콘텐츠로 교체한다.

```css
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    var(--bg-elevated) 25%,
    var(--bg-card) 50%,
    var(--bg-elevated) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  will-change: background-position; /* GPU 합성 */
}
```

---

## 스트리밍 서비스 아이콘 & Spotify Attribution

(ADR-002 및 Spotify 브랜드 가이드라인 준수)

**아이콘은 `components/ui/StreamingIcons.tsx`에서만 가져올 것** — `SpotifyIcon` / `AppleMusicIcon` / `YoutubeMusicIcon`. SVG path를 인라인으로 새로 쓰지 말 것.
스타일은 역할별로 따로 둔다 (아이콘만 공유, 컴포넌트는 통합하지 않음):

| 역할 | 사용처 | 컴포넌트 / 스타일 |
|---|---|---|
| 조용한 출처 표시 | 트랙리스트 옆, 워치리스트 등 | `SpotifyAttribution.tsx` / `AppleMusicLink.tsx` / `YoutubeMusicLink.tsx` (회색 아이콘+텍스트) |
| 주요 감상 CTA | 홈 "감상하기" 피커 (`HomeTodaySection.tsx`) | 브랜드색 채움 버튼 + 아이콘+텍스트 |

- 브랜드색은 공식값 그대로. Apple/YouTube처럼 색이 비슷해도 비공식 색으로 바꾸지 말고 **아이콘 모양으로 구분**.
- **Spotify 최소 크기:** 아이콘 단독 21px, 풀 로고(아이콘+워드마크) 70px
- **링크:** 반드시 `open.spotify.com`
- **캡처 이미지(StoryCard 등)**: 링크를 걸 수 없으므로 21px 로고 + 저장·공유 시 Spotify URL 클립보드 복사로 대응

```tsx
<SpotifyAttribution spotifyId={album.spotify_id} />
```

---

## iOS / 모바일 특이사항

iOS와 Android 기기에서 발생하는 고질적 문제들과 그 대응 방법이다.
여기서 놓치면 실제 기기에서만 재현되는 버그가 생기므로 주의한다.

| 항목 | 규칙 | 이유 |
|------|------|------|
| `input` / `textarea` font-size | 반드시 **16px 이상** | 미만이면 iOS가 포커스 시 자동 줌인 (BUG-005) |
| 하단 패딩 | `env(safe-area-inset-bottom)` 포함 | iPhone 홈 인디케이터 밑으로 콘텐츠가 숨음 |
| overscroll | `overscroll-behavior: none` | iOS 바운스 스크롤 시 배경색 노출 방지 |
| 터치 타겟 | 최소 **44×44px** | `.touch-target` 클래스 활용 |

---

## 알려진 미해결 이슈 (다음 작업 후보)

- [ ] 음반고 "NEW" 뱃지 — 스톡 흰/검처럼 보임, 웜톤 칩으로 재디자인 (`AlbumCard.tsx`)
- [ ] 홈 "갑론을박" 패널 — 왼쪽 카드와 높이 맞추면서 생기는 빈 여백 처리
- [ ] 청음감 페이지 — 섹션이 전부 같은 카드 톤이라 스크롤할수록 단조로움, 리듬 변화 필요
- [ ] `--text-muted` (#857468) on `--bg` (#181614) 대비 ≈ 4.0:1 — WCAG AA(4.5:1) 미달. 작은 텍스트에 광범위하게 쓰임
- [ ] 아이콘 전용 버튼에 `aria-label` 커버리지 낮음 (전역 6건뿐, AlbumModal 등 핵심 모달 0건)
- [ ] `AlbumAddModal.tsx`, `ArtistModal.tsx`에 Spotify SVG 인라인 잔존 → `StreamingIcons.tsx`의 `SpotifyIcon`으로 교체
- [ ] (확인 필요, 2026-07 기록) 청음록 섹션 헤더 스타일 3종 혼용(fontSize/weight/color 불일치), padding 방식 혼용(inline style vs Tailwind) — 3탭 개편 후에도 남아 있는지 스크린샷으로 확인
- [ ] 어드민 별칭 관리 NEW 뱃지 `#ffa500` 하드코딩 (`admin/page.tsx`) — 어드민 전용이라 우선순위 낮음, `--warning` 치환 후보
- [x] 홈 감상하기 피커 Apple/YouTube 버튼 구분 안 됨 → 색 유지, 아이콘 추가로 해결 (2026-10-11)

---

## 변경 이력

- 2026-06-20: 디자인 시스템 문서 최초 작성 (색상·타이포·애니메이션·컴포넌트 패턴 기술).
- 2026-10-11: (구 `acc/DESIGN.md`) 색 토큰 정리(`--warning` 추가, 하드코딩 제거), 타이포/radius 스케일, 시각 원칙, 스크린샷 기반 미적 리뷰 1차 결론 기록.
- 2026-10-11: 홈 스크린샷 리뷰 — 스트리밍 아이콘 `StreamingIcons.tsx` 공용화, 감상하기 피커 아이콘 추가. 원칙을 "아이콘만 공유, 스타일은 역할별"로 정정.
- 2026-11-21: `acc/DESIGN.md`를 이 문서로 통합. NEW 뱃지 판정 정정(토큰 위반 아님 → 시각 톤 문제). 평균 점수 티어 `Math.floor` 확정 반영.
