"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ANALYSIS_LINKS = [
  { href: "/analysis/overview", label: "Overview", badge: "Briefing" },
  { href: "/analysis/correlation", label: "Correlation", badge: "Matrix" },
  { href: "/analysis/regression", label: "Regression", badge: "Drivers" },
  { href: "/analysis/classification", label: "Classification", badge: "ML Model" },
  { href: "/analysis/clusters", label: "Clusters", badge: "Typology" },
] as const;

export function AnalysisSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex h-10 items-center overflow-x-auto no-scrollbar">
      {ANALYSIS_LINKS.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`group flex h-full items-center gap-2 px-4 sm:px-5 font-mono text-[11px] tracking-wider transition-all whitespace-nowrap rounded-none border-b-2 cursor-pointer ${
              isActive
                ? "border-[var(--text-primary)] text-[var(--text-primary)] font-semibold bg-[var(--bg-subtle)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]/40"
            }`}
          >
            <span>{link.label}</span>
            <span
              className={`text-[9px] uppercase px-1.5 py-0.5 border transition-colors ${
                isActive
                  ? "border-[var(--border-active)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold"
                  : "border-[var(--border-subtle)] text-[var(--text-muted)] group-hover:border-[var(--border)]"
              }`}
            >
              {link.badge}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
