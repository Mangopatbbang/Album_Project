"use client";

import { useState } from "react";
import { DIARY_CATEGORIES, MAX_TAGS } from "@/lib/diaryTags";

type Props = {
  selected: string[];
  onChange: (tags: string[]) => void;
  recentTags?: string[];
};

export default function TagSelector({ selected, onChange, recentTags = [] }: Props) {
  const [openCats, setOpenCats] = useState<Set<string>>(
    () => new Set(DIARY_CATEGORIES.filter((c) => c.defaultOpen).map((c) => c.id))
  );

  const toggle = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      if (selected.length >= MAX_TAGS) return;
      onChange([...selected, tag]);
    }
  };

  const toggleCat = (id: string) => {
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const recentFiltered = recentTags.filter((t) => !selected.includes(t)).slice(0, 8);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* 선택된 태그 */}
      {selected.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 8 }}>
            선택됨 {selected.length}/{MAX_TAGS}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {selected.map((tag) => (
              <button
                key={tag}
                onClick={() => toggle(tag)}
                style={{
                  padding: "5px 11px",
                  borderRadius: 20,
                  backgroundColor: "var(--accent)",
                  border: "none",
                  color: "var(--bg)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "opacity 0.1s",
                }}
              >
                {tag}
                <span style={{ fontSize: 10, opacity: 0.8 }}>✕</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 최근 사용 태그 */}
      {recentFiltered.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 8 }}>
            최근에 자주 쓴 태그
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {recentFiltered.map((tag) => (
              <TagChip
                key={tag}
                tag={tag}
                selected={false}
                disabled={selected.length >= MAX_TAGS}
                onToggle={toggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* 구분선 */}
      {(selected.length > 0 || recentFiltered.length > 0) && (
        <div style={{ borderTop: "1px solid var(--border)", marginBottom: 16 }} />
      )}

      {/* 카테고리 아코디언 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {DIARY_CATEGORIES.map((cat) => {
          const isOpen = openCats.has(cat.id);
          return (
            <div key={cat.id}>
              <button
                onClick={() => toggleCat(cat.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 0",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <span style={{ letterSpacing: "-0.01em" }}>{cat.label}</span>
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 10,
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.18s",
                    display: "inline-block",
                  }}
                >
                  ▾
                </span>
              </button>
              {isOpen && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingBottom: 12 }}>
                  {cat.tags.map((tag) => (
                    <TagChip
                      key={tag}
                      tag={tag}
                      selected={selected.includes(tag)}
                      disabled={!selected.includes(tag) && selected.length >= MAX_TAGS}
                      onToggle={toggle}
                    />
                  ))}
                </div>
              )}
              <div style={{ borderTop: "1px solid var(--border)" }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TagChip({
  tag,
  selected,
  disabled,
  onToggle,
}: {
  tag: string;
  selected: boolean;
  disabled: boolean;
  onToggle: (tag: string) => void;
}) {
  return (
    <button
      onClick={() => onToggle(tag)}
      disabled={disabled && !selected}
      style={{
        padding: "5px 11px",
        borderRadius: 20,
        backgroundColor: selected ? "var(--accent)" : "var(--bg-elevated)",
        border: `1px solid ${selected ? "transparent" : "var(--border)"}`,
        color: selected ? "var(--bg)" : disabled ? "var(--text-muted)" : "var(--text)",
        fontSize: 12,
        fontWeight: selected ? 600 : 400,
        cursor: disabled && !selected ? "default" : "pointer",
        opacity: disabled && !selected ? 0.4 : 1,
        transition: "background-color 0.12s, color 0.12s, opacity 0.12s",
        whiteSpace: "nowrap",
      }}
    >
      {tag}
    </button>
  );
}
