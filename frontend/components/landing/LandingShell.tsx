"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import {
  getReferendumSeatColor,
  getReferendumSeatResult,
  getReferendumSeatSoftColor,
  getSeatColor,
  getSeatSoftColor,
} from "@/lib/colors";
import { getSeatElectionStatus } from "@/lib/electionStatus";
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
}

const ALL_DIVISIONS = "All Divisions";
type MapMode = "election" | "referendum";
const NATIONAL_TURNOUT_BASELINE = 58.2;

interface CompetitivenessBadge {
  label: "Highly Contested" | "Competitive" | "Safe Seat" | "Data Missing";
  backgroundColor: string;
  borderColor: string;
  textColor: string;
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

function getSeatRuralPopulation(seat: ConstituencyRow): number | null {
  if (seat.pop_rural !== null) {
    return seat.pop_rural;
  }
  if (seat.pop_total_loc !== null && seat.pop_urban !== null) {
    return Math.max(0, Math.round(seat.pop_total_loc - seat.pop_urban));
  }
  return null;
}

function getSeatFemaleSharePct(seat: ConstituencyRow): number | null {
  if (seat.female_pct !== null) {
    return seat.female_pct;
  }
  if (seat.pop_female !== null && seat.pop_total_loc !== null && seat.pop_total_loc > 0) {
    return (seat.pop_female / seat.pop_total_loc) * 100;
  }
  if (seat.sex_ratio !== null && seat.sex_ratio > 0) {
    return 10000 / (100 + seat.sex_ratio);
  }
  return null;
}

function getRunnerUpVoteSharePct(seat: ConstituencyRow): number | null {
  if (seat.runner_up_votes === null || seat.total_valid_votes === null || seat.total_valid_votes <= 0) {
    return null;
  }
  return (seat.runner_up_votes / seat.total_valid_votes) * 100;
}

function getCompetitivenessBadge(seat: ConstituencyRow): CompetitivenessBadge {
  if (seat.competitiveness_index === null) {
    return {
      label: "Data Missing",
      backgroundColor: "rgba(115, 115, 115, 0.22)",
      borderColor: "rgba(156, 152, 136, 0.55)",
      textColor: "#d1d5db",
    };
  }
  if (seat.competitiveness_index > 5) {
    return {
      label: "Highly Contested",
      backgroundColor: "rgba(220, 38, 38, 0.18)",
      borderColor: "rgba(248, 113, 113, 0.5)",
      textColor: "#fecaca",
    };
  }
  if (seat.competitiveness_index >= 2) {
    return {
      label: "Competitive",
      backgroundColor: "rgba(201, 168, 76, 0.18)",
      borderColor: "rgba(217, 195, 141, 0.5)",
      textColor: "#f6e7c0",
    };
  }
  return {
    label: "Safe Seat",
    backgroundColor: "rgba(115, 115, 115, 0.22)",
    borderColor: "rgba(156, 152, 136, 0.55)",
    textColor: "#d1d5db",
  };
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

export function LandingShell({ summaryDataset, constituencyDataset }: LandingShellProps) {
  const { summary } = summaryDataset;
  const seats = constituencyDataset.rows;
  const [mapMode, setMapMode] = useState<MapMode>("election");
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);
  const [activeDivision, setActiveDivision] = useState<string>(ALL_DIVISIONS);
  const [selectedSeatKey, setSelectedSeatKey] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const seatFromQuery = new URLSearchParams(window.location.search).get("seat");
    if (!seatFromQuery) {
      return null;
    }

    return seats.some((seat) => seat.seat_key === seatFromQuery) ? seatFromQuery : null;
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

  const selectedSeatStatus = useMemo(() => {
    if (!selectedSeat) {
      return null;
    }

    return getSeatElectionStatus(selectedSeat);
  }, [selectedSeat]);
  const selectedSeatRuralPopulation = selectedSeat ? getSeatRuralPopulation(selectedSeat) : null;
  const selectedSeatFemalePct = selectedSeat ? getSeatFemaleSharePct(selectedSeat) : null;
  const selectedSeatRunnerUpSharePct = selectedSeat ? getRunnerUpVoteSharePct(selectedSeat) : null;
  const selectedSeatCompetitivenessBadge = selectedSeat ? getCompetitivenessBadge(selectedSeat) : null;

  const getSeatDisplayColor = (seat: ConstituencyRow): string => {
    return mapMode === "election" ? getSeatColor(seat) : getReferendumSeatColor(seat);
  };

  const getSeatDisplaySoftColor = (seat: ConstituencyRow): string => {
    return mapMode === "election" ? getSeatSoftColor(seat) : getReferendumSeatSoftColor(seat);
  };

  const getReferendumBadgeLabel = (seat: ConstituencyRow): string => {
    const result = getReferendumSeatResult(seat);
    if (result === "yes") {
      return "Referendum · Majority Yes";
    }
    if (result === "no") {
      return "Referendum · Majority No";
    }
    return "Referendum · Result Missing";
  };

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
    <main className="min-h-screen bg-[#0b0c0e] text-[#f4f1ea]">
      <PrimaryNav />

      {/* ── Hero banner ──────────────────────────────────────── */}
      <section className="relative shrink-0 overflow-hidden border-b border-white/[0.07] px-4 py-5 sm:px-10 sm:py-6">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.08),transparent_70%)]" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="relative z-10 font-mono text-[10px] uppercase tracking-[0.24em] text-[#d4af37]">
              Bangladesh General Election · 2026 National Results
            </p>
            <h1
              className="relative z-10 mt-1 text-2xl font-semibold leading-tight text-[#f4f1ea] sm:text-3xl lg:text-4xl"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              National Election <em className="text-[#d4af37]">Intelligence</em>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Verified Pre-rendered
            </span>
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────── */}
      <section className="shrink-0 grid border-b border-white/[0.07] bg-[#0e0f12]/50 sm:grid-cols-2 lg:grid-cols-5">
        {summaryCards.map((card) => (
          <article key={card.label} className="border-r border-white/[0.07] px-4 py-3 last:border-r-0 sm:px-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#71717a]">{card.label}</p>
            <p
              className={`details-number mt-1 text-[1.65rem] font-bold leading-none ${card.label === "Top Party" ? "text-[#d4af37]" : "text-[#f4f1ea]"}`}
            >
              {card.value}
            </p>
            <p className="mt-1 text-xs text-[#a1a1aa]">{card.detail}</p>
          </article>
        ))}
      </section>

      {/* ── Main content (fills remaining viewport) ──────────── */}
      <section className="flex h-screen overflow-hidden border-t border-white/[0.07]">

        {/* Left column: division tabs + map + seat list */}
        <div className="flex min-w-0 flex-1 flex-col border-r border-white/[0.07]">

          {/* Division filter tabs */}
          <div className="flex h-11 shrink-0 items-center overflow-x-auto border-b border-white/[0.07] bg-[#0b0c0e] px-2 sm:px-6">
            {divisions.map((division) => {
              const active = division.name === activeDivision;
              return (
                <button
                  key={division.name}
                  type="button"
                  onClick={() => handleDivisionChange(division.name)}
                  className={`group flex h-11 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 font-mono text-[11px] tracking-wide transition ${
                    active
                      ? "border-[#d4af37] text-[#f4f1ea] font-medium"
                      : "border-transparent text-[#71717a] hover:text-[#d4d4d8]"
                  }`}
                >
                  <span>{division.name}</span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[9px] ${
                      active ? "bg-[#d4af37]/20 text-[#d4af37]" : "bg-white/5 text-[#52525b]"
                    }`}
                  >
                    {division.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Map + seat list side-by-side */}
          <div className="flex min-h-0 flex-1">

            {/* Map panel */}
            <div className="flex min-w-0 flex-1 flex-col bg-[#0b0c0e]">
              <div className="shrink-0 border-b border-white/[0.07] bg-[#0e0f12]/60 px-4 py-2.5 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex rounded-md border border-white/10 bg-[#0b0c0e] p-0.5">
                    <button
                      type="button"
                      onClick={() => setMapMode("election")}
                      className={`rounded px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition ${
                        mapMode === "election"
                          ? "bg-[#d4af37] text-[#0b0c0e] font-semibold shadow-sm"
                          : "text-[#a1a1aa] hover:text-white"
                      }`}
                    >
                      Election
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapMode("referendum")}
                      className={`rounded px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition ${
                        mapMode === "referendum"
                          ? "bg-[#d4af37] text-[#0b0c0e] font-semibold shadow-sm"
                          : "text-[#a1a1aa] hover:text-white"
                      }`}
                    >
                      Referendum
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#71717a]">
                      Cartography: Esri Dark Canvas
                    </span>
                  </div>
                </div>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#52525b]">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="seatSearch"
                    type="search"
                    value={searchValue}
                    onChange={(event) => handleSearchChange(event.target.value)}
                    placeholder="Search by constituency, district, division, winner..."
                    className="w-full rounded-md border border-white/10 bg-[#0b0c0e] py-1.5 pl-9 pr-3 font-mono text-xs text-[#f4f1ea] placeholder-[#52525b] outline-none transition focus:border-[#d4af37]/60 focus:ring-1 focus:ring-[#d4af37]/40"
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1 relative">
                <BangladeshMap
                  seats={sortedSeats}
                  mode={mapMode}
                  selectedSeatKey={selectedSeatKey}
                  onSelectSeat={(seatKey) => {
                    setSelectedSeatKey(seatKey);
                  }}
                  onClearSelection={() => setSelectedSeatKey(null)}
                />
              </div>
            </div>

            {/* Seat list panel */}
            <div className="flex w-72 shrink-0 flex-col border-l border-white/[0.07] bg-[#0c0d10]">
              <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-4 py-2.5">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#71717a]">Constituencies</p>
                <span className="rounded bg-[#d4af37]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#d4af37]">
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
                      className={`flex w-full items-center gap-3 border-b border-white/[0.04] px-4 py-2.5 text-left transition ${
                        selected
                          ? "border-l-2 border-l-[#d4af37] bg-[#d4af37]/10"
                          : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <span
                        className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: getSeatDisplayColor(seat),
                          boxShadow: selected ? `0 0 8px ${getSeatDisplayColor(seat)}` : undefined,
                        }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#f4f1ea]">{seat.constituency}</p>
                        <p className="truncate font-mono text-[10px] text-[#71717a]">
                          {seat.district} · {seat.division}
                        </p>
                      </div>
                    </button>
                  );
                })}
                {filteredSeats.length === 0 && (
                  <div className="px-4 py-6 font-mono text-xs text-[#71717a]">No seats match the current filters.</div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Right column: constituency detail panel */}
        <aside className="flex w-160 shrink-0 flex-col overflow-y-auto border-l border-white/[0.07] bg-[#0e0f13] px-5 py-5">
          {selectedSeat ? (
            <div className="flex flex-col gap-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#71717a]">
                  {selectedSeat.district} · {selectedSeat.division} Division
                </p>
                <h3
                  className="mt-1 text-[1.65rem] font-semibold leading-tight text-[#f4f1ea]"
                  style={{ fontFamily: "var(--font-playfair), serif" }}
                >
                  {selectedSeat.constituency}
                </h3>
                <div
                  className="mt-2.5 inline-flex items-center gap-2 rounded border px-3 py-1"
                  style={{
                    backgroundColor: getSeatDisplaySoftColor(selectedSeat),
                    borderColor: `${getSeatDisplayColor(selectedSeat)}55`,
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: getSeatDisplayColor(selectedSeat),
                      boxShadow: `0 0 6px ${getSeatDisplayColor(selectedSeat)}`,
                    }}
                  />
                  <span className="font-mono text-xs tracking-wide" style={{ color: getSeatDisplayColor(selectedSeat) }}>
                    {mapMode === "election"
                      ? selectedSeatStatus?.isPostponed
                        ? selectedSeatStatus.label
                        : `${selectedSeat.winner_party} · ${selectedSeat.winner_candidate}`
                      : getReferendumBadgeLabel(selectedSeat)}
                  </span>
                </div>
                {mapMode === "election" && selectedSeatStatus?.isPostponed ? (
                  <p className="mt-2 text-xs text-amber-300">Reason: {selectedSeatStatus.reason}</p>
                ) : mapMode === "election" ? (
                  <p className="mt-2 text-xs text-[#a1a1aa]">
                    Runner-up: <span className="text-[#f4f1ea]">{selectedSeat.runner_up_candidate}</span> ({selectedSeat.runner_up_party})
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-[#a1a1aa]">
                    Referendum Votes: <span className="text-[#f4f1ea]">Yes {formatNumber(selectedSeat.referendum_yes)} · No {formatNumber(selectedSeat.referendum_no)}</span>
                  </p>
                )}
              </div>

              <ConstituencyMiniMap
                seat={selectedSeat}
                mode={mapMode}
              />

              <section className="rounded-lg border border-white/[0.07] bg-[#121317] overflow-hidden shadow-sm">
                <div className="border-b border-white/[0.07] bg-[#16171c] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#d4af37]">
                  Election Result
                </div>
                <div className="grid grid-cols-2 gap-2.5 p-3.5">
                  {[
                    { label: "Election Status", value: selectedSeatStatus?.label ?? "Completed" },
                    { label: "Winner Votes", value: formatNumber(selectedSeat.winner_votes) },
                    { label: "Runner-up Votes", value: formatNumber(selectedSeat.runner_up_votes) },
                    { label: "Winner Vote Share", value: formatPercent(selectedSeat.winner_vote_share_pct) },
                    { label: "Runner-up Vote Share", value: formatPercent(selectedSeatRunnerUpSharePct) },
                    { label: "Turnout", value: formatPercent(selectedSeat.turnout_pct) },
                    { label: "Valid Votes", value: formatNumber(selectedSeat.total_valid_votes) },
                    { label: "Candidates", value: formatNumber(selectedSeat.candidate_count) },
                    ...(selectedSeatStatus?.isPostponed
                      ? [{ label: "Postponement Reason", value: selectedSeatStatus.reason ?? "N/A" }]
                      : []),
                  ].map((item) => (
                    <article key={item.label} className="rounded border border-white/[0.05] bg-[#17181e] px-3 py-2">
                      <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#71717a]">{item.label}</p>
                      <p className="details-number mt-1 text-base font-semibold text-[#f4f1ea]">
                        {item.value}
                      </p>
                    </article>
                  ))}
                </div>
                {selectedSeatCompetitivenessBadge && (
                  <div className="px-3.5 pb-3.5">
                    <div
                      className="inline-flex items-center gap-2 rounded border px-3 py-1 font-mono text-[10px] uppercase tracking-wider"
                      style={{
                        backgroundColor: selectedSeatCompetitivenessBadge.backgroundColor,
                        borderColor: selectedSeatCompetitivenessBadge.borderColor,
                        color: selectedSeatCompetitivenessBadge.textColor,
                      }}
                    >
                      <span className="text-[#a1a1aa]">Competitiveness:</span>
                      <span className="font-semibold">{selectedSeatCompetitivenessBadge.label}</span>
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-white/[0.07] bg-[#121317] overflow-hidden shadow-sm">
                <div className="border-b border-white/[0.07] bg-[#16171c] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#d4af37]">
                  Constituency Profile
                </div>
                <div className="grid grid-cols-2 gap-2.5 p-3.5">
                  {[
                    { label: "Population", value: formatNumber(selectedSeat.Population_Total) },
                    { label: "Households", value: formatNumber(selectedSeat.Household_Total) },
                    { label: "Population Density", value: selectedSeat.pop_density === null ? "N/A" : `${formatNumber(selectedSeat.pop_density)}/km²` },
                    { label: "Urban Population", value: formatNumber(selectedSeat.pop_urban) },
                    { label: "Rural Population", value: formatNumber(selectedSeatRuralPopulation) },
                    { label: "Female Share", value: formatPercent(selectedSeatFemalePct) },
                  ].map((item) => (
                    <article key={item.label} className="rounded border border-white/[0.05] bg-[#17181e] px-3 py-2">
                      <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#71717a]">{item.label}</p>
                      <p className="details-number mt-1 text-base font-semibold text-[#f4f1ea]">
                        {item.value}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-white/[0.07] bg-[#121317] overflow-hidden shadow-sm">
                <div className="border-b border-white/[0.07] bg-[#16171c] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#d4af37]">
                  Key Indicators vs National Baseline
                </div>
                <div className="space-y-3 p-3.5">
                  {(
                    [
                      ["Voter Turnout", selectedSeat.turnout_pct, NATIONAL_TURNOUT_BASELINE],
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
                        <div className="flex items-center justify-between gap-2 text-xs text-[#a1a1aa]">
                          <span>{label}</span>
                          <span className="details-number text-[11px] font-medium text-[#f4f1ea]">{formatPercent(seatValue)}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#1e2026]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${width}%`,
                              background: `linear-gradient(90deg, ${getSeatDisplayColor(selectedSeat)}, #d4af37)`,
                            }}
                          />
                        </div>
                        <p className="details-number mt-0.5 text-[9px] text-[#71717a]">{comparison} vs national average</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : (
            <div className="flex flex-col justify-center gap-4 px-6 py-12">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37]">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">Electoral Inspector</p>
                <h3
                  className="mt-1 text-2xl font-semibold leading-snug text-[#f4f1ea]"
                  style={{ fontFamily: "var(--font-playfair), serif" }}
                >
                  Select a constituency to inspect details
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-[#71717a]">
                Explore constituency geometry, winning party margins, runner-up candidates, and compare 19 socio-economic indicators directly against national baselines.
              </p>
              <div className="mt-2 space-y-2 rounded-lg border border-white/[0.06] bg-[#121317] p-3">
                <p className="font-mono text-[9px] uppercase tracking-wider text-[#a1a1aa]">Quick Summary</p>
                <div className="flex items-center justify-between text-xs text-[#71717a]">
                  <span>Total Constituencies:</span>
                  <span className="font-mono text-[#f4f1ea]">300</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#71717a]">
                  <span>Majority Threshold:</span>
                  <span className="font-mono text-[#d4af37]">151 seats</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#71717a]">
                  <span>Competitive Races (&lt;10%):</span>
                  <span className="font-mono text-[#f4f1ea]">{summary.competitive_seats.count} seats</span>
                </div>
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}