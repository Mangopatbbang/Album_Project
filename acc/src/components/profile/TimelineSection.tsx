"use client";

import { useEffect, useRef, useState } from "react";
import { scoreColor } from "@/lib/score";
import type { TimelineEvent } from "@/app/api/profile/[userId]/timeline/route";
import AlbumModal from "@/components/album/AlbumModal";
import type { AlbumWithRatings } from "@/types";
import Spinner from "@/components/ui/Spinner";
import { useAuth } from "@/context/AuthContext";

type GroupedYear = {
  year: string;
  months: {
    month: string;
    label: string;
    events: TimelineEvent[];
  }[];
};

function groupEvents(events: TimelineEvent[]): GroupedYear[] {
  const map = new Map<string, Map<string, TimelineEvent[]>>();
  for (const e of events) {
    const year = e.date.slice(0, 4);
    const month = e.date.slice(0, 7);
    if (!map.has(year)) map.set(year, new Map());
    const yearMap = map.get(year)!;
    if (!yearMap.has(month)) yearMap.set(month, []);
    yearMap.get(month)!.push(e);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, monthMap]) => ({
      year,
      months: [...monthMap.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([month, evs]) => ({
          month,
          label: `${parseInt(month.slice(5, 7))}월`,
          events: evs,
        })),
    }));
}

const MONTH_NAMES = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

export default function TimelineSection({ userId }: { userId: string }) {
  const { profile } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<AlbumWithRatings | null>(null);
  const loadedRef = useRef(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // admin이 본인 프로필을 볼 때만 표시
  const isVisible = profile?.role === "admin" && profile?.id === userId;
  if (!isVisible) return null;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadedRef.current) {
          loadedRef.current = true;
          fetch(`/api/profile/${userId}/timeline`)
            .then((r) => r.json())
            .then((d) => setEvents(d.events ?? []))
            .catch(() => setError(true));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [userId]);

  const grouped = events ? groupEvents(events) : [];

  return (
    <div ref={sectionRef}>
      <div style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "20px 24px",
      }}>
        <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 20 }}>
          청음 연대기
        </p>

        {!events && !error && (
          <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
            <Spinner />
          </div>
        )}

        {error && (
          <p style={{ color: "var(--text-muted)", fontSize: 12 }}>불러오지 못했어요</p>
        )}

        {events && events.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: 12, opacity: 0.5, fontStyle: "italic" }}>
            청음 기록이 없어요
          </p>
        )}

        {grouped.map((yearGroup) => (
          <div key={yearGroup.year} style={{ marginBottom: 28 }}>
            {/* 연도 헤더 */}
            <p style={{
              color: "var(--text)", fontSize: 16, fontWeight: 800,
              letterSpacing: "-0.03em", marginBottom: 14,
              fontFamily: "var(--font-playfair, serif)",
            }}>
              {yearGroup.year}
            </p>

            {yearGroup.months.map((monthGroup) => (
              <div key={monthGroup.month} style={{ marginBottom: 16 }}>
                {/* 월 헤더 */}
                <p style={{
                  color: "var(--text-muted)", fontSize: 10, fontWeight: 700,
                  letterSpacing: "0.08em", marginBottom: 8,
                }}>
                  {MONTH_NAMES[parseInt(monthGroup.month.slice(5, 7)) - 1]}
                </p>

                {/* 이벤트 목록 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {monthGroup.events.map((event, i) => (
                    <button
                      key={`${event.type}-${event.album.id}-${event.date}-${i}`}
                      onClick={() => setSelected({
                        id: event.album.id,
                        title: event.album.title,
                        artist: event.album.artist,
                        cover_url: event.album.cover_url ?? undefined,
                        genre: event.album.genre ?? undefined,
                        ratings: [],
                      })}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        background: "none", border: "none", cursor: "pointer",
                        padding: "5px 0", textAlign: "left",
                        borderBottom: "1px solid var(--border)",
                        transition: "opacity 0.12s",
                      }}
                      className="hover:opacity-70"
                    >
                      {/* 커버 */}
                      <div style={{
                        flexShrink: 0, width: 36, height: 36,
                        borderRadius: 4, overflow: "hidden",
                        backgroundColor: "var(--bg-elevated)",
                      }}>
                        {event.album.cover_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={event.album.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>♪</div>
                        }
                      </div>

                      {/* 텍스트 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          color: "var(--text)", fontSize: 12, fontWeight: 500,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {event.album.title}
                        </p>
                        <p style={{
                          color: "var(--text-muted)", fontSize: 11,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          marginTop: 1,
                        }}>
                          {event.album.artist}
                          {event.review && (
                            <span style={{ fontStyle: "italic" }}> · "{event.review}"</span>
                          )}
                        </p>
                      </div>

                      {/* 우측: 점수 또는 일기 아이콘 */}
                      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
                        {event.type === "rating" && event.score != null && (
                          <span style={{
                            fontSize: 13, fontWeight: 700,
                            color: scoreColor(event.score),
                          }}>
                            {event.score}
                          </span>
                        )}
                        {event.type === "diary" && (
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>✎</span>
                        )}
                        <span style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.6 }}>
                          {event.date.slice(5).replace("-", "/")}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {selected && (
        <AlbumModal
          album={selected}
          onClose={() => setSelected(null)}
          source="timeline"
        />
      )}
    </div>
  );
}
