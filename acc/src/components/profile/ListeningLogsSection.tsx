"use client";

import { useState } from "react";
import AlbumModal from "@/components/album/AlbumModal";
import { AlbumWithRatings } from "@/types";

type LogAlbum = {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
};

export type ListeningLog = {
  id: string;
  listened_at: string;
  context: string[] | null;
  note: string | null;
  albums: LogAlbum | null;
};

type Props = {
  logs: ListeningLog[];
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear().toString().slice(2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export default function ListeningLogsSection({ logs }: Props) {
  const [selected, setSelected] = useState<AlbumWithRatings | null>(null);

  const openAlbum = (a: LogAlbum) => {
    setSelected({ id: a.id, title: a.title, artist: a.artist, cover_url: a.cover_url ?? undefined, ratings: [] });
  };

  return (
    <>
      <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 14 }}>
          재청음 기록
          <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: 6 }}>총 {logs.length}회</span>
        </p>
        {(!logs || logs.length === 0) ? (
          <p style={{ color: "var(--text-muted)", fontSize: 12, opacity: 0.5, fontStyle: "italic" }}>
            아직 재청음 기록이 없어요
          </p>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(logs ?? []).map((log) => (
            <div
              key={log.id}
              onClick={() => log.albums && openAlbum(log.albums)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                cursor: log.albums ? "pointer" : "default",
              }}
              className={log.albums ? "transition-opacity hover:opacity-80" : ""}
            >
              {/* 앨범 커버 */}
              <div style={{ width: 32, height: 32, borderRadius: 4, overflow: "hidden", flexShrink: 0, backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                {log.albums?.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={log.albums.cover_url}
                    alt={log.albums.title ?? ""}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>♪</span>
                  </div>
                )}
              </div>

              {/* 제목 + 아티스트 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "var(--text)", fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {log.albums?.title ?? "—"}
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {log.albums?.artist ?? ""}
                </p>
              </div>

              {/* 날짜 */}
              <span style={{ color: "var(--text-muted)", fontSize: 11, flexShrink: 0 }}>
                {formatDate(log.listened_at)}
              </span>

              {/* context 첫 번째 태그 */}
              {log.context && log.context.length > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  backgroundColor: "rgba(var(--accent-rgb), 0.08)",
                  color: "var(--accent)",
                  border: "1px solid rgba(var(--accent-rgb), 0.25)",
                  borderRadius: 4, padding: "1px 6px",
                  flexShrink: 0, maxWidth: 80,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {log.context[0]}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {selected && <AlbumModal album={selected} onClose={() => setSelected(null)} source="profile_logs" />}
    </>
  );
}
