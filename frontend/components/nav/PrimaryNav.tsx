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
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/12 px-4 sm:px-10">
      <div className="flex min-w-0 items-center gap-4 sm:gap-6">
        <span className="truncate font-mono text-[11px] uppercase tracking-[0.18em] text-[#5a5848]">
          BD Election Dashboard
        </span>
        <span className="hidden h-4 w-px bg-white/15 sm:block" />
        <span className="hidden font-mono text-[11px] tracking-[0.05em] text-[#5a5848] sm:block">
          National Constituency Results - 2026
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
              className={`relative flex h-full items-center border-l border-white/8 px-5 font-mono text-[11px] uppercase tracking-widest transition ${
                isActive
                  ? "bg-[#c9a84c]/10 text-[#f0ece2]"
                  : "text-[#9c9888] hover:bg-white/5 hover:text-[#f0ece2]"
              }`}
            >
              {link.label}
              {isActive ? (
                <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#c9a84c]" aria-hidden="true" />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
