"use client";

import { useRef, useLayoutEffect, useCallback } from "react";

export default function HomeSyncedGrid({
  left,
  right,
  rightAttrs,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  rightAttrs?: Record<string, string>;
}) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const sync = useCallback(() => {
    const l = leftRef.current;
    const r = rightRef.current;
    if (!l || !r) return;
    if (window.innerWidth < 640) {
      r.style.maxHeight = "";
      return;
    }
    r.style.maxHeight = l.offsetHeight + "px";
  }, []);

  useLayoutEffect(() => {
    sync();
    const ro = new ResizeObserver(sync);
    if (leftRef.current) ro.observe(leftRef.current);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [sync]);

  return (
    <div className="sm:flex sm:gap-6">
      <div ref={leftRef} className="mb-8 sm:mb-0 sm:flex-1">
        {left}
      </div>
      <div
        ref={rightRef}
        className="sm:flex-1 sm:flex sm:flex-col sm:overflow-hidden"
        {...rightAttrs}
      >
        {right}
      </div>
    </div>
  );
}
