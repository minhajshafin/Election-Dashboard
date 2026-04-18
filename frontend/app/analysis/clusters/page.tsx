import {
  GroupedBarChart,
  RadarComparison,
  ScatterPlot,
} from "@/components/analysis/charts";
import { getConstituencyDataset } from "@/lib/data";

interface ClusterProfile {
  cluster: number;
  n: number;
  avg_literacy: number;
  avg_internet: number;
  avg_urban: number;
  avg_turnout: number;
  avg_margin: number;
  label: string;
}

const CLUSTER_PROFILES: ClusterProfile[] = [
  {
    cluster: 0,
    n: 73,
    avg_literacy: 68.0,
    avg_internet: 21.1,
    avg_urban: 23.2,
    avg_turnout: 57.0,
    avg_margin: 22.13,
    label: "Rural - Low Development",
  },
  {
    cluster: 1,
    n: 20,
    avg_literacy: 71.0,
    avg_internet: 38.5,
    avg_urban: 47.6,
    avg_turnout: 51.8,
    avg_margin: 11.77,
    label: "Semi-Urban - Connected",
  },
  {
    cluster: 2,
    n: 114,
    avg_literacy: 73.5,
    avg_internet: 30.0,
    avg_urban: 31.6,
    avg_turnout: 57.9,
    avg_margin: 17.53,
    label: "Mixed - Moderate",
  },
  {
    cluster: 3,
    n: 32,
    avg_literacy: 77.6,
    avg_internet: 40.2,
    avg_urban: 46.0,
    avg_turnout: 56.4,
    avg_margin: 20.52,
    label: "Urban - High Literacy",
  },
  {
    cluster: 4,
    n: 61,
    avg_literacy: 81.8,
    avg_internet: 52.0,
    avg_urban: 46.3,
    avg_turnout: 54.7,
    avg_margin: 21.38,
    label: "Urban Elite - Digitally Advanced",
  },
];

const CLUSTER_COLORS: Record<number, string> = {
  0: "#ef4444",
  1: "#3b82f6",
  2: "#22c55e",
  3: "#f59e0b",
  4: "#a855f7",
};

const PARTY_BY_CLUSTER = [
  { cluster: 0, bnp: 48, jamaat: 13, others: 12 },
  { cluster: 1, bnp: 13, jamaat: 6, others: 1 },
  { cluster: 2, bnp: 72, jamaat: 23, others: 19 },
  { cluster: 3, bnp: 26, jamaat: 4, others: 2 },
  { cluster: 4, bnp: 49, jamaat: 7, others: 5 },
];

function normalizeSeries(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1e-6);
  const visualFloor = 0.16;

  return values.map((value) => {
    const normalized = (value - min) / span;
    return visualFloor + normalized * (1 - visualFloor);
  });
}

function dominantParty(row: { bnp: number; jamaat: number; others: number }) {
  const entries = [
    ["BNP", row.bnp],
    ["Jamaat", row.jamaat],
    ["Others", row.others],
  ] as const;

  const total = row.bnp + row.jamaat + row.others;
  const [name, seats] = [...entries].sort((left, right) => right[1] - left[1])[0];
  return {
    name,
    sharePct: total === 0 ? 0 : Math.round((seats / total) * 100),
  };
}

export default async function ClustersPage() {
  const constituencyDataset = await getConstituencyDataset();

  const axes = ["Literacy", "Internet", "Urban", "Turnout", "Avg Margin"];
  const rawByAxis = {
    Literacy: CLUSTER_PROFILES.map((profile) => profile.avg_literacy),
    Internet: CLUSTER_PROFILES.map((profile) => profile.avg_internet),
    Urban: CLUSTER_PROFILES.map((profile) => profile.avg_urban),
    Turnout: CLUSTER_PROFILES.map((profile) => profile.avg_turnout),
    "Avg Margin": CLUSTER_PROFILES.map((profile) => profile.avg_margin),
  };

  const normalizedByAxis = {
    Literacy: normalizeSeries(rawByAxis.Literacy),
    Internet: normalizeSeries(rawByAxis.Internet),
    Urban: normalizeSeries(rawByAxis.Urban),
    Turnout: normalizeSeries(rawByAxis.Turnout),
    "Avg Margin": normalizeSeries(rawByAxis["Avg Margin"]),
  };

  const radarSeries = CLUSTER_PROFILES.map((profile, index) => ({
    name: `Cluster ${profile.cluster} - ${profile.label}`,
    color: CLUSTER_COLORS[profile.cluster],
    values: axes.map((axis) => normalizedByAxis[axis as keyof typeof normalizedByAxis][index]),
  }));

  const groupedData = PARTY_BY_CLUSTER.map((row) => ({
    label: `Cluster ${row.cluster}`,
    values: {
      bnp: row.bnp,
      jamaat: row.jamaat,
      others: row.others,
    },
  }));

  const groupColors: Record<string, string> = Object.fromEntries(
    CLUSTER_PROFILES.map((profile) => [`Cluster ${profile.cluster}`, CLUSTER_COLORS[profile.cluster]]),
  );

  const profileLookup = new Map(CLUSTER_PROFILES.map((profile) => [profile.cluster, profile]));
  const scatterPoints = constituencyDataset.rows
    .map((seat) => {
      if (seat.cluster === null || seat.turnout_pct === null || seat.urbanization_index === null) {
        return null;
      }

      const clusterId = Number(seat.cluster);
      const clusterProfile = profileLookup.get(clusterId);
      if (!clusterProfile) {
        return null;
      }

      return {
        x: seat.urbanization_index,
        y: seat.turnout_pct,
        group: `Cluster ${clusterId}`,
        label: seat.constituency,
        detail: clusterProfile.label,
      };
    })
    .filter((point): point is { x: number; y: number; group: string; label: string; detail: string } => point !== null);

  return (
    <main className="min-h-screen bg-[#0d0d0b] px-4 pb-10 text-[#f0ece2] sm:px-10">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {CLUSTER_PROFILES.map((profile) => {
          const partyStats = PARTY_BY_CLUSTER.find((row) => row.cluster === profile.cluster);
          const dominant = partyStats ? dominantParty(partyStats) : { name: "N/A", sharePct: 0 };

          return (
            <article key={profile.cluster} className="border border-white/10 bg-[#141412] px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5a5848]">Cluster {profile.cluster}</p>
              <p className="mt-2 text-sm text-[#f0ece2]">{profile.label}</p>
              <p className="mt-2 text-xs text-[#c8c3b5]">n = {profile.n} constituencies</p>
              <p className="mt-1 text-xs text-[#c8c3b5]">Avg turnout: {profile.avg_turnout.toFixed(1)}%</p>
              <p className="mt-1 text-xs" style={{ color: CLUSTER_COLORS[profile.cluster] }}>
                Dominant: {dominant.name} {dominant.sharePct}%
              </p>
            </article>
          );
        })}
      </section>

      <section className="mt-6">
        <RadarComparison
          title="Socioeconomic Signature Radar by Cluster"
          axes={axes}
          series={radarSeries}
          height={480}
        />

        <div className="mt-3 rounded border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-4 py-3 text-sm text-[#f7d38d]">
          Cluster 4 consistently dominates literacy and internet access, while Cluster 0 remains the least developed on
          nearly all axes.
        </div>
      </section>

      <section className="mt-6">
        <GroupedBarChart
          title="Party Seat Distribution by Cluster"
          data={groupedData}
          series={[
            { key: "bnp", label: "BNP", color: "#22c55e" },
            { key: "jamaat", label: "Jamaat", color: "#3b82f6" },
            { key: "others", label: "Others", color: "#f59e0b" },
          ]}
          xAxisLabel="Cluster"
          yAxisLabel="Seat Count"
          height={320}
        />

        <div className="mt-3 rounded border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-4 py-3 text-sm text-[#f7d38d]">
          BNP leads in every cluster, but Cluster 1 and Cluster 2 show relatively stronger Jamaat presence compared
          with urban clusters.
        </div>
      </section>

      <section className="mt-6">
        <ScatterPlot
          title="Turnout vs Urbanisation (Colored by Cluster)"
          points={scatterPoints}
          xAxisLabel="Urbanisation Index (%)"
          yAxisLabel="Voter Turnout (%)"
          xUnit="%"
          yUnit="%"
          height={400}
          groupColors={groupColors}
        />
      </section>
    </main>
  );
}
