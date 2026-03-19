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
    <nav className="flex flex-wrap gap-2 px-4 pb-4 sm:px-10">
      {ANALYSIS_LINKS.map((link) => {
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition ${
              isActive
                ? "border-[#c9a84c]/70 bg-[#c9a84c]/10 text-[#c9a84c]"
                : "border-white/15 text-[#9c9888] hover:border-white/35 hover:text-[#f0ece2]"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
