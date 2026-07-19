"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const SWIPE_THRESHOLD = 72;   // px — 이 이상 수평으로 움직여야 스와이프로 인식
const RATIO_THRESHOLD = 1.8;  // 수평/수직 비율 — 대각선 스와이프 걸러내기

function isScrollableHorizontally(el: Element | null): boolean {
  while (el && el !== document.body) {
    const style = getComputedStyle(el);
    const overflow = style.overflowX;
    if ((overflow === "auto" || overflow === "scroll") && el.scrollWidth > el.clientWidth) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

export default function SwipeNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuth();
  const touchStart = useRef<{ x: number; y: number; target: Element } | null>(null);

  useEffect(() => {
    const profilePath = profile ? `/profile/${profile.id}` : null;

    const pages = [
      "/",
      "/albums",
      "/best",
      "/community",
      ...(profilePath ? [profilePath] : []),
    ];

    // 현재 페이지 인덱스 계산
    const currentIndex = () => {
      // 정확 매칭 우선
      const exact = pages.indexOf(pathname);
      if (exact !== -1) return exact;
      // 프로필 페이지 패턴 매칭
      if (pathname.startsWith("/profile/")) return profilePath ? pages.indexOf(profilePath) : -1;
      return -1;
    };

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        target: e.target as Element,
      };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = touch.clientY - touchStart.current.y;

      // 수평 이동이 threshold 미만이거나 수직 이동이 더 크면 무시
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      if (Math.abs(dx) < Math.abs(dy) * RATIO_THRESHOLD) return;

      // 모달이 열린 상태(body 스크롤 잠금)면 탭 이동 무시
      if (document.body.style.overflow === "hidden") return;

      // 수평 스크롤 가능한 요소 위에서 시작한 스와이프 무시
      if (isScrollableHorizontally(touchStart.current.target)) return;

      const idx = currentIndex();
      if (idx === -1) return;

      if (dx < 0 && idx < pages.length - 1) {
        // 왼쪽 스와이프 → 다음 페이지
        router.push(pages[idx + 1]);
      } else if (dx > 0 && idx > 0) {
        // 오른쪽 스와이프 → 이전 페이지
        router.push(pages[idx - 1]);
      }

      touchStart.current = null;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [pathname, profile, router]);

  return null;
}
