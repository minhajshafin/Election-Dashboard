"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { getAllianceColor } from "@/lib/colors";
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
    <main className="min-h-screen bg-[#0d0d0b] text-[#f0ece2]">
      <section className="border-b border-white/8 px-4 py-5 sm:px-10 sm:py-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c9a84c]">Constituency Explorer</p>
        <h1 className="mt-2 text-2xl leading-tight sm:text-3xl" style={{ fontFamily: "var(--font-playfair), serif" }}>
          Search, filter, and compare all 299 constituencies
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-[#9c9888]">
          Use filters to slice by division, alliance, or winning party. Selecting a seat opens the landing map with that
          constituency pre-selected.
        </p>
      </section>

      <section className="grid gap-3 border-b border-white/8 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-10">
        <label className="flex flex-col gap-1.5 text-xs text-[#9c9888]">
          Search
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Seat, district, division, winner"
            className="h-10 border border-white/15 bg-[#11110f] px-3 text-sm text-[#f0ece2] outline-none transition focus:border-[#c9a84c]"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-[#9c9888]">
          Division
          <select
            value={division}
            onChange={(event) => setDivision(event.target.value)}
            className="h-10 border border-white/15 bg-[#11110f] px-3 text-sm text-[#f0ece2] outline-none transition focus:border-[#c9a84c]"
          >
            <option value="all">All divisions</option>
            {divisions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-[#9c9888]">
          Alliance
          <select
            value={alliance}
            onChange={(event) => setAlliance(event.target.value)}
            className="h-10 border border-white/15 bg-[#11110f] px-3 text-sm text-[#f0ece2] outline-none transition focus:border-[#c9a84c]"
          >
            <option value="all">All alliances</option>
            {alliances.map((item) => (
              <option key={item} value={item}>
                {item}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-[#9c9888]">
          Winning party
          <select
            value={party}
            onChange={(event) => setParty(event.target.value)}
            className="h-10 border border-white/15 bg-[#11110f] px-3 text-sm text-[#f0ece2] outline-none transition focus:border-[#c9a84c]"
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

      <section className="px-4 py-4 sm:px-10">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#5a5848]">
            Matching constituencies
          </p>
          <span className="rounded bg-[#c9a84c]/15 px-2 py-1 font-mono text-[11px] text-[#c9a84c]">
            {filteredSeats.length}
          </span>
        </div>

        <div className="overflow-x-auto border border-white/10">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-[#151512] text-[11px] uppercase tracking-[0.13em] text-[#9c9888]">
              <tr>
                <th className="px-3 py-2">Constituency</th>
                <th className="px-3 py-2">District</th>
                <th className="px-3 py-2">Division</th>
                <th className="px-3 py-2">Winner</th>
                <th className="px-3 py-2">Party</th>
                <th className="px-3 py-2">Alliance</th>
                <th className="px-3 py-2">Turnout</th>
                <th className="px-3 py-2">Margin</th>
                <th className="px-3 py-2">Candidates</th>
              </tr>
            </thead>
            <tbody>
              {filteredSeats.map((seat) => (
                <tr key={seat.seat_key} className="border-t border-white/10 hover:bg-[#151512]">
                  <td className="px-3 py-2 font-medium text-[#f0ece2]">
                    <Link className="underline-offset-4 hover:underline" href={`/?seat=${encodeURIComponent(seat.seat_key)}`}>
                      {seat.constituency}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-[#d8d3c6]">{seat.district}</td>
                  <td className="px-3 py-2 text-[#d8d3c6]">{seat.division}</td>
                  <td className="px-3 py-2 text-[#d8d3c6]">{seat.winner_candidate}</td>
                  <td className="px-3 py-2 text-[#d8d3c6]">{seat.winner_party}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2 text-[#d8d3c6]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getAllianceColor(seat.alliance) }} />
                      {seat.alliance}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[#d8d3c6]">{formatPercent(seat.turnout_pct)}</td>
                  <td className="px-3 py-2 text-[#d8d3c6]">{formatPercent(seat.winning_margin_pct)}</td>
                  <td className="px-3 py-2 text-[#d8d3c6]">{formatNumber(seat.candidate_count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
