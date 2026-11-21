import type { ReactNode } from "react";

import { AnalysisSubNav } from "@/components/nav/AnalysisSubNav";
import { PrimaryNav } from "@/components/nav/PrimaryNav";

export default function AnalysisLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] selection:bg-[var(--text-primary)] selection:text-[var(--bg-canvas)]">
      <PrimaryNav />
      
      {/* Sticky Tab Navigation Ribbon - flush edge to edge */}
      <div className="sticky top-[42px] z-40 border-b border-[var(--border)] bg-[var(--bg-surface)] px-2 sm:px-4">
        <AnalysisSubNav />
      </div>

      {/* Full-width Main Content Area */}
      <main className="flex-1 w-full px-2 sm:px-4 py-3 sm:py-4">
        {children}
      </main>
    </div>
  );
}
