"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const TABS = [
  { id: "reviews", label: "소감" },
  { id: "members", label: "멤버" },
] as const;

export default function CommunityTabBar() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "reviews";

  return (
    <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 28 }}>
      {TABS.map(({ id, label }) => {
        const isActive = tab === id;
        return (
          <Link
            key={id}
            href={`/community?tab=${id}`}
            scroll={false}
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
