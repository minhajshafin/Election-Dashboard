import { getCorrelationDataset } from "@/lib/data";
import { CorrelationHeatmap, HorizontalBarChart } from "@/components/analysis/charts";

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

  const positiveData = topPositive.map((pair) => ({
    label: `${pair.left} <-> ${pair.right}`,
    value: pair.value,
    color: "#4a9e7a",
    valueLabel: pair.value.toFixed(3),
  }));

  const negativeData = topNegative.map((pair) => ({
    label: `${pair.left} <-> ${pair.right}`,
    value: Math.abs(pair.value),
    color: "#c0572a",
    valueLabel: pair.value.toFixed(3),
  }));

  return (
    <main className="min-h-screen bg-[#0d0d0b] px-4 pb-10 text-[#f0ece2] sm:px-10">
      <section className="grid gap-4 xl:grid-cols-2">
        <CorrelationHeatmap title="Pearson Matrix" columns={columns} matrix={pearson} />
        <CorrelationHeatmap title="Spearman Matrix" columns={columns} matrix={spearman} />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <HorizontalBarChart title="Top Positive Correlations" data={positiveData} />
        <HorizontalBarChart title="Top Negative Correlations" data={negativeData} />
      </section>
    </main>
  );
}
