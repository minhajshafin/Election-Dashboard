"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { getSeatColor } from "@/lib/colors";
import { getSeatElectionStatus } from "@/lib/electionStatus";
import type { ConstituencyRow } from "@/types/api";

interface ExplorerShellProps {
  seats: ConstituencyRow[];
  divisions: string[];
  alliances: string[];
  parties: string[];
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "N/A";
  }

  return `${value.toFixed(2)}%`;
}

export function ExplorerShell({ seats, divisions, alliances, parties }: ExplorerShellProps) {
  const [search, setSearch] = useState("");
  const [division, setDivision] = useState("all");
  const [alliance, setAlliance] = useState("all");
  const [party, setParty] = useState("all");

  const filteredSeats = useMemo(() => {
    const query = search.trim().toLowerCase();

    return seats
      .filter((seat) => {
        const searchMatch =
          query.length === 0 ||
          [seat.constituency, seat.district, seat.division, seat.winner_party, seat.winner_candidate]
            .join(" ")
            .toLowerCase()
            .includes(query);
        const divisionMatch = division === "all" || seat.division === division;
        const allianceMatch = alliance === "all" || seat.alliance === alliance;
        const partyMatch = party === "all" || seat.winner_party === party;

        return searchMatch && divisionMatch && allianceMatch && partyMatch;
      })
      .sort((left, right) => left.constituency.localeCompare(right.constituency));
  }, [alliance, division, party, search, seats]);

  return (
    <main className="min-h-screen bg-[#0b0c0e] text-[#f4f1ea]">
      <section className="border-b border-white/[0.07] px-4 py-5 sm:px-10 sm:py-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">Constituency Explorer</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight sm:text-3xl" style={{ fontFamily: "var(--font-playfair), serif" }}>
          Search, filter, and compare all 300 constituencies
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[#a1a1aa]">
          Slice electoral data by division, political alliance, or winning party with instant drill-down.
        </p>
      </section>

      <section className="grid gap-3 border-b border-white/[0.07] bg-[#0e0f13] px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-10">
        <label className="flex flex-col gap-1.5 text-xs text-[#a1a1aa]">
          Search
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Seat, district, division, winner"
            className="h-10 rounded-md border border-white/10 bg-[#121317] px-3 font-mono text-xs text-[#f4f1ea] outline-none transition focus:border-[#d4af37]/60"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-[#a1a1aa]">
          Division
          <select
            value={division}
            onChange={(event) => setDivision(event.target.value)}
            className="h-10 rounded-md border border-white/10 bg-[#121317] px-3 font-mono text-xs text-[#f4f1ea] outline-none transition focus:border-[#d4af37]/60"
          >
            <option value="all">All divisions</option>
            {divisions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-[#a1a1aa]">
          Alliance
          <select
            value={alliance}
            onChange={(event) => setAlliance(event.target.value)}
            className="h-10 rounded-md border border-white/10 bg-[#121317] px-3 font-mono text-xs text-[#f4f1ea] outline-none transition focus:border-[#d4af37]/60"
          >
            <option value="all">All alliances</option>
            {alliances.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-[#a1a1aa]">
          Winning party
          <select
            value={party}
            onChange={(event) => setParty(event.target.value)}
            className="h-10 rounded-md border border-white/10 bg-[#121317] px-3 font-mono text-xs text-[#f4f1ea] outline-none transition focus:border-[#d4af37]/60"
          >
            <option value="all">All parties</option>
            {parties.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="px-4 py-6 sm:px-10">
        <div className="mb-3.5 flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#71717a]">
            Matching constituencies
          </p>
          <span className="rounded bg-[#d4af37]/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#d4af37]">
            {filteredSeats.length} seats
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-white/[0.07] bg-[#121317] shadow-sm">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-[#16171c] text-[10px] uppercase tracking-[0.15em] text-[#a1a1aa] border-b border-white/[0.07]">
              <tr>
                <th className="px-3.5 py-3">Constituency</th>
                <th className="px-3.5 py-3">District</th>
                <th className="px-3.5 py-3">Division</th>
                <th className="px-3.5 py-3">Winner</th>
                <th className="px-3.5 py-3">Party</th>
                <th className="px-3.5 py-3">Alliance</th>
                <th className="px-3.5 py-3">Turnout</th>
                <th className="px-3.5 py-3">Margin</th>
                <th className="px-3.5 py-3">Candidates</th>
              </tr>
            </thead>
            <tbody>
              {filteredSeats.map((seat) => {
                const status = getSeatElectionStatus(seat);

                return (
                  <tr key={seat.seat_key} className="border-t border-white/[0.04] transition hover:bg-white/[0.02]">
                    <td className="px-3.5 py-2.5 font-medium text-[#f4f1ea]">
                      <Link className="underline-offset-4 hover:text-[#d4af37] hover:underline" href={`/?seat=${encodeURIComponent(seat.seat_key)}`}>
                        {seat.constituency}
                      </Link>
                    </td>
                    <td className="px-3.5 py-2.5 text-[#a1a1aa]">{seat.district}</td>
                    <td className="px-3.5 py-2.5 text-[#a1a1aa]">{seat.division}</td>
                    <td className="px-3.5 py-2.5 text-[#f4f1ea]">
                      {status.isPostponed ? status.label : seat.winner_candidate}
                    </td>
                    <td className="px-3.5 py-2.5 text-[#a1a1aa]">
                      {status.isPostponed ? status.reason : seat.winner_party}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-[#f4f1ea]">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getSeatColor(seat) }} />
                        {seat.alliance}
                      </span>
                    </td>
                    <td className="details-number px-3.5 py-2.5 text-[#f4f1ea]">{formatPercent(seat.turnout_pct)}</td>
                    <td className="details-number px-3.5 py-2.5 text-[#f4f1ea]">{formatPercent(seat.winning_margin_pct)}</td>
                    <td className="details-number px-3.5 py-2.5 text-[#a1a1aa]">{formatNumber(seat.candidate_count)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
