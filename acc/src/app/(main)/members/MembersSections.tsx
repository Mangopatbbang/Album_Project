"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import UserAvatar from "@/components/ui/UserAvatar";

type UserRef = { id: string; display_name: string };

export type PairData = {
  a: UserRef;
  b: UserRef;
  commonCount: number;
  diff: number | null;
};

const PREVIEW = 4;

function SectionModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)",
        zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div style={{
        backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 14, width: "100%", maxWidth: 560, maxHeight: "80vh",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 15 }}>{title}</p>
          <button onClick={onClose} style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
        <div style={{ overflowY: "auto", padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function MoreButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        marginTop: 8, width: "100%", padding: "8px 0",
        backgroundColor: "transparent", border: "1px solid var(--border)",
        borderRadius: 8, color: "var(--text-muted)", fontSize: 12,
        cursor: "pointer", transition: "border-color 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget).style.borderColor = "var(--border-light)"; (e.currentTarget).style.color = "var(--text)"; }}
      onMouseLeave={(e) => { (e.currentTarget).style.borderColor = "var(--border)"; (e.currentTarget).style.color = "var(--text-muted)"; }}
    >
      더보기 ({count}개)
    </button>
  );
}

function PairRow({ pair, avatarMap }: { pair: PairData; avatarMap: Record<string, string | null> }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 16px", backgroundColor: "var(--bg-elevated)", borderRadius: 8,
    }}>
      <span style={{ color: "var(--text-sub)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden" }}>
        <UserAvatar avatarUrl={avatarMap[pair.a.id]} size={18} />
        <Link href={`/profile/${pair.a.id}`} style={{ color: "inherit", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 72 }} className="hover:text-[var(--accent)] transition-colors">{pair.a.display_name}</Link>
        <span style={{ opacity: 0.4, flexShrink: 0 }}>×</span>
        <UserAvatar avatarUrl={avatarMap[pair.b.id]} size={18} />
        <Link href={`/profile/${pair.b.id}`} style={{ color: "inherit", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 72 }} className="hover:text-[var(--accent)] transition-colors">{pair.b.display_name}</Link>
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div style={{ textAlign: "right" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11 }}>공통 {pair.commonCount}장</p>
          {pair.diff !== null && (
            <p style={{ color: pair.diff < 1.0 ? "var(--accent)" : "var(--text-sub)", fontSize: 12, fontWeight: 600 }}>
              {pair.diff.toFixed(2)}점 차이
            </p>
          )}
        </div>
        {pair.commonCount > 0 && (
          <Link
            href={`/profile/${pair.a.id}#comparison`}
            style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "none", flexShrink: 0 }}
            className="hover:text-[var(--accent)] transition-colors"
          >
            비교 →
          </Link>
        )}
      </div>
    </div>
  );
}

export function PairsSection({ pairs, avatarMap }: { pairs: PairData[]; avatarMap: Record<string, string | null> }) {
  const [showModal, setShowModal] = useState(false);
  const preview = pairs.slice(0, PREVIEW);
  const hidden = pairs.length - PREVIEW;

  return (
    <div data-tour="members-compat" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px", marginBottom: 24 }}>
      <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>취향 궁합</p>
      <div className={pairs.length > 3 ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "grid grid-cols-1 gap-3"}>
        {preview.map((pair) => (
          <PairRow key={`${pair.a.id}-${pair.b.id}`} pair={pair} avatarMap={avatarMap} />
        ))}
      </div>
      {hidden > 0 && <MoreButton count={hidden} onClick={() => setShowModal(true)} />}
      {showModal && (
        <SectionModal title="취향 궁합 전체" onClose={() => setShowModal(false)}>
          {pairs.map((pair) => (
            <PairRow key={`${pair.a.id}-${pair.b.id}`} pair={pair} avatarMap={avatarMap} />
          ))}
        </SectionModal>
      )}
    </div>
  );
}

