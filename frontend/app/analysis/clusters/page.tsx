import {
  GroupedBarChart,
  Panel,
  RadarComparison,
  ScatterPlot,
  type ScatterPoint,
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
    label: "Rural · Low Development",
  },
  {
    cluster: 1,
    n: 20,
    avg_literacy: 71.0,
    avg_internet: 38.5,
    avg_urban: 47.6,
    avg_turnout: 51.8,
    avg_margin: 11.77,
    label: "Semi-Urban · Connected",
  },
  {
    cluster: 2,
    n: 114,
    avg_literacy: 73.5,
    avg_internet: 30.0,
    avg_urban: 31.6,
    avg_turnout: 57.9,
    avg_margin: 17.53,
    label: "Mixed · Moderate",
  },
  {
    cluster: 3,
    n: 32,
    avg_literacy: 77.6,
    avg_internet: 40.2,
    avg_urban: 46.0,
    avg_turnout: 56.4,
    avg_margin: 20.52,
    label: "Urban · High Literacy",
  },
  {
    cluster: 4,
    n: 61,
    avg_literacy: 81.8,
    avg_internet: 52.0,
    avg_urban: 46.3,
    avg_turnout: 54.7,
    avg_margin: 21.38,
    label: "Metropolitan Elite",
  },
];

const CLUSTER_COLORS: Record<number, string> = {
  0: "#ef4444",
  1: "#3b82f6",
  2: "#10b981",
  3: "#f59e0b",
  4: "#8b5cf6",
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
  const visualFloor = 0.2;

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

  const axes = ["Literacy", "Internet", "Urban", "Turnout", "Margin"];
  const rawByAxis = {
    Literacy: CLUSTER_PROFILES.map((profile) => profile.avg_literacy),
    Internet: CLUSTER_PROFILES.map((profile) => profile.avg_internet),
    Urban: CLUSTER_PROFILES.map((profile) => profile.avg_urban),
    Turnout: CLUSTER_PROFILES.map((profile) => profile.avg_turnout),
    Margin: CLUSTER_PROFILES.map((profile) => profile.avg_margin),
  };

  const normalizedByAxis = {
    Literacy: normalizeSeries(rawByAxis.Literacy),
    Internet: normalizeSeries(rawByAxis.Internet),
    Urban: normalizeSeries(rawByAxis.Urban),
    Turnout: normalizeSeries(rawByAxis.Turnout),
    Margin: normalizeSeries(rawByAxis.Margin),
  };

  const radarSeries = CLUSTER_PROFILES.map((profile, index) => ({
    name: `C${profile.cluster} · ${profile.label.split("·")[0].trim()}`,
    color: CLUSTER_COLORS[profile.cluster],
    values: axes.map((axis) => normalizedByAxis[axis as keyof typeof normalizedByAxis][index]),
  }));

  const groupedData = PARTY_BY_CLUSTER.map((row) => ({
    label: `Cluster ${row.cluster} (${CLUSTER_PROFILES[row.cluster].label.split("·")[0].trim()})`,
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
  const scatterPoints: ScatterPoint[] = constituencyDataset.rows
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
        label: `${seat.constituency} (${seat.district})`,
        detail: `${clusterProfile.label} · ${seat.winner_party ?? "Winner N/A"}`,
      };
    })
    .filter((point): point is NonNullable<typeof point> => point !== null);

  return (
    <div className="space-y-4">
      {/* 5 Socioeconomic Archetype Dossier Cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {CLUSTER_PROFILES.map((profile) => {
          const partyStats = PARTY_BY_CLUSTER.find((row) => row.cluster === profile.cluster);
          const dominant = partyStats ? dominantParty(partyStats) : { name: "N/A", sharePct: 0 };
          const color = CLUSTER_COLORS[profile.cluster];

          return (
            <article
              key={profile.cluster}
              className="border border-[var(--border)] bg-[var(--bg-surface)] p-4 rounded-none transition-all hover:border-[var(--border-active)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Archetype {profile.cluster}
                </span>
                <span className="h-2 w-2 shrink-0" style={{ backgroundColor: color }} />
              </div>
              <p className="mt-2 font-serif text-sm font-bold text-[var(--text-primary)]">
                {profile.label}
              </p>
              <div className="mt-3 space-y-1 font-mono text-[11px] text-[var(--text-secondary)] border-t border-[var(--border-subtle)] pt-2">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Seats:</span>
                  <span className="font-bold text-[var(--text-primary)]">{profile.n}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Turnout:</span>
                  <span className="tabular-nums">{profile.avg_turnout.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Margin:</span>
                  <span className="tabular-nums">{profile.avg_margin.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[var(--border-subtle)] font-semibold">
                  <span className="text-[var(--text-muted)]">Dominant:</span>
                  <span style={{ color }}>{dominant.name} ({dominant.sharePct}%)</span>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Signature Radar & Grouped Political Control */}
      <section className="grid gap-6 lg:grid-cols-2">
        <RadarComparison
          title="Socioeconomic Signature Radar (K-Means Normalized)"
          axes={axes}
          series={radarSeries}
          height={400}
        />

        <GroupedBarChart
          title="Parliamentary Seats by Typology Cluster"
          data={groupedData}
          series={[
            { key: "bnp", label: "BNP", color: "#10b981" },
            { key: "jamaat", label: "Jamaat", color: "#3b82f6" },
            { key: "others", label: "Others", color: "#f59e0b" },
          ]}
          xAxisLabel="Constituency Typology"
          yAxisLabel="Seat Count"
          height={340}
        />
      </section>

      {/* Scatter Canvas: Turnout vs Urbanization by Cluster */}
      <section>
        <ScatterPlot
          title="Constituency Voter Turnout vs. Urbanization Index (by Cluster)"
          data={scatterPoints}
          xAxisLabel="Urbanization Index (%)"
          yAxisLabel="General Election Turnout (%)"
          height={420}
          showRegressionLine={false}
          groupColors={groupColors}
        />
      </section>

      {/* Editorial Typology Takeaways */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Cluster Characteristics & Polarization"
          subtitle="How demographic clusters define election battlegrounds"
        >
          <p className="font-sans text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
            Cluster 4 (Metropolitan Elite) exhibits the highest digital penetration and literacy yet records compressed voter margins, signaling fierce multi-candidate engagement. Conversely, Cluster 0 (Rural Low Development) maintains traditional turnout but exhibits wide victory margins for incumbent networks.
          </p>
        </Panel>

        <Panel
          title="Electoral Coalition Geography"
          subtitle="Where minority alliances make inroads"
        >
          <p className="font-sans text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
            While BNP commands pluralities across all five demographic strata, Jamaat-e-Islami and independent slates secure their strongest seat conversions in Cluster 1 (Semi-Urban Connected) and Cluster 2 (Mixed Moderate), where agrarian-commercial crossroads amplify local candidate brand equity.
          </p>
        </Panel>
      </section>
    </div>
  );
}
