"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/apiFetch";
import dynamic from "next/dynamic";

const FollowListModal = dynamic(() => import("./FollowListModal"), { ssr: false });

type FollowData = {
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
};

export default function ProfileFollowSection({ targetUserId }: { targetUserId: string }) {
  const { profile } = useAuth();
  const [data, setData] = useState<FollowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<"followers" | "following" | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/follows?userId=${targetUserId}`);
    if (res.ok) setData(await res.json());
  }, [targetUserId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggle = async () => {
    if (!profile || !data || loading) return;
    setLoading(true);
    const wasFollowing = data.isFollowing;
    setData((prev) =>
      prev
        ? { ...prev, isFollowing: !wasFollowing, followerCount: prev.followerCount + (wasFollowing ? -1 : 1) }
        : prev
    );
    try {
      let res: Response;
      if (wasFollowing) {
        res = await apiFetch(`/api/follows?targetId=${targetUserId}`, { method: "DELETE" });
      } else {
        res = await apiFetch("/api/follows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetId: targetUserId }),
        });
      }
      if (!res.ok) throw new Error();
    } catch {
      setData((prev) =>
        prev
          ? { ...prev, isFollowing: wasFollowing, followerCount: prev.followerCount + (wasFollowing ? 1 : -1) }
          : prev
      );
    } finally {
      setLoading(false);
    }
  };

  const isOwnProfile = profile?.id === targetUserId;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
        <button
          onClick={() => setModal("followers")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--text-muted)", fontSize: 12 }}
        >
          팔로워{" "}
          <span style={{ color: "var(--text)", fontWeight: 700 }}>
            {data?.followerCount ?? "—"}
          </span>
        </button>
        <span style={{ color: "var(--border)", fontSize: 11, userSelect: "none" }}>·</span>
        <button
          onClick={() => setModal("following")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--text-muted)", fontSize: 12 }}
        >
          팔로잉{" "}
          <span style={{ color: "var(--text)", fontWeight: 700 }}>
            {data?.followingCount ?? "—"}
          </span>
        </button>
        {!isOwnProfile && profile && data && (
          <button
            onClick={toggle}
            disabled={loading}
            style={{
              padding: "3px 13px", borderRadius: 7, fontSize: 11, fontWeight: 600,
              cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1,
              border: data.isFollowing ? "1px solid var(--border)" : "none",
              backgroundColor: data.isFollowing ? "transparent" : "var(--accent)",
              color: data.isFollowing ? "var(--text-muted)" : "var(--bg)",
              transition: "all 0.15s",
              marginLeft: 2,
            }}
          >
            {data.isFollowing ? "팔로잉 ✓" : "팔로우"}
          </button>
        )}
      </div>

      {modal && (
        <FollowListModal
          userId={targetUserId}
          type={modal}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
