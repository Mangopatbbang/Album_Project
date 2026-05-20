# 디자인 시스템

> 아차청음사의 시각적 기준. 새 UI를 만들 때 이 파일을 먼저 읽을 것.

---

## 컨셉

**필름 그레인 다크 테마** — 낡은 레코드, 조도 낮은 음반 가게의 분위기.  
베이지 계열 강조색과 네온 라임(8점) 포인트 색의 대비.

---

## 색상 변수 (CSS Custom Properties)

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

- 페이지 패딩: `40px 24px`
- 모바일 하단 여백: `calc(80px + env(safe-area-inset-bottom))` — iOS 홈바 대응
- 카드 패딩: `16px 20px` ~ `20px 24px`
- 섹션 간격: `48px`
- 항목 간격: `8px` ~ `16px`

---

## 애니메이션

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
| `rotationSpin` | 랜덤 버튼 회전 | 0.5s |

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

---

## 컴포넌트 패턴

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

Tailwind 기본 사용: `sm: = 640px`

| 클래스 패턴 | 의미 |
|-------------|------|
| `sm:hidden` | 모바일에서만 표시 |
| `hidden sm:block` | 데스크탑에서만 표시 |
| `sm:flex` | 데스크탑 flex |
| `text-[12px] sm:text-[11px]` | 모바일 크게 / 데스크탑 작게 |

> **규칙:** 모바일 작업 시 `sm:` 클래스만 사용. 데스크탑 기본값은 절대 변경 금지.

---

## 장르 색상

`src/lib/bio.ts`의 `GENRE_COLOR` 맵:

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

로딩 중 콘텐츠 자리 표시자:

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

1. **input/textarea font-size:** 반드시 16px 이상 — 미만 시 iOS 자동 줌인 (BUG-005)
2. **하단 패딩:** `env(safe-area-inset-bottom)` 포함 필수
3. **overscroll:** `overscroll-behavior: none` — iOS bounce 배경색 노출 방지
4. **터치 타겟:** 최소 44×44px 권장 (`.touch-target` 클래스 활용)
