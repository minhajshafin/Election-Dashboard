import { ExplorerShell } from "@/components/explorer/ExplorerShell";
import { PrimaryNav } from "@/components/nav/PrimaryNav";
import { getConstituencyDataset, getSummaryDataset } from "@/lib/data";

export default async function ExplorerPage() {
  const [constituencyDataset, summaryDataset] = await Promise.all([
    getConstituencyDataset(),
    getSummaryDataset(),
  ]);

  const { rows } = constituencyDataset;
  const divisions = Object.keys(summaryDataset.summary.division_seat_counts).sort((left, right) =>
    left.localeCompare(right),
  );
  const alliances = Object.keys(summaryDataset.summary.seats_by_alliance).sort((left, right) =>
    left.localeCompare(right),
  );
  const parties = summaryDataset.summary.party_rankings.map((party) => party.party);

  return (
    <>
      <PrimaryNav />
      <ExplorerShell seats={rows} divisions={divisions} alliances={alliances} parties={parties} />
    </>
  );
}
