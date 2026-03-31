"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

type Props = {
  userId: string;
  initialDisplayName: string;
  initialEmoji: string;
  initialAvatarUrl: string | null;
};

export default function ProfileEditButton({ userId, initialDisplayName, initialEmoji, initialAvatarUrl }: Props) {
  const { profile, authUser, refreshProfile } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [emoji, setEmoji] = useState(initialEmoji);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  // 본인 프로필 아닐 때 렌더링 안 함
  if (!profile || profile.id !== userId) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!authUser) return;
    setSaving(true);
    setError("");

    let avatarUrl: string | null = initialAvatarUrl;

    if (avatarFile) {
      const formData = new FormData();
      formData.append("file", avatarFile);
      formData.append("userId", userId);
      const res = await fetch("/api/users/avatar", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "이미지 업로드 실패");
        setSaving(false);
        return;
      }
      const data = await res.json();
      avatarUrl = data.url;
    }

    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_id: authUser.id,
        display_name: displayName.trim() || initialDisplayName,
        emoji: emoji.trim() || initialEmoji,
        avatar_url: avatarUrl,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "저장 실패");
      setSaving(false);
      return;
    }

    await refreshProfile();
    setSaving(false);
    setOpen(false);
    router.refresh();
  };

  const inputStyle = {
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 13,
    outline: "none",
    width: "100%",
  } as const;

  const labelStyle = {
    color: "var(--text-muted)",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    display: "block",
    marginBottom: 6,
  } as const;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "4px 10px",
          cursor: "pointer",
          color: "var(--text-muted)",
          fontSize: 11,
          flexShrink: 0,
          transition: "color 0.15s",
        }}
      >
        편집
      </button>

      {open && (
        <div
          ref={backdropRef}
          onClick={(e) => { if (e.target === backdropRef.current) setOpen(false); }}
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)",
            zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
        >
          <div style={{
            backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 14, width: "100%", maxWidth: 400,
            padding: 32, display: "flex", flexDirection: "column", gap: 20,
          }}>
            {/* 헤더 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 16 }}>프로필 편집</p>
              <button onClick={() => setOpen(false)} style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>×</button>
            </div>

            {/* 아바타 */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  width: 88, height: 88, borderRadius: "50%",
                  backgroundColor: "var(--bg-elevated)", border: "2px solid var(--border-light)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 38, cursor: "pointer", overflow: "hidden", position: "relative",
                }}
              >
                {avatarPreview
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={avatarPreview} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ lineHeight: 1 }}>{emoji || initialEmoji}</span>
                }
                <div
                  style={{
                    position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: 0, transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
                >
                  <span style={{ color: "#fff", fontSize: 11, fontWeight: 600 }}>변경</span>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
              <p style={{ color: "var(--text-muted)", fontSize: 11 }}>클릭해서 사진 업로드</p>
            </div>

            {/* 닉네임 */}
            <div>
              <label style={labelStyle}>DISPLAY NAME</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* 이모지 */}
            <div>
              <label style={labelStyle}>EMOJI</label>
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                maxLength={4}
                style={{ ...inputStyle, width: 72, textAlign: "center", fontSize: 22, padding: "6px 8px" }}
              />
            </div>

            {error && <p style={{ color: "#e05050", fontSize: 12 }}>{error}</p>}

            {/* 버튼 */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  backgroundColor: "transparent", border: "1px solid var(--border)",
                  color: "var(--text-muted)", borderRadius: 6, padding: "8px 20px", fontSize: 13, cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  backgroundColor: "var(--accent)", border: "none", color: "var(--bg)",
                  borderRadius: 6, padding: "8px 20px", fontSize: 13, fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
