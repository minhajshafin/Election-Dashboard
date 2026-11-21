"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ANALYSIS_LINKS = [
  { href: "/analysis/overview", label: "Overview" },
  { href: "/analysis/correlation", label: "Correlation" },
  { href: "/analysis/regression", label: "Regression" },
  { href: "/analysis/classification", label: "Classification" },
  { href: "/analysis/clusters", label: "Clusters" },
] as const;

export function AnalysisSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex h-9 items-center overflow-x-auto no-scrollbar">
      {ANALYSIS_LINKS.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`group flex h-9 items-center px-3.5 font-mono text-[11px] tracking-wide transition-colors whitespace-nowrap rounded-none border-b-2 cursor-pointer ${
              isActive
                ? "border-[var(--text-primary)] text-[var(--text-primary)] font-medium bg-[var(--bg-subtle)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
