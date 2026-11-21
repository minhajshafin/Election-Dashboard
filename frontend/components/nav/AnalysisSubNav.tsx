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
    <nav className="flex flex-wrap gap-2 px-4 pb-4 sm:px-10 bg-[#0b0c0e]">
      {ANALYSIS_LINKS.map((link) => {
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition ${
              isActive
                ? "border-[#d4af37]/60 bg-[#d4af37]/10 text-[#d4af37] font-semibold shadow-sm"
                : "border-white/10 text-[#a1a1aa] hover:border-white/25 hover:text-[#f4f1ea] hover:bg-white/[0.02]"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
