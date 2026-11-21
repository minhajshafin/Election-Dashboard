import {
  DivergingBarChart,
  MetricCards,
  Panel,
  ScatterPlot,
  type ScatterPoint,
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

function computeFeatureBounds(rows: ConstituencyRow[], features: string[]): Record<string, { min: number; max: number }> {
  const bounds: Record<string, { min: number; max: number }> = {};

  for (const feature of features) {
    const values: number[] = [];
    for (const seat of rows) {
      const val = resolveNumericFeature(seat, feature);
      if (val !== null) {
        values.push(val);
      }
    }

    if (values.length > 0) {
      bounds[feature] = {
        min: Math.min(...values),
        max: Math.max(...values),
      };
    } else {
      bounds[feature] = { min: 0, max: 1 };
    }
  }

  return bounds;
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
    valueLabel: `${value > 0 ? "+" : ""}${value.toFixed(4)}`,
  }));
  const featureBounds = computeFeatureBounds(constituencyDataset.rows, result.features);

  const divisionColors: Record<string, string> = {
    Barishal: "#f97316",
    Chattogram: "#3b82f6",
    Dhaka: "#10b981",
    Khulna: "#eab308",
    Mymensingh: "#f43f5e",
    Rajshahi: "#06b6d4",
    Rangpur: "#8b5cf6",
    Sylhet: "#84cc16",
  };

  const points: ScatterPoint[] = constituencyDataset.rows
    .map((seat) => {
      if (seat.turnout_pct === null) {
        return null;
      }

      let prediction = result.intercept;
      for (const feature of result.features) {
        const featureValue = resolveNumericFeature(seat, feature);
        const { min, max } = featureBounds[feature] ?? { min: 0, max: 1 };
        const normalized = featureValue !== null && max > min ? (featureValue - min) / (max - min) : 0.5;
        prediction += (result.coefficients[feature] ?? 0) * normalized;
      }

      return {
        x: seat.turnout_pct,
        y: prediction,
        group: seat.division ?? "Unknown",
        label: `${seat.constituency} (${seat.district})`,
        detail: seat.winner_party ? `Winner: ${seat.winner_party}` : undefined,
      };
    })
    .filter((point): point is NonNullable<typeof point> => point !== null);

  return (
    <main className="space-y-6">
      {/* Model Performance Scorecards */}
      <MetricCards
        cards={[
          { label: "Architecture", value: result.model, detail: `Target: ${result.target}` },
          { label: "R² Goodness of Fit", value: result.r2.toFixed(3), detail: `${(result.r2 * 100).toFixed(1)}% variance explained` },
          { label: "Root Mean Squared Error", value: `${result.rmse.toFixed(2)}%`, detail: "Constituency residual deviance" },
          { label: "Model Intercept", value: result.intercept.toFixed(2), detail: "Baseline turnout constant" },
          { label: "Feature Predictors", value: String(result.features.length), detail: "Socioeconomic inputs" },
        ]}
      />

      {/* Main Charts: Diverging Coefficients and Scatter Canvas */}
      <section className="grid gap-6 lg:grid-cols-2">
        <DivergingBarChart
          title="Turnout Feature Coefficients (Marginal Impact)"
          data={coefficientData}
          xAxisLabel="Beta Coefficient (β)"
          yAxisLabel="Demographic & Political Factor"
          height={380}
          valueDecimals={4}
        />

        <ScatterPlot
          title="Constituency Actual vs. Model Predicted Turnout"
          data={points}
          xAxisLabel="Actual General Election Turnout (%)"
          yAxisLabel="ML Predicted Turnout (%)"
          height={380}
          showRegressionLine
          groupColors={divisionColors}
        />
      </section>

      {/* Editorial Methodology & Takeaways */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Coefficient Direction & Magnitude"
          subtitle="Understanding statistical turnout drivers"
        >
          <p className="font-sans text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
            Green bars indicate variables that elevate voter participation (e.g. higher candidate counts and rural civic mobilization), while red bars indicate dampening factors (such as acute urban mobility or low economic baseline). Coefficients closer to zero reflect minimal marginal elasticity.
          </p>
        </Panel>

        <Panel
          title="Residual Error & Regional Clustering"
          subtitle="Evaluating model accuracy across divisions"
        >
          <p className="font-sans text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
            Dots positioned closer to the dashed 45° diagonal line indicate accurate model estimates. Outliers drifting significantly above or below the line highlight local anomalies—such as hyper-contested mayoral districts or uncontested stronghold seats—where national demographic baselines fail to capture idiosyncratic political dynamics.
          </p>
        </Panel>
      </section>
    </main>
  );
}
