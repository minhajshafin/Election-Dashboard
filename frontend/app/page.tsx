import { getSummaryDataset } from "@/lib/data";

export default async function Home() {
  const { summary } = await getSummaryDataset();

  return (
    <main>
      <h1>Election Dashboard</h1>
      <p>Total Seats: {summary.total_seats}</p>
      <p>
        Top Party: {summary.top_party.party} ({summary.top_party.seat_count})
      </p>
    </main>
  );
}
