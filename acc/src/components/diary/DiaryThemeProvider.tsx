"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type DiaryTheme = "light" | "dark";

type Ctx = { theme: DiaryTheme; toggle: () => void };
const DiaryThemeCtx = createContext<Ctx>({ theme: "light", toggle: () => {} });

const LIGHT = {
  "--bg": "#f0ede6",
  "--bg-card": "#ffffff",
  "--bg-elevated": "#e8e4db",
  "--bg-rgb": "240,237,230",
  "--border": "rgba(20,14,6,0.13)",
  "--border-light": "rgba(20,14,6,0.07)",
  "--text": "#150f06",
  "--text-muted": "rgba(21,15,6,0.5)",
  "--text-sub": "rgba(21,15,6,0.3)",
  "--accent": "#8a2d24",
  "--accent-rgb": "138,45,36",
  colorScheme: "light",
  "--diary-ink-rgb": "20,14,6",
  "--diary-page-from": "#fefefe",
  "--diary-page-mid": "#fdfcfa",
  "--diary-page-to": "#f9f8f3",
  "--diary-label-bg": "#f5ecd6",
  "--diary-label-text": "#1e1510",
  "--diary-page-inset": "rgba(255,255,255,0.7)",
};

const DARK = {
  "--bg": "#1e1810",
  "--bg-card": "#2a221a",
  "--bg-elevated": "#342a20",
  "--bg-rgb": "30,24,16",
  "--border": "rgba(196,170,124,0.16)",
  "--border-light": "rgba(196,170,124,0.08)",
  "--text": "#ede5d8",
  "--text-muted": "rgba(237,229,216,0.48)",
  "--text-sub": "rgba(237,229,216,0.28)",
  "--accent": "#c4aa7c",
  "--accent-rgb": "196,170,124",
  colorScheme: "dark",
  "--diary-ink-rgb": "196,170,124",
  "--diary-page-from": "#2e261c",
  "--diary-page-mid": "#28201a",
  "--diary-page-to": "#221a14",
  "--diary-label-bg": "#2a2018",
  "--diary-label-text": "#c4aa7c",
  "--diary-page-inset": "rgba(255,255,255,0.04)",
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
