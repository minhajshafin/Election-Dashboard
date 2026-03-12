"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { getAllianceColor, getAllianceSoftColor } from "@/lib/colors";
import { findGeoFeatureForSeat, type BangladeshGeoJson } from "@/lib/geo";
import type { ConstituencyDataset, ConstituencyRow, SummaryDataset } from "@/types/api";

const BangladeshMap = dynamic(() => import("../map/BangladeshMap").then((mod) => mod.BangladeshMap), {
  ssr: false,
  loading: () => <div className="h-155 rounded-[28px] bg-[#f3efe5] animate-pulse" />,
});

const ConstituencyMiniMap = dynamic(() => import("../map/ConstituencyMiniMap").then((mod) => mod.ConstituencyMiniMap), {
  ssr: false,
  loading: () => <div className="h-80 rounded-[18px] bg-[#f3efe5] animate-pulse" />,
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
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);
  const [activeDivision, setActiveDivision] = useState<string>(ALL_DIVISIONS);
  const [selectedSeatKey, setSelectedSeatKey] = useState<string | null>(null);
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,249,240,0.95),rgba(240,232,221,0.92)_30%,rgba(229,220,205,0.9)_100%)] px-4 py-6 text-[#201910] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-400">
        <header className="mb-6 flex flex-col gap-4 rounded-[30px] border border-white/60 bg-white/70 px-6 py-5 shadow-[0_18px_70px_rgba(41,29,18,0.1)] backdrop-blur-sm lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#8f785d]">
              Bangladesh Election Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#201910] sm:text-4xl">
              National result map with synchronized seat browsing
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#685846] sm:text-base">
              Scan the election at a national level, then move directly from division to constituency without losing context.
            </p>
          </div>

          <nav className="flex gap-2 text-sm font-medium text-[#5d4d3f]">
            <span className="rounded-full bg-[#efe5d4] px-4 py-2">Overview</span>
            <span className="rounded-full border border-[#d9c9b1] px-4 py-2">Explorer</span>
            <span className="rounded-full border border-[#d9c9b1] px-4 py-2">Analysis</span>
          </nav>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card) => (
            <article
              key={card.label}
              className="rounded-3xl border border-white/60 bg-white/72 px-5 py-5 shadow-[0_18px_50px_rgba(40,29,17,0.08)] backdrop-blur-sm"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8b755c]">{card.label}</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#211910]">{card.value}</p>
              <p className="mt-2 text-sm leading-6 text-[#6d5e4f]">{card.detail}</p>
            </article>
          ))}
        </section>

        <div className="mt-6 rounded-[30px] border border-white/60 bg-white/74 p-5 shadow-[0_24px_80px_rgba(40,29,17,0.1)] backdrop-blur-sm">
          <label className="block mb-5">
            <span className="sr-only">Search by seat, district, division, or party</span>
            <input
              type="search"
              value={searchValue}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search constituency, district, division, party, or candidate"
              className="w-full rounded-full border border-[#d9c9b1] bg-[#f8f2e9] px-5 py-3 text-sm text-[#2c2218] outline-none transition focus:border-[#8e6e42] focus:ring-2 focus:ring-[#d9c7aa]"
            />
          </label>

          <section className="grid gap-5 lg:grid-cols-[0.3fr_0.7fr]">
            <div className="min-w-0 h-155">
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

            <div className="min-w-0 grid gap-4 lg:grid-cols-[0.9fr_1fr_1.35fr]">
              <section className="rounded-[22px] bg-[#f7f1e7] p-3">
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8b755c]">Divisions</p>
                <div className="mt-3 space-y-2">
                  {divisions.map((division) => {
                    const active = division.name === activeDivision;
                    return (
                      <button
                        key={division.name}
                        type="button"
                        onClick={() => handleDivisionChange(division.name)}
                        className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm transition ${
                          active
                            ? "bg-[#201910] text-[#fff7ed] shadow-sm"
                            : "bg-white/80 text-[#3d3126] hover:bg-white"
                        }`}
                      >
                        <span className="font-medium text-xs">{division.name}</span>
                        <span className={`text-xs ${active ? "text-[#e9d5ba]" : "text-[#8b755c]"}`}>
                          {division.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[22px] bg-[#f7f1e7] p-3">
                <div className="flex items-center justify-between px-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8b755c]">Seats</p>
                  <p className="text-xs text-[#8b755c]">{filteredSeats.length}</p>
                </div>
                <div className="mt-3 max-h-147.5 space-y-1 overflow-y-auto pr-1">
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
                        className={`w-full rounded-2xl border px-3 py-2 text-left transition `}
                        style={
                          selected
                            ? {
                                background: `linear-gradient(135deg, ${getAllianceColor(seat.alliance)}, #1f1a14)`,
                                borderColor: "transparent",
                                color: "white",
                              }
                            : {
                                backgroundColor: "rgba(255,255,255,0.82)",
                                borderColor: "transparent",
                              }
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs">{seat.constituency}</p>
                            <p className={`mt-0.5 text-[11px] ${selected ? "text-white/80" : "text-[#7b6a59]"}`}>
                              {seat.district}
                            </p>
                          </div>
                          <span
                            className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: getAllianceColor(seat.alliance) }}
                          />
                        </div>
                      </button>
                    );
                  })}
                  {filteredSeats.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#d5c4ab] px-3 py-4 text-xs text-[#6c5d4d]">
                      No seats match the filters.
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="rounded-[22px] bg-[#f7f1e7] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8b755c]">Details</p>
                {selectedSeat ? (
                  <div className="mt-3 space-y-3 max-h-147.5 overflow-y-auto pr-1">
                    <div>
                      <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#211910]">
                        {selectedSeat.constituency}
                      </h3>
                      <p className="mt-0.5 text-xs text-[#6e604f]">
                        {selectedSeat.district}, {selectedSeat.division}
                      </p>
                    </div>

                    <ConstituencyMiniMap feature={selectedFeature} alliance={selectedSeat.alliance} />

                    <div className="grid gap-2 sm:grid-cols-2">
                      <article
                        className="rounded-[18px] border px-3 py-3"
                        style={{
                          backgroundColor: getAllianceSoftColor(selectedSeat.alliance),
                          borderColor: `${getAllianceColor(selectedSeat.alliance)}33`,
                        }}
                      >
                        <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#7f6852]">Winner</p>
                        <h4 className="mt-1.5 text-sm font-semibold text-[#201910]">{selectedSeat.winner_candidate}</h4>
                        <p className="mt-0.5 text-xs text-[#5d4f41]">{selectedSeat.winner_party}</p>
                        <p className="mt-1.5 text-xs text-[#5d4f41]">
                          {formatNumber(selectedSeat.winner_votes)} · {formatPercent(selectedSeat.winner_vote_share_pct)}
                        </p>
                      </article>

                      <article className="rounded-[18px] border border-[#dbc9b0] bg-white/72 px-3 py-3">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#7f6852]">Runner Up</p>
                        <h4 className="mt-1.5 text-sm font-semibold text-[#201910]">{selectedSeat.runner_up_candidate}</h4>
                        <p className="mt-0.5 text-xs text-[#5d4f41]">{selectedSeat.runner_up_party}</p>
                        <p className="mt-1.5 text-xs text-[#5d4f41]">
                          {formatNumber(selectedSeat.runner_up_votes)}
                        </p>
                      </article>
                    </div>

                    <div className="grid gap-1.5 sm:grid-cols-4">
                      {[
                        { label: "Turnout", value: formatPercent(selectedSeat.turnout_pct) },
                        { label: "Margin", value: formatPercent(selectedSeat.winning_margin_pct) },
                        { label: "Candidates", value: formatNumber(selectedSeat.candidate_count) },
                        {
                          label: "Cluster",
                          value: selectedSeat.cluster === null ? "N/A" : `C${selectedSeat.cluster}`,
                        },
                      ].map((item) => (
                        <div key={item.label} className="rounded-2xl bg-white/82 px-2 py-2">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#8b755c]">{item.label}</p>
                          <p className="mt-1 text-xs font-semibold text-[#211910]">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-[18px] border border-[#dbc9b0] bg-white/76 px-3 py-3">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#7f6852] mb-2">
                        Socioeconomic vs National
                      </p>
                      <div className="space-y-2">
                        {(
                          [
                            ["Literacy", selectedSeat.literacy_rate, summary.national_averages.literacy_rate],
                            ["Internet", selectedSeat.internet_pct, summary.national_averages.internet_pct],
                            ["Urbanization", selectedSeat.urbanization_index, summary.national_averages.urbanization_index],
                            ["Employment", selectedSeat.employment_rate_pct, summary.national_averages.employment_rate_pct],
                            ["NEET", selectedSeat.neet_pct, summary.national_averages.neet_pct],
                            ["Financial Account", selectedSeat.financial_account_pct, summary.national_averages.financial_account_pct],
                          ] as [string, number | null, number | null][]
                        ).map(([label, seatValue, nationalValue]) => {
                          const width = seatValue ? Math.min(seatValue, 100) : 0;
                          const comparison =
                            seatValue !== null && nationalValue !== null
                              ? `${seatValue >= nationalValue ? "+" : ""}${(seatValue - nationalValue).toFixed(1)}`
                              : "N/A";

                          return (
                            <div key={label}>
                              <div className="flex items-center justify-between gap-2 text-[10px] text-[#4f4336]">
                                <span className="font-medium">{label}</span>
                                <span className="text-[#8b755c]">{formatPercent(seatValue)}</span>
                              </div>
                              <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#eadfce]">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${width}%`,
                                    background: `linear-gradient(90deg, ${getAllianceColor(selectedSeat.alliance)}, #d6a85d)`,
                                  }}
                                />
                              </div>
                              <p className="mt-0.5 text-[9px] text-[#8b755c]">{comparison} pts</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-[18px] border border-dashed border-[#d8c8b1] bg-white/76 px-4 py-5 text-[#5d4f41]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8b755c]">No Selection</p>
                    <h3 className="mt-2 text-sm font-semibold text-[#211910]">Click a seat from left or map</h3>
                    <p className="mt-2 text-xs leading-5">
                      View candidate info, election stats, and socioeconomic comparison.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}