import { getClassificationDataset } from "@/lib/data";
import {
  HorizontalBarChart,
  MetricCards,
  Panel,
} from "@/components/analysis/charts";

export default async function ClassificationPage() {
  const dataset = await getClassificationDataset();
  const result = dataset.result;
  const features = Object.entries(result.feature_importance).sort((left, right) => right[1] - left[1]);

  const featureData = features.map(([feature, score]) => ({
    label: feature,
    value: score,
    color: "#c9a84c",
    valueLabel: `${(score * 100).toFixed(2)}%`,
  }));

  const metrics = Object.entries(result.metrics).map(([metric, value]) => ({
    label: metric,
    value: `${(value * 100).toFixed(2)}%`,
  }));

  return (
    <main className="min-h-screen bg-[#0d0d0b] px-4 pb-10 text-[#f0ece2] sm:px-10">
      <MetricCards
        cards={[
          ...metrics,
          {
            label: "Trees / Depth",
            value: `${result.num_trees ?? "-"} / ${result.max_depth ?? "-"}`,
          },
        ]}
      />

      <Panel title="Trained Party Labels">
        <div className="mt-3 flex flex-wrap gap-2">
          {result.party_labels.map((label) => (
            <span key={label} className="rounded border border-white/15 bg-[#181814] px-2 py-1 text-xs text-[#d8d3c6]">
              {label}
            </span>
          ))}
        </div>
      </Panel>

      <section className="mt-6">
        <HorizontalBarChart title="Feature Importance Ranking" data={featureData} />
      </section>
    </main>
  );
}
