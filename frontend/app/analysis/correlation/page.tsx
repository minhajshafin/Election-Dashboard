import { getCorrelationDataset } from "@/lib/data";
import { CorrelationHeatmap, Panel } from "@/components/analysis/charts";
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

  const topPositive = getTopPairs(columns, pearson, "positive", 6);
  const topNegative = getTopPairs(columns, pearson, "negative", 6);

  return (
    <main className="space-y-6">
      {/* Interactive Pearson Correlation Heatmap */}
      <section>
        <CorrelationHeatmap
          title="Pearson Correlation Coefficient Matrix"
          columns={columns}
          matrix={pearson}
          highlightKey="turnout_pct"
          height={480}
        />
      </section>

      {/* Top Positive and Negative Associations */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Positive Pairings */}
        <article className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 rounded-none">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-emerald-500 shrink-0" />
              <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] font-semibold text-[var(--text-primary)]">
                Highest Positive Linear Associations
              </h2>
            </div>
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
              r &gt; 0
            </span>
          </div>

          <div className="mt-4 space-y-2.5">
            {topPositive.map((pair) => (
              <div
                key={`${pair.left}-${pair.right}`}
                className="flex items-center justify-between p-3 border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 hover:bg-[var(--bg-subtle)] transition-colors rounded-none"
              >
                <div className="min-w-0 pr-3">
                  <p className="font-sans text-xs font-semibold text-[var(--text-primary)] truncate">
                    {getAnalysisLabel(pair.left)}{" "}
                    <span className="text-[var(--text-muted)] font-normal">and</span>{" "}
                    {getAnalysisLabel(pair.right)}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                    Positive co-movement across 300 constituencies
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20">
                    +{pair.value.toFixed(3)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        {/* Negative Pairings */}
        <article className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 rounded-none">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-red-500 shrink-0" />
              <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] font-semibold text-[var(--text-primary)]">
                Strongest Inverse Relationships
              </h2>
            </div>
            <span className="font-mono text-[10px] text-red-600 dark:text-red-400 font-bold uppercase tracking-wider">
              r &lt; 0
            </span>
          </div>

          <div className="mt-4 space-y-2.5">
            {topNegative.map((pair) => (
              <div
                key={`${pair.left}-${pair.right}`}
                className="flex items-center justify-between p-3 border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 hover:bg-[var(--bg-subtle)] transition-colors rounded-none"
              >
                <div className="min-w-0 pr-3">
                  <p className="font-sans text-xs font-semibold text-[var(--text-primary)] truncate">
                    {getAnalysisLabel(pair.left)}{" "}
                    <span className="text-[var(--text-muted)] font-normal">vs.</span>{" "}
                    {getAnalysisLabel(pair.right)}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                    Inverse trade-off across electoral returns
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400 tabular-nums px-2 py-0.5 bg-red-500/10 border border-red-500/20">
                    {pair.value.toFixed(3)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* Methodological Context Note */}
      <section>
        <Panel
          title="Methodology Note · Pearson Product-Moment Correlation"
          subtitle="Interpreting statistical collinearity"
        >
          <p className="font-sans text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
            Pearson’s coefficient \(r\) evaluates the strength and direction of the linear relationship between variables, ranging from \(-1.0\) (perfect inverse correlation) to \(+1.0\) (perfect positive correlation). Values where \(|r| &gt; 0.6\) indicate significant covariance—vital for identifying demographic drivers like urbanization, literacy, and financial inclusion before applying multivariable regression.
          </p>
        </Panel>
      </section>
    </main>
  );
}
