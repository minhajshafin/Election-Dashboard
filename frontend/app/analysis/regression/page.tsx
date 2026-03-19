import {
  DivergingBarChart,
  MetricCards,
  Panel,
  ScatterPlot,
} from "@/components/analysis/charts";
import { getConstituencyDataset, getRegressionDataset } from "@/lib/data";
import type { ConstituencyRow } from "@/types/api";

function toSortedEntries(coefficients: Record<string, number>) {
  return Object.entries(coefficients).sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]));
}

function resolveNumericFeature(seat: ConstituencyRow, feature: string): number | null {
  const value = seat[feature as keyof ConstituencyRow];
  return typeof value === "number" ? value : null;
}

export default async function RegressionPage() {
  const [dataset, constituencyDataset] = await Promise.all([
    getRegressionDataset(),
    getConstituencyDataset(),
  ]);

  const result = dataset.result;
  const sorted = toSortedEntries(result.coefficients);
  const coefficientData = sorted.slice(0, 12).map(([feature, value]) => ({
    label: feature,
    value,
  }));

  const points = constituencyDataset.rows
    .map((seat) => {
      if (seat.turnout_pct === null) {
        return null;
      }

      let prediction = result.intercept;
      for (const feature of result.features) {
        const featureValue = resolveNumericFeature(seat, feature);
        if (featureValue === null) {
          return null;
        }

        prediction += (result.coefficients[feature] ?? 0) * featureValue;
      }

      return {
        x: seat.turnout_pct,
        y: prediction,
        group: seat.division,
        label: seat.constituency,
      };
    })
    .filter((point): point is { x: number; y: number; group: string; label: string } => point !== null);

  return (
    <main className="min-h-screen bg-[#0d0d0b] px-4 pb-10 text-[#f0ece2] sm:px-10">
      <MetricCards
        cards={[
          { label: "Model", value: result.model, detail: `Target: ${result.target}` },
          { label: "R2", value: result.r2.toFixed(3), detail: "Explained variance" },
          { label: "RMSE", value: result.rmse.toFixed(3), detail: "Prediction error" },
        ]}
      />

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <DivergingBarChart title="Coefficient Magnitude and Direction" data={coefficientData} />
        <ScatterPlot title="Predicted vs Actual Turnout" points={points} />
      </section>

      <Panel title="Model Formula Snapshot">
        <p className="mt-3 text-sm text-[#d8d3c6]">
          turnout_pct = {result.intercept.toFixed(4)}
          {sorted
            .slice(0, 6)
            .map(([feature, value]) => `${value >= 0 ? " + " : " - "}${Math.abs(value).toFixed(4)} x ${feature}`)
            .join("")}
          ...
        </p>
      </Panel>
    </main>
  );
}
