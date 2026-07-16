import { Suspense } from "react";
import CallbackHandler from "./_client";

function Loading() {
  return (
    <div
      style={{
        backgroundColor: "var(--bg)",
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <p style={{ color: "var(--text-muted)", fontSize: 14 }}>로그인 처리 중...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CallbackHandler />
    </Suspense>
  );
}
