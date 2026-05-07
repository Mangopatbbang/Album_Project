type Props = {
  size?: number;
  color?: string;
};

export default function Spinner({ size = 18, color = "var(--text-muted)" }: Props) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid transparent`,
        borderTopColor: color,
        borderRightColor: color,
        animation: "spin 0.65s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}
