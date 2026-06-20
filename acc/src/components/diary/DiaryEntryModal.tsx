"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import TagSelector from "@/components/diary/TagSelector";

type DiaryAlbum = {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  score: number;
};

type Props = {
  onClose: () => void;
  onSaved: () => void;
  recentTags?: string[];
  initialAlbum?: DiaryAlbum;
  editEntry?: {
    id: string;
    note: string | null;
    context: string[] | null;
    image_url: string | null;
    listened_at: string;
    album: DiaryAlbum;
  };
};

const STEP_LABELS = ["앨범", "기록", "태그"];
const SCORES = ["", "이건 좀", "음", "괜찮네", "좋네", "오", "워", "ㅠㅠ", "이게 뭐야"];

function todayKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function DiaryEntryModal({ onClose, onSaved, recentTags = [], initialAlbum, editEntry }: Props) {
  const isEdit = !!editEntry;
  const [step, setStep] = useState(isEdit ? 1 : initialAlbum ? 1 : 0);

  // Step 0 — 앨범 선택
  const [query, setQuery] = useState("");
  const [albums, setAlbums] = useState<DiaryAlbum[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<DiaryAlbum | null>(initialAlbum ?? editEntry?.album ?? null);
  const [listenedAt, setListenedAt] = useState(editEntry?.listened_at ?? todayKST());

  // Step 1 — 메모 + 사진
  const [note, setNote] = useState(editEntry?.note ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(editEntry?.image_url ?? null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(editEntry?.image_url ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 2 — 태그
  const [tags, setTags] = useState<string[]>(editEntry?.context ?? []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(false);
  const doClose = () => { setClosing(true); setTimeout(onClose, 160); };

  const backdropRef = useRef<HTMLDivElement>(null);

  // 앨범 목록 로드
  const loadAlbums = useCallback(async (q: string) => {
    setAlbumsLoading(true);
    try {
      const res = await apiFetch(`/api/diary/albums?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setAlbums(data.albums ?? []);
    } catch {
      setAlbums([]);
    } finally {
      setAlbumsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 0 && !isEdit) loadAlbums("");
  }, [step, isEdit, loadAlbums]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 0) loadAlbums(query);
    }, 220);
    return () => clearTimeout(timer);
  }, [query, step, loadAlbums]);

  // ESC 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") doClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImagePreview(URL.createObjectURL(file));
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch("/api/diary/image", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "이미지 업로드 실패"); setImagePreview(null); return; }
      setImageUrl(data.url);
    } catch {
      setError("이미지 업로드 실패");
      setImagePreview(null);
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = () => {
    if (imageUrl) {
      apiFetch(`/api/diary/image?url=${encodeURIComponent(imageUrl)}`, { method: "DELETE" }).catch(() => {});
    }
    setImageUrl(null);
    setImagePreview(null);
  };

  const handleSave = async () => {
    if (!selectedAlbum && !isEdit) return;
    setSaving(true);
    setError("");
    try {
      let res;
      if (isEdit) {
        res = await apiFetch("/api/listening-logs", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editEntry!.id, listenedAt, context: tags, imageUrl }),
        });
      } else {
        res = await apiFetch("/api/listening-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            albumId: selectedAlbum!.id,
            note: note.trim() || null,
            context: tags,
            listenedAt,
            imageUrl,
          }),
        });
      }
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "저장 실패");
        return;
      }
      onSaved();
    } catch {
      setError("네트워크 오류");
    } finally {
      setSaving(false);
    }
  };

  const canNext0 = !!selectedAlbum;
  const canSave = !saving;

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) doClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        backgroundColor: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
        animation: closing ? "backdropOut 0.16s ease-in forwards" : "backdropIn 0.18s ease-out",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          width: "100%",
          maxWidth: 480,
          maxHeight: "90dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: closing ? "modalOut 0.16s ease-in forwards" : "modalIn 0.18s ease-out",
        }}
      >
        {/* 헤더 */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>
              {isEdit ? "청음일기 수정" : "청음일기"}
            </p>
            <button
              onClick={doClose}
              style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 2 }}
            >
              ×
            </button>
          </div>

          {/* 스텝 인디케이터 */}
          {!isEdit && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {STEP_LABELS.map((label, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      backgroundColor: i === step ? "var(--accent)" : i < step ? "var(--accent)" : "var(--bg-elevated)",
                      border: i > step ? "1px solid var(--border)" : "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      transition: "background-color 0.18s, border-color 0.18s",
                    }}>
                      {i < step
                        ? <span style={{ color: "var(--bg)", fontSize: 10, fontWeight: 700 }}>✓</span>
                        : <span style={{ color: i === step ? "var(--bg)" : "var(--text-muted)", fontSize: 10, fontWeight: 700 }}>{i + 1}</span>
                      }
                    </div>
                    <span style={{
                      fontSize: 11,
                      color: i === step ? "var(--text)" : "var(--text-muted)",
                      fontWeight: i === step ? 600 : 400,
                    }}>
                      {label}
                    </span>
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div style={{ width: 20, height: 1, backgroundColor: "var(--border)" }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 컨텐츠 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* ── 수정 모드: 단일 화면 ── */}
          {isEdit && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* 앨범 요약 (읽기 전용) */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", backgroundColor: "var(--bg-elevated)", borderRadius: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 5, overflow: "hidden", flexShrink: 0, border: "1px solid var(--border)" }}>
                  {editEntry!.album.cover_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img loading="lazy" src={editEntry!.album.cover_url} alt={editEntry!.album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>♪</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{editEntry!.album.title}</p>
                  <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{editEntry!.album.artist} · {SCORES[editEntry!.album.score]}</p>
                </div>
              </div>

              {/* 날짜 */}
              <div>
                <label style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                  들은 날짜
                </label>
                <input
                  type="date"
                  value={listenedAt}
                  max={todayKST()}
                  onChange={(e) => setListenedAt(e.target.value)}
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "9px 12px",
                    color: "var(--text)",
                    fontSize: 14,
                    outline: "none",
                    colorScheme: "dark",
                  }}
                />
              </div>

              {/* 메모 — 읽기 전용 */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em" }}>
                    메모
                  </label>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.5 }}>수정할 수 없어요</span>
                </div>
                <div style={{
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  color: "var(--text)",
                  fontSize: 14,
                  lineHeight: 1.7,
                  opacity: 0.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  minHeight: 44,
                  cursor: "default",
                  userSelect: "text",
                }}>
                  {editEntry?.note
                    ? editEntry.note
                    : <span style={{ fontStyle: "italic" }}>메모 없음</span>
                  }
                </div>
              </div>

              {/* 사진 */}
              <div>
                <label style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
                  사진 <span style={{ fontWeight: 400, opacity: 0.6 }}>(선택, 1장)</span>
                </label>
                {imagePreview ? (
                  <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" src={imagePreview} alt="첨부 사진" style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }} />
                    <button
                      onClick={handleRemoveImage}
                      style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 28, height: 28, color: "#fff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >✕</button>
                    {imageUploading && (
                      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <p style={{ color: "#fff", fontSize: 12 }}>업로드 중...</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{ width: "100%", padding: "20px 0", backgroundColor: "var(--bg-elevated)", border: "1px dashed var(--border)", borderRadius: 10, color: "var(--text-muted)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <span style={{ fontSize: 16 }}>📷</span>
                    사진 추가
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
              </div>

              {/* 태그 */}
              <div>
                <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 12 }}>
                  태그 <span style={{ fontWeight: 400, opacity: 0.6 }}>(선택)</span>
                </p>
                <TagSelector selected={tags} onChange={setTags} recentTags={recentTags} />
              </div>

            </div>
          )}

          {/* ── Step 0: 앨범 선택 ── */}
          {!isEdit && step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {selectedAlbum ? (
                <SelectedAlbumCard album={selectedAlbum} onClear={() => setSelectedAlbum(null)} />
              ) : (
                <>
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="앨범명 또는 아티스트 검색"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "10px 14px",
                      color: "var(--text)",
                      fontSize: 14,
                      outline: "none",
                      width: "100%",
                    }}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {albumsLoading && (
                      <p style={{ color: "var(--text-muted)", fontSize: 12, padding: "8px 0", textAlign: "center" }}>불러오는 중...</p>
                    )}
                    {!albumsLoading && albums.length === 0 && (
                      <p style={{ color: "var(--text-muted)", fontSize: 12, padding: "8px 0", textAlign: "center" }}>
                        {query ? "검색 결과 없음" : "평가한 앨범이 없어요"}
                      </p>
                    )}
                    {albums.map((album) => (
                      <button
                        key={album.id}
                        onClick={() => setSelectedAlbum(album)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 10px", borderRadius: 8,
                          background: "none", border: "none", cursor: "pointer",
                          textAlign: "left",
                          transition: "background-color 0.1s",
                        }}
                        className="hover:bg-[var(--bg-elevated)]"
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 4, flexShrink: 0,
                          overflow: "hidden", backgroundColor: "var(--bg-elevated)",
                          border: "1px solid var(--border)",
                        }}>
                          {album.cover_url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img loading="lazy" src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>♪</span>
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{album.title}</p>
                          <p style={{ color: "var(--text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{album.artist}</p>
                        </div>
                        <span style={{ color: "var(--accent)", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          {album.score}점
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* 날짜 선택 */}
              {selectedAlbum && (
                <div>
                  <label style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                    들은 날짜
                  </label>
                  <input
                    type="date"
                    value={listenedAt}
                    max={todayKST()}
                    onChange={(e) => setListenedAt(e.target.value)}
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "9px 12px",
                      color: "var(--text)",
                      fontSize: 14,
                      outline: "none",
                      colorScheme: "dark",
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Step 1: 메모 + 사진 ── */}
          {!isEdit && step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* 선택한 앨범 요약 */}
              {selectedAlbum && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", backgroundColor: "var(--bg-elevated)", borderRadius: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 5, overflow: "hidden", flexShrink: 0, border: "1px solid var(--border)" }}>
                    {selectedAlbum.cover_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img loading="lazy" src={selectedAlbum.cover_url} alt={selectedAlbum.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>♪</span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedAlbum.title}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{selectedAlbum.artist} · {SCORES[selectedAlbum.score]}</p>
                  </div>
                  <p style={{ color: "var(--text-muted)", fontSize: 11, flexShrink: 0 }}>{formatDate(listenedAt)}</p>
                </div>
              )}

              {/* 메모 */}
              <div>
                <label style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
                  메모 <span style={{ fontWeight: 400, opacity: 0.6 }}>(선택)</span>
                </label>
                <textarea
                  autoFocus
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="오늘 이 앨범을 들으며..."
                  rows={6}
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    color: "var(--text)",
                    fontSize: 14,
                    lineHeight: 1.7,
                    outline: "none",
                    width: "100%",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* 사진 */}
              <div>
                <label style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
                  사진 <span style={{ fontWeight: 400, opacity: 0.6 }}>(선택, 1장)</span>
                </label>
                {imagePreview ? (
                  <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="첨부 사진"
                      style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }}
                    />
                    <button
                      onClick={handleRemoveImage}
                      style={{
                        position: "absolute", top: 8, right: 8,
                        backgroundColor: "rgba(0,0,0,0.6)", border: "none",
                        borderRadius: "50%", width: 28, height: 28,
                        color: "#fff", fontSize: 14, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      ✕
                    </button>
                    {imageUploading && (
                      <div style={{
                        position: "absolute", inset: 0,
                        backgroundColor: "rgba(0,0,0,0.4)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <p style={{ color: "#fff", fontSize: 12 }}>업로드 중...</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{
                      width: "100%", padding: "20px 0",
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px dashed var(--border)",
                      borderRadius: 10,
                      color: "var(--text-muted)",
                      fontSize: 12, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>📷</span>
                    사진 추가
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
              </div>
            </div>
          )}

          {/* ── Step 2: 태그 ── */}
          {!isEdit && step === 2 && (
            <div>
              <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 16, lineHeight: 1.6 }}>
                이 청음을 표현하는 태그를 골라요 <span style={{ opacity: 0.6 }}>(최대 {MAX_TAGS}개, 건너뛰어도 돼요)</span>
              </p>
              <TagSelector selected={tags} onChange={setTags} recentTags={recentTags} />
            </div>
          )}

          {error && <p style={{ color: "#e05050", fontSize: 12, marginTop: 12 }}>{error}</p>}
        </div>

        {/* 하단 버튼 */}
        <div style={{
          padding: "14px 24px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          gap: 8,
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          {step > 0 && !isEdit ? (
            <button
              onClick={() => setStep(step - 1)}
              style={{
                backgroundColor: "transparent", border: "1px solid var(--border)",
                color: "var(--text)", borderRadius: 8, padding: "9px 18px",
                fontSize: 13, cursor: "pointer",
              }}
            >
              ← 이전
            </button>
          ) : (
            <button
              onClick={doClose}
              style={{
                backgroundColor: "transparent", border: "1px solid var(--border)",
                color: "var(--text)", borderRadius: 8, padding: "9px 18px",
                fontSize: 13, cursor: "pointer",
              }}
            >
              취소
            </button>
          )}

          {!isEdit && step < 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && !canNext0}
              style={{
                backgroundColor: "var(--accent)", border: "none",
                color: "var(--bg)", borderRadius: 8, padding: "9px 22px",
                fontSize: 13, fontWeight: 600,
                cursor: step === 0 && !canNext0 ? "not-allowed" : "pointer",
                opacity: step === 0 && !canNext0 ? 0.45 : 1,
              }}
            >
              다음 →
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!canSave}
              style={{
                backgroundColor: "var(--accent)", border: "none",
                color: "var(--bg)", borderRadius: 8, padding: "9px 22px",
                fontSize: 13, fontWeight: 600,
                cursor: canSave ? "pointer" : "not-allowed",
                opacity: canSave ? 1 : 0.5,
              }}
            >
              {saving ? "저장 중..." : isEdit ? "수정 완료" : "저장"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectedAlbumCard({ album, onClear }: { album: DiaryAlbum; onClear: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px",
      backgroundColor: "var(--bg-elevated)",
      border: "1px solid var(--accent)",
      borderRadius: 10,
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 6, overflow: "hidden", flexShrink: 0, border: "1px solid var(--border)" }}>
        {album.cover_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img loading="lazy" src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>♪</span>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: "var(--text)", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{album.title}</p>
        <p style={{ color: "var(--text-muted)", fontSize: 12 }}>{album.artist}</p>
      </div>
      <button
        onClick={onClear}
        style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 16, cursor: "pointer", padding: 4, flexShrink: 0 }}
      >
        ✕
      </button>
    </div>
  );
}

const MAX_TAGS = 8;

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
}
