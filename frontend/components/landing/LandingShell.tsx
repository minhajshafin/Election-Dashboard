"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { getSeatColor, getSeatSoftColor } from "@/lib/colors";
import { findGeoFeatureForSeat, type BangladeshGeoJson } from "@/lib/geo";
import type { ConstituencyDataset, ConstituencyRow, SummaryDataset } from "@/types/api";
import { PrimaryNav } from "@/components/nav/PrimaryNav";

const BangladeshMap = dynamic(() => import("../map/BangladeshMap").then((mod) => mod.BangladeshMap), {
  ssr: false,
  loading: () => <div className="h-full border border-white/10 bg-[#141412] animate-pulse" />,
});

const ConstituencyMiniMap = dynamic(() => import("../map/ConstituencyMiniMap").then((mod) => mod.ConstituencyMiniMap), {
  ssr: false,
  loading: () => <div className="h-56 border border-white/10 bg-[#141412] animate-pulse" />,
});

interface LandingShellProps {
  summaryDataset: SummaryDataset;
  constituencyDataset: ConstituencyDataset;
  geoJson: BangladeshGeoJson;
}

const ALL_DIVISIONS = "All Divisions";

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

function matchesSeatQuery(seat: ConstituencyRow, query: string): boolean {
  if (!query) {
    return true;
  }

  const haystack = [
    seat.constituency,
    seat.district,
    seat.division,
    seat.winner_party,
    seat.winner_candidate,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function matchesSeatFilters(seat: ConstituencyRow, division: string, query: string): boolean {
  const divisionMatch = division === ALL_DIVISIONS || seat.division === division;
  return divisionMatch && matchesSeatQuery(seat, query);
}

export function LandingShell({ summaryDataset, constituencyDataset, geoJson }: LandingShellProps) {
  const { summary } = summaryDataset;
  const seats = constituencyDataset.rows;
  const searchParams = useSearchParams();
  const initialSeatFromQuery = searchParams.get("seat");
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);
  const [activeDivision, setActiveDivision] = useState<string>(ALL_DIVISIONS);
  const [selectedSeatKey, setSelectedSeatKey] = useState<string | null>(() => {
    if (!initialSeatFromQuery) {
      return null;
    }

    return seats.some((seat) => seat.seat_key === initialSeatFromQuery) ? initialSeatFromQuery : null;
  });
  const seatRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const normalizedSearch = deferredSearchValue.trim().toLowerCase();

  const sortedSeats = useMemo(() => {
    return [...seats].sort((left, right) => left.constituency.localeCompare(right.constituency));
  }, [seats]);

  const divisions = useMemo(() => {
    const counts = new Map<string, number>();

    for (const seat of sortedSeats) {
      if (!matchesSeatQuery(seat, normalizedSearch)) {
        continue;
      }
      counts.set(seat.division, (counts.get(seat.division) ?? 0) + 1);
    }

    return [
      { name: ALL_DIVISIONS, count: sortedSeats.filter((seat) => matchesSeatQuery(seat, normalizedSearch)).length },
      ...Array.from(counts.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, count]) => ({ name, count })),
    ];
  }, [normalizedSearch, sortedSeats]);

  const filteredSeats = useMemo(() => {
    return sortedSeats.filter((seat) => {
      const divisionMatch = activeDivision === ALL_DIVISIONS || seat.division === activeDivision;
      return divisionMatch && matchesSeatQuery(seat, normalizedSearch);
    });
  }, [activeDivision, normalizedSearch, sortedSeats]);

  const selectedSeat = useMemo(() => {
    return sortedSeats.find((seat) => seat.seat_key === selectedSeatKey) ?? null;
  }, [selectedSeatKey, sortedSeats]);

  const selectedFeature = useMemo(() => {
    if (!selectedSeat) {
      return null;
    }

    return findGeoFeatureForSeat(geoJson, selectedSeat);
  }, [geoJson, selectedSeat]);

  useEffect(() => {
    if (!selectedSeatKey) {
      return;
    }

    seatRefs.current[selectedSeatKey]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedSeatKey]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);

    if (selectedSeat && !matchesSeatFilters(selectedSeat, activeDivision, value.trim().toLowerCase())) {
      setSelectedSeatKey(null);
    }
  };

  const handleDivisionChange = (division: string) => {
    setActiveDivision(division);

    if (selectedSeat && !matchesSeatFilters(selectedSeat, division, searchValue.trim().toLowerCase())) {
      setSelectedSeatKey(null);
    }
  };

  const summaryCards = [
    {
      label: "Total Seats",
      value: formatNumber(summary.total_seats),
      detail: `${summary.divisions.length} divisions covered`,
    },
    {
      label: "Top Party",
      value: summary.top_party.party,
      detail: `${summary.top_party.seat_count} seats · ${summary.top_party.seat_share_pct.toFixed(2)}% share`,
    },
    {
      label: "Avg Turnout",
      value: formatPercent(summary.avg_turnout),
      detail: `${formatPercent(summary.national_averages.winner_vote_share_pct)} average winner share`,
    },
    {
      label: "Avg Margin",
      value: formatPercent(summary.avg_margin),
      detail: `${formatNumber(summary.avg_candidate_count)} average candidates`,
    },
    {
      label: "Competitive Seats",
      value: formatNumber(summary.competitive_seats.count),
      detail: `<${summary.competitive_seats.threshold_pct}% margin · ${summary.competitive_seats.share_pct.toFixed(2)}% of seats`,
    },
  ];

  return (
    <main className="min-h-screen bg-[#0d0d0b] text-[#f0ece2]">
      <PrimaryNav />

      {/* ── Hero banner ──────────────────────────────────────── */}
      <section className="relative shrink-0 overflow-hidden border-b border-white/8 px-4 py-4 sm:px-10 sm:py-5">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(ellipse_at_top_right,rgba(201,168,76,0.07),transparent_70%)]" />
        <p className="relative z-10 font-mono text-[10px] uppercase tracking-[0.22em] text-[#c9a84c]">
          Bangladesh General Election · National Results
        </p>
        <h1
          className="relative z-10 mt-1 text-xl font-semibold leading-snug text-[#f0ece2] sm:text-2xl"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          National result map with <em className="text-[#c9a84c]">synchronized</em> seat browsing
        </h1>
      </section>

      {/* ── Stats strip ──────────────────────────────────────── */}
      <section className="shrink-0 grid border-b border-white/8 sm:grid-cols-2 lg:grid-cols-5">
        {summaryCards.map((card) => (
          <article key={card.label} className="border-r border-white/8 px-4 py-3 last:border-r-0 sm:px-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5a5848]">{card.label}</p>
            <p
              className={`mt-1 text-[1.6rem] font-bold leading-none ${card.label === "Top Party" ? "text-[#c9a84c]" : "text-[#f0ece2]"}`}
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              {card.value}
            </p>
            <p className="mt-1 text-xs text-[#9c9888]">{card.detail}</p>
          </article>
        ))}
      </section>

      {/* ── Main content (fills remaining viewport) ──────────── */}
      <section className="flex h-screen overflow-hidden border-t border-white/8">

        {/* Left column: division tabs + map + seat list */}
        <div className="flex min-w-0 flex-1 flex-col border-r border-white/8">

          {/* Division filter tabs */}
          <div className="flex h-11 shrink-0 items-center overflow-x-auto border-b border-white/8 px-2 sm:px-6">
            {divisions.map((division) => {
              const active = division.name === activeDivision;
              return (
                <button
                  key={division.name}
                  type="button"
                  onClick={() => handleDivisionChange(division.name)}
                  className={`group flex h-11 items-center whitespace-nowrap border-b-2 px-3 font-mono text-[11px] tracking-[0.08em] transition ${
                    active
                      ? "border-[#c9a84c] text-[#f0ece2]"
                      : "border-transparent text-[#5a5848] hover:text-[#9c9888]"
                  }`}
                >
                  <span>{division.name}</span>
                </button>
              );
            })}
          </div>

          {/* Map + seat list side-by-side */}
          <div className="flex min-h-0 flex-1">

            {/* Map panel */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="shrink-0 border-b border-white/8 px-4 py-2.5 sm:px-5">
                <label className="sr-only" htmlFor="seatSearch">
                  Search constituency, district, division, party, or candidate
                </label>
                <input
                  id="seatSearch"
                  type="search"
                  value={searchValue}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search constituency, district, division..."
                  className="w-full border border-white/15 bg-[#0d0d0b] px-3 py-2 text-sm text-[#9c9888] outline-none transition focus:border-[#c9a84c] focus:text-[#f0ece2]"
                />
              </div>
              <div className="min-h-0 flex-1">
                <BangladeshMap
                  geoJson={geoJson}
                  seats={sortedSeats}
                  selectedSeatKey={selectedSeatKey}
                  onSelectSeat={(seatKey) => {
                    setSelectedSeatKey(seatKey);
                  }}
                  onClearSelection={() => setSelectedSeatKey(null)}
                />
              </div>
            </div>

            {/* Seat list panel */}
            <div className="flex w-70 shrink-0 flex-col border-l border-white/8">
              <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-2.5">
                <p className="font-mono text-[12px] py-2 uppercase tracking-[0.18em] text-[#5a5848]">Constituencies</p>
                <span className="rounded bg-[#c9a84c]/15 px-2 py-0.5 font-mono text-[11px] text-[#c9a84c]">
                  {filteredSeats.length}
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {filteredSeats.map((seat) => {
                  const selected = seat.seat_key === selectedSeatKey;
                  return (
                    <button
                      key={seat.seat_key}
                      ref={(node) => {
                        seatRefs.current[seat.seat_key] = node;
                      }}
                      type="button"
                      onClick={() => setSelectedSeatKey(seat.seat_key)}
                      className={`flex w-full items-center gap-3 border-b border-white/8 px-4 py-2.5 text-left transition ${
                        selected ? "border-l-2 border-l-[#c9a84c] bg-[#c9a84c]/10" : "hover:bg-[#1a1a18]"
                      }`}
                    >
                      <span
                        className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: getSeatColor(seat) }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-[#f0ece2]">{seat.constituency}</p>
                        <p className="truncate font-mono text-[10px] text-[#5a5848]">
                          {seat.district} · {seat.division}
                        </p>
                      </div>
                    </button>
                  );
                })}
                {filteredSeats.length === 0 && (
                  <div className="px-4 py-6 text-sm text-[#5a5848]">No seats match the current filters.</div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Right column: constituency detail panel */}
        <aside className="flex w-170 shrink-0 flex-col overflow-y-auto border-l border-white/8 bg-[#0f0f0d] px-5 py-5">
          {selectedSeat ? (
            <div className="flex flex-col gap-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5a5848]">
                  {selectedSeat.district} - {selectedSeat.division} Division
                </p>
                <h3
                  className="mt-2 text-[1.6rem] font-semibold leading-tight text-[#f0ece2]"
                  style={{ fontFamily: "var(--font-playfair), serif" }}
                >
                  {selectedSeat.constituency}
                </h3>
                <div
                  className="mt-3 inline-flex items-center gap-2 border px-3 py-1.5"
                  style={{
                    backgroundColor: getSeatSoftColor(selectedSeat),
                    borderColor: `${getSeatColor(selectedSeat)}66`,
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getSeatColor(selectedSeat) }} />
                  <span className="font-mono text-[13px] tracking-[0.08em]" style={{ color: getSeatColor(selectedSeat) }}>
                    {selectedSeat.winner_party} - {selectedSeat.winner_candidate}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#9c9888]">
                  Runner-up: <span className="text-[#f0ece2]">{selectedSeat.runner_up_candidate}</span> ({selectedSeat.runner_up_party})
                </p>
              </div>

              <ConstituencyMiniMap
                feature={selectedFeature}
                alliance={selectedSeat.alliance}
                winnerParty={selectedSeat.winner_party}
              />

              <section className="border border-white/10">
                <div className="border-b border-white/10 bg-[#141412] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#5a5848]">
                  Election Result
                </div>
                <div className="grid grid-cols-2 gap-3 p-4">
                  {[
                    { label: "Winner Votes", value: formatNumber(selectedSeat.winner_votes) },
                    { label: "Runner-up Votes", value: formatNumber(selectedSeat.runner_up_votes) },
                    { label: "Winner Vote Share", value: formatPercent(selectedSeat.winner_vote_share_pct) },
                    { label: "Winning Margin", value: formatPercent(selectedSeat.winning_margin_pct) },
                    { label: "Turnout", value: formatPercent(selectedSeat.turnout_pct) },
                    { label: "Valid Votes", value: formatNumber(selectedSeat.total_valid_votes) },
                    { label: "Candidates", value: formatNumber(selectedSeat.candidate_count) },
                  ].map((item) => (
                    <article key={item.label} className="border border-white/10 bg-[#141412] px-3 py-2">
                      <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#5a5848]">{item.label}</p>
                      <p
                        className="details-number mt-1 text-lg font-semibold text-[#f0ece2]"
                      >
                        {item.value}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="border border-white/10">
                <div className="border-b border-white/10 bg-[#141412] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#5a5848]">
                  Constituency Profile
                </div>
                <div className="grid grid-cols-2 gap-3 p-4">
                  {[
                    { label: "Population", value: formatNumber(selectedSeat.Population_Total) },
                    { label: "Households", value: formatNumber(selectedSeat.Household_Total) },
                    { label: "Population Density", value: selectedSeat.pop_density === null ? "N/A" : `${formatNumber(selectedSeat.pop_density)}/km2` },
                    { label: "Urban Population", value: formatNumber(selectedSeat.pop_urban) },
                    { label: "Rural Population", value: formatNumber(selectedSeat.pop_rural) },
                    { label: "Female Share", value: formatPercent(selectedSeat.female_pct) },
                  ].map((item) => (
                    <article key={item.label} className="border border-white/10 bg-[#141412] px-3 py-2">
                      <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#5a5848]">{item.label}</p>
                      <p
                        className="details-number mt-1 text-lg font-semibold text-[#f0ece2]"
                      >
                        {item.value}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="border border-white/10">
                <div className="border-b border-white/10 bg-[#141412] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#5a5848]">
                  Key Indicators vs National
                </div>
                <div className="space-y-3 p-4">
                  {(
                    [
                      ["Literacy", selectedSeat.literacy_rate, summary.national_averages.literacy_rate],
                      ["Internet Access", selectedSeat.internet_pct, summary.national_averages.internet_pct],
                      ["Employment Rate", selectedSeat.employment_rate_pct, summary.national_averages.employment_rate_pct],
                      ["NEET", selectedSeat.neet_pct, summary.national_averages.neet_pct],
                      ["Financial Account", selectedSeat.financial_account_pct, summary.national_averages.financial_account_pct],
                    ] as [string, number | null, number | null][]
                  ).map(([label, seatValue, nationalValue]) => {
                    const width = seatValue === null ? 0 : Math.max(0, Math.min(seatValue, 100));
                    const comparison =
                      seatValue !== null && nationalValue !== null
                        ? `${seatValue >= nationalValue ? "+" : ""}${(seatValue - nationalValue).toFixed(1)} pts`
                        : "N/A";

                    return (
                      <div key={label}>
                        <div className="flex items-center justify-between gap-2 text-xs text-[#9c9888]">
                          <span>{label}</span>
                          <span className="details-number text-[11px]">{formatPercent(seatValue)}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden bg-[#222220]">
                          <div
                            className="h-full"
                            style={{
                              width: `${width}%`,
                              background: `linear-gradient(90deg, ${getSeatColor(selectedSeat)}, #c9a84c)`,
                            }}
                          />
                        </div>
                        <p className="details-number mt-0.5 text-[10px] text-[#5a5848]">{comparison} vs national</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : (
            <div className="flex flex-col justify-center gap-3 py-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5a5848]">No Selection</p>
              <h3
                className="max-w-60 text-xl font-medium leading-snug text-[#9c9888]"
                style={{ fontFamily: "var(--font-playfair), serif" }}
              >
                Select a seat from the list or map
              </h3>
              <p className="max-w-60 text-sm leading-6 text-[#5a5848]">
                View candidate info, election stats, and socioeconomic comparison against national averages.
              </p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}