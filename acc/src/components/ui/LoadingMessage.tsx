"use client";

import { useEffect, useState } from "react";

export default function LoadingMessage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <p
      style={{
        color: "var(--text-muted)",
        fontSize: 12,
        marginTop: 16,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.7s ease",
        letterSpacing: "0.01em",
        textAlign: "center",
      }}
    >
      음반을 꺼내는 중이에요
    </p>
  );
}
