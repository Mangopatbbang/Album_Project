"use client";

import { useState } from "react";
import { DiaryEntry } from "@/types/diary";

type Props = {
  entry: DiaryEntry;
  onEdit: () => void;
  onDeleteRequest: () => void;
  isSample?: boolean;
};

const NOTE_LIMIT = 160;

type TagStyle = { icon: string; bg: string; border: string; text: string };

const TAG_PRESETS: Record<string, TagStyle> = {
  // 장소
  "카페":       { icon: "☕", bg: "rgba(155,105,60,0.12)",  border: "rgba(155,105,60,0.32)",  text: "#B8845A" },
  "집":         { icon: "🏠", bg: "rgba(115,155,115,0.12)", border: "rgba(115,155,115,0.32)", text: "#6EA87A" },
  "방":         { icon: "🛋️", bg: "rgba(140,120,100,0.12)", border: "rgba(140,120,100,0.32)", text: "#9E8870" },
  "도서관":     { icon: "📚", bg: "rgba(100,130,170,0.12)", border: "rgba(100,130,170,0.32)", text: "#7090C0" },
  "지하철":     { icon: "🚇", bg: "rgba(80,120,180,0.12)",  border: "rgba(80,120,180,0.32)",  text: "#6090C8" },
  "버스":       { icon: "🚌", bg: "rgba(80,150,130,0.12)",  border: "rgba(80,150,130,0.32)",  text: "#50A090" },
  "공원":       { icon: "🌳", bg: "rgba(85,145,85,0.12)",   border: "rgba(85,145,85,0.32)",   text: "#5A9E5A" },
  "헬스장":     { icon: "🏋️", bg: "rgba(180,90,90,0.12)",   border: "rgba(180,90,90,0.32)",   text: "#C06060" },
  "사무실":     { icon: "💼", bg: "rgba(110,120,140,0.12)", border: "rgba(110,120,140,0.32)", text: "#7880A0" },
  "차 안":      { icon: "🚗", bg: "rgba(90,140,180,0.12)",  border: "rgba(90,140,180,0.32)",  text: "#5A9EC8" },
  "학교":       { icon: "🎓", bg: "rgba(130,100,180,0.12)", border: "rgba(130,100,180,0.32)", text: "#9070C8" },
  "야외":       { icon: "🌤️", bg: "rgba(100,170,150,0.12)", border: "rgba(100,170,150,0.32)", text: "#60B09A" },

  // 시간대
  "아침":       { icon: "🌅", bg: "rgba(210,150,80,0.12)",  border: "rgba(210,150,80,0.32)",  text: "#D09040" },
  "오전":       { icon: "🌤️", bg: "rgba(190,160,80,0.12)",  border: "rgba(190,160,80,0.32)",  text: "#C0A840" },
  "점심":       { icon: "☀️", bg: "rgba(210,170,60,0.12)",  border: "rgba(210,170,60,0.32)",  text: "#C8A830" },
  "오후":       { icon: "🌇", bg: "rgba(200,140,80,0.12)",  border: "rgba(200,140,80,0.32)",  text: "#C89050" },
  "저녁":       { icon: "🌆", bg: "rgba(190,110,70,0.12)",  border: "rgba(190,110,70,0.32)",  text: "#C07040" },
  "밤":         { icon: "🌃", bg: "rgba(80,90,150,0.12)",   border: "rgba(80,90,150,0.32)",   text: "#6070B0" },
  "심야":       { icon: "🌙", bg: "rgba(100,90,180,0.12)",  border: "rgba(100,90,180,0.32)",  text: "#7868C8" },
  "새벽":       { icon: "🌌", bg: "rgba(60,70,140,0.12)",   border: "rgba(60,70,140,0.32)",   text: "#5060A8" },
  "퇴근 후":    { icon: "🌆", bg: "rgba(185,120,70,0.12)",  border: "rgba(185,120,70,0.32)",  text: "#C08045" },
  "출근 전":    { icon: "🌅", bg: "rgba(200,150,70,0.12)",  border: "rgba(200,150,70,0.32)",  text: "#C09840" },

  // 이동/활동
  "출퇴근":     { icon: "🚇", bg: "rgba(70,130,185,0.12)",  border: "rgba(70,130,185,0.32)",  text: "#4888C8" },
  "산책":       { icon: "🌿", bg: "rgba(90,155,105,0.12)",  border: "rgba(90,155,105,0.32)",  text: "#5A9E6A" },
  "드라이브":   { icon: "🛣️", bg: "rgba(80,150,170,0.12)",  border: "rgba(80,150,170,0.32)",  text: "#50A0B8" },
  "여행":       { icon: "✈️", bg: "rgba(60,140,200,0.12)",  border: "rgba(60,140,200,0.32)",  text: "#3A98D8" },
  "운동":       { icon: "🏃", bg: "rgba(180,80,80,0.12)",   border: "rgba(180,80,80,0.32)",   text: "#C05858" },
  "조깅":       { icon: "🏃", bg: "rgba(170,90,70,0.12)",   border: "rgba(170,90,70,0.32)",   text: "#B86050" },

  // 기기
  "이어폰":     { icon: "🎧", bg: "rgba(110,130,185,0.12)", border: "rgba(110,130,185,0.32)", text: "#7888C8" },
  "헤드폰":     { icon: "🎧", bg: "rgba(100,120,175,0.12)", border: "rgba(100,120,175,0.32)", text: "#7080C0" },
  "에어팟":     { icon: "🎧", bg: "rgba(120,140,190,0.12)", border: "rgba(120,140,190,0.32)", text: "#8090CC" },
  "스피커":     { icon: "🔊", bg: "rgba(155,120,75,0.12)",  border: "rgba(155,120,75,0.32)",  text: "#A88050" },
  "블루투스":   { icon: "📡", bg: "rgba(80,130,200,0.12)",  border: "rgba(80,130,200,0.32)",  text: "#5088D8" },

  // 감정/분위기
  "차분한":     { icon: "🌊", bg: "rgba(70,155,160,0.12)",  border: "rgba(70,155,160,0.32)",  text: "#48A0A8" },
  "신남":       { icon: "⚡", bg: "rgba(210,170,50,0.12)",  border: "rgba(210,170,50,0.32)",  text: "#C8A020" },
  "우울":       { icon: "🌧️", bg: "rgba(90,100,140,0.12)",  border: "rgba(90,100,140,0.32)",  text: "#6070A0" },
  "설레는":     { icon: "💫", bg: "rgba(180,130,200,0.12)", border: "rgba(180,130,200,0.32)", text: "#C090D8" },
  "피곤한":     { icon: "😪", bg: "rgba(120,110,100,0.12)", border: "rgba(120,110,100,0.32)", text: "#887868" },
  "행복한":     { icon: "✨", bg: "rgba(210,175,80,0.12)",  border: "rgba(210,175,80,0.32)",  text: "#C8A840" },
  "그리운":     { icon: "🕯️", bg: "rgba(160,130,90,0.12)",  border: "rgba(160,130,90,0.32)",  text: "#A88858" },
  "몽환적":     { icon: "🌸", bg: "rgba(185,130,165,0.12)", border: "rgba(185,130,165,0.32)", text: "#C090B0" },
  "쓸쓸한":     { icon: "🍂", bg: "rgba(155,110,70,0.12)",  border: "rgba(155,110,70,0.32)",  text: "#A87848" },
  "편안한":     { icon: "🛋️", bg: "rgba(120,165,130,0.12)", border: "rgba(120,165,130,0.32)", text: "#78A888" },

  // 상황/상태
  "혼자":       { icon: "🕯️", bg: "rgba(155,135,90,0.12)",  border: "rgba(155,135,90,0.32)",  text: "#A89060" },
  "집중":       { icon: "🎯", bg: "rgba(180,75,75,0.12)",   border: "rgba(180,75,75,0.32)",   text: "#C05050" },
  "반복 청취":  { icon: "🔁", bg: "rgba(196,170,124,0.12)", border: "rgba(196,170,124,0.32)", text: "#C4AA7C" },
  "처음 듣기":  { icon: "🆕", bg: "rgba(60,180,160,0.12)",  border: "rgba(60,180,160,0.32)",  text: "#38B8A0" },
  "재청취":     { icon: "🔄", bg: "rgba(196,170,124,0.12)", border: "rgba(196,170,124,0.32)", text: "#C4AA7C" },
  "작업 중":    { icon: "💻", bg: "rgba(80,140,180,0.12)",  border: "rgba(80,140,180,0.32)",  text: "#5090C0" },
  "공부 중":    { icon: "📖", bg: "rgba(100,120,180,0.12)", border: "rgba(100,120,180,0.32)", text: "#6880C8" },
  "요리 중":    { icon: "🍳", bg: "rgba(190,120,60,0.12)",  border: "rgba(190,120,60,0.32)",  text: "#C07838" },
  "청소 중":    { icon: "🧹", bg: "rgba(100,170,160,0.12)", border: "rgba(100,170,160,0.32)", text: "#58A89E" },
  "누워서":     { icon: "🛏️", bg: "rgba(120,100,160,0.12)", border: "rgba(120,100,160,0.32)", text: "#8068B0" },
  "술 한잔":    { icon: "🍷", bg: "rgba(155,65,85,0.12)",   border: "rgba(155,65,85,0.32)",   text: "#B04058" },

  // 날씨
  "맑은날":     { icon: "☀️", bg: "rgba(210,175,55,0.12)",  border: "rgba(210,175,55,0.32)",  text: "#C8A828" },
  "비오는날":   { icon: "🌧️", bg: "rgba(80,110,155,0.12)",  border: "rgba(80,110,155,0.32)",  text: "#5878A8" },
  "흐린날":     { icon: "☁️", bg: "rgba(115,125,140,0.12)", border: "rgba(115,125,140,0.32)", text: "#808898" },
  "눈오는날":   { icon: "❄️", bg: "rgba(160,185,210,0.12)", border: "rgba(160,185,210,0.32)", text: "#90B0D0" },
  "바람부는날": { icon: "🍃", bg: "rgba(90,155,130,0.12)",  border: "rgba(90,155,130,0.32)",  text: "#58A080" },
};

