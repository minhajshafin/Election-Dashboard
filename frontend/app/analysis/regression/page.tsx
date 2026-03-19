import { getRegressionDataset } from "@/lib/data";

function toSortedEntries(coefficients: Record<string, number>) {
  return Object.entries(coefficients).sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]));
}

export default async function RegressionPage() {
  const dataset = await getRegressionDataset();
  const result = dataset.result;
  const sorted = toSortedEntries(result.coefficients);
  const strongestPositive = sorted.filter(([, value]) => value > 0).slice(0, 5);
  const strongestNegative = sorted.filter(([, value]) => value < 0).slice(0, 5);

  return (
    <main className="min-h-screen bg-[#0d0d0b] px-4 pb-10 text-[#f0ece2] sm:px-10">
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="border border-white/10 bg-[#141412] px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5a5848]">Model</p>
          <p className="mt-2 text-lg">{result.model}</p>
        </article>
        <article className="border border-white/10 bg-[#141412] px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5a5848]">R2</p>
          <p className="mt-2 text-lg">{result.r2.toFixed(3)}</p>
        </article>
        <article className="border border-white/10 bg-[#141412] px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5a5848]">RMSE</p>
          <p className="mt-2 text-lg">{result.rmse.toFixed(3)}</p>
        </article>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <article className="border border-white/10 bg-[#141412] p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">Strongest Positive Coefficients</h2>
          <div className="mt-3 space-y-2">
            {strongestPositive.map(([feature, value]) => (
              <div key={feature} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{feature}</span>
                  <span className="font-mono text-[#4a9e7a]">+{value.toFixed(4)}</span>
                </div>
                <div className="h-1.5 bg-[#252521]">
                  <div className="h-full bg-[#4a9e7a]" style={{ width: `${Math.min(Math.abs(value) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-white/10 bg-[#141412] p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">Strongest Negative Coefficients</h2>
          <div className="mt-3 space-y-2">
            {strongestNegative.map(([feature, value]) => (
              <div key={feature} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{feature}</span>
                  <span className="font-mono text-[#c0572a]">{value.toFixed(4)}</span>
                </div>
                <div className="h-1.5 bg-[#252521]">
                  <div className="h-full bg-[#c0572a]" style={{ width: `${Math.min(Math.abs(value) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 border border-white/10 bg-[#141412] p-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">Model Formula Snapshot</h2>
        <p className="mt-3 text-sm text-[#d8d3c6]">
          turnout_pct = {result.intercept.toFixed(4)}
          {sorted
            .slice(0, 6)
            .map(([feature, value]) => `${value >= 0 ? " + " : " - "}${Math.abs(value).toFixed(4)} x ${feature}`)
            .join("")}
          ...
        </p>
      </section>
    </main>
  );
}
