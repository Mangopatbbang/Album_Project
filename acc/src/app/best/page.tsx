import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import { fetchAllAlbumsWithRatings, getBestByYear, getBestByGenre, getBestByArtist, AlbumStat } from "@/lib/stats";
import BestPageClient from "./BestPageClient";

export const metadata: Metadata = {
  title: "도감",
  description: "아차청음사 음반 도감 — 연도별·장르별·아티스트별",
};

export default async function BestPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = "year" } = await searchParams;
  const albums = await fetchAllAlbumsWithRatings();
  const byYear = getBestByYear(albums);
  const byGenre = getBestByGenre(albums);
  const byArtist = getBestByArtist(albums);

  const sections: [string, AlbumStat[]][] =
    view === "genre" ? [...byGenre.entries()] :
    view === "artist" ? [...byArtist.entries()] :
    [...byYear.entries()];

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <Header />
      <main style={{ maxWidth: 1100, margin: "0 auto" }} className="px-4 sm:px-6 pt-8 sm:pt-10 pb-20">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.03em" }}>도감</p>
          <div style={{ display: "flex", gap: 6 }}>
            {(["year", "genre", "artist"] as const).map((v) => (
              <Link
                key={v}
                href={`/best?view=${v}`}
                style={{
                  padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                  textDecoration: "none",
                  backgroundColor: view === v ? "var(--accent)" : "var(--bg-elevated)",
                  color: view === v ? "var(--bg)" : "var(--text-sub)",
                  border: `1px solid ${view === v ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                {v === "year" ? "연도별" : v === "genre" ? "장르별" : "아티스트별"}
              </Link>
            ))}
          </div>
        </div>

        <BestPageClient sections={sections} view={view} />
      </main>
    </div>
  );
}
