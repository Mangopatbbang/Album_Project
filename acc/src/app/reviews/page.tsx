import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "@/components/layout/Header";
import ReviewsClient from "./ReviewsClient";

export const metadata: Metadata = {
  title: "소감첩",
  description: "아차청음사 멤버들의 한줄 소감 모음",
};

export default function ReviewsPage() {
  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <Header />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.03em" }}>소감첩</p>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>청음사 멤버들의 한줄 소감 모음</p>
        </div>
        <Suspense>
          <ReviewsClient />
        </Suspense>
      </main>
    </div>
  );
}
