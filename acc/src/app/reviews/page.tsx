import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "@/components/layout/Header";
import PageHeader from "@/components/layout/PageHeader";
import ReviewsClient from "./ReviewsClient";

export const metadata: Metadata = {
  title: "청음평",
  description: "아차청음사 멤버들의 한줄 소감 모음",
};

export default function ReviewsPage() {
  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <Header />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px calc(80px + env(safe-area-inset-bottom))" }}>
        <PageHeader title="청음평" subtitle="청음사 멤버들의 한줄 소감 모음" />
        <Suspense>
          <ReviewsClient />
        </Suspense>
      </main>
    </div>
  );
}
