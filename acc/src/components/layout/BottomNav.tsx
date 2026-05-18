"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useUserAvatars } from "@/context/UserAvatarsContext";
import { useUsers } from "@/context/UsersContext";
import type { NotificationItem } from "@/app/api/notifications/route";
import UserAvatar from "@/components/ui/UserAvatar";
import { apiFetch } from "@/lib/apiFetch";
import { trackTabClick } from "@/lib/track";

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

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

export default function BottomNav() {
  const { profile } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const avatarMap = useUserAvatars();
  const { getUserById } = useUsers();
  const [bouncingHref, setBouncingHref] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    fetch(`/api/notifications?userId=${profile.id}`)
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications ?? []));
  }, [profile]);

  // 패널 외부 터치 시 닫기
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [notifOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleBellClick = async () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening && unreadCount > 0 && profile) {
      await apiFetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const handleTap = (href: string) => {
    setBouncingHref(href);
    setTimeout(() => setBouncingHref(null), 240);
  };

  const navItems = [
    { href: "/", label: "홈", Icon: HomeIcon, tour: undefined },
    { href: "/albums", label: "음반고", Icon: AlbumsIcon, tour: "nav-albums" },
    { href: "/reviews", label: "청음평", Icon: ReviewsIcon, tour: "nav-reviews" },
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
    <>
      {/* 알림 패널 — BottomNav 위에서 슬라이드업 */}
      {notifOpen && profile && (
        <div
          style={{
            position: "fixed", inset: 0,
            zIndex: 49,
            backgroundColor: "rgba(0,0,0,0.45)",
          }}
          className="sm:hidden"
        >
          <div
            ref={panelRef}
            style={{
              position: "absolute",
              bottom: "calc(60px + env(safe-area-inset-bottom))",
              left: 0, right: 0,
              maxHeight: "70dvh",
              backgroundColor: "var(--bg-card)",
              borderTop: "1px solid var(--border)",
              borderRadius: "16px 16px 0 0",
              overflowY: "auto",
              animation: "slideUpPanel 0.22s ease-out",
            }}
          >
            {/* 패널 핸들 */}
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "var(--border-light)" }} />
            </div>

            {/* 헤더 */}
            <div style={{
              padding: "4px 18px 12px",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>알림</span>
              {notifications.length > 0 && (
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{notifications.length}개</span>
              )}
            </div>

            {/* 알림 목록 */}
            {notifications.length === 0 ? (
              <p style={{ padding: "28px 18px", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
                새 알림이 없어요
              </p>
            ) : (
              notifications.map((n) => {
                const isSystemNotif = n.type !== "comment" && n.type !== "like";
                const fromUser = isSystemNotif ? null : getUserById(n.fromUserId ?? "");
                const nd = new Date(n.createdAt);
                const ndStr = `${String(nd.getMonth() + 1).padStart(2, "0")}.${String(nd.getDate()).padStart(2, "0")}`;

                const systemIcon =
                  n.type === "report_reviewed" || n.type === "report_ban" ? "⚖️"
                  : n.type === "moderation_warning" ? "⚠️"
                  : "🚫";

                const systemText = () => {
                  if (n.type === "report_reviewed") return <>신고가 <b>확인 처리</b>됐습니다{n.reviewerId && <> — @{n.reviewerId}</>}</>;
                  if (n.type === "report_ban") return <>신고 <b>처리 완료</b>{n.reviewerId && <> — <span style={{ color: "#e05050" }}>@{n.reviewerId}</span> 제재됨</>}</>;
                  if (n.type === "moderation_warning") return <>관리자로부터 <b>경고</b>가 발송됐습니다</>;
                  if (n.type === "moderation_ban_temp") return <><b>{n.reviewerId ?? "?"}일 이용 정지</b> 처리됐습니다</>;
                  if (n.type === "moderation_ban_permanent") return <><b>영구 이용 정지</b> 처리됐습니다</>;
                  return null;
                };

                const leftBarColor =
                  n.type === "moderation_warning" ? "#e0a030"
                  : n.type === "moderation_ban_temp" || n.type === "moderation_ban_permanent" ? "#e05050"
                  : "var(--accent)";

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      setNotifOpen(false);
                      if (!isSystemNotif && n.albumId) router.push(`/reviews?albumId=${n.albumId}`);
                    }}
                    style={{
                      padding: "12px 18px",
                      borderBottom: "1px solid var(--border)",
                      backgroundColor: n.read ? "transparent" : "rgba(var(--accent-rgb), 0.05)",
                      borderLeft: n.read ? "3px solid transparent" : `3px solid ${leftBarColor}`,
                      display: "flex", alignItems: "flex-start", gap: 10,
                      cursor: isSystemNotif ? "default" : "pointer",
                    }}
                  >
                    <span style={{ flexShrink: 0, fontSize: 15, lineHeight: "18px", marginTop: 1 }}>
                      {isSystemNotif ? systemIcon : (
                        <UserAvatar avatarUrl={n.fromUserId ? avatarMap[n.fromUserId] : null} size={18} />
                      )}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isSystemNotif ? (
                        <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{systemText()}</p>
                      ) : (
                        <>
                          <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, marginBottom: 2 }}>
                            <span style={{ marginRight: 4 }}>{n.type === "comment" ? "💬" : "♥"}</span>
                            <span style={{ fontWeight: 600 }}>{fromUser?.display_name ?? n.fromUserId}</span>
                            {" "}님이 {n.type === "comment" ? "소감에 댓글을 달았어요" : "소감에 공감했어요"}
                          </p>
                          {n.albumTitle && (
                            <p style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {n.albumTitle}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0, marginTop: 1 }}>{ndStr}</span>
                  </div>
                );
              })
            )}
            <div style={{ height: "env(safe-area-inset-bottom)" }} />
          </div>
        </div>
      )}

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
          {/* 일반 탭들 */}
          {navItems.map(({ href, label, Icon, tour }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                {...(tour ? { "data-tour": tour } : {})}
                onClick={() => { handleTap(href); setNotifOpen(false); trackTabClick(label); }}
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

          {/* 알림 탭 — 로그인 시에만 */}
          {profile && (
            <button
              aria-label="알림"
              onClick={handleBellClick}
              style={{
                flex: 1,
                color: notifOpen ? "var(--accent)" : "var(--text)",
                background: "none", border: "none", cursor: "pointer",
                transition: "color 0.15s",
                boxShadow: notifOpen ? "inset 0 2px 0 var(--accent)" : "none",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 4, padding: "12px 0",
              }}
            >
              <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BellIcon />
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: -3, right: -4 }}>
                    <span style={{
                      position: "absolute", inset: 0, borderRadius: "50%",
                      backgroundColor: "var(--accent)", opacity: 0.5,
                      pointerEvents: "none",
                    }} className="animate-ping" />
                    <span style={{
                      position: "relative",
                      width: 14, height: 14, borderRadius: "50%",
                      backgroundColor: "var(--accent)", color: "var(--bg)",
                      fontSize: 9, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  </span>
                )}
              </span>
              <span style={{ fontSize: 10, fontWeight: notifOpen ? 700 : 500, letterSpacing: "0.04em" }}>
                알림
              </span>
            </button>
          )}
        </div>
      </nav>

      <style>{`
        @keyframes slideUpPanel {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
