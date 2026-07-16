"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/apiFetch";
import UserAvatar from "@/components/ui/UserAvatar";

type FollowUser = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

export default function FollowListModal({
  userId,
  type,
  onClose,
}: {
  userId: string;
  type: "followers" | "following";
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/follows?userId=${userId}&list=${type}`)
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId, type]);

  useEffect(() => {
    if (!profile) return;
    fetch(`/api/follows?userId=${profile.id}&list=following`)
      .then((r) => r.json())
      .then((data) => {
        const ids = (data.users ?? []).map((u: FollowUser) => u.id);
        setFollowingSet(new Set(ids));
      });
  }, [profile]);

  const toggleFollow = async (targetId: string) => {
    if (!profile) return;
    const isFollowing = followingSet.has(targetId);
    setFollowingSet((prev) => {
      const next = new Set(prev);
      if (isFollowing) next.delete(targetId);
      else next.add(targetId);
      return next;
    });
    try {
      let res: Response;
      if (isFollowing) {
        res = await apiFetch(`/api/follows?targetId=${targetId}`, { method: "DELETE" });
      } else {
        res = await apiFetch("/api/follows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetId }),
        });
      }
      if (!res.ok) throw new Error();
    } catch {
      setFollowingSet((prev) => {
        const next = new Set(prev);
        if (isFollowing) next.add(targetId);
        else next.delete(targetId);
        return next;
      });
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 300, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 400, maxHeight: "70vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 15 }}>
            {type === "followers" ? "팔로워" : "팔로잉"}
          </p>
          <button onClick={onClose} style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: "2px 6px", lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ overflowY: "auto", padding: "4px 0" }}>
          {loading ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>불러오는 중...</div>
          ) : users.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              {type === "followers" ? "아직 팔로워가 없어요" : "아직 팔로잉하는 멤버가 없어요"}
            </div>
          ) : (
            users.map((u) => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px" }}>
                <Link
                  href={`/profile/${u.id}`}
                  onClick={onClose}
                  style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, textDecoration: "none" }}
                >
                  <UserAvatar avatarUrl={u.avatar_url} size={36} />
                  <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.display_name}
                  </p>
                </Link>
                {profile && profile.id !== u.id && (
                  <button
                    onClick={() => toggleFollow(u.id)}
                    style={{
                      padding: "5px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, flexShrink: 0, cursor: "pointer",
                      border: followingSet.has(u.id) ? "1px solid var(--border)" : "none",
                      backgroundColor: followingSet.has(u.id) ? "transparent" : "var(--accent)",
                      color: followingSet.has(u.id) ? "var(--text-muted)" : "var(--bg)",
                      transition: "all 0.15s",
                    }}
                  >
                    {followingSet.has(u.id) ? "팔로잉" : "팔로우"}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
