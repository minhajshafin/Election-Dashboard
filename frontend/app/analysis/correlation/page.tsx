import { getCorrelationDataset } from "@/lib/data";

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

  const sorted = [...pairs].sort((a, b) => (mode === "positive" ? b.value - a.value : a.value - b.value));
  return sorted.slice(0, limit);
}

export default async function CorrelationPage() {
  const dataset = await getCorrelationDataset();
  const { columns, pearson, spearman } = dataset;

  const topPositive = getTopPairs(columns, pearson, "positive", 6);
  const topNegative = getTopPairs(columns, pearson, "negative", 6);

  return (
    <main className="min-h-screen bg-[#0d0d0b] px-4 pb-10 text-[#f0ece2] sm:px-10">
      <section className="grid gap-4 xl:grid-cols-2">
        <article className="border border-white/10 bg-[#141412] p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">Pearson Matrix</h2>
          <p className="mt-2 text-xs text-[#9c9888]">{columns.length} features x {columns.length} features</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-white/10 bg-[#191915] px-2 py-1 text-left text-[#9c9888]">Feature</th>
                  {columns.map((column) => (
                    <th key={column} className="border border-white/10 bg-[#191915] px-2 py-1 text-[#9c9888]">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {columns.map((rowLabel, rowIdx) => (
                  <tr key={rowLabel}>
                    <td className="border border-white/10 bg-[#191915] px-2 py-1 text-[#d8d3c6]">{rowLabel}</td>
                    {pearson[rowIdx].map((value, colIdx) => {
                      const tint = value >= 0 ? "74, 158, 122" : "192, 87, 42";
                      const alpha = Math.min(Math.abs(value), 1) * 0.8;

                      return (
                        <td
                          key={`${rowLabel}-${columns[colIdx]}`}
                          className="border border-white/10 px-2 py-1 text-center"
                          style={{ backgroundColor: `rgba(${tint}, ${alpha})` }}
                        >
                          {value.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="border border-white/10 bg-[#141412] p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">Spearman Matrix</h2>
          <p className="mt-2 text-xs text-[#9c9888]">Monotonic relationships for the same feature set.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-white/10 bg-[#191915] px-2 py-1 text-left text-[#9c9888]">Feature</th>
                  {columns.map((column) => (
                    <th key={column} className="border border-white/10 bg-[#191915] px-2 py-1 text-[#9c9888]">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {columns.map((rowLabel, rowIdx) => (
                  <tr key={rowLabel}>
                    <td className="border border-white/10 bg-[#191915] px-2 py-1 text-[#d8d3c6]">{rowLabel}</td>
                    {spearman[rowIdx].map((value, colIdx) => {
                      const tint = value >= 0 ? "42, 106, 170" : "192, 87, 42";
                      const alpha = Math.min(Math.abs(value), 1) * 0.8;

                      return (
                        <td
                          key={`${rowLabel}-${columns[colIdx]}`}
                          className="border border-white/10 px-2 py-1 text-center"
                          style={{ backgroundColor: `rgba(${tint}, ${alpha})` }}
                        >
                          {value.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <article className="border border-white/10 bg-[#141412] p-4">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">Top Positive Correlations</h3>
          <div className="mt-3 space-y-2">
            {topPositive.map((pair) => (
              <div key={`${pair.left}-${pair.right}`} className="flex items-center justify-between border border-white/10 px-3 py-2 text-sm">
                <span className="text-[#d8d3c6]">{pair.left} {"<->"} {pair.right}</span>
                <span className="font-mono text-[#4a9e7a]">{pair.value.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-white/10 bg-[#141412] p-4">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">Top Negative Correlations</h3>
          <div className="mt-3 space-y-2">
            {topNegative.map((pair) => (
              <div key={`${pair.left}-${pair.right}`} className="flex items-center justify-between border border-white/10 px-3 py-2 text-sm">
                <span className="text-[#d8d3c6]">{pair.left} {"<->"} {pair.right}</span>
                <span className="font-mono text-[#c0572a]">{pair.value.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
