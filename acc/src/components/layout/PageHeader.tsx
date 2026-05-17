import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

export default function PageHeader({ title, subtitle, right }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        paddingBottom: 20,
        marginBottom: 28,
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* accent 바 */}
        <div
          style={{
            width: 3,
            height: 26,
            borderRadius: 2,
            backgroundColor: "var(--accent)",
            opacity: 0.75,
            flexShrink: 0,
            marginTop: 2,
          }}
        />
        <div>
          <h1
            style={{
              color: "var(--text)",
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              margin: 0,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: 12,
                marginTop: 6,
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}
