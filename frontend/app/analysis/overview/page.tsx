import { getConstituencyDataset, getSummaryDataset } from "@/lib/data";
import {
  HistogramChart,
  HorizontalBarChart,
  MetricCards,
  Panel,
  VerticalBarChart,
} from "@/components/analysis/charts";
import { getAllianceColor } from "@/lib/colors";

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
      label: `${start.toFixed(1)}-${end.toFixed(1)}`,
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
      color: "#2a6aaa",
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
    <main className="min-h-screen bg-[#0d0d0b] px-4 pb-10 text-[#f0ece2] sm:px-10">
      <Panel title="What This Page Shows">
        <p className="text-sm leading-6 text-[#c8c3b5]">
          This page gives a quick national briefing before deeper model analysis. Read top cards for the headline,
          then use party/division bars for power distribution, and the two histograms to understand voter behavior and
          race competitiveness.
        </p>
      </Panel>

      <MetricCards
        cards={[
          { label: "Total Seats", value: String(summary.total_seats), detail: `${summary.divisions.length} divisions` },
          {
            label: "Top Party",
            value: `${summary.top_party.party} (${summary.top_party.seat_count})`,
            detail: `${summary.top_party.seat_share_pct.toFixed(2)}% seat share`,
          },
          { label: "Avg Turnout", value: formatPercent(summary.avg_turnout) },
          { label: "Avg Margin", value: formatPercent(summary.avg_margin) },
          { label: "Avg Candidates", value: summary.avg_candidate_count?.toFixed(2) ?? "N/A" },
        ]}
      />

      <section className="mt-6 grid gap-4 xl:grid-cols-3">
        <Panel title="Key Takeaway 1">
          <p className="text-sm text-[#d8d3c6]">
            {leadingAlliance[0].toUpperCase()} leads with {leadingAlliance[1]} seats nationally, while
            {" "}
            {summary.top_party.party} alone holds {summary.top_party.seat_share_pct.toFixed(1)}% of all seats.
          </p>
        </Panel>
        <Panel title="Key Takeaway 2">
          <p className="text-sm text-[#d8d3c6]">
            {competitiveSeats.length} constituencies are highly competitive (margin below {threshold}%). These are the
            most volatile seats for future election swings.
          </p>
        </Panel>
        <Panel title="Key Takeaway 3">
          <p className="text-sm text-[#d8d3c6]">
            Turnout is highest in {highestTurnoutDivision?.division ?? "N/A"} ({highestTurnoutDivision?.turnout.toFixed(2) ?? "N/A"}%) and lowest in
            {" "}
            {lowestTurnoutDivision?.division ?? "N/A"} ({lowestTurnoutDivision?.turnout.toFixed(2) ?? "N/A"}%).
          </p>
        </Panel>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <HorizontalBarChart
          title="Seats by Party"
          data={partyData}
          xAxisLabel="Seats"
          yAxisLabel="Party"
          height={320}
          valueDecimals={0}
          maxBarFillPercent={88}
        />
        <VerticalBarChart
          title="Seats by Division"
          data={divisionData}
          xAxisLabel="Division"
          yAxisLabel="Seat Count"
          height={320}
          valueDecimals={0}
        />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <HistogramChart
          title="Turnout Distribution"
          data={turnoutBuckets}
          color="#4a9e7a"
          xAxisLabel="Voter Turnout (%)"
          yAxisLabel="Number of Constituencies"
          height={320}
        />
        <HistogramChart
          title="Winning Margin Distribution"
          data={marginBuckets}
          color="#2a6aaa"
          xAxisLabel="Winning Margin (%)"
          yAxisLabel="Number of Constituencies"
          height={320}
        />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <Panel title="How To Interpret Turnout Distribution">
          <p className="text-sm leading-6 text-[#c8c3b5]">
            Bars show how many constituencies fall into each turnout range. If bars cluster tightly in the middle,
            turnout behavior is consistent nationwide. Wider spread implies stronger local variation that may require
            division-specific campaign strategy.
          </p>
        </Panel>
        <Panel title="How To Interpret Margin Distribution">
          <p className="text-sm leading-6 text-[#c8c3b5]">
            Lower-margin bins indicate competitive seats, while higher bins indicate safe seats. A large share of
            low-margin seats means coalition shifts or local issues can significantly change seat outcomes.
          </p>
        </Panel>
      </section>
    </main>
  );
}
