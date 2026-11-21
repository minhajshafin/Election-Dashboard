import { getConstituencyDataset, getSummaryDataset } from "@/lib/data";
import {
  HistogramChart,
  HorizontalBarChart,
  MetricCards,
  Panel,
  VerticalBarChart,
} from "@/components/analysis/charts";
import { DEFAULT_DIVISION_COLORS, getAllianceColor } from "@/lib/colors";

function formatPercent(value: number | null): string {
  if (value === null) {
    return "N/A";
  }

  return `${value.toFixed(2)}%`;
}

function buildDynamicBins(values: Array<number | null>, binCount: number) {
  const cleanValues = values.filter((value): value is number => value !== null);
  if (cleanValues.length === 0) {
    return [];
  }

  const min = Math.min(...cleanValues);
  const max = Math.max(...cleanValues);
  if (min === max) {
    return [{ label: `${min.toFixed(1)}-${max.toFixed(1)}`, count: cleanValues.length }];
  }

  const width = (max - min) / binCount;
  const counts = new Array(binCount).fill(0);

  for (const value of cleanValues) {
    const index = Math.min(binCount - 1, Math.floor((value - min) / width));
    counts[index] += 1;
  }

  return counts.map((count, index) => {
    const start = min + index * width;
    const end = index === binCount - 1 ? max : start + width;
    return {
      label: `${start.toFixed(1)}–${end.toFixed(1)}%`,
      count,
    };
  });
}

