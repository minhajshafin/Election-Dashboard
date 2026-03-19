import { getConstituencyDataset, getSummaryDataset } from "@/lib/data";
import {
  HistogramChart,
  HorizontalBarChart,
  MetricCards,
  Panel,
} from "@/components/analysis/charts";

function formatPercent(value: number | null): string {
  if (value === null) {
    return "N/A";
  }

  return `${value.toFixed(2)}%`;
}

function buildBuckets(values: Array<number | null>, bucketSize: number) {
  const buckets = new Map<string, number>();

  for (const value of values) {
    if (value === null) {
      continue;
    }

    const floor = Math.floor(value / bucketSize) * bucketSize;
    const ceil = floor + bucketSize;
    const label = `${floor}-${ceil}`;
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }

  return Array.from(buckets.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => Number(left.label.split("-")[0]) - Number(right.label.split("-")[0]));
}

export default async function AnalysisOverviewPage() {
  const [summaryDataset, constituencyDataset] = await Promise.all([
    getSummaryDataset(),
    getConstituencyDataset(),
  ]);

  const summary = summaryDataset.summary;
  const seats = constituencyDataset.rows;

  const turnoutBuckets = buildBuckets(
    seats.map((seat) => seat.turnout_pct),
    10,
  );
  const marginBuckets = buildBuckets(
    seats.map((seat) => seat.winning_margin_pct),
    5,
  );

  const partyData = summary.party_rankings.map((party) => ({
    label: party.party,
    value: party.seat_count,
    color: "#c9a84c",
    valueLabel: `${party.seat_count} seats`,
  }));

  const divisionData = summary.divisions.map((division) => ({
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
        <HorizontalBarChart title="Seats by Party" data={partyData} />
        <HorizontalBarChart title="Seats by Division" data={divisionData} />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <HistogramChart title="Turnout Distribution" data={turnoutBuckets} color="#4a9e7a" />
        <HistogramChart title="Margin Distribution" data={marginBuckets} color="#2a6aaa" />
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
