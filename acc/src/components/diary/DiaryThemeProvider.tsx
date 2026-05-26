"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type DiaryTheme = "light" | "dark";

type Ctx = { theme: DiaryTheme; toggle: () => void };
const DiaryThemeCtx = createContext<Ctx>({ theme: "light", toggle: () => {} });

const LIGHT = {
  "--bg": "#f8f7f4",
  "--bg-card": "#ffffff",
  "--bg-elevated": "#f2f1ee",
  "--bg-rgb": "248,247,244",
  "--border": "rgba(20,14,6,0.14)",
  "--border-light": "rgba(20,14,6,0.07)",
  "--text": "#150f06",
  "--text-muted": "rgba(21,15,6,0.5)",
  "--text-sub": "rgba(21,15,6,0.3)",
  "--accent": "#8a2d24",
  "--accent-rgb": "138,45,36",
  colorScheme: "light",
  "--diary-ink-rgb": "20,14,6",
  "--diary-page-from": "#fafaf8",
  "--diary-page-mid": "#f8f7f4",
  "--diary-page-to": "#f5f4f0",
  "--diary-label-bg": "#f7efd8",
  "--diary-label-text": "#241b14",
  "--diary-page-inset": "rgba(255,255,255,0.4)",
};

const DARK = {
  "--bg": "#110f0b",
  "--bg-card": "#1c1814",
  "--bg-elevated": "#252018",
  "--bg-rgb": "17,15,11",
  "--border": "rgba(196,170,124,0.14)",
  "--border-light": "rgba(196,170,124,0.07)",
  "--text": "#ede5d8",
  "--text-muted": "rgba(237,229,216,0.45)",
  "--text-sub": "rgba(237,229,216,0.28)",
  "--accent": "#c4aa7c",
  "--accent-rgb": "196,170,124",
  colorScheme: "dark",
  "--diary-ink-rgb": "196,170,124",
  "--diary-page-from": "#1c1814",
  "--diary-page-mid": "#191510",
  "--diary-page-to": "#15110c",
  "--diary-label-bg": "#1d1912",
  "--diary-label-text": "#c4aa7c",
  "--diary-page-inset": "rgba(255,255,255,0.05)",
};

export function DiaryThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<DiaryTheme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("diary-theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: DiaryTheme = prev === "light" ? "dark" : "light";
      localStorage.setItem("diary-theme", next);
      return next;
    });
  }, []);

  return (
    <DiaryThemeCtx.Provider value={{ theme, toggle }}>
      <div style={(theme === "light" ? LIGHT : DARK) as React.CSSProperties}>
        {children}
      </div>
    </DiaryThemeCtx.Provider>
  );
}

export function useDiaryTheme() {
  return useContext(DiaryThemeCtx);
}
