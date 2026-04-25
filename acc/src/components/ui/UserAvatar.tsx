export default function UserAvatar({
  avatarUrl,
  size = 20,
}: {
  avatarUrl?: string | null;
  size?: number;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        border: "1px solid var(--border)",
        backgroundColor: "var(--bg-elevated)",
        flexShrink: 0,
        verticalAlign: "middle",
      }}
    >
      {avatarUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      )}
    </span>
  );
}
