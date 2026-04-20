import { Suspense } from "react";
import ReviewsClient from "./ReviewsClient";

export default function ReviewsPage() {
  return (
    <Suspense>
      <ReviewsClient />
    </Suspense>
  );
}
