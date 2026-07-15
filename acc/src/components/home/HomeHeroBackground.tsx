"use client";

import { useState, useEffect } from "react";

export default function HomeHeroBackground({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    const handler = (e: Event) => {
      const coverUrl = (e as CustomEvent<{ coverUrl: string }>).detail.coverUrl;
      if (coverUrl) setUrl(coverUrl);
    };
    window.addEventListener("home:album-changed", handler);
    return () => window.removeEventListener("home:album-changed", handler);
  }, []);

  if (!url) return null;

  return (
    <>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={url}
          src={url}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(72px) brightness(0.22) saturate(1.4)",
            transform: "scale(1.18)",
            animation: "heroBgFadeIn 0.9s ease-out",
          }}
        />
        {/* 하단 페이드아웃 — 일반 배경으로 자연스럽게 연결 */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "30%",
            background: "linear-gradient(to bottom, transparent, var(--bg))",
          }}
        />
      </div>

      <style>{`
        @keyframes heroBgFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}
