interface Props {
  height?: number;
  className?: string;
}

// 그라디언트·필터 IDs는 layout.tsx의 <LogoMarkDefs> 에서 전역 주입
export default function LogoMark({ height = 36, className }: Props) {
  const C  = "#a89880";
  const SW = 4.5;

  const grooves: [number, number][] = [
    [88, .40], [84, .37], [80, .33], [76, .29], [72, .25],
    [67, .21], [62, .18], [57, .14], [52, .11], [46, .08],
  ];

  return (
    <svg
      viewBox="0 0 320 280"
      height={height}
      style={{ width: "auto", display: "block", flexShrink: 0 }}
      className={className}
      shapeRendering="geometricPrecision"
      aria-hidden="true"
    >
      {/* ── LP 디스크 (내부) ── */}
      <circle cx={117} cy={140} r={100} fill="url(#lm-body)" />
      <circle cx={117} cy={140} r={100} fill="url(#lm-spec)" />

      {grooves.map(([r, op]) => (
        <circle key={r} cx={117} cy={140} r={r}
          fill="none" stroke="#e8d5a3" strokeWidth=".68" opacity={op} />
      ))}

      <circle cx={117} cy={140} r={100} fill="url(#lm-vign)" />

      <circle cx={117} cy={140} r={36} fill="url(#lm-lbl)" filter="url(#lm-grain)" />
      <circle cx={117} cy={140} r={36} fill="none" stroke="#e8d5a3" strokeWidth="1.3" opacity=".48" />
      <circle cx={117} cy={140} r={25} fill="none" stroke="#e8d5a3" strokeWidth=".55" opacity=".25" />
      <circle cx={117} cy={109} r={1.8} fill="#e8d5a3" opacity=".40" />

      <circle cx={117} cy={140} r={4.5} fill="url(#lm-spd)" />
      <circle cx={117} cy={140} r={2.8} fill="#0c0a07" />

      {/* ── 글자 획 (ㅇ 외곽 + ㅏ 톤암) ── */}
      <circle cx={117} cy={140} r={100} fill="none" stroke={C} strokeWidth={SW} />
      <line x1={217} y1={18}  x2={217} y2={262} stroke={C} strokeWidth={SW} strokeLinecap="round" />
      <line x1={217} y1={158} x2={302} y2={158} stroke={C} strokeWidth={SW} strokeLinecap="round" />
    </svg>
  );
}
