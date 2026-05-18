"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import Spinner from "@/components/ui/Spinner";
import UserAvatar from "@/components/ui/UserAvatar";
import FilterSelect from "@/components/ui/FilterSelect";

type Announcement = {
  id: number;
  content: string;
  show_popup: boolean;
  created_at: string;
};

type Inquiry = {
  id: number;
  content: string;
  author_id: string | null;
  author_name: string | null;
  category: string | null;
  created_at: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

const cardStyle = {
  backgroundColor: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
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
  fontFamily: "inherit",
} as const;

const labelStyle = {
  color: "var(--text-muted)",
  fontSize: 11,
  fontWeight: 600 as const,
  letterSpacing: "0.06em",
  display: "block" as const,
  marginBottom: 6,
};

export default function BoardClient() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const isAdmin = profile?.role === "admin";

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // 공지 작성 폼
  const [noticeContent, setNoticeContent] = useState("");
  const [noticePopup, setNoticePopup] = useState(false);
  const [savingNotice, setSavingNotice] = useState(false);

  // 문의 폼
  const [inquiryContent, setInquiryContent] = useState("");
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryCategory, setInquiryCategory] = useState("");
  const [inquirySubSelect, setInquirySubSelect] = useState(""); // 게시판 하위 선택
  const [inquirySearchInput, setInquirySearchInput] = useState(""); // 앨범/아티스트 검색어
  const [inquirySearchResults, setInquirySearchResults] = useState<{ label: string }[]>([]);
  const [inquirySearchSelected, setInquirySearchSelected] = useState(""); // 선택된 앨범/아티스트
  const [searchLoading, setSearchLoading] = useState(false);
  const [savingInquiry, setSavingInquiry] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    const res = await fetch("/api/notices");
    if (res.ok) setAnnouncements(await res.json());
  }, []);

  const fetchInquiries = useCallback(async () => {
    if (!isAdmin || !profile) return;
    const res = await fetch(`/api/inquiries?userId=${profile.id}`);
    if (res.ok) setInquiries(await res.json());
  }, [isAdmin, profile]);

  useEffect(() => {
    Promise.all([fetchAnnouncements(), fetchInquiries()]).finally(() => setLoadingData(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const handlePostNotice = async () => {
    if (!noticeContent.trim() || !profile) return;
    setSavingNotice(true);
    const res = await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noticeContent, show_popup: noticePopup, userId: profile.id }),
    });
    setSavingNotice(false);
    if (res.ok) {
      setNoticeContent("");
      setNoticePopup(false);
      showToast("공지를 등록했어요");
      fetchAnnouncements();
    }
  };

  const handleTogglePopup = async (a: Announcement) => {
    if (!profile) return;
    const res = await fetch(`/api/notices/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ show_popup: !a.show_popup, userId: profile.id }),
    });
    if (res.ok) {
      setAnnouncements((prev) => prev.map((x) => x.id === a.id ? { ...x, show_popup: !x.show_popup } : x));
    }
  };

  const handleDeleteNotice = async (id: number) => {
    if (!profile || !confirm("공지를 삭제할까요?")) return;
    const res = await fetch(`/api/notices/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profile.id }),
    });
    if (res.ok) {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showToast("공지를 삭제했어요", "info");
    }
  };

  const handleCategoryChange = (cat: string) => {
    setInquiryCategory(cat);
    setInquirySubSelect("");
    setInquirySearchInput("");
    setInquirySearchResults([]);
    setInquirySearchSelected("");
  };

  const handleSearchInput = (value: string) => {
    setInquirySearchInput(value);
    setInquirySearchSelected("");
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!value.trim()) { setInquirySearchResults([]); return; }
    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        if (inquiryCategory === "앨범") {
          const res = await fetch(`/api/albums?search=${encodeURIComponent(value)}&limit=8`);
          const data = await res.json();
          setInquirySearchResults(
            (data.items ?? []).map((a: { title: string; artist: string }) => ({
              label: `${a.title} — ${a.artist}`,
            }))
          );
        } else if (inquiryCategory === "아티스트") {
          const res = await fetch(`/api/albums/artists?q=${encodeURIComponent(value)}`);
          const artists: string[] = await res.json();
          setInquirySearchResults(artists.map((a) => ({ label: a })));
        }
      } finally {
        setSearchLoading(false);
      }
    }, 280);
  };

  // 최종 제출 시 카테고리 문자열 조합
  const buildCategoryString = () => {
    if (!inquiryCategory) return null;
    if (inquiryCategory === "게시판") {
      return inquirySubSelect ? `게시판 > ${inquirySubSelect}` : "게시판";
    }
    if (inquiryCategory === "앨범" || inquiryCategory === "아티스트") {
      return inquirySearchSelected
        ? `${inquiryCategory} > ${inquirySearchSelected}`
        : inquiryCategory;
    }
    return inquiryCategory; // 기타
  };

  const handleSubmitInquiry = async () => {
    if (!inquiryContent.trim()) return;
    if (!profile) {
      showToast("로그인 후 문의를 남길 수 있어요", "error");
      return;
    }
    setSavingInquiry(true);
    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: inquiryContent,
        author_id: profile?.id || null,
        author_name: profile ? profile.display_name : inquiryName,
        category: buildCategoryString(),
      }),
    });
    setSavingInquiry(false);
    if (res.ok) {
      setInquiryContent("");
      setInquiryName("");
      setInquiryCategory("");
      setInquirySubSelect("");
      setInquirySearchInput("");
      setInquirySearchResults([]);
      setInquirySearchSelected("");
      showToast("문의를 남겼어요");
      if (isAdmin) fetchInquiries();
    }
  };

  if (loadingData) {
    return (
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px calc(80px + env(safe-area-inset-bottom))", display: "flex", justifyContent: "center" }}>
        <Spinner size={22} />
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px calc(80px + env(safe-area-inset-bottom))" }}>

      {/* 페이지 타이틀 */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ color: "var(--text)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.03em" }}>
          문의판
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
          공지사항 및 문의 게시판
        </p>
      </div>

      {/* ── 공지사항 ── */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>
            공지사항
          </p>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{announcements.length}건</span>
        </div>

        {/* 관리자 공지 작성 */}
        {isAdmin && (
          <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: 12 }}>
            <p style={{ ...labelStyle, marginBottom: 10 }}>새 공지 작성</p>
            <textarea
              value={noticeContent}
              onChange={(e) => setNoticeContent(e.target.value)}
              rows={3}
              placeholder="공지 내용을 입력하세요"
              style={{ ...inputStyle, resize: "vertical", marginBottom: 12 }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
              <button
                onClick={handlePostNotice}
                disabled={savingNotice || !noticeContent.trim()}
                style={{
                  backgroundColor: "var(--accent)", border: "none", color: "var(--bg)",
                  borderRadius: 6, padding: "6px 16px", fontSize: 13, fontWeight: 600,
                  cursor: savingNotice || !noticeContent.trim() ? "not-allowed" : "pointer",
                  opacity: savingNotice || !noticeContent.trim() ? 0.4 : 1,
                }}
              >
                {savingNotice ? "등록 중..." : "등록"}
              </button>
            </div>
          </div>
        )}

        {/* 공지 목록 */}
        {announcements.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "20px 0" }}>등록된 공지가 없습니다.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {announcements.map((a) => (
              <div
                key={a.id}
                style={{
                  ...cardStyle,
                  padding: "16px 20px",
                  borderLeft: `3px solid ${a.show_popup ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                <p style={{ color: "var(--text)", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {a.content}
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{formatDate(a.created_at)}</span>
                    {a.show_popup && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: "var(--bg)",
                        backgroundColor: "var(--accent)", borderRadius: 3,
                        padding: "2px 5px", letterSpacing: "0.06em",
                      }}>
                        NEW
                      </span>
                    )}
                  </div>
                  {isAdmin && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleTogglePopup(a)}
                        style={{
                          background: "none", border: "1px solid var(--border)", borderRadius: 4,
                          color: a.show_popup ? "var(--accent)" : "var(--text-muted)",
                          fontSize: 11, padding: "4px 10px", cursor: "pointer", transition: "opacity 0.15s",
                        }}
                        className="hover:opacity-70"
                      >
                        {a.show_popup ? "NEW 해제" : "NEW 설정"}
                      </button>
                      <button
                        onClick={() => handleDeleteNotice(a.id)}
                        style={{
                          background: "none", border: "1px solid var(--border)", borderRadius: 4,
                          color: "var(--text-muted)", fontSize: 11, padding: "4px 10px", cursor: "pointer", transition: "opacity 0.15s",
                        }}
                        className="hover:opacity-70"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 문의하기 ── */}
      <section>
        <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>
          문의하기
        </p>

        {/* 관리자 문의 목록 */}
        {isAdmin && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 10 }}>
              문의 목록 — {inquiries.length}건
            </p>
            {inquiries.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>접수된 문의가 없습니다.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                {inquiries.map((q) => (
                  <div key={q.id} style={{ ...cardStyle, padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{
                        color: "var(--accent)", fontSize: 11, fontWeight: 600,
                        backgroundColor: "rgba(232,213,163,0.1)", border: "1px solid rgba(232,213,163,0.2)",
                        borderRadius: 4, padding: "1px 8px",
                      }}>
                        {q.author_name ?? "익명"}
                      </span>
                      {q.category && (
                        <span style={{
                          color: "var(--text-sub)", fontSize: 11,
                          backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
                          borderRadius: 4, padding: "1px 8px",
                        }}>
                          {q.category}
                        </span>
                      )}
                      <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{formatDate(q.created_at)}</span>
                    </div>
                    <p style={{ color: "var(--text)", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {q.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div style={{ height: 1, backgroundColor: "var(--border)", marginBottom: 24 }} />
          </div>
        )}

        {/* 문의 작성 폼 */}
        <div style={{ ...cardStyle, padding: "20px 24px" }}>
          <p style={{ ...labelStyle, marginBottom: 14 }}>문의 남기기</p>
          {!profile ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 8 }}>로그인 후 문의를 남길 수 있어요</p>
              <a href="/login" style={{ color: "var(--accent)", fontSize: 13 }}>입문하기 →</a>
            </div>
          ) : (
            <>
              <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <UserAvatar avatarUrl={profile.avatar_url ?? null} size={16} />
                {profile.display_name} 으로 제출됩니다
              </p>
              {/* 카테고리 선택 (optional) */}
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>관련 항목 <span style={{ fontWeight: 400, opacity: 0.6 }}>(선택)</span></label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <FilterSelect
                    value={inquiryCategory}
                    onChange={handleCategoryChange}
                    options={[
                      { value: "", label: "없음" },
                      { value: "게시판", label: "게시판" },
                      { value: "앨범", label: "앨범" },
                      { value: "아티스트", label: "아티스트" },
                      { value: "기타", label: "기타" },
                    ]}
                    title="관련 항목"
                    style={{ ...inputStyle, width: "auto", minWidth: 130, justifyContent: "space-between", cursor: "pointer" }}
                  />

                  {/* 게시판 → 사이트 탭 선택 */}
                  {inquiryCategory === "게시판" && (
                    <FilterSelect
                      value={inquirySubSelect}
                      onChange={setInquirySubSelect}
                      options={[
                        { value: "", label: "탭 선택" },
                        { value: "홈", label: "홈" },
                        { value: "음반고", label: "음반고" },
                        { value: "도감", label: "청음감" },
                        { value: "청음집", label: "청음집" },
                        { value: "청음인", label: "청음인" },
                        { value: "청음록", label: "청음록" },
                        { value: "문의판", label: "문의판" },
                      ]}
                      title="탭 선택"
                      style={{ ...inputStyle, width: "auto", minWidth: 120, justifyContent: "space-between", cursor: "pointer" }}
                    />
                  )}

                  {/* 앨범/아티스트 → 검색 */}
                  {(inquiryCategory === "앨범" || inquiryCategory === "아티스트") && (
                    <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
                      <input
                        value={inquirySearchSelected || inquirySearchInput}
                        onChange={(e) => {
                          if (inquirySearchSelected) setInquirySearchSelected("");
                          handleSearchInput(e.target.value);
                        }}
                        placeholder={inquiryCategory === "앨범" ? "앨범명 검색..." : "아티스트명 검색..."}
                        style={{ ...inputStyle }}
                      />
                      {inquirySearchResults.length > 0 && !inquirySearchSelected && (
                        <div style={{
                          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                          backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
                          borderRadius: 6, marginTop: 2, overflow: "hidden",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                        }}>
                          {inquirySearchResults.map((r, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setInquirySearchSelected(r.label);
                                setInquirySearchInput(r.label);
                                setInquirySearchResults([]);
                              }}
                              style={{
                                display: "block", width: "100%", textAlign: "left",
                                padding: "8px 12px", background: "none", border: "none",
                                color: "var(--text)", fontSize: 13, cursor: "pointer",
                                borderBottom: i < inquirySearchResults.length - 1 ? "1px solid var(--border)" : "none",
                              }}
                              className="hover:bg-[var(--bg-elevated)]"
                            >
                              {r.label}
                            </button>
                          ))}
                        </div>
                      )}
                      {searchLoading && (
                        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 11 }}>
                          검색 중...
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <textarea
                value={inquiryContent}
                onChange={(e) => setInquiryContent(e.target.value)}
                rows={4}
                placeholder="불편한 점, 궁금한 점, 건의사항을 자유롭게 남겨주세요"
                style={{ ...inputStyle, resize: "vertical", marginBottom: 12 }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={handleSubmitInquiry}
                  disabled={savingInquiry || !inquiryContent.trim()}
                  style={{
                    backgroundColor: "var(--accent)", border: "none", color: "var(--bg)",
                    borderRadius: 6, padding: "7px 20px", fontSize: 13, fontWeight: 600,
                    cursor: savingInquiry || !inquiryContent.trim() ? "not-allowed" : "pointer",
                    opacity: savingInquiry || !inquiryContent.trim() ? 0.4 : 1,
                  }}
                >
                  {savingInquiry ? "제출 중..." : "문의하기"}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
