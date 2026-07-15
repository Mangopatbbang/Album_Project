"use client";

import Link from "next/link";
import { useSearchParams, useParams } from "next/navigation";

const TABS = [
  { id: "taste", label: "취향" },
  { id: "cheongeum", label: "청음기" },
  { id: "social", label: "소셜" },
] as const;

export default function ProfileTabBar() {
  const searchParams = useSearchParams();
  const params = useParams<{ userId: string }>();
  const tab = searchParams.get("tab") ?? "taste";

  return (
    <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
      {TABS.map(({ id, label }) => {
        const isActive = tab === id;
        return (
          <Link
            key={id}
            href={`/profile/${params.userId}?tab=${id}`}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? "var(--accent)" : "var(--text-muted)",
              textDecoration: "none",
              borderBottom: `2px solid ${isActive ? "var(--accent)" : "transparent"}`,
              marginBottom: -1,
              transition: "color 0.15s, border-color 0.15s",
              letterSpacing: "-0.01em",
            }}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
