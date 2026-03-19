import { getClassificationDataset } from "@/lib/data";

export default async function ClassificationPage() {
  const dataset = await getClassificationDataset();
  const result = dataset.result;
  const features = Object.entries(result.feature_importance).sort((left, right) => right[1] - left[1]);

  return (
    <main className="min-h-screen bg-[#0d0d0b] px-4 pb-10 text-[#f0ece2] sm:px-10">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Object.entries(result.metrics).map(([metric, value]) => (
          <article key={metric} className="border border-white/10 bg-[#141412] px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5a5848]">{metric}</p>
            <p className="mt-2 text-lg">{(value * 100).toFixed(2)}%</p>
          </article>
        ))}
        <article className="border border-white/10 bg-[#141412] px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5a5848]">Trees / Depth</p>
          <p className="mt-2 text-lg">{result.num_trees ?? "-"} / {result.max_depth ?? "-"}</p>
        </article>
      </section>

      <section className="mt-6 border border-white/10 bg-[#141412] p-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">Trained Party Labels</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {result.party_labels.map((label) => (
            <span key={label} className="rounded border border-white/15 bg-[#181814] px-2 py-1 text-xs text-[#d8d3c6]">
              {label}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-6 border border-white/10 bg-[#141412] p-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">Feature Importance Ranking</h2>
        <div className="mt-3 space-y-2">
          {features.map(([feature, score]) => (
            <div key={feature} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{feature}</span>
                <span className="font-mono text-[#c9a84c]">{(score * 100).toFixed(2)}%</span>
              </div>
              <div className="h-1.5 bg-[#252521]">
                <div className="h-full bg-[#c9a84c]" style={{ width: `${Math.max(score * 100, 1)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
