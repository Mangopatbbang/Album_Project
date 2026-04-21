"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import AlbumAddModal from "@/components/album/AlbumAddModal";

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
    <polyline points="9 21 9 12 15 12 15 21"/>
  </svg>
);

const AlbumsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="2.5"/>
  </svg>
);

const BestIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const ThemesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"/>
    <circle cx="6" cy="18" r="3"/>
    <circle cx="18" cy="16" r="3"/>
  </svg>
);

const ReviewsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const ProfileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);

export default function BottomNav() {
  const { profile } = useAuth();
  const pathname = usePathname();
  const [showAddModal, setShowAddModal] = useState(false);

  const leftItems = [
    { href: "/", label: "홈", Icon: HomeIcon },
    { href: "/albums", label: "음반고", Icon: AlbumsIcon },
  ];

  const rightItems = [
    { href: "/best", label: "도감", Icon: BestIcon },
    { href: "/reviews", label: "청음평", Icon: ReviewsIcon },
    {
      href: profile ? `/profile/${profile.id}` : "/login",
      label: profile ? "청음록" : "입장",
      Icon: ProfileIcon,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/profile/")) return pathname.startsWith("/profile/");
    return pathname.startsWith(href);
  };

  const NavLink = ({ href, label, Icon }: { href: string; label: string; Icon: () => React.JSX.Element }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        style={{ color: active ? "var(--accent)" : "var(--text)", transition: "color 0.15s", boxShadow: active ? "inset 0 2px 0 var(--accent)" : "none" }}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-3 active:opacity-60"
      >
        <Icon />
        <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: "0.04em" }}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <>
      <nav
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          backgroundColor: "var(--bg-card)", borderTop: "1px solid var(--border)",
          zIndex: 50, paddingBottom: "env(safe-area-inset-bottom)",
        }}
        className="sm:hidden"
      >
        <div className="flex items-stretch">
          {leftItems.map((item) => <NavLink key={item.href} {...item} />)}

          {/* 중앙 + 버튼 (로그인 시만) */}
          {profile ? (
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                flexShrink: 0,
                width: 52,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "12px 0",
              }}
              className="active:opacity-60"
            >
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                backgroundColor: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </div>
            </button>
          ) : (
            /* 비로그인 시 빈 공간 유지 */
            <div className="flex-1" />
          )}

          {rightItems.map((item) => <NavLink key={item.href} {...item} />)}
        </div>
      </nav>

      {showAddModal && (
        <AlbumAddModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => setShowAddModal(false)}
        />
      )}
    </>
  );
}
