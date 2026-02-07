"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "boss-ui-theme";
export type BossTheme = "dark" | "light";

function getStoredTheme(): BossTheme {
  if (typeof window === "undefined") return "dark";
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "light" ? "light" : "dark";
}

export function useBossTheme(): [BossTheme, (next: BossTheme) => void] {
  const [theme, setThemeState] = useState<BossTheme>("dark");

  useEffect(() => {
    setThemeState(getStoredTheme());
  }, []);

  const setTheme = useCallback((next: BossTheme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return [theme, setTheme];
}
