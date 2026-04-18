import {
  DivergingBarChart,
  MetricCards,
  ScatterPlot,
} from "@/components/analysis/charts";
import { getConstituencyDataset, getRegressionDataset } from "@/lib/data";
import { getAnalysisLabel } from "@/lib/analysisLabels";
import type { ConstituencyRow } from "@/types/api";

const FEATURE_ALIASES: Record<string, keyof ConstituencyRow> = {
  mobile_pct: "mobile_phone_pct",
  urban_pct: "urbanization_index",
  financial_inclusion_pct: "financial_account_pct",
};

function toSortedEntries(coefficients: Record<string, number>) {
  return Object.entries(coefficients).sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]));
}

function resolveNumericFeature(seat: ConstituencyRow, feature: string): number | null {
  const resolvedFeature = FEATURE_ALIASES[feature] ?? (feature as keyof ConstituencyRow);
  const value = seat[resolvedFeature];
  return typeof value === "number" ? value : null;
}

function computeFeatureMeans(rows: ConstituencyRow[], features: string[]): Record<string, number> {
  const accumulators = new Map<string, { total: number; count: number }>();

  for (const feature of features) {
    accumulators.set(feature, { total: 0, count: 0 });
  }

  for (const seat of rows) {
    for (const feature of features) {
      const value = resolveNumericFeature(seat, feature);
      if (value === null) {
        continue;
      }

      const accumulator = accumulators.get(feature);
      if (!accumulator) {
        continue;
      }

      accumulator.total += value;
      accumulator.count += 1;
    }
  }

  const means: Record<string, number> = {};
  for (const feature of features) {
    const accumulator = accumulators.get(feature);
    means[feature] = accumulator && accumulator.count > 0 ? accumulator.total / accumulator.count : 0;
  }

  return means;
}

export default async function RegressionPage() {
  const [dataset, constituencyDataset] = await Promise.all([
    getRegressionDataset(),
    getConstituencyDataset(),
  ]);

  const result = dataset.result;
  const sorted = toSortedEntries(result.coefficients);
  const coefficientData = sorted.map(([feature, value]) => ({
    label: getAnalysisLabel(feature),
    value,
    valueLabel: value.toFixed(4),
  }));
  const featureMeans = computeFeatureMeans(constituencyDataset.rows, result.features);

  const divisionColors: Record<string, string> = {
    Barishal: "#f97316",
    Chattogram: "#3b82f6",
    Dhaka: "#22c55e",
    Khulna: "#eab308",
    Mymensingh: "#f43f5e",
    Rajshahi: "#06b6d4",
    Rangpur: "#8b5cf6",
    Sylhet: "#84cc16",
  };

  const points = constituencyDataset.rows
    .map((seat) => {
      if (seat.turnout_pct === null) {
        return null;
      }

      let prediction = result.intercept;
      for (const feature of result.features) {
        const featureValue = resolveNumericFeature(seat, feature);
        const valueForPrediction = featureValue ?? featureMeans[feature] ?? 0;
        prediction += (result.coefficients[feature] ?? 0) * valueForPrediction;
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

      <section className="mt-6 grid gap-4">
        <div className="space-y-2">
          <DivergingBarChart
            title="Linear Regression Coefficients (Direction + Magnitude)"
            data={coefficientData}
            xAxisLabel="Coefficient Value"
            yAxisLabel="Features"
            height={360}
            valueDecimals={4}
          />
          <p className="text-xs text-[#9c9888]">
            Blue coefficients increase predicted turnout, while red coefficients decrease it. Values closer to zero
            indicate weaker marginal influence.
          </p>
        </div>

        <ScatterPlot
          title="Predicted vs Actual Turnout"
          points={points}
          xAxisLabel="Actual Turnout (%)"
          yAxisLabel="Predicted Turnout (%)"
          xUnit="%"
          yUnit="%"
          height={400}
          showReferenceLine
          groupColors={divisionColors}
        />
      </section>
    </main>
  );
}
