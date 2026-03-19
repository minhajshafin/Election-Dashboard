import { getClusterDataset } from "@/lib/data";
import {
  HorizontalBarChart,
  Panel,
  RadarComparison,
} from "@/components/analysis/charts";

function normalizeSeries(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1e-6);

  // Keep the lower profile visible on radar by avoiding a full collapse to center.
  const visualFloor = 0.22;
  return values.map((value) => {
    const normalized = (value - min) / span;
    return visualFloor + normalized * (1 - visualFloor);
  });
}

export default async function ClustersPage() {
  const dataset = await getClusterDataset();
  const profiles = dataset.profiles;
  const [firstCluster, secondCluster] = profiles;

  const axes = ["Literacy", "Internet", "Urban", "Density"];
  const rawByAxis = {
    Literacy: profiles.map((profile) => profile.avg_literacy),
    Internet: profiles.map((profile) => profile.avg_internet),
    Urban: profiles.map((profile) => profile.avg_urban),
    Density: profiles.map((profile) => profile.avg_density),
  };

  const normalizedByAxis = {
    Literacy: normalizeSeries(rawByAxis.Literacy),
    Internet: normalizeSeries(rawByAxis.Internet),
    Urban: normalizeSeries(rawByAxis.Urban),
    Density: normalizeSeries(rawByAxis.Density),
  };

  const radarSeries = profiles.map((profile, index) => ({
    name: `Cluster ${profile.cluster}`,
    color: index % 2 === 0 ? "#4a9e7a" : "#2a6aaa",
    values: axes.map((axis) => normalizedByAxis[axis as keyof typeof normalizedByAxis][index]),
  }));

  const comparisonRows = [
    {
      label: "Literacy",
      first: firstCluster?.avg_literacy ?? 0,
      second: secondCluster?.avg_literacy ?? 0,
    },
    {
      label: "Internet",
      first: firstCluster?.avg_internet ?? 0,
      second: secondCluster?.avg_internet ?? 0,
    },
    {
      label: "Urban",
      first: firstCluster?.avg_urban ?? 0,
      second: secondCluster?.avg_urban ?? 0,
    },
    {
      label: "Density",
      first: firstCluster?.avg_density ?? 0,
      second: secondCluster?.avg_density ?? 0,
    },
  ];

  return (
    <main className="bg-[#0d0d0b] px-4 pb-6 text-[#f0ece2] sm:px-10 xl:h-[calc(100vh-180px)] xl:overflow-hidden">
      <section className="grid gap-4 xl:h-full xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4 xl:overflow-y-auto xl:pr-1">
          <Panel title="Cluster Comparison Snapshot">
            <p className="text-sm text-[#9c9888]">
              This table compares average socioeconomic signatures between the two clusters and highlights which
              cluster leads each dimension.
            </p>
            <div className="mt-3 overflow-x-auto border border-white/10">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-[#191915] text-[10px] uppercase tracking-[0.14em] text-[#9c9888]">
                  <tr>
                    <th className="px-3 py-2 text-left">Metric</th>
                    <th className="px-3 py-2 text-right">Cluster {firstCluster?.cluster ?? "A"}</th>
                    <th className="px-3 py-2 text-right">Cluster {secondCluster?.cluster ?? "B"}</th>
                    <th className="px-3 py-2 text-right">Delta</th>
                    <th className="px-3 py-2 text-left">Lead</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => {
                    const delta = row.first - row.second;
                    const lead =
                      delta === 0
                        ? "Tie"
                        : delta > 0
                          ? `Cluster ${firstCluster?.cluster ?? "A"}`
                          : `Cluster ${secondCluster?.cluster ?? "B"}`;

                    return (
                      <tr key={row.label} className="border-t border-white/10">
                        <td className="px-3 py-2 text-[#d8d3c6]">{row.label}</td>
                        <td className="px-3 py-2 text-right text-[#d8d3c6]">{row.first.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right text-[#d8d3c6]">{row.second.toFixed(3)}</td>
                        <td className={`px-3 py-2 text-right font-mono ${delta >= 0 ? "text-[#4a9e7a]" : "text-[#c0572a]"}`}>
                          {delta >= 0 ? "+" : ""}
                          {delta.toFixed(3)}
                        </td>
                        <td className="px-3 py-2 text-[#9c9888]">{lead}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            {profiles.map((profile, index) => {
              const metrics = [
                { label: "avg_literacy", value: profile.avg_literacy },
                { label: "avg_internet", value: profile.avg_internet },
                { label: "avg_urban", value: profile.avg_urban },
                { label: "avg_density", value: profile.avg_density },
                { label: "avg_muslim", value: profile.avg_muslim },
                { label: "avg_margin", value: profile.avg_margin },
              ];

              return (
                <div key={profile.cluster} className="space-y-4">
                  <Panel title={`Cluster ${profile.cluster} Summary`}>
                    <p className="text-lg" style={{ fontFamily: "var(--font-playfair), serif" }}>
                      {profile.n} constituencies
                    </p>
                  </Panel>
                  <HorizontalBarChart
                    title={`Cluster ${profile.cluster} Metrics`}
                    data={metrics.map((metric) => ({
                      label: metric.label,
                      value: metric.value,
                      color: index % 2 === 0 ? "#4a9e7a" : "#2a6aaa",
                      valueLabel: metric.value.toFixed(3),
                    }))}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="xl:sticky xl:top-0 xl:self-start">
          <RadarComparison
            title="Socioeconomic Radar (Normalized)"
            axes={axes}
            series={radarSeries}
            compact
            className="xl:max-h-[calc(100vh-220px)]"
          />
          <div className="mt-4">
            <Panel title="Outcome Metrics (Not Radar Inputs)">
              <div className="space-y-2 text-sm">
                {profiles.map((profile) => (
                  <div
                    key={`outcome-${profile.cluster}`}
                    className="flex items-center justify-between border border-white/10 bg-[#181814] px-3 py-2"
                  >
                    <span className="text-[#d8d3c6]">Cluster {profile.cluster} avg_margin</span>
                    <span className="font-mono text-[#9c9888]">{profile.avg_margin.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </section>
    </main>
  );
}
