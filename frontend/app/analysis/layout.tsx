import type { ReactNode } from "react";

import { AnalysisSubNav } from "@/components/nav/AnalysisSubNav";
import { PrimaryNav } from "@/components/nav/PrimaryNav";

export default function AnalysisLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b0c0e] text-[#f4f1ea]">
      <PrimaryNav />
      <section className="border-b border-white/[0.07] px-4 pb-2 pt-5 sm:px-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">Analytics Workspace</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight text-[#f4f1ea] sm:text-3xl" style={{ fontFamily: "var(--font-playfair), serif" }}>
          Election Intelligence and Model Outputs
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm text-[#a1a1aa]">
          Explore correlations, predictive model quality, and constituency segmentation from the Spark ML pipeline.
        </p>
      </section>
      <AnalysisSubNav />
      {children}
    </div>
  );
}
