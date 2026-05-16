"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

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

const ReviewsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const MembersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="3"/>
    <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
    <circle cx="17" cy="8" r="2.5"/>
    <path d="M21 21v-1.5a3.5 3.5 0 0 0-2-3.17"/>
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
  const [bouncingHref, setBouncingHref] = useState<string | null>(null);

  const handleTap = (href: string) => {
    setBouncingHref(href);
    setTimeout(() => setBouncingHref(null), 240);
  };

  const items = [
    { href: "/", label: "홈", Icon: HomeIcon, tour: undefined },
    { href: "/albums", label: "음반고", Icon: AlbumsIcon, tour: "nav-albums" },
    { href: "/best", label: "청음감", Icon: BestIcon, tour: "nav-best" },
    { href: "/reviews", label: "청음평", Icon: ReviewsIcon, tour: "nav-reviews" },
    { href: "/members", label: "청음인", Icon: MembersIcon, tour: "nav-members" },
    {
      href: profile ? `/profile/${profile.id}` : "/login",
      label: profile ? "청음록" : "입장",
      Icon: ProfileIcon,
      tour: "nav-profile",
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/profile/")) return pathname.startsWith("/profile/");
    return pathname.startsWith(href);
  };

  return (
    <nav
      data-bottom-nav="true"
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        backgroundColor: "var(--bg-card)", borderTop: "1px solid var(--border)",
        zIndex: 50, paddingBottom: "env(safe-area-inset-bottom)",
      }}
      className="sm:hidden"
    >
      <div className="flex items-stretch">
        {items.map(({ href, label, Icon, tour }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              {...(tour ? { "data-tour": tour } : {})}
              onClick={() => handleTap(href)}
              style={{ color: active ? "var(--accent)" : "var(--text)", transition: "color 0.15s", boxShadow: active ? "inset 0 2px 0 var(--accent)" : "none" }}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3"
            >
              <span className={bouncingHref === href ? "nav-bounce" : ""} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon />
              </span>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: "0.04em" }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
