import Link from "next/link";
import Header from "@/components/layout/Header";
import { fetchAllAlbumsWithRatings, getBestByYear, getBestByGenre, AlbumStat } from "@/lib/stats";
import { scoreColor } from "@/lib/score";

export default async function BestPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = "year" } = await searchParams;
  const albums = await fetchAllAlbumsWithRatings();
  const byYear = getBestByYear(albums);
  const byGenre = getBestByGenre(albums);

  const sections: [string, AlbumStat[]][] =
    view === "genre" ? [...byGenre.entries()] : [...byYear.entries()];

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <Header />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 96px" }}>
        {/* 헤더 */}
        <div style={{ marginBottom: 40 }}>
          <Link
            href="/"
            style={{ color: "var(--text-muted)", fontSize: 12, textDecoration: "none", display: "inline-block", marginBottom: 16 }}
            className="hover:text-[var(--accent)] transition-colors"
          >
            ← 홈으로
          </Link>
          <h1 style={{ color: "var(--text)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.03em", marginBottom: 20 }}>
            명반
          </h1>
          {/* 탭 */}
          <div style={{ display: "flex", gap: 8 }}>
            {(["year", "genre"] as const).map((v) => (
              <Link
                key={v}
                href={`/best?view=${v}`}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: "none",
                  backgroundColor: view === v ? "var(--accent)" : "var(--bg-elevated)",
                  color: view === v ? "var(--bg)" : "var(--text-sub)",
                  border: `1px solid ${view === v ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                {v === "year" ? "연도별" : "장르별"}
              </Link>
            ))}
          </div>
        </div>

        {/* 섹션 목록 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
          {sections.map(([label, list]) => (
            <div key={label}>
              <div style={{
                display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
                paddingBottom: 12, borderBottom: "1px solid var(--border)",
              }}>
                <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em" }}>
                  {label}
                </h2>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{list.length}장</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {list.map((album, idx) => (
                  <div key={album.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", borderRadius: 8,
                    backgroundColor: idx === 0 ? "var(--bg-elevated)" : "transparent",
                    border: idx === 0 ? "1px solid var(--border)" : "1px solid transparent",
                  }}>
                    <span style={{ color: "var(--text-muted)", fontSize: 11, width: 20, textAlign: "right", flexShrink: 0 }}>
                      {idx + 1}
                    </span>
                    <div style={{
                      width: 40, height: 40, borderRadius: 6, overflow: "hidden", flexShrink: 0,
                      backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
                    }}>
                      {album.cover_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 16, color: "var(--text-muted)" }}>♪</span>
                          </div>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "var(--text)", fontWeight: 500, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {album.title}
                      </p>
                      <p style={{ color: "var(--text-muted)", fontSize: 12 }}>{album.artist}</p>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <p style={{ color: scoreColor(album.avg), fontWeight: 700, fontSize: 16 }}>
                        {album.avg.toFixed(1)}
                      </p>
                      <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{album.count}명</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
