import Link from "next/link";
import Header from "@/components/layout/Header";
import {
  fetchAllAlbumsWithRatings,
  getEightClub,
  getUnanimous,
  getControversial,
  THEMES,
  AlbumStat,
} from "@/lib/stats";
import { scoreColor } from "@/lib/score";

function AlbumRow({ album, idx }: { album: AlbumStat; idx: number }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 12px", borderRadius: 8,
      backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
    }}>
      <span style={{ color: "var(--text-muted)", fontSize: 11, width: 20, textAlign: "right", flexShrink: 0 }}>
        {idx + 1}
      </span>
      <div style={{
        width: 40, height: 40, borderRadius: 6, overflow: "hidden", flexShrink: 0,
        backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
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
        <p style={{ color: "var(--text-muted)", fontSize: 12 }}>{album.artist}{album.year ? ` · ${album.year}` : ""}</p>
      </div>
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <p style={{ color: scoreColor(album.avg), fontWeight: 700, fontSize: 15 }}>
          {album.avg.toFixed(1)}
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{album.count}명</p>
      </div>
    </div>
  );
}

export default async function ThemesPage() {
  const albums = await fetchAllAlbumsWithRatings();
  const eightClub = getEightClub(albums);
  const unanimous = getUnanimous(albums);
  const controversial = getControversial(albums).slice(0, 30);

  const themeData: Record<string, AlbumStat[]> = {
    eight_club: eightClub,
    unanimous,
    controversial,
  };

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <Header />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 96px" }}>
        <div style={{ marginBottom: 40 }}>
          <Link
            href="/"
            style={{ color: "var(--text-muted)", fontSize: 12, textDecoration: "none", display: "inline-block", marginBottom: 16 }}
            className="hover:text-[var(--accent)] transition-colors"
          >
            ← 홈으로
          </Link>
          <h1 style={{ color: "var(--text)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.03em" }}>
            테마별 선곡집
          </h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
          {THEMES.map((theme) => {
            const list = themeData[theme.id] ?? [];
            return (
              <div key={theme.id}>
                <div style={{
                  display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16,
                  paddingBottom: 12, borderBottom: "1px solid var(--border)",
                }}>
                  <span style={{ fontSize: 20 }}>{theme.emoji}</span>
                  <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em" }}>
                    {theme.name}
                  </h2>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{list.length}장</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: "auto" }}>
                    {theme.description}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {list.map((album, idx) => (
                    <AlbumRow key={album.id} album={album} idx={idx} />
                  ))}
                  {list.length === 0 && (
                    <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "16px 0" }}>
                      인연 닿는 음반이 없습니다.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
