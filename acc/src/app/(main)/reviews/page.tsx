import type { Metadata } from "next";
import { Suspense } from "react";
import PageHeader from "@/components/layout/PageHeader";
import Spinner from "@/components/ui/Spinner";
import ReviewsClient from "./ReviewsClient";

export const metadata: Metadata = {
  title: "청음평",
  description: "아차청음사 멤버들의 한줄 소감 모음",
};

export default function ReviewsPage() {
  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px calc(80px + env(safe-area-inset-bottom))" }}>
        <PageHeader title="청음평" subtitle="청음사 멤버들의 한줄 소감 모음" />
        <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><Spinner size={22} /></div>}>
          <ReviewsClient />
        </Suspense>
      </main>
    </div>
  );
}
