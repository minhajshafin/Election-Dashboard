"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/", label: "Overview", matchPrefix: "/" },
  { href: "/analysis/overview", label: "Analysis", matchPrefix: "/analysis" },
] as const;

export function PrimaryNav() {
  const pathname = usePathname();
  const normalizedPath = pathname.replace(/\/$/, "") || "/";
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const currentTheme = (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
    setTheme(currentTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    try {
      localStorage.setItem("theme", nextTheme);
    } catch {}
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: nextTheme } }));
  };

  return (
    <header className="sticky top-0 z-50 flex h-[42px] shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
            {/* Light mode: dark/black icon */}
            <img
              src="/logo-dark.svg"
              alt="Bangladesh Election 2026 Logo"
              className="h-5 w-5 object-contain block [html[data-theme='dark']_&]:hidden"
            />
            {/* Dark mode: light/white icon */}
            <img
              src="/logo-light.svg"
              alt="Bangladesh Election 2026 Logo"
              className="h-5 w-5 object-contain hidden [html[data-theme='dark']_&]:block"
            />
          </div>
          <span
            className="truncate text-base font-semibold tracking-tight text-[var(--text-primary)] group-hover:opacity-90 transition-opacity leading-none -translate-y-[1.5px]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Bangladesh Election 2026
          </span>
        </Link>
        <span className="hidden h-3 w-px bg-[var(--border)] sm:block" />
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] sm:block">
          National Results & Intelligence
        </span>
      </div>

      <div className="flex h-full items-center">
        <nav className="flex h-full items-center">
          {LINKS.map((link) => {
            const normalizedPrefix = link.matchPrefix.replace(/\/$/, "") || "/";
            const isActive =
              normalizedPrefix === "/"
                ? normalizedPath === "/"
                : normalizedPath === normalizedPrefix || normalizedPath.startsWith(`${normalizedPrefix}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex h-full items-center border-l border-[var(--border)] px-4 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                  isActive
                    ? "bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--text-primary)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sharp Boxy Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle light/dark theme"
          className="flex h-full items-center gap-1.5 border-l border-[var(--border)] px-3 font-mono text-[10px] uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          {theme === "light" ? (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="square" strokeLinejoin="miter" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <span>Dark</span>
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="square" strokeLinejoin="miter" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Light</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
