import { getConstituencyDataset, getSummaryDataset } from "@/lib/data";

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

  return Array.from(buckets.entries()).map(([label, count]) => ({ label, count }));
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

  return (
    <main className="min-h-screen bg-[#0d0d0b] px-4 pb-10 text-[#f0ece2] sm:px-10">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Total Seats", String(summary.total_seats)],
          ["Top Party", `${summary.top_party.party} (${summary.top_party.seat_count})`],
          ["Avg Turnout", formatPercent(summary.avg_turnout)],
          ["Avg Margin", formatPercent(summary.avg_margin)],
          ["Avg Candidates", summary.avg_candidate_count?.toFixed(2) ?? "N/A"],
        ].map(([label, value]) => (
          <article key={label} className="border border-white/10 bg-[#141412] px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5a5848]">{label}</p>
            <p className="mt-2 text-lg text-[#f0ece2]">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <article className="border border-white/10 bg-[#141412] p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">Seats by Party</h2>
          <div className="mt-3 space-y-2">
            {summary.party_rankings.map((party) => (
              <div key={party.party} className="space-y-1">
                <div className="flex items-center justify-between text-sm text-[#d8d3c6]">
                  <span>{party.party}</span>
                  <span>{party.seat_count}</span>
                </div>
                <div className="h-1.5 bg-[#252521]">
                  <div className="h-full bg-[#c9a84c]" style={{ width: `${Math.max(party.seat_share_pct, 1)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-white/10 bg-[#141412] p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">Seats by Division</h2>
          <div className="mt-3 grid gap-2">
            {summary.divisions.map((division) => (
              <div key={division.division} className="flex items-center justify-between border border-white/10 px-3 py-2 text-sm">
                <span>{division.division}</span>
                <span className="font-mono text-[#9c9888]">{division.seat_count}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <article className="border border-white/10 bg-[#141412] p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">Turnout Distribution</h2>
          <div className="mt-3 space-y-2">
            {turnoutBuckets.map((bucket) => (
              <div key={bucket.label} className="flex items-center gap-3 text-sm">
                <span className="w-20 text-[#9c9888]">{bucket.label}%</span>
                <div className="h-2 flex-1 bg-[#252521]">
                  <div className="h-full bg-[#4a9e7a]" style={{ width: `${(bucket.count / seats.length) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-[#d8d3c6]">{bucket.count}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-white/10 bg-[#141412] p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">Margin Distribution</h2>
          <div className="mt-3 space-y-2">
            {marginBuckets.map((bucket) => (
              <div key={bucket.label} className="flex items-center gap-3 text-sm">
                <span className="w-20 text-[#9c9888]">{bucket.label}%</span>
                <div className="h-2 flex-1 bg-[#252521]">
                  <div className="h-full bg-[#2a6aaa]" style={{ width: `${(bucket.count / seats.length) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-[#d8d3c6]">{bucket.count}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
