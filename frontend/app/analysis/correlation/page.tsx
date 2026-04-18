import { getCorrelationDataset } from "@/lib/data";
import { CorrelationHeatmap } from "@/components/analysis/charts";
import { getAnalysisLabel } from "@/lib/analysisLabels";

interface PairScore {
  left: string;
  right: string;
  value: number;
}

function getTopPairs(columns: string[], matrix: number[][], mode: "positive" | "negative", limit: number): PairScore[] {
  const pairs: PairScore[] = [];

  for (let row = 0; row < columns.length; row += 1) {
    for (let col = row + 1; col < columns.length; col += 1) {
      pairs.push({
        left: columns[row],
        right: columns[col],
        value: matrix[row][col],
      });
    }
  }

  const filtered = pairs.filter((pair) => (mode === "positive" ? pair.value > 0 : pair.value < 0));
  const sorted = [...filtered].sort((a, b) => (mode === "positive" ? b.value - a.value : a.value - b.value));
  return sorted.slice(0, limit);
}

export default async function CorrelationPage() {
  const dataset = await getCorrelationDataset();
  const { columns, pearson } = dataset;

  const topPositive = getTopPairs(columns, pearson, "positive", 8);
  const topNegative = getTopPairs(columns, pearson, "negative", 8);

  return (
    <main className="min-h-screen bg-[#0d0d0b] px-4 pb-10 text-[#f0ece2] sm:px-10">
      <section>
        <CorrelationHeatmap
          title="Pearson Correlation Heatmap"
          columns={columns}
          matrix={pearson}
          highlightKey="turnout_pct"
          height={480}
        />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <article className="border border-white/10 bg-[#141412] p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#4ade80]">Top Positive Correlations</h2>
          <div className="mt-3 space-y-2">
            {topPositive.map((pair) => (
              <div key={`${pair.left}-${pair.right}`} className="rounded border border-[#4ade80]/30 bg-[#4ade80]/10 px-3 py-2">
                <p className="text-sm text-[#dcfce7]">
                  {getAnalysisLabel(pair.left)} x {getAnalysisLabel(pair.right)}
                </p>
                <p className="mt-1 font-mono text-xs text-[#86efac]">r = {pair.value.toFixed(3)}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-white/10 bg-[#141412] p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#f87171]">Top Negative Correlations</h2>
          <div className="mt-3 space-y-2">
            {topNegative.map((pair) => (
              <div key={`${pair.left}-${pair.right}`} className="rounded border border-[#f87171]/30 bg-[#f87171]/10 px-3 py-2">
                <p className="text-sm text-[#fee2e2]">
                  {getAnalysisLabel(pair.left)} x {getAnalysisLabel(pair.right)}
                </p>
                <p className="mt-1 font-mono text-xs text-[#fca5a5]">r = {pair.value.toFixed(3)}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
