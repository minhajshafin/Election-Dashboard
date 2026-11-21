import type { ReactNode } from "react";

import { AnalysisSubNav } from "@/components/nav/AnalysisSubNav";
import { PrimaryNav } from "@/components/nav/PrimaryNav";

export default function AnalysisLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] selection:bg-[var(--text-primary)] selection:text-[var(--bg-canvas)]">
      <PrimaryNav />
      
      {/* Editorial Intelligence Masthead */}
      <section className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 py-5 sm:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 bg-emerald-500 shrink-0" />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 font-semibold">
              Analytics &amp; Machine Learning Intelligence
            </p>
          </div>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] font-serif">
            Election Intelligence &amp; Statistical Models
          </h1>
          <p className="mt-1.5 max-w-3xl text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
            Cross-constituency correlations, demographic drivers, turnout regression, random forest winner predictions, and K-Means segmentation from the 2026 national dataset.
          </p>
        </div>
      </section>

      {/* Sticky Tab Navigation Ribbon */}
      <div className="sticky top-[42px] z-40 border-b border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto">
          <AnalysisSubNav />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 sm:px-8 lg:px-12">
        {children}
      </div>
    </div>
  );
}