const FALLBACK_COLORS: Omit<TagStyle, "icon">[] = [
  // 따뜻한 황금 — 포근함, 향수, 오래된 것
  { bg: "rgba(196,170,100,0.1)", border: "rgba(196,170,100,0.28)", text: "#C4AA64" },
  // 차가운 청회색 — 고요함, 집중, 이른 아침
  { bg: "rgba(100,120,165,0.1)", border: "rgba(100,120,165,0.28)", text: "#7088B8" },
  // 세이지 그린 — 자연, 산책, 맑은 공기
  { bg: "rgba(100,150,115,0.1)", border: "rgba(100,150,115,0.28)", text: "#64A078" },
  // 먼지 낀 로즈 — 감상, 부드러운 슬픔, 밤
  { bg: "rgba(175,115,115,0.1)", border: "rgba(175,115,115,0.28)", text: "#C07878" },
  // 테라코타 — 흙냄새, 오후, 따뜻한 실내
  { bg: "rgba(185,120,80,0.1)",  border: "rgba(185,120,80,0.28)",  text: "#C08050" },
  // 라벤더 — 몽환, 피로, 잠들기 전
  { bg: "rgba(145,120,185,0.1)", border: "rgba(145,120,185,0.28)", text: "#9878C8" },
  // 딥 틸 — 깊은 물, 고독, 몰입
  { bg: "rgba(60,148,150,0.1)",  border: "rgba(60,148,150,0.28)",  text: "#3A9898" },
  // 앰버 — 늦은 오후, 카페 창가, 따스한 빛
  { bg: "rgba(200,150,60,0.1)",  border: "rgba(200,150,60,0.28)",  text: "#C89830" },
  // 슬레이트 퍼플 — 사색, 심야, 혼자인 시간
  { bg: "rgba(120,95,170,0.1)",  border: "rgba(120,95,170,0.28)",  text: "#8060B8" },
  // 모스 그린 — 빈티지, 낡은 LP, 오래된 기억
  { bg: "rgba(110,135,80,0.1)",  border: "rgba(110,135,80,0.28)",  text: "#789050" },
  // 아이스 블루 — 겨울, 투명함, 정적
  { bg: "rgba(90,155,185,0.1)",  border: "rgba(90,155,185,0.28)",  text: "#58A0C8" },
  // 버건디 — 와인, 깊은 밤, 감정의 무게
  { bg: "rgba(155,65,80,0.1)",   border: "rgba(155,65,80,0.28)",   text: "#A84050" },
];

