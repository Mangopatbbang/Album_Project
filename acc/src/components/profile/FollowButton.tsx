"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/apiFetch";

type FollowData = {
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
};

export default function FollowButton({ targetUserId }: { targetUserId: string }) {
  const { profile } = useAuth();
  const [data, setData] = useState<FollowData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await apiFetch(`/api/follows?userId=${targetUserId}`);
    if (res.ok) {
      const json = await res.json();
      setData(json);
    }
  }, [targetUserId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggle = async () => {
    if (!profile || !data || loading) return;
    setLoading(true);
    const wasFollowing = data.isFollowing;

    setData((prev) => prev ? {
      ...prev,
      isFollowing: !wasFollowing,
      followerCount: prev.followerCount + (wasFollowing ? -1 : 1),
    } : prev);

    try {
      if (wasFollowing) {
        await apiFetch(`/api/follows?targetId=${targetUserId}`, { method: "DELETE" });
      } else {
        await apiFetch("/api/follows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetId: targetUserId }),
        });
      }
    } catch {
      setData((prev) => prev ? {
        ...prev,
        isFollowing: wasFollowing,
        followerCount: prev.followerCount + (wasFollowing ? 1 : -1),
      } : prev);
    } finally {
      setLoading(false);
    }
  };

  const isOwnProfile = profile?.id === targetUserId;

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      {/* 팔로워/팔로잉 카운트 */}
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 18, lineHeight: 1, letterSpacing: "-0.03em" }}>
            {data?.followerCount ?? "—"}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 3 }}>팔로워</p>
        </div>
        <div style={{ width: 1, backgroundColor: "var(--border)" }} />
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 18, lineHeight: 1, letterSpacing: "-0.03em" }}>
            {data?.followingCount ?? "—"}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 3 }}>팔로잉</p>
        </div>
      </div>

      {/* 팔로우 버튼 (타인 프로필 + 로그인 상태) */}
      {!isOwnProfile && profile && data && (
        <button
          onClick={toggle}
          disabled={loading}
          style={{
            padding: "8px 20px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
            transition: "all 0.15s",
            border: data.isFollowing ? "1px solid var(--border)" : "none",
            backgroundColor: data.isFollowing ? "transparent" : "var(--accent)",
            color: data.isFollowing ? "var(--text-muted)" : "var(--bg)",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {data.isFollowing ? "팔로잉 ✓" : "팔로우"}
        </button>
      )}
    </div>
  );
}
