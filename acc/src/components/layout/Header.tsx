"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useUserAvatars } from "@/context/UserAvatarsContext";
import { useUsers } from "@/context/UsersContext";
import { useNotifications } from "@/context/NotificationsContext";
import UserAvatar from "@/components/ui/UserAvatar";
import SettingsModal from "@/components/ui/SettingsModal";
import DeleteAccountModal from "@/components/ui/DeleteAccountModal";
import LogoMark from "@/components/ui/LogoMark";


export default function Header() {
  const { profile, loading, signOut } = useAuth();
  const avatarMap = useUserAvatars();
  const { getUserById } = useUsers();
  const router = useRouter();
  const pathname = usePathname();
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const navHoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNavEnter = (href: string) => {
    if (navHoverTimeout.current) clearTimeout(navHoverTimeout.current);
    setHoveredNav(href);
  };
  const handleNavLeave = () => {
    navHoverTimeout.current = setTimeout(() => setHoveredNav(null), 120);
  };

  const { notifications, markAllRead, clearAll, removeNotification } = useNotifications();
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showModeration, setShowModeration] = useState(false);

  const navItems = [
    { href: "/albums", label: "음반고", tour: "nav-albums", desc: "보유한 모든 앨범 탐색" },
    { href: "/best", label: "청음감", tour: "nav-best", desc: "명반 랭킹과 발견" },
    { href: "/community", label: "청음방", tour: undefined, desc: "소감과 멤버 모아보기" },
    ...(profile ? [{ href: `/profile/${profile.id}`, label: "청음록", tour: "nav-profile", desc: "나의 청음 기록" }] : []),
  ];


  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettings(false);
    };
    if (showNotif || showSettings) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNotif, showSettings]);


  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleBellClick = async () => {
    setShowNotif((v) => !v);
    if (!showNotif && unreadCount > 0) {
      await markAllRead();
    }
  };

  return (
    <>
    <header
      style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}
      className="sticky top-0 z-50 hidden sm:block"
    >
      <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "auto 1fr minmax(max-content, auto)", alignItems: "center", height: 52, gap: 8 }}>

        {/* 로고 */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9 }} className="group">
          <LogoMark height={32} className="transition-transform duration-200 group-hover:scale-[1.08]" />
          <span style={{ color: "var(--text)", fontWeight: 700, fontSize: 13, letterSpacing: "-0.03em", transition: "color 0.15s" }} className="group-hover:text-[var(--accent)]">
            아차청음사
          </span>
        </Link>

        {/* 네비 */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-evenly" }} className="hidden sm:flex">
          {navItems.map(({ href, label, tour, desc }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
            <div
              key={href}
              style={{ position: "relative" }}
              onMouseEnter={() => handleNavEnter(href)}
              onMouseLeave={handleNavLeave}
            >
              <Link
                href={href}
                {...(tour ? { "data-tour": tour } : {})}
                style={{
                  color: isActive ? "var(--accent)" : hoveredNav === href ? "var(--text)" : "var(--text-sub)",
                  background: "transparent",
                  boxShadow: hoveredNav === href
                    ? "inset 0 0 40px 0 rgba(232,213,163,0.13)"
                    : "inset 0 0 0px 0 rgba(232,213,163,0)",
                  fontSize: 12, fontWeight: isActive ? 700 : 600, letterSpacing: "0.04em",
                  padding: "0 12px", height: 52,
                  display: "flex", alignItems: "center",
                  textTransform: "uppercase",
                  transition: "color 0.2s ease, box-shadow 0.35s ease",
                }}
              >
                {label}
              </Link>

              {/* 현재 페이지 언더라인 */}
              <div style={{
                position: "absolute",
                bottom: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: isActive ? "60%" : "0%",
                height: 2,
                backgroundColor: "var(--accent)",
                borderRadius: "2px 2px 0 0",
                opacity: 0.8,
                transition: "width 0.25s ease",
                pointerEvents: "none",
              }} />

              {hoveredNav === href && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "11px 16px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                  zIndex: 60,
                  minWidth: 148,
                  pointerEvents: "none",
                  animation: "navDropIn 0.14s ease-out",
                }}>
                  <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 13, letterSpacing: "-0.02em", marginBottom: 4 }}>
                    {label}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: 11, lineHeight: 1.5 }}>
                    {desc}
                  </p>
                </div>
              )}
            </div>
          );})}
        </nav>

        {/* 유저 + 알림 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, opacity: 0.4 }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 4, height: 4, borderRadius: "50%",
                    backgroundColor: "var(--text-muted)",
                    display: "inline-block",
                    animation: "popupBlink 1.4s ease-in-out infinite",
                    animationDelay: `${i * 0.22}s`,
                  }}
                />
              ))}
            </div>
          )}
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
                    <span style={{ position: "absolute", top: 1, right: 1 }}>
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
                        <button
                          onClick={clearAll}
                          style={{ fontSize: 10, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontFamily: "inherit" }}
                          className="hover:text-[var(--error)] transition-colors"
                        >
                          전체 삭제
                        </button>
                      )}
                    </div>
                    <div style={{ maxHeight: "min(320px, 50dvh)", overflowY: "auto" }}>
                      {notifications.filter(n => n.type !== "comment").length === 0 ? (
                        <div style={{ padding: "28px 16px", textAlign: "center" }}>
                          <p style={{ fontSize: 18, marginBottom: 6 }}>🔔</p>
                          <p style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4 }}>새 알림이 없어요</p>
                          <p style={{ fontSize: 11, color: "var(--text-muted)", opacity: 0.6, lineHeight: 1.5 }}>멤버가 소감에 공감하면<br />여기에 나타나요</p>
                        </div>
                      ) : (
                        notifications.filter(n => n.type !== "comment").map((n) => {
                          const isSystemNotif = n.type !== "like";
                          const fromUser = isSystemNotif ? null : getUserById(n.fromUserId ?? "");
                          const nd = new Date(n.createdAt);
                          const ndStr = `${String(nd.getMonth() + 1).padStart(2, "0")}.${String(nd.getDate()).padStart(2, "0")}`;

                          const systemIcon =
                            n.type === "report_reviewed" || n.type === "report_ban" ? "⚖️"
                            : n.type === "moderation_warning" ? "⚠️"
                            : "🚫";

                          const systemText = () => {
                            if (n.type === "report_reviewed") return (
                              <>신고가 <span style={{ fontWeight: 600 }}>확인 처리</span>됐습니다{n.reviewerId && <> — @{n.reviewerId}</>}</>
                            );
                            if (n.type === "report_ban") return (
                              <>신고 <span style={{ fontWeight: 600 }}>처리 완료</span>{n.reviewerId && <> — <span style={{ color: "#e05050" }}>@{n.reviewerId}</span> 제재됨</>}</>
                            );
                            if (n.type === "moderation_warning") return (
                              <>관리자로부터 <span style={{ fontWeight: 600 }}>경고</span>가 발송됐습니다</>
                            );
                            if (n.type === "moderation_ban_temp") return (
                              <><span style={{ fontWeight: 600 }}>{n.reviewerId ?? "?"}일 이용 정지</span> 처리됐습니다</>
                            );
                            if (n.type === "moderation_ban_permanent") return (
                              <><span style={{ fontWeight: 600 }}>영구 이용 정지</span> 처리됐습니다</>
                            );
                            return null;
                          };

                          const leftBarColor =
                            n.type === "moderation_warning" ? "#e0a030"
                            : n.type === "moderation_ban_temp" || n.type === "moderation_ban_permanent" ? "#e05050"
                            : isSystemNotif ? "var(--accent)"
                            : "var(--accent)";

                          return (
                            <div
                              key={n.id}
                              onClick={() => {
                                setShowNotif(false);
                                if (!isSystemNotif && n.albumId) router.push(`/community?albumId=${n.albumId}${profile ? `&userId=${profile.id}` : ""}`);
                              }}
                              style={{
                                padding: "10px 16px",
                                borderBottom: "1px solid var(--border)",
                                backgroundColor: n.read ? "transparent" : "rgba(var(--accent-rgb), 0.05)",
                                borderLeft: n.read ? "2px solid transparent" : `2px solid ${leftBarColor}`,
                                display: "flex", alignItems: "flex-start", gap: 8,
                                cursor: isSystemNotif ? "default" : "pointer",
                              }}
                              className={isSystemNotif ? "" : "hover:bg-[var(--bg-elevated)] transition-colors"}
                            >
                              <span style={{ flexShrink: 0, fontSize: 14, lineHeight: "16px", marginTop: 1 }}>
                                {isSystemNotif ? systemIcon : (
                                  <UserAvatar avatarUrl={n.fromUserId ? avatarMap[n.fromUserId] : null} size={16} />
                                )}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {isSystemNotif ? (
                                  <p style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.5 }}>
                                    {systemText()}
                                  </p>
                                ) : (
                                  <>
                                    <p style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.5, marginBottom: 2 }}>
                                      <span style={{ marginRight: 4 }}>♥</span>
                                      <span style={{ fontWeight: 600 }}>{fromUser?.display_name ?? n.fromUserId}</span>
                                      {" "}님이 소감에 공감했어요
                                    </p>
                                    {n.albumTitle && (
                                      <p style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {n.albumTitle}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{ndStr}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 11, padding: "2px 2px", lineHeight: 1, opacity: 0.6 }}
                                  className="hover:opacity-100 hover:text-[var(--error)] transition-[opacity,color]"
                                >
                                  ✕
                                </button>
                              </div>
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
              {/* 설정 드롭다운 */}
              <div ref={settingsRef} style={{ position: "relative" }} className="hidden sm:block">
                <button
                  onClick={() => setShowSettings((v) => !v)}
                  style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: "4px 6px", display: "flex", alignItems: "center" }}
                  className="hover:text-[var(--text)] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>
                {showSettings && (
                  <div style={{
                    position: "absolute", right: 0, top: "calc(100% + 8px)",
                    width: 140, backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)", borderRadius: 10,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                    zIndex: 200, overflow: "hidden",
                    animation: "modalIn 0.15s ease-out",
                  }}>
                    <button
                      onClick={() => { setShowSettings(false); signOut(); }}
                      style={{ display: "block", width: "100%", padding: "12px 16px", background: "none", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", color: "var(--text)", fontSize: 13, textAlign: "left", fontFamily: "inherit" }}
                      className="hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      로그아웃
                    </button>
                    <button
                      onClick={() => { setShowSettings(false); setShowModeration(true); }}
                      style={{ display: "block", width: "100%", padding: "12px 16px", background: "none", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", color: "var(--text)", fontSize: 13, textAlign: "left", fontFamily: "inherit" }}
                      className="hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      제재 이력
                    </button>
                    <button
                      onClick={() => { setShowSettings(false); setShowDeleteConfirm(true); }}
                      style={{ display: "block", width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", color: "var(--error)", fontSize: 13, textAlign: "left", fontFamily: "inherit" }}
                      className="hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      계정 탈퇴
                    </button>
                  </div>
                )}
              </div>
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
      <style>{`
        @keyframes navDropIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </header>

    {showModeration && <SettingsModal onClose={() => setShowModeration(false)} />}
    {showDeleteConfirm && <DeleteAccountModal onClose={() => setShowDeleteConfirm(false)} />}
    </>
  );
}
