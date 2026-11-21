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

  return `${value.toFixed(1)}%`;
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
      {/* ── Fixed 42px Primary Nav ─────────────────────────────────────── */}
      <PrimaryNav />

      {/* ── Strict 38px Macro Stats Ribbon ────────────────────────────── */}
      <header className="h-[38px] shrink-0 border-b border-[var(--border)] bg-[var(--bg-surface)] flex items-stretch divide-x divide-[var(--border)] overflow-x-auto text-xs">
        <div className="flex items-center gap-2 px-3.5 whitespace-nowrap">
          <span className="font-mono text-[10px] uppercase text-[var(--text-muted)] tracking-wider">Seats</span>
          <span className="font-mono font-semibold text-[var(--text-primary)]">{summary.total_seats}</span>
          <span className="text-[10px] text-[var(--text-muted)]">({summary.divisions.length} Divisions)</span>
        </div>

        <div className="flex items-center gap-2 px-3.5 whitespace-nowrap">
          <span className="font-mono text-[10px] uppercase text-[var(--text-muted)] tracking-wider">Leading</span>
          <span className="font-mono font-semibold text-[var(--text-primary)]">{summary.top_party.party}</span>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">
            {summary.top_party.seat_count} ({summary.top_party.seat_share_pct.toFixed(1)}%)
          </span>
        </div>

        <div className="flex items-center gap-2 px-3.5 whitespace-nowrap">
          <span className="font-mono text-[10px] uppercase text-[var(--text-muted)] tracking-wider">Turnout</span>
          <span className="font-mono font-semibold text-[var(--text-primary)]">{formatPercent(summary.avg_turnout)}</span>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">
            (Winner Avg: {formatPercent(summary.national_averages.winner_vote_share_pct)})
          </span>
        </div>

        <div className="flex items-center gap-2 px-3.5 whitespace-nowrap">
          <span className="font-mono text-[10px] uppercase text-[var(--text-muted)] tracking-wider">Avg Margin</span>
          <span className="font-mono font-semibold text-[var(--text-primary)]">{formatPercent(summary.avg_margin)}</span>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">
            ({summary.competitive_seats.count} Competitive &lt;10%)
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-2 px-3.5 ml-auto whitespace-nowrap">
          <span className="font-mono text-[10px] uppercase text-[var(--text-muted)] tracking-wider">Cartography</span>
          <span className="font-mono text-[10px] text-[var(--text-primary)]">300 Constituencies · Verified Pre-rendered</span>
        </div>
      </header>

      {/* ── Main 3-Pane Workspace (Strictly fills remainder of 100dvh) ──── */}
      <section className="flex-1 min-h-0 flex overflow-hidden">

        {/* ── Left Pane: Division Filter & Constituency Directory (260px) ─ */}
        <aside className="w-64 shrink-0 flex flex-col border-r border-[var(--border)] bg-[var(--bg-surface)]">
          {/* Controls: Division Select & Search */}
          <div className="p-2 space-y-1.5 border-b border-[var(--border)] bg-[var(--bg-canvas)]">
            <select
              aria-label="Filter by division"
              value={activeDivision}
              onChange={(e) => handleDivisionChange(e.target.value)}
              className="w-full h-7 px-2 font-mono text-[11px] bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-none outline-none cursor-pointer focus:border-[var(--text-primary)]"
            >
              {divisions.map((d) => (
                <option key={d.name} value={d.name} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                  {d.name} ({d.count})
                </option>
              ))}
            </select>

            <div className="relative">
              <input
                id="seatSearch"
                type="search"
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search constituency..."
                className="w-full h-7 pl-2 pr-2 font-mono text-[11px] bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-none outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--text-primary)]"
              />
            </div>
          </div>

          {/* Directory Column Header */}
          <div className="h-6 shrink-0 px-2.5 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)] font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
            <span>Constituencies</span>
            <span>{filteredSeats.length} / {sortedSeats.length}</span>
          </div>

          {/* Scrollable Constituency List */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[var(--border-subtle)]">
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
                  className={`w-full text-left px-2.5 py-2 flex items-center gap-2.5 transition-colors rounded-none ${
                    selected
                      ? "bg-[var(--accent-muted)] border-l-2 border-l-[var(--text-primary)]"
                      : "hover:bg-[var(--accent-muted)]"
                  }`}
                >
                  <span
                    className="w-2 h-2 shrink-0 rounded-none border border-[var(--border)]"
                    style={{ backgroundColor: displayColor }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[var(--text-primary)] leading-tight">
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
              <div className="p-4 text-center font-mono text-xs text-[var(--text-muted)]">
                No matching constituencies
              </div>
            )}
          </div>
        </aside>

        {/* ── Center Pane: Cartography Canvas ────────────────────────────── */}
        <section className="flex-1 min-w-0 flex flex-col bg-[var(--bg-canvas)] relative">
          {/* Map Top Control Bar (34px) */}
          <div className="h-[34px] shrink-0 border-b border-[var(--border)] bg-[var(--bg-surface)] px-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase text-[var(--text-muted)] tracking-wider mr-1">Layer:</span>
              <button
                type="button"
                onClick={() => setMapMode("election")}
                className={`px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider rounded-none border border-[var(--border)] transition-colors ${
                  mapMode === "election"
                    ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] font-semibold"
                    : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                Election 2026
              </button>
              <button
                type="button"
                onClick={() => setMapMode("referendum")}
                className={`px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider rounded-none border border-[var(--border)] transition-colors ${
                  mapMode === "referendum"
                    ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] font-semibold"
                    : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                Constitutional Referendum
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
              <span className="hidden md:inline font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                Esri Canvas Basemap
              </span>
            </div>
          </div>

          {/* Interactive Map */}
          <div className="flex-1 min-h-0 relative">
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
        </section>

        {/* ── Right Pane: Electoral & Demographic Inspector (360px) ───────── */}
        <aside className="w-80 md:w-96 shrink-0 flex flex-col border-l border-[var(--border)] bg-[var(--bg-surface)] overflow-y-auto">
          {selectedSeat ? (
            <div className="p-3.5 space-y-3.5">
              {/* Constituency Title Header */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                  {selectedSeat.district} · {selectedSeat.division} Division
                </p>
                <h2 className="mt-1 text-2xl font-serif font-bold text-[var(--text-primary)] leading-tight">
                  {selectedSeat.constituency}
                </h2>

                {/* Status Badge */}
                <div className="mt-2.5 flex items-center gap-2 border border-[var(--border)] bg-[var(--bg-canvas)] px-2.5 py-1">
                  <span
                    className="w-2.5 h-2.5 shrink-0 rounded-none"
                    style={{ backgroundColor: getSeatDisplayColor(selectedSeat) }}
                  />
                  <span className="font-mono text-xs font-medium text-[var(--text-primary)]">
                    {mapMode === "election"
                      ? selectedSeatStatus?.isPostponed
                        ? selectedSeatStatus.label
                        : `${selectedSeat.winner_party} · ${selectedSeat.winner_candidate}`
                      : getReferendumBadgeLabel(selectedSeat)}
                  </span>
                </div>

                {mapMode === "election" && selectedSeatStatus?.isPostponed ? (
                  <p className="mt-1.5 font-mono text-xs text-amber-500">
                    Reason: {selectedSeatStatus.reason}
                  </p>
                ) : mapMode === "election" ? (
                  <p className="mt-1.5 text-xs text-[var(--text-muted)] font-mono">
                    Runner-up: <span className="text-[var(--text-primary)]">{selectedSeat.runner_up_candidate}</span> ({selectedSeat.runner_up_party})
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-[var(--text-muted)] font-mono">
                    Votes: <span className="text-[var(--text-primary)]">Yes {formatNumber(selectedSeat.referendum_yes)} · No {formatNumber(selectedSeat.referendum_no)}</span>
                  </p>
                )}
              </div>

              {/* Cartographic Boundary Mini-Map */}
              <ConstituencyMiniMap seat={selectedSeat} mode={mapMode} />

              {/* Election Breakdown Card */}
              <div className="border border-[var(--border)] bg-[var(--bg-canvas)]">
                <div className="border-b border-[var(--border)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface)]">
                  Election Metrics
                </div>
                <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)]">
                  {[
                    { label: "Winner Votes", value: formatNumber(selectedSeat.winner_votes) },
                    { label: "Runner-up Votes", value: formatNumber(selectedSeat.runner_up_votes) },
                    { label: "Winner Vote Share", value: formatPercent(selectedSeat.winner_vote_share_pct) },
                    { label: "Runner-up Share", value: formatPercent(selectedSeatRunnerUpSharePct) },
                    { label: "Voter Turnout", value: formatPercent(selectedSeat.turnout_pct) },
                    { label: "Valid Votes", value: formatNumber(selectedSeat.total_valid_votes) },
                    { label: "Candidates", value: formatNumber(selectedSeat.candidate_count) },
                    { label: "Competitiveness", value: selectedSeatCompetitivenessBadge?.label ?? "Safe" },
                  ].map((item) => (
                    <div key={item.label} className="p-2">
                      <p className="font-mono text-[9px] uppercase text-[var(--text-muted)]">{item.label}</p>
                      <p className="font-mono text-xs font-semibold text-[var(--text-primary)] mt-0.5">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Census & Demographic Profile */}
              <div className="border border-[var(--border)] bg-[var(--bg-canvas)]">
                <div className="border-b border-[var(--border)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface)]">
                  Demographic Profile
                </div>
                <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)]">
                  {[
                    { label: "Population", value: formatNumber(selectedSeat.Population_Total) },
                    { label: "Households", value: formatNumber(selectedSeat.Household_Total) },
                    { label: "Density", value: selectedSeat.pop_density === null ? "N/A" : `${formatNumber(selectedSeat.pop_density)}/km²` },
                    { label: "Urban Pop", value: formatNumber(selectedSeat.pop_urban) },
                    { label: "Rural Pop", value: formatNumber(selectedSeatRuralPopulation) },
                    { label: "Female Share", value: formatPercent(selectedSeatFemalePct) },
                  ].map((item) => (
                    <div key={item.label} className="p-2">
                      <p className="font-mono text-[9px] uppercase text-[var(--text-muted)]">{item.label}</p>
                      <p className="font-mono text-xs font-semibold text-[var(--text-primary)] mt-0.5">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Socio-Economic Benchmark vs National Baseline */}
              <div className="border border-[var(--border)] bg-[var(--bg-canvas)]">
                <div className="border-b border-[var(--border)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface)]">
                  Indicators vs National Baseline
                </div>
                <div className="p-2.5 space-y-2.5">
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
            <div className="p-6 flex flex-col justify-between h-full space-y-6">
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
