import type { ReactNode } from "react";

import { AnalysisSubNav } from "@/components/nav/AnalysisSubNav";
import { PrimaryNav } from "@/components/nav/PrimaryNav";

export default function AnalysisLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PrimaryNav />
      <section className="border-b border-white/8 px-4 pb-2 pt-5 sm:px-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c9a84c]">Analytics Workspace</p>
        <h1 className="mt-2 text-2xl leading-tight text-[#f0ece2] sm:text-3xl" style={{ fontFamily: "var(--font-playfair), serif" }}>
          Election Intelligence and Model Outputs
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[#9c9888]">
          Explore correlations, model quality, and constituency segmentation from the Spark pipeline.
        </p>
      </section>
      <AnalysisSubNav />
      {children}
    </>
  );
}
