"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useUserAvatars } from "@/context/UserAvatarsContext";
import { useUsers } from "@/context/UsersContext";
import type { NotificationItem } from "@/app/api/notifications/route";
import UserAvatar from "@/components/ui/UserAvatar";

export default function Header() {
  const { profile, loading, signOut } = useAuth();
  const avatarMap = useUserAvatars();
  const { getUserById } = useUsers();
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { href: "/albums", label: "음반고" },
    { href: "/best", label: "청음감" },
    { href: "/themes", label: "청음집" },
    { href: "/reviews", label: "청음평" },
    { href: "/members", label: "청음인" },
    ...(profile ? [{ href: `/profile/${profile.id}`, label: "청음록" }] : []),
  ];

  useEffect(() => {
    if (!profile) return;
    fetch(`/api/notifications?userId=${profile.id}`)
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications ?? []));
  }, [profile]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    if (showNotif) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNotif]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleBellClick = async () => {
    setShowNotif((v) => !v);
    if (!showNotif && unreadCount > 0 && profile) {
      // 열면 전체 읽음 처리
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  return (
    <header
      style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}
      className="sticky top-0 z-50 hidden sm:block"
    >
      <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "auto 1fr minmax(max-content, auto)", alignItems: "center", height: 52, gap: 8 }}>

        {/* 로고 */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--accent)", fontSize: 16, lineHeight: 1 }}>♪</span>
          <span style={{ color: "var(--text)", fontWeight: 700, fontSize: 13, letterSpacing: "-0.03em" }}>
            아차청음사
          </span>
        </Link>

        {/* 네비 */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-evenly" }} className="hidden sm:flex">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onMouseEnter={() => setHoveredNav(href)}
              onMouseLeave={() => setHoveredNav(null)}
              style={{
                color: hoveredNav === href ? "var(--text)" : "var(--text-sub)",
                backgroundColor: hoveredNav === href ? "var(--border)" : "transparent",
                fontSize: 12, fontWeight: 600, letterSpacing: "0.04em",
                padding: "0 12px", height: 52,
                display: "flex", alignItems: "center",
                textTransform: "uppercase",
                transition: "color 0.15s, background-color 0.15s",
              }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* 유저 + 알림 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
          {!loading && profile && (
            <>
              {/* 알림 벨 */}
              <div ref={notifRef} style={{ position: "relative" }}>
                <button
                  onClick={handleBellClick}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", position: "relative", color: "var(--text-muted)", display: "flex", alignItems: "center" }}
                  className="hover:text-[var(--text)] transition-colors"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {unreadCount > 0 && (
                    <span style={{
                      position: "absolute", top: 1, right: 1,
                      width: 14, height: 14, borderRadius: "50%",
                      backgroundColor: "var(--accent)", color: "var(--bg)",
                      fontSize: 9, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* 알림 드롭다운 */}
                {showNotif && (
                  <div style={{
                    position: "absolute", right: 0, top: "calc(100% + 8px)",
                    width: "min(300px, calc(100vw - 32px))", backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)", borderRadius: 10,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                    zIndex: 200, overflow: "hidden",
                    animation: "modalIn 0.15s ease-out",
                  }}>
                    <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>알림</span>
                      {notifications.length > 0 && (
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{notifications.length}개</span>
                      )}
                    </div>
                    <div style={{ maxHeight: 320, overflowY: "auto" }}>
                      {notifications.length === 0 ? (
                        <p style={{ padding: "20px 16px", fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>새 알림이 없어요</p>
                      ) : (
                        notifications.map((n) => {
                          const fromUser = getUserById(n.fromUserId);
                          const typeIcon = n.type === "comment" ? "💬" : "♥";
                          const label = n.type === "comment" ? "소감에 댓글을 달았어요" : "소감에 공감했어요";
                          const nd = new Date(n.createdAt);
                          const ndStr = `${String(nd.getMonth() + 1).padStart(2, "0")}.${String(nd.getDate()).padStart(2, "0")}`;
                          return (
                            <div
                              key={n.id}
                              style={{
                                padding: "10px 16px",
                                borderBottom: "1px solid var(--border)",
                                backgroundColor: n.read ? "transparent" : "rgba(var(--accent-rgb), 0.05)",
                                borderLeft: n.read ? "2px solid transparent" : "2px solid var(--accent)",
                                display: "flex", alignItems: "flex-start", gap: 8,
                              }}
                            >
                              <span style={{ flexShrink: 0 }}><UserAvatar avatarUrl={n.fromUserId ? avatarMap[n.fromUserId] : null} size={16} /></span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.5 }}>
                                  <span style={{ marginRight: 4 }}>{typeIcon}</span>
                                  <span style={{ fontWeight: 600 }}>{fromUser?.display_name ?? n.fromUserId}</span>
                                  {" "}님이 {label}
                                </p>
                              </div>
                              <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>{ndStr}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Link href={`/profile/${profile.id}`} style={{ color: "var(--text-muted)", fontSize: 12, textDecoration: "none", display: "flex", alignItems: "center", gap: 5, maxWidth: 120, minWidth: 0 }}
                className="hover:text-[var(--text)] transition-colors hidden sm:flex">
                <UserAvatar avatarUrl={profile.avatar_url} size={18} />
                <span className="truncate">{profile.display_name}</span>
              </Link>
              <button
                onClick={signOut}
                style={{ color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.04em" }}
                className="hidden sm:block hover:text-[var(--text)] transition-colors"
              >
                로그아웃
              </button>
            </>
          )}
          {!loading && !profile && (
            <Link href="/login" style={{ color: "var(--text-muted)", fontSize: 12 }}
              className="hidden sm:block hover:text-[var(--text)] transition-colors">
              입장
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
