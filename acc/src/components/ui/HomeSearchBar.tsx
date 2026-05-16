"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomeSearchBar() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  const submit = () => {
    const q = query.trim();
    if (!q) { router.push("/albums"); return; }
    router.push(`/albums?search=${encodeURIComponent(q)}`);
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      padding: "28px 0 0",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        maxWidth: 560,
        backgroundColor: "var(--bg-card)",
        border: `1px solid ${focused ? "var(--border-light)" : "var(--border)"}`,
        borderRadius: 999,
        padding: "0 6px 0 18px",
        gap: 4,
        boxShadow: focused ? "0 0 0 3px rgba(var(--accent-rgb), 0.13)" : "none",
        transition: "border-color 0.18s, box-shadow 0.18s",
      }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="앨범·아티스트 검색"
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            color: "var(--text)",
            fontSize: 14,
            padding: "10px 0",
            minWidth: 0,
          }}
        />
        <button
          onClick={submit}
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: "50%",
            backgroundColor: "var(--accent)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          className="active:opacity-70 hover:opacity-85 transition-opacity"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