export default async function AnalysisOverviewPage() {
  const [summaryDataset, constituencyDataset] = await Promise.all([
    getSummaryDataset(),
    getConstituencyDataset(),
  ]);

  const summary = summaryDataset.summary;
  const seats = constituencyDataset.rows;

  const turnoutBuckets = buildDynamicBins(
    seats.map((seat) => seat.turnout_pct),
    8,
  );
  const marginBuckets = buildDynamicBins(
    seats.map((seat) => seat.winning_margin_pct),
    10,
  );

  const partyAllianceCounts = new Map<string, Map<string, number>>();
  for (const seat of seats) {
    if (!seat.winner_party) {
      continue;
    }

    const existing = partyAllianceCounts.get(seat.winner_party) ?? new Map<string, number>();
    const allianceKey = (seat.alliance ?? "others").toLowerCase();
    existing.set(allianceKey, (existing.get(allianceKey) ?? 0) + 1);
    partyAllianceCounts.set(seat.winner_party, existing);
  }

  function allianceForParty(party: string): string {
    const counts = partyAllianceCounts.get(party);
    if (!counts) {
      return "others";
    }

    return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? "others";
  }

  const partyData = [...summary.party_rankings]
    .sort((left, right) => right.seat_count - left.seat_count)
    .map((party) => ({
      label: party.party,
      value: party.seat_count,
      color: getAllianceColor(allianceForParty(party.party)),
      valueLabel: `${party.seat_count} seats`,
    }));

  const divisionData = [...summary.divisions]
    .sort((left, right) => right.seat_count - left.seat_count)
    .map((division) => ({
      label: division.division,
      value: division.seat_count,
      color: DEFAULT_DIVISION_COLORS[division.division] ?? "#1d4ed8",
      valueLabel: `${division.seat_count}`,
    }));

  const threshold = summary.competitive_seats.threshold_pct;
  const competitiveSeats = seats.filter(
    (seat) => seat.winning_margin_pct !== null && seat.winning_margin_pct < threshold,
  );

  const divisionTurnout = summary.divisions
    .map((division) => {
      const rows = seats.filter((seat) => seat.division === division.division && seat.turnout_pct !== null);
      const average = rows.length
        ? rows.reduce((acc, seat) => acc + (seat.turnout_pct ?? 0), 0) / rows.length
        : 0;

      return {
        division: division.division,
        turnout: average,
      };
    })
    .sort((left, right) => right.turnout - left.turnout);

  const highestTurnoutDivision = divisionTurnout[0];
  const lowestTurnoutDivision = divisionTurnout[divisionTurnout.length - 1];
  const leadingAlliance =
    Object.entries(summary.seats_by_alliance).sort((left, right) => right[1] - left[1])[0] ?? ["N/A", 0];

  return (
    <div className="space-y-4">
      {/* Top 5 Headline Metric Bento Cards */}
      <MetricCards
        cards={[
          { label: "Total Seats", value: String(summary.total_seats), detail: `${summary.divisions.length} divisions declared` },
          {
            label: "Dominant Party",
            value: `${summary.top_party.party} (${summary.top_party.seat_count})`,
            detail: `${summary.top_party.seat_share_pct.toFixed(1)}% parliamentary share`,
          },
          { label: "National Turnout", value: formatPercent(summary.avg_turnout), detail: "Mean constituency turnout" },
          { label: "Average Margin", value: formatPercent(summary.avg_margin), detail: "Lead over runner-up" },
          { label: "Candidates / Seat", value: summary.avg_candidate_count?.toFixed(1) ?? "N/A", detail: "Ballot competition density" },
        ]}
      />

      {/* Editorial Key Findings Dossier */}
      <section className="grid gap-2.5 sm:gap-3 md:grid-cols-3">
        <article className="border border-[var(--border)] bg-[var(--bg-surface)] p-3.5 sm:p-4 rounded-none">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 bg-emerald-500 shrink-0" />
            <h3 className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              01 · Coalition Stance
            </h3>
          </div>
          <p className="font-sans text-xs leading-relaxed text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)] font-semibold">{leadingAlliance[0].toUpperCase()}</strong> leads with{" "}
            <span className="font-mono font-bold text-[var(--text-primary)]">{leadingAlliance[1]} seats</span> nationwide, while{" "}
            {summary.top_party.party} alone secured {summary.top_party.seat_share_pct.toFixed(1)}% of all declared seats.
          </p>
        </article>

        <article className="border border-[var(--border)] bg-[var(--bg-surface)] p-3.5 sm:p-4 rounded-none">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 bg-amber-500 shrink-0" />
            <h3 className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              02 · Battleground Volatility
            </h3>
          </div>
          <p className="font-sans text-xs leading-relaxed text-[var(--text-secondary)]">
            <span className="font-mono font-bold text-[var(--text-primary)]">{competitiveSeats.length} constituencies</span> are highly contested with winning margins below {threshold}%. These represent key swing battlegrounds for subsequent electoral cycles.
          </p>
        </article>

        <article className="border border-[var(--border)] bg-[var(--bg-surface)] p-3.5 sm:p-4 rounded-none">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 bg-blue-500 shrink-0" />
            <h3 className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              03 · Regional Participation
            </h3>
          </div>
          <p className="font-sans text-xs leading-relaxed text-[var(--text-secondary)]">
            Turnout peaked in <strong className="text-[var(--text-primary)] font-semibold">{highestTurnoutDivision?.division}</strong> ({highestTurnoutDivision?.turnout.toFixed(1)}%), contrasting with <strong className="text-[var(--text-primary)] font-semibold">{lowestTurnoutDivision?.division}</strong> ({lowestTurnoutDivision?.turnout.toFixed(1)}%).
          </p>
        </article>
      </section>

      {/* Power Distribution Charts */}
      <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <HorizontalBarChart
          title="Parliamentary Seats by Party"
          data={partyData}
          xAxisLabel="Seats Won"
          yAxisLabel="Political Party"
          height={320}
          valueDecimals={0}
          maxBarFillPercent={90}
        />
        <VerticalBarChart
          title="Seat Allocation by Administrative Division"
          data={divisionData}
          xAxisLabel="Division"
          yAxisLabel="Constituencies"
          height={320}
          valueDecimals={0}
        />
      </section>

      {/* Histograms: Turnout & Winning Margin Distributions */}
      <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <HistogramChart
          title="Constituency Voter Turnout Distribution"
          data={turnoutBuckets}
          color="#059669"
          xAxisLabel="Turnout Percentage Range"
          yAxisLabel="Number of Seats"
          height={300}
        />
        <HistogramChart
          title="Constituency Winning Margin Distribution"
          data={marginBuckets}
          color="#1d4ed8"
          xAxisLabel="Victory Margin Percentage Range"
          yAxisLabel="Number of Seats"
          height={300}
        />
      </section>

      {/* Methodological Guidance Panels */}
      <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Panel
          title="Turnout Distribution Dynamics"
          subtitle="Interpreting voter participation spread"
        >
          <p className="font-sans text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
            Bars aggregate constituencies into discrete turnout brackets. Tight clustering around the median indicates uniform national civic mobilization, whereas pronounced bimodality indicates stark urban-rural divides or localized boycott dynamics.
          </p>
        </Panel>

        <Panel
          title="Competitiveness & Margin Spread"
          subtitle="Understanding seat vulnerability"
        >
          <p className="font-sans text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
            The leftward skew in the margin distribution highlights seats decided by razor-thin leads. When over 20% of constituencies fall under a 10% margin, parliamentary control remains highly sensitive to minor swing voter shifts.
          </p>
        </Panel>
      </section>
    </div>
  );
}
