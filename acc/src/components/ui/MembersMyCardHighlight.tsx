"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function MembersMyCardHighlight() {
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile) return;
    const cards = document.querySelectorAll<HTMLElement>(`[data-userid="${profile.id}"]`);
    cards.forEach((el) => {
      el.style.borderColor = "rgba(var(--accent-rgb), 0.55)";
      el.style.boxShadow = "0 0 0 1px rgba(var(--accent-rgb), 0.2)";
    });
    return () => {
      cards.forEach((el) => {
        el.style.borderColor = "";
        el.style.boxShadow = "";
      });
    };
  }, [profile]);

  return null;
}
