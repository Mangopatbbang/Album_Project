"use client";

import { useMemo, useState } from "react";
import { DiaryEntry } from "@/types/diary";
import DiaryEntryCard from "@/components/diary/DiaryEntryCard";
import DeleteConfirmModal from "@/components/diary/DeleteConfirmModal";

type AlbumGroup = {
  albumId: string;
  title: string;
  artist: string;
  cover_url: string | null;
  count: number;
  entries: DiaryEntry[];
};

type Props = {
  entries: DiaryEntry[];
  onEdit: (entry: DiaryEntry) => void;
  onDelete: (id: string) => Promise<void>;
  isSample?: boolean;
};

export default function AlbumsTab({ entries, onEdit, onDelete, isSample }: Props) {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const albumGroups = useMemo(() => {
    const map = new Map<string, AlbumGroup>();
    for (const e of entries) {
      if (!e.albums) continue;
      const ex = map.get(e.albums.id);
      if (ex) {
        ex.count++;
        ex.entries.push(e);
      } else {
        map.set(e.albums.id, {
          albumId: e.albums.id,
          title: e.albums.title,
          artist: e.albums.artist,
          cover_url: e.albums.cover_url,
          count: 1,
          entries: [e],
        });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [entries]);

  const selectedGroup = selectedAlbumId
    ? albumGroups.find((g) => g.albumId === selectedAlbumId) ?? null
    : null;

  if (entries.length === 0) {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 36, marginBottom: 20, opacity: 0.3, color: "var(--accent)" }}>♪</p>
        <p style={{
          color: "var(--text)", fontSize: 17, fontWeight: 700,
          letterSpacing: "-0.03em", marginBottom: 10,
          fontFamily: "var(--font-playfair, serif)",
        }}>
          기록된 앨범이 없어요
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.8 }}>
          청음일기를 남기면 앨범별로 모아볼 수 있어요.
        </p>
      </div>
    );
  }

  // 앨범 상세 뷰
  if (selectedGroup) {
    return (
      <>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px calc(144px + env(safe-area-inset-bottom))" }}>
          <button
            onClick={() => setSelectedAlbumId(null)}
            style={{
              background: "none", border: "none",
              color: "var(--text-muted)", fontSize: 13, cursor: "pointer",
              padding: "0 0 20px 0", display: "flex", alignItems: "center", gap: 5,
            }}
          >
            ← 앨범 목록
          </button>

          <div style={{ display: "flex", gap: 14, marginBottom: 28, alignItems: "center" }}>
            <div style={{
              width: 60, height: 60, borderRadius: 4,
              overflow: "hidden", flexShrink: 0,
              border: "1px solid var(--border-light)", backgroundColor: "var(--bg-elevated)",
              boxShadow: "1px 2px 6px rgba(var(--diary-ink-rgb,20,14,6), 0.08)",
            }}>
              {selectedGroup.cover_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img loading="lazy" src={selectedGroup.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 22 }}>♪</span>
              }
            </div>
            <div>
              <p style={{
                color: "var(--text)", fontSize: 15, fontWeight: 700,
                fontFamily: "var(--font-playfair, serif)", letterSpacing: "-0.02em",
              }}>
                {selectedGroup.title}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>{selectedGroup.artist}</p>
              <p style={{ color: "var(--accent)", fontSize: 11, fontWeight: 600, marginTop: 4 }}>
                {selectedGroup.count}회 청취
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {selectedGroup.entries.map((entry) => (
              <DiaryEntryCard
                key={entry.id}
                entry={entry}
                onEdit={() => onEdit(entry)}
                onDeleteRequest={() => setDeleteConfirm(entry.id)}
                isSample={isSample}
              />
            ))}
          </div>
        </div>

        {deleteConfirm && (
          <DeleteConfirmModal
            onConfirm={async () => {
              await onDelete(deleteConfirm);
              setDeleteConfirm(null);
            }}
            onCancel={() => setDeleteConfirm(null)}
          />
        )}
      </>
    );
  }

  // 앨범 그리드
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px calc(144px + env(safe-area-inset-bottom))" }}>
      <p style={{ color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.06em", marginBottom: 16 }}>
        {albumGroups.length}장의 앨범
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4" style={{ gap: 10 }}>
        {albumGroups.map((group, idx) => (
          <div
            key={group.albumId}
            onClick={() => setSelectedAlbumId(group.albumId)}
            className="group cursor-pointer transition-all active:scale-[0.96]"
            style={{ animation: `feedItemIn 0.22s ease-out ${idx * 0.05}s both` }}
          >
            <div
              className="overflow-hidden"
              style={{
                position: "relative",
                aspectRatio: "1/1",
                borderRadius: 3,
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-light)",
                marginBottom: 6,
                boxShadow: "1px 2px 6px rgba(var(--diary-ink-rgb,20,14,6), 0.08)",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "2px 4px 10px rgba(var(--diary-ink-rgb,20,14,6), 0.14)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-light)";
                e.currentTarget.style.boxShadow = "1px 2px 6px rgba(var(--diary-ink-rgb,20,14,6), 0.08)";
              }}
            >
              {group.cover_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img loading="lazy" src={group.cover_url} alt="" className="group-hover:scale-[1.06]" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.35s ease" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, color: "var(--text-muted)", opacity: 0.3 }}>♪</div>
              }
              {group.count > 1 && (
                <div style={{
                  position: "absolute", top: 6, right: 6,
                  backgroundColor: "rgba(28,25,23,0.85)",
                  border: "1px solid rgba(212,165,116,0.3)",
                  borderRadius: 5, padding: "2px 7px",
                  color: "var(--accent)", fontSize: 10, fontWeight: 700,
                }}>
                  ×{group.count}
                </div>
              )}
            </div>
            <p style={{
              color: "var(--text)", fontSize: 11, fontWeight: 600,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              fontFamily: "var(--font-playfair, serif)",
            }}>
              {group.title}
            </p>
            <p style={{
              color: "var(--text-muted)", fontSize: 9,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              marginTop: 2,
            }}>
              {group.artist}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
