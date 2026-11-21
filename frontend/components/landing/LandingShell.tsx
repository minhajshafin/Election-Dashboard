"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import {
  getReferendumSeatColor,
  getReferendumSeatResult,
  getSeatColor,
} from "@/lib/colors";
import { getSeatElectionStatus } from "@/lib/electionStatus";
import type { ConstituencyDataset, ConstituencyRow, SummaryDataset } from "@/types/api";
import { PrimaryNav } from "@/components/nav/PrimaryNav";

const BangladeshMap = dynamic(() => import("../map/BangladeshMap").then((mod) => mod.BangladeshMap), {
  ssr: false,
  loading: () => <div className="h-full border border-[var(--border)] bg-[var(--bg-canvas)]" />,
});

const ConstituencyMiniMap = dynamic(() => import("../map/ConstituencyMiniMap").then((mod) => mod.ConstituencyMiniMap), {
  ssr: false,
  loading: () => <div className="h-44 border border-[var(--border)] bg-[var(--bg-canvas)]" />,
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
    return { label: "Data Missing" };
  }
  if (seat.competitiveness_index > 5) {
    return { label: "Highly Contested" };
  }
  if (seat.competitiveness_index >= 2) {
    return { label: "Competitive" };
  }
  return { label: "Safe Seat" };
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

  const getReferendumBadgeLabel = (seat: ConstituencyRow): string => {
    const result = getReferendumSeatResult(seat);
    if (result === "yes") {
      return "Referendum · Majority Yes";
    }
    if (result === "no") {
      return "Referendum · Majority No";
    }
    return "Referendum · Result Pending";
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

  return (
    <main className="h-screen max-h-screen overflow-hidden flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans antialiased">
      {/* ── Fixed 42px Header Navigation ───────────────────────────────── */}
      <PrimaryNav />

      {/* ── 3-Column Layout (Map | Constituencies | Inspector) ──────────── */}
      <section className="flex-1 min-h-0 flex overflow-hidden border-t border-[var(--border)]">

        {/* ── Left Column: Division Tabs + Map Canvas + Seat Search ─────── */}
        <div className="flex min-w-0 flex-1 flex-col border-r border-[var(--border)]">

          {/* Division Filter Tabs across top of Map & Seat List */}
          <div className="flex h-9 shrink-0 items-center overflow-x-auto border-b border-[var(--border)] bg-[var(--bg-surface)] px-2 sm:px-4">
            {divisions.map((division) => {
              const active = division.name === activeDivision;
              return (
                <button
                  key={division.name}
                  type="button"
                  onClick={() => handleDivisionChange(division.name)}
                  className={`group flex h-9 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 font-mono text-[11px] tracking-wide transition-colors rounded-none ${
                    active
                      ? "border-[var(--text-primary)] text-[var(--text-primary)] font-medium bg-[var(--accent-muted)]"
                      : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span>{division.name}</span>
                  <span
                    className={`rounded-none px-1 py-0.2 font-mono text-[9px] border ${
                      active
                        ? "border-[var(--border)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
                        : "border-transparent text-[var(--text-muted)]"
                    }`}
                  >
                    {division.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sub-container: Map Canvas (Left) + Constituencies List (Middle) */}
          <div className="flex min-h-0 flex-1">

            {/* Map Canvas Column */}
            <div className="flex min-w-0 flex-1 flex-col bg-[var(--bg-canvas)]">
              {/* Map Controls: Mode Toggle & Search */}
              <div className="shrink-0 border-b border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex border border-[var(--border)] bg-[var(--bg-canvas)]">
                    <button
                      type="button"
                      onClick={() => setMapMode("election")}
                      className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors rounded-none ${
                        mapMode === "election"
                          ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] font-bold"
                          : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      Election
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapMode("referendum")}
                      className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors rounded-none border-l border-[var(--border)] ${
                        mapMode === "referendum"
                          ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] font-bold"
                          : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      Referendum
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    {selectedSeat && (
                      <button
                        type="button"
                        onClick={() => setSelectedSeatKey(null)}
                        className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] underline decoration-[var(--border)]"
                      >
                        Clear Selection
                      </button>
                    )}
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                      MAP MODE: {mapMode.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-[var(--text-muted)]">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <input
                    id="seatSearch"
                    type="search"
                    value={searchValue}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search constituency, district, division..."
                    className="w-full h-7 pl-8 pr-3 font-mono text-[11px] bg-[var(--bg-canvas)] text-[var(--text-primary)] border border-[var(--border)] rounded-none outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--text-primary)]"
                  />
                </div>
              </div>

              {/* Map Viewport Canvas */}
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

            {/* Middle Column: Constituencies List */}
            <div className="flex w-64 md:w-72 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--bg-surface)]">
              <div className="flex h-8 shrink-0 items-center justify-between border-b border-[var(--border)] px-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                  Constituencies
                </p>
                <span className="border border-[var(--border)] bg-[var(--bg-canvas)] px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[var(--text-primary)]">
                  {filteredSeats.length}
                </span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
                {filteredSeats.map((seat) => {
                  const selected = seat.seat_key === selectedSeatKey;
                  const displayColor = getSeatDisplayColor(seat);

                  return (
                    <button
                      key={seat.seat_key}
                      ref={(node) => {
                        seatRefs.current[seat.seat_key] = node;
                      }}
                      type="button"
                      onClick={() => setSelectedSeatKey(seat.seat_key)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors rounded-none ${
                        selected
                          ? "border-l-2 border-l-[var(--text-primary)] bg-[var(--accent-muted)]"
                          : "hover:bg-[var(--accent-muted)]"
                      }`}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-none border border-[var(--border)]"
                        style={{ backgroundColor: displayColor }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                          {seat.constituency}
                        </p>
                        <p className="truncate font-mono text-[9px] text-[var(--text-muted)] mt-0.5">
                          {seat.district} · {seat.division}
                        </p>
                      </div>
                    </button>
                  );
                })}

                {filteredSeats.length === 0 && (
                  <div className="px-4 py-6 font-mono text-xs text-[var(--text-muted)] text-center">
                    No matching constituencies
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── Right Column: Constituency Detail Panel (Inspector) ───────── */}
        <aside className="flex w-80 md:w-96 lg:w-[400px] shrink-0 flex-col overflow-y-auto bg-[var(--bg-surface)] p-4 space-y-4">
          {selectedSeat ? (
            <div className="space-y-4">
              {/* Breadcrumb & Title */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                  {selectedSeat.district} · {selectedSeat.division} Division
                </p>
                <h2 className="mt-1 text-2xl font-serif font-bold text-[var(--text-primary)] leading-tight">
                  {selectedSeat.constituency}
                </h2>

                {/* Winner Status Badge */}
                <div className="mt-2.5 inline-flex items-center gap-2 border border-[var(--border)] bg-[var(--bg-canvas)] px-2.5 py-1">
                  <span
                    className="h-2 w-2 shrink-0 rounded-none border border-[var(--border)]"
                    style={{ backgroundColor: getSeatDisplayColor(selectedSeat) }}
                  />
                  <span className="font-mono text-xs font-medium text-[var(--text-primary)]">
                    {mapMode === "election"
                      ? selectedSeatStatus?.isPostponed
                        ? selectedSeatStatus.label
                        : `${selectedSeat.winner_party} - ${selectedSeat.winner_candidate}`
                      : getReferendumBadgeLabel(selectedSeat)}
                  </span>
                </div>

                {mapMode === "election" && selectedSeatStatus?.isPostponed ? (
                  <p className="mt-1.5 font-mono text-xs text-amber-500">
                    Reason: {selectedSeatStatus.reason}
                  </p>
                ) : mapMode === "election" ? (
                  <p className="mt-1.5 font-mono text-xs text-[var(--text-muted)]">
                    Runner-up: <span className="text-[var(--text-primary)]">{selectedSeat.runner_up_candidate}</span> ({selectedSeat.runner_up_party})
                  </p>
                ) : (
                  <p className="mt-1.5 font-mono text-xs text-[var(--text-muted)]">
                    Referendum Votes: <span className="text-[var(--text-primary)]">Yes {formatNumber(selectedSeat.referendum_yes)} · No {formatNumber(selectedSeat.referendum_no)}</span>
                  </p>
                )}
              </div>

              {/* Boundary Mini-Map */}
              <ConstituencyMiniMap seat={selectedSeat} mode={mapMode} />

              {/* Election Result Card */}
              <div className="border border-[var(--border)] bg-[var(--bg-canvas)]">
                <div className="border-b border-[var(--border)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface)]">
                  Election Result
                </div>
                <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)]">
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
                    <div key={item.label} className="p-2">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">{item.label}</p>
                      <p className="font-mono text-xs font-semibold text-[var(--text-primary)] mt-0.5">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {selectedSeatCompetitivenessBadge && (
                  <div className="border-t border-[var(--border)] p-2 bg-[var(--bg-surface)]">
                    <div className="inline-flex items-center gap-1.5 border border-[var(--border)] bg-[var(--bg-canvas)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-primary)]">
                      <span className="text-[var(--text-muted)]">Competitiveness:</span>
                      <span className="font-bold">{selectedSeatCompetitivenessBadge.label}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Constituency Profile Card */}
              <div className="border border-[var(--border)] bg-[var(--bg-canvas)]">
                <div className="border-b border-[var(--border)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface)]">
                  Constituency Profile
                </div>
                <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)]">
                  {[
                    { label: "Population", value: formatNumber(selectedSeat.Population_Total) },
                    { label: "Households", value: formatNumber(selectedSeat.Household_Total) },
                    {
                      label: "Density",
                      value: selectedSeat.pop_density === null ? "N/A" : `${formatNumber(selectedSeat.pop_density)}/km²`,
                    },
                    { label: "Urban Pop", value: formatNumber(selectedSeat.pop_urban) },
                    { label: "Rural Pop", value: formatNumber(selectedSeatRuralPopulation) },
                    { label: "Female Share", value: formatPercent(selectedSeatFemalePct) },
                  ].map((item) => (
                    <div key={item.label} className="p-2">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">{item.label}</p>
                      <p className="font-mono text-xs font-semibold text-[var(--text-primary)] mt-0.5">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Indicators vs National Baseline */}
              <div className="border border-[var(--border)] bg-[var(--bg-canvas)]">
                <div className="border-b border-[var(--border)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface)]">
                  Key Indicators vs National Baseline
                </div>
                <div className="p-3 space-y-3">
                  {(
                    [
                      ["Voter Turnout", selectedSeat.turnout_pct, NATIONAL_TURNOUT_BASELINE],
                      ["Literacy Rate", selectedSeat.literacy_rate, summary.national_averages.literacy_rate],
                      ["Internet Access", selectedSeat.internet_pct, summary.national_averages.internet_pct],
                      ["Employment Rate", selectedSeat.employment_rate_pct, summary.national_averages.employment_rate_pct],
                      ["NEET Share", selectedSeat.neet_pct, summary.national_averages.neet_pct],
                      ["Financial Account", selectedSeat.financial_account_pct, summary.national_averages.financial_account_pct],
                    ] as [string, number | null, number | null][]
                  ).map(([label, seatValue, nationalValue]) => {
                    const width = seatValue === null ? 0 : Math.max(0, Math.min(seatValue, 100));
                    const diff =
                      seatValue !== null && nationalValue !== null
                        ? seatValue - nationalValue
                        : null;
                    const diffLabel =
                      diff !== null
                        ? `${diff >= 0 ? "+" : ""}${diff.toFixed(1)} pts vs avg`
                        : "N/A";

                    return (
                      <div key={label} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[var(--text-secondary)]">{label}</span>
                          <span className="font-mono font-medium text-[var(--text-primary)]">
                            {formatPercent(seatValue)}
                          </span>
                        </div>
                        <div className="h-1 bg-[var(--border)] rounded-none overflow-hidden">
                          <div
                            className="h-full rounded-none bg-[var(--text-primary)]"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <div className="font-mono text-[9px] text-[var(--text-muted)]">
                          {diffLabel}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-between h-full space-y-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                  Electoral Inspector
                </p>
                <h3 className="mt-2 text-2xl font-serif font-bold text-[var(--text-primary)] leading-tight">
                  Constituency Cartography & Analytics
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
                  Select any constituency on the interactive map or directory to inspect official 2026 election returns, runner-up candidate margins, boundary cartography, and socio-economic benchmarks.
                </p>
              </div>

              <div className="border border-[var(--border)] bg-[var(--bg-canvas)]">
                <div className="border-b border-[var(--border)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface)]">
                  National Benchmark
                </div>
                <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)]">
                  <div className="p-2.5">
                    <p className="font-mono text-[9px] uppercase text-[var(--text-muted)]">Total Seats</p>
                    <p className="font-mono text-base font-bold text-[var(--text-primary)] mt-0.5">300</p>
                  </div>
                  <div className="p-2.5">
                    <p className="font-mono text-[9px] uppercase text-[var(--text-muted)]">Majority Threshold</p>
                    <p className="font-mono text-base font-bold text-[var(--text-primary)] mt-0.5">151 Seats</p>
                  </div>
                  <div className="p-2.5">
                    <p className="font-mono text-[9px] uppercase text-[var(--text-muted)]">Competitive Races</p>
                    <p className="font-mono text-base font-bold text-[var(--text-primary)] mt-0.5">{summary.competitive_seats.count}</p>
                  </div>
                  <div className="p-2.5">
                    <p className="font-mono text-[9px] uppercase text-[var(--text-muted)]">Avg Turnout</p>
                    <p className="font-mono text-base font-bold text-[var(--text-primary)] mt-0.5">{formatPercent(summary.avg_turnout)}</p>
                  </div>
                </div>
              </div>

              <div className="border border-dashed border-[var(--border)] p-3 text-center">
                <p className="font-mono text-[11px] text-[var(--text-muted)]">
                  ← Click any region on the map or constituency in the directory
                </p>
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
