# 디자인 시스템

> 아차청음사의 시각적 기준. 새 UI를 만들 때 이 파일을 먼저 읽을 것.  
> 색상·타이포·간격·애니메이션·컴포넌트 패턴 전체를 다룬다.

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

## 색상 변수 (CSS Custom Properties)

`globals.css`에 선언된 CSS 변수 전체 목록. 컴포넌트 인라인 스타일에서 `"var(--accent)"` 형태로 직접 참조한다.

```css
/* 배경 계층 */
--bg:           #181614   /* 최하단 배경 */
--bg-card:      #242220   /* 카드, 모달 내부 */
--bg-elevated:  #2e2b28   /* 인풋, 호버 시 강조 */

/* 강조색 */
--accent:       #e8d5a3   /* 베이지 — 버튼, 링크, 하이라이트 */
--accent-rgb:   232,213,163

/* 텍스트 계층 */
--text:         #f0ece4   /* 주 텍스트 */
--text-sub:     #a89880   /* 보조 텍스트 */
--text-muted:   #857468   /* 흐린 텍스트, 레이블 */

/* 보더 */
--border:       #363028   /* 일반 구분선 */
--border-light: #4a4038   /* 강조 구분선 */

/* 특수 */
--error:          #e05050   /* 에러, 일요일 */
--color-saturday: #7799cc   /* 토요일 */
--color-foreign:  #6b9ef0   /* 해외 앨범 뱃지 */
```

---

## 점수 색상 시스템

점수에 따라 색상이 달라진다. `src/lib/score.ts` 참고.  
점수가 올라갈수록 차가운 색 → 따뜻한 색이 아닌, **낮음=빨강, 높음=라임**의 직관적 매핑을 쓴다.  
7점부터 glow 효과가 시작되어 8점에서 가장 강렬해진다 — 명반임을 한눈에 알아볼 수 있게.

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

7점 이상 앨범에 테두리 + 박스 그림자 glow 적용:

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

텍스트 계층은 크기와 굵기의 조합으로 만든다. 배경이 어둡기 때문에 작은 텍스트도 읽히도록 색상 대비를 높게 유지한다. `--text`(주), `--text-sub`(보조), `--text-muted`(흐린) 세 단계로 구분해 시각적 위계를 잡는다.

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

### NEW 배지

```typescript
{ fontSize: 11, fontWeight: 700, color: "var(--bg)", backgroundColor: "var(--accent)", borderRadius: 3, padding: "2px 5px" }
```

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

## Spotify Attribution 규칙

(ADR-002 및 Spotify 브랜드 가이드라인 준수)

- **최소 크기:** 21px
- **링크:** 반드시 `open.spotify.com` 링크 연결
- **패턴:** `SpotifyAttribution.tsx` 컴포넌트 사용 (직접 구현 금지)

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