function getTagStyle(tag: string): TagStyle & { isPreset: boolean } {
  if (TAG_PRESETS[tag]) return { ...TAG_PRESETS[tag], isPreset: true };
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0xffff;
  const c = FALLBACK_COLORS[h % FALLBACK_COLORS.length];
  return { icon: "", ...c, isPreset: false };
}

export default function DiaryEntryCard({ entry, onEdit, onDeleteRequest, isSample }: Props) {
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [coverLoaded, setCoverLoaded] = useState(false);

  const note = entry.note ?? "";
  const isLong = note.length > NOTE_LIMIT;
  const displayNote = noteExpanded || !isLong ? note : note.slice(0, NOTE_LIMIT) + "...";

  return (
    <>
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-light)",
          borderRadius: 4,
          padding: "14px 16px",
          boxShadow: "1px 2px 8px rgba(var(--diary-ink-rgb), 0.08), 0 1px 1px rgba(var(--diary-ink-rgb), 0.04)",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.borderColor = "var(--border)";
          el.style.boxShadow = "2px 4px 14px rgba(var(--diary-ink-rgb), 0.12), 0 1px 1px rgba(var(--diary-ink-rgb), 0.06)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.borderColor = "var(--border-light)";
          el.style.boxShadow = "1px 2px 8px rgba(var(--diary-ink-rgb), 0.08), 0 1px 1px rgba(var(--diary-ink-rgb), 0.04)";
        }}
      >
        {/* 앨범 + 액션 */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {/* 커버 */}
          <div style={{
            width: 52, height: 52, borderRadius: 4,
            overflow: "hidden", flexShrink: 0,
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-light)",
          }}>
            {entry.albums?.cover_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img
                  src={entry.albums.cover_url}
                  alt={entry.albums.title ?? ""}
                  onLoad={() => setCoverLoaded(true)}
                  style={{
                    width: "100%", height: "100%", objectFit: "cover",
                    opacity: coverLoaded ? 1 : 0,
                    filter: coverLoaded ? "none" : "blur(8px)",
                    transition: "opacity 0.3s ease, filter 0.3s ease",
                  }}
                />
              : <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "var(--text-muted)", opacity: 0.4 }}>♪</span>
            }
          </div>

          {/* 앨범 정보 */}
          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <p style={{
              color: "var(--text)", fontSize: 14, fontWeight: 700,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              fontFamily: "var(--font-playfair, serif)", letterSpacing: "-0.01em",
            }}>
              {entry.albums?.title}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {entry.albums?.artist}
            </p>
            {entry.relistened && (
              <span style={{
                display: "inline-block", marginTop: 5,
                fontSize: 9, fontWeight: 700,
                color: "var(--accent)",
                backgroundColor: "rgba(var(--accent-rgb), 0.1)",
                border: "1px solid rgba(var(--accent-rgb), 0.25)",
                borderRadius: 4, padding: "2px 6px",
                letterSpacing: "0.04em",
              }}>
                재청취
              </span>
            )}
          </div>

          {!isSample && (
            <div style={{ display: "flex", gap: 1, flexShrink: 0, paddingTop: 2 }}>
              <button
                onClick={onEdit}
                style={{
                  background: "none", border: "none",
                  color: "var(--text-sub)", fontSize: 11,
                  cursor: "pointer", padding: "2px 6px",
                  transition: "color 0.12s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-sub)")}
              >
                편집
              </button>
              <button
                onClick={onDeleteRequest}
                style={{
                  background: "none", border: "none",
                  color: "var(--text-sub)", fontSize: 11,
                  cursor: "pointer", padding: "2px 6px",
                  transition: "color 0.12s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-sub)")}
              >
                삭제
              </button>
            </div>
          )}
        </div>

        {/* 사진 */}
        {entry.image_url && (
          <button
            onClick={() => setImageExpanded(true)}
            style={{
              display: "block", width: "100%", padding: 0, border: "none",
              background: "none", cursor: "pointer",
              marginTop: 12, borderRadius: 8, overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.image_url}
              alt="청음 사진"
              style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block", borderRadius: 8 }}
            />
          </button>
        )}

        {/* 메모 */}
        {note && (
          <div style={{
            marginTop: 12,
            paddingLeft: 12,
            borderLeft: "2px solid rgba(var(--accent-rgb), 0.45)",
          }}>
            <p style={{
              color: "var(--text-muted)", fontSize: 13, lineHeight: 1.9,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
              letterSpacing: "-0.005em",
              fontStyle: "italic",
              fontFamily: "var(--font-lora, Georgia, serif)",
            }}>
              {displayNote}
            </p>
            {isLong && (
              <button
                onClick={() => setNoteExpanded((p) => !p)}
                style={{
                  background: "none", border: "none",
                  color: "var(--text-muted)", fontSize: 11,
                  cursor: "pointer", padding: "4px 0 0 0",
                }}
              >
                {noteExpanded ? "접기 ↑" : "더 보기 ↓"}
              </button>
            )}
          </div>
        )}

        {/* 태그 */}
        {entry.context && entry.context.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
            {entry.context.map((tag) => {
              const s = getTagStyle(tag);
              return (
                <span key={tag} style={{
                  display: "inline-flex", alignItems: "center", gap: s.isPreset ? 4 : 0,
                  padding: "3px 9px", borderRadius: 20,
                  backgroundColor: s.bg,
                  border: `1px solid ${s.border}`,
                  color: s.text,
                  fontSize: 10, letterSpacing: "0.02em",
                }}>
                  {s.isPreset && (
                    <span style={{ fontSize: 10, lineHeight: 1 }}>{s.icon}</span>
                  )}
                  #{tag}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* 사진 확대 */}
      {imageExpanded && (
        <div
          onClick={() => setImageExpanded(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 500,
            backgroundColor: "rgba(0,0,0,0.95)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.image_url!}
            alt="확대 사진"
            style={{ maxWidth: "100%", maxHeight: "92dvh", objectFit: "contain", borderRadius: 6 }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
