"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import type { CSSProperties } from "react";

export function useBlockedAction() {
  const [shaking, setShaking] = useState(false);
  const { showToastWithAction } = useToast();
  const router = useRouter();

  const triggerBlock = useCallback(() => {
    setShaking(true);
    showToastWithAction("로그인 후 이용할 수 있어요", "입문하기 →", () => router.push("/login"));
    setTimeout(() => setShaking(false), 420);
  }, [showToastWithAction, router]);

  const shakeStyle: CSSProperties = shaking ? { animation: "shake 0.42s ease-in-out" } : {};

  return { shaking, triggerBlock, shakeStyle };
}
