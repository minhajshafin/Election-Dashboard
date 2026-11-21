"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview", matchPrefix: "/" },
  { href: "/explorer", label: "Explorer", matchPrefix: "/explorer" },
  { href: "/analysis/overview", label: "Analysis", matchPrefix: "/analysis" },
] as const;

export function PrimaryNav() {
  const pathname = usePathname();
  const normalizedPath = pathname.replace(/\/$/, "") || "/";

  return (
    <header className="sticky top-0 z-50 flex h-12 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#0b0c0e]/95 px-4 backdrop-blur-md sm:px-10">
      <div className="flex min-w-0 items-center gap-4 sm:gap-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_8px_#d4af37]" />
          <span className="truncate font-mono text-[11px] uppercase tracking-[0.2em] text-[#f4f1ea] font-medium">
            BD Election Intelligence
          </span>
        </Link>
        <span className="hidden h-3.5 w-px bg-white/10 sm:block" />
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-[#71717a] sm:block">
          2026 National Results
        </span>
      </div>
      <nav className="hidden h-full items-center sm:flex">
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
              className={`relative flex h-full items-center border-l border-white/[0.07] px-5 font-mono text-[11px] uppercase tracking-widest transition ${
                isActive
                  ? "bg-[#d4af37]/10 text-[#f4f1ea] font-semibold"
                  : "text-[#a1a1aa] hover:bg-white/[0.03] hover:text-[#f4f1ea]"
              }`}
            >
              {link.label}
              {isActive ? (
                <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#d4af37] shadow-[0_0_8px_#d4af37]" aria-hidden="true" />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
