import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.scdn.co" },
      { protocol: "https", hostname: "*.spotifycdn.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.mzstatic.com" },
    ],
  },
  // 2026-07 IA 개편으로 탭에 흡수된 옛 독립 페이지 → 해당 탭 (2026-11 독립 페이지 삭제)
  // 쿼리(예: /reviews?albumId=X)는 목적지로 자동 전달됨. 주소 재사용 가능성 때문에 307(임시).
  async redirects() {
    return [
      { source: "/reviews", destination: "/community?tab=reviews", permanent: false },
      { source: "/members", destination: "/community?tab=members", permanent: false },
      { source: "/themes", destination: "/best?tab=collections", permanent: false },
    ];
  },
};

export default nextConfig;
