"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const TABS = [
  { id: "ranking", label: "랭킹" },
  { id: "discover", label: "발견" },
  { id: "collections", label: "컬렉션" },
] as const;

export default function BestTabBar() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "ranking";

  return (
    <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 28 }}>
      {TABS.map(({ id, label }) => {
        const isActive = tab === id;
        return (
          <Link
            key={id}
            href={`/best?tab=${id}`}
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
