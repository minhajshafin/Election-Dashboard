"use client";

import { useSyncExternalStore } from "react";

function subscribeTheme(callback: () => void) {
  window.addEventListener("themechange", callback);
  return () => window.removeEventListener("themechange", callback);
}

function getThemeSnapshot(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
}

function getThemeServerSnapshot(): "light" | "dark" {
  return "light";
}

export function useTheme(): "light" | "dark" {
  return useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
}

export function toggleThemeMode(): "light" | "dark" {
  const current = getThemeSnapshot();
  const nextTheme = current === "light" ? "dark" : "light";
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", nextTheme);
    try {
      localStorage.setItem("theme", nextTheme);
    } catch {}
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: nextTheme } }));
  }
  return nextTheme;
}
