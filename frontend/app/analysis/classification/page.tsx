import { Fragment } from "react";
import { getClassificationDataset } from "@/lib/data";
import {
  HorizontalBarChart,
  MetricCards,
} from "@/components/analysis/charts";
import { getAnalysisLabel } from "@/lib/analysisLabels";

function confusionCellColor(value: number, maxValue: number): string {
  const ratio = maxValue === 0 ? 0 : value / maxValue;
  const red = Math.round(26 + ratio * 104);
  const green = Math.round(22 + ratio * 80);
  const blue = Math.round(14 + ratio * 28);
  return `rgb(${red}, ${green}, ${blue})`;
}

export default async function ClassificationPage() {
  const dataset = await getClassificationDataset();
  const result = dataset.result;
  const features = Object.entries(result.feature_importance).sort((left, right) => right[1] - left[1]);

  const featureData = features.map(([feature, score]) => ({
    label: getAnalysisLabel(feature),
    value: score * 100,
    color: "#7c3aed",
    valueLabel: `${(score * 100).toFixed(2)}%`,
  }));

  const metrics = Object.entries(result.metrics).map(([metric, value]) => ({
    label: metric,
    value: `${(value * 100).toFixed(2)}%`,
  }));

  const labels = ["BNP", "Jamaat", "Others", "NCP"];
  const confusionMatrix = [
    [119, 4, 9, 0],
    [17, 0, 0, 0],
    [34, 0, 4, 0],
    [6, 0, 1, 0],
  ];
  const maxCell = Math.max(...confusionMatrix.flat());

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

      <section className="mt-6">
        <HorizontalBarChart
          title="Random Forest Feature Importances"
          data={featureData}
          xAxisLabel="Importance Score (%)"
          yAxisLabel="Features"
          height={320}
          defaultColor="#7c3aed"
          valueDecimals={2}
          valueUnit=""
        />
      </section>

      <section className="mt-6 border border-white/10 bg-[#141412] p-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">Confusion Matrix (True vs Predicted)</h2>
        <p className="mt-2 text-xs text-[#9c9888]">Predicted label (columns) versus true label (rows).</p>

        <div className="mt-4 overflow-x-auto">
          <div
            className="min-w-160"
            style={{
              display: "grid",
              gridTemplateColumns: "140px repeat(4, minmax(110px, 1fr))",
            }}
          >
            <div className="border border-white/10 bg-[#191915] px-3 py-2 text-[11px] text-[#9c9888]">Actual \ Predicted</div>
            {labels.map((label) => (
              <div
                key={`pred-${label}`}
                className="border border-white/10 bg-[#191915] px-3 py-2 text-center text-[11px] text-[#d8d3c6]"
              >
                {label}
              </div>
            ))}

            {labels.map((actualLabel, rowIndex) => (
              <Fragment key={`row-${actualLabel}`}>
                <div
                  key={`actual-${actualLabel}`}
                  className="border border-white/10 bg-[#191915] px-3 py-2 text-[11px] text-[#d8d3c6]"
                >
                  {actualLabel}
                </div>
                {confusionMatrix[rowIndex].map((value, colIndex) => {
                  const background = confusionCellColor(value, maxCell);
                  const ratio = maxCell === 0 ? 0 : value / maxCell;
                  return (
                    <div
                      key={`${actualLabel}-${labels[colIndex]}`}
                      className="flex items-center justify-center border border-white/10 px-3 py-3 font-mono text-sm"
                      style={{
                        backgroundColor: background,
                        color: ratio > 0.22 ? "#fff7e6" : "#d8c9a0",
                      }}
                    >
                      {value}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>

        <p className="mt-3 text-xs text-[#9c9888]">
          The model predicts BNP strongly but struggles to distinguish minority classes, indicating class imbalance and
          low precision for Jamaat, Others, and NCP.
        </p>
      </section>
    </main>
  );
}
