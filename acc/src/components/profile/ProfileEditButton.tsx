"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

type Props = {
  userId: string;
  initialDisplayName: string;
  initialEmoji: string;
  initialAvatarUrl: string | null;
  initialBio?: string | null;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
};

const CROP_SIZE = 220;
const OUTPUT_SIZE = 600;

export default function ProfileEditButton({ userId, initialDisplayName, initialEmoji, initialAvatarUrl, initialBio, open: controlledOpen, onOpenChange }: Props) {
  const { profile, authUser, refreshProfile } = useAuth();
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen! : internalOpen;
  const setOpen = (v: boolean) => { if (isControlled) onOpenChange?.(v); else setInternalOpen(v); };
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // crop state
  const [cropMode, setCropMode] = useState(false);
  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [rawFileName, setRawFileName] = useState("avatar.jpg");
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [imgDisplaySize, setImgDisplaySize] = useState({ w: CROP_SIZE, h: CROP_SIZE });
  const cropImgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startOx: number; startOy: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (cropMode) setCropMode(false); else setOpen(false); }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, cropMode]);

  if (!profile || profile.id !== userId) return null;

  const clampOffset = (ox: number, oy: number, sz: { w: number; h: number }) => ({
    x: Math.max(-(sz.w - CROP_SIZE) / 2, Math.min((sz.w - CROP_SIZE) / 2, ox)),
    y: Math.max(-(sz.h - CROP_SIZE) / 2, Math.min((sz.h - CROP_SIZE) / 2, oy)),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setRawSrc(URL.createObjectURL(file));
    setRawFileName(file.name);
    setCropOffset({ x: 0, y: 0 });
    setImgDisplaySize({ w: CROP_SIZE, h: CROP_SIZE });
    setCropMode(true);
  };

  const handleImgLoad = () => {
    const img = cropImgRef.current;
    if (!img) return;
    const scale = Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight);
    setImgDisplaySize({ w: img.naturalWidth * scale, h: img.naturalHeight * scale });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOx: cropOffset.x, startOy: cropOffset.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setCropOffset(clampOffset(dragRef.current.startOx + dx, dragRef.current.startOy + dy, imgDisplaySize));
  };

  const handlePointerUp = () => { dragRef.current = null; };

  const handleCropConfirm = () => {
    const img = cropImgRef.current;
    if (!img) return;
    const scale = Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight);
    const { x: ox, y: oy } = clampOffset(cropOffset.x, cropOffset.y, imgDisplaySize);
    const srcX = (imgDisplaySize.w / 2 - CROP_SIZE / 2 - ox) / scale;
    const srcY = (imgDisplaySize.h / 2 - CROP_SIZE / 2 - oy) / scale;
    const srcSize = CROP_SIZE / scale;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], rawFileName.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(blob));
      setCropMode(false);
    }, "image/jpeg", 0.92);
  };

  const handleSave = async () => {
    if (!authUser) return;
    setSaving(true);
    setError("");

    let avatarUrl: string | null = initialAvatarUrl;

    if (avatarFile) {
      const formData = new FormData();
      formData.append("file", avatarFile);
      const res = await apiFetch("/api/users/avatar", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "이미지 업로드 실패");
        setSaving(false);
        return;
      }
      const data = await res.json();
      avatarUrl = data.url;
    }

    const res = await apiFetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: displayName.trim() || initialDisplayName,
        emoji: initialEmoji,
        avatar_url: avatarUrl,
        bio: bio.trim() || null,
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
    fontSize: 16,
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
      {!isControlled && (
        <button
          onClick={() => setOpen(true)}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "4px 10px",
            cursor: "pointer",
            color: "var(--text)",
            fontSize: 11,
            flexShrink: 0,
            transition: "color 0.15s",
          }}
        >
          편집
        </button>
      )}

      {open && (
        <div
          ref={backdropRef}
          onClick={(e) => { if (!cropMode && e.target === backdropRef.current) setOpen(false); }}
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)",
            zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
        >
          {cropMode && rawSrc ? (
            /* ── 위치 조정 UI ── */
            <div
              style={{
                backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 16, padding: "28px 28px 24px",
                display: "flex", flexDirection: "column", gap: 18, alignItems: "center",
                maxWidth: 320, width: "100%",
                animation: "modalIn 0.18s ease-out",
              }}
            >
              <div style={{ alignSelf: "flex-start" }}>
                <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 15 }}>사진 위치 조정</p>
                <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 3 }}>드래그해서 원하는 부분이 보이도록 조정하세요</p>
              </div>

              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{
                  width: CROP_SIZE, height: CROP_SIZE,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "3px solid var(--accent)",
                  position: "relative",
                  cursor: "grab",
                  flexShrink: 0,
                  touchAction: "none",
                  userSelect: "none",
                  boxShadow: "0 0 0 4px rgba(0,0,0,0.4)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={cropImgRef}
                  src={rawSrc}
                  alt="crop"
                  onLoad={handleImgLoad}
                  draggable={false}
                  style={{
                    position: "absolute",
                    width: imgDisplaySize.w,
                    height: imgDisplaySize.h,
                    left: CROP_SIZE / 2 - imgDisplaySize.w / 2 + cropOffset.x,
                    top: CROP_SIZE / 2 - imgDisplaySize.h / 2 + cropOffset.y,
                    pointerEvents: "none",
                  }}
                />
              </div>

              <p style={{ color: "var(--text-muted)", fontSize: 11, opacity: 0.6 }}>← 드래그 →</p>

              <div style={{ display: "flex", gap: 8, width: "100%" }}>
                <button
                  onClick={() => setCropMode(false)}
                  style={{
                    flex: 1, padding: "10px 0",
                    backgroundColor: "transparent", border: "1px solid var(--border)",
                    borderRadius: 8, color: "var(--text)", fontSize: 13, cursor: "pointer",
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleCropConfirm}
                  style={{
                    flex: 2, padding: "10px 0",
                    backgroundColor: "var(--accent)", border: "none",
                    borderRadius: 8, color: "var(--bg)", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  이 위치로 설정
                </button>
              </div>
            </div>
          ) : (
            /* ── 프로필 편집 UI ── */
            <div style={{
              backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 14, width: "100%", maxWidth: 400,
              padding: 32, display: "flex", flexDirection: "column", gap: 20,
            }}>
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
                    : <span style={{ lineHeight: 1 }}>{initialEmoji}</span>
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
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: 11 }}>클릭해서 사진 업로드</p>
                  {avatarFile && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      style={{ color: "var(--accent)", fontSize: 11, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                    >
                      위치 재조정
                    </button>
                  )}
                </div>
              </div>

              {/* 닉네임 */}
              <div>
                <label style={labelStyle}>DISPLAY NAME</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle} />
              </div>

              {/* 소개글 */}
              <div>
                <label style={labelStyle}>소개글</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={150}
                  rows={3}
                  placeholder="짧게 자신을 소개해보세요 (최대 150자)"
                  style={{ ...inputStyle, resize: "none", lineHeight: 1.5, fontFamily: "inherit" }}
                />
                <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 4, textAlign: "right" }}>
                  {bio.length} / 150
                </p>
              </div>

              {error && <p style={{ color: "#e05050", fontSize: 12 }}>{error}</p>}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    backgroundColor: "transparent", border: "1px solid var(--border)",
                    color: "var(--text)", borderRadius: 6, padding: "8px 20px", fontSize: 13, cursor: "pointer",
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
          )}
        </div>
      )}
    </>
  );
}
