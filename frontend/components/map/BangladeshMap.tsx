"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GeoJsonObject } from "geojson";
import L from "leaflet";
import { GeoJSON, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";

import { getReferendumSeatColor, getReferendumSeatResult, getSeatColor } from "@/lib/colors";
import { getSeatElectionStatus } from "@/lib/electionStatus";
import {
  type BangladeshGeoFeature,
  type BangladeshGeoJson,
  fetchBangladeshGeoJson,
  normalizeGeoLookupName,
} from "@/lib/geo";
import type { ConstituencyRow } from "@/types/api";

interface BangladeshMapProps {
  seats: ConstituencyRow[];
  mode: "election" | "referendum";
  selectedSeatKey: string | null;
  onSelectSeat: (seatKey: string) => void;
  onClearSelection: () => void;
}

const ELECTION_NO_DATA_FILL_COLOR = "#272a30";
const POSTPONED_SEAT_FILL_COLOR = "#475569";
const REFERENDUM_NULL_FILL_COLOR = "#272a30";

function formatVotes(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US").format(value);
}

function MapBackgroundReset({ onClearSelection }: { onClearSelection: () => void }) {
  useMapEvents({
    click: () => {
      onClearSelection();
    },
  });

  return null;
}

function FlyToSelectedSeat({ feature }: { feature: BangladeshGeoFeature | null }) {
  const map = useMap();

  useEffect(() => {
    if (!feature) {
      return;
    }

    const bounds = L.geoJSON(feature as GeoJsonObject).getBounds();
    if (bounds.isValid()) {
      map.flyToBounds(bounds.pad(0.9), {
        duration: 0.8,
        easeLinearity: 0.25,
      });
    }
  }, [feature, map]);

  return null;
}

function MapZoomControls({ geoJson }: { geoJson: BangladeshGeoJson }) {
  const map = useMap();

  const handleReset = () => {
    const bounds = L.geoJSON(geoJson as GeoJsonObject).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { animate: true, padding: [4, 4] });
    }
  };

  return (
    <div className="absolute right-3 top-3 z-1000 flex flex-col border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        title="Zoom In"
        className="flex h-7 w-7 items-center justify-center font-mono text-xs text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] border-b border-[var(--border)] transition-colors cursor-pointer"
      >
        +
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        title="Zoom Out"
        className="flex h-7 w-7 items-center justify-center font-mono text-xs text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] border-b border-[var(--border)] transition-colors cursor-pointer"
      >
        −
      </button>
      <button
        type="button"
        onClick={handleReset}
        title="Reset Map View"
        className="flex h-7 w-7 items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
      >
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="square" strokeLinejoin="miter" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
}

function FitBoundsAfterResize({ geoJson }: { geoJson: BangladeshGeoJson }) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.geoJSON(geoJson as GeoJsonObject).getBounds();
    if (!bounds.isValid()) {
      return;
    }

    const fitToBounds = () => {
      map.invalidateSize();
      map.fitBounds(bounds, {
        animate: false,
        padding: [4, 4],
      });
    };

    // Run once after layout settles, then keep fit centered on map resizes.
    const id = setTimeout(fitToBounds, 120);
    map.on("resize", fitToBounds);

    return () => {
      clearTimeout(id);
      map.off("resize", fitToBounds);
    };
  }, [map, geoJson]);

  return null;
}

export function BangladeshMap({
  seats,
  mode,
  selectedSeatKey,
  onSelectSeat,
  onClearSelection,
}: BangladeshMapProps) {
  const [geoJson, setGeoJson] = useState<BangladeshGeoJson | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const getTheme = () => (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
    setTheme(getTheme());

    const handleThemeChange = (e: Event) => {
      const custom = e as CustomEvent<{ theme: "light" | "dark" }>;
      if (custom.detail?.theme) {
        setTheme(custom.detail.theme);
      } else {
        setTheme(getTheme());
      }
    };

    window.addEventListener("themechange", handleThemeChange);
    return () => window.removeEventListener("themechange", handleThemeChange);
  }, []);

  useEffect(() => {
    let disposed = false;

    fetchBangladeshGeoJson()
      .then((data) => {
        if (!disposed) {
          setGeoJson(data);
        }
      })
      .catch(() => {
        if (!disposed) {
          setGeoJson(null);
        }
      });

    return () => {
      disposed = true;
    };
  }, []);

  const seatIndex = useMemo(() => {
    const byGeoCode = new Map<number, ConstituencyRow>();
    const byName = new Map<string, ConstituencyRow>();

    for (const seat of seats) {
      if (seat.geo_code !== null) {
        byGeoCode.set(seat.geo_code, seat);
      }
      byName.set(normalizeGeoLookupName(seat.constituency), seat);
      if (seat.geo_name) {
        byName.set(normalizeGeoLookupName(seat.geo_name), seat);
      }
    }

    return { byGeoCode, byName };
  }, [seats]);

  const getSeatForFeature = useCallback((feature?: BangladeshGeoFeature) => {
    if (!feature) {
      return null;
    }

    const geoCode = feature.properties.cst;
    const byCode = seatIndex.byGeoCode.get(geoCode);
    if (byCode) {
      return byCode;
    }

    return seatIndex.byName.get(normalizeGeoLookupName(feature.properties.cst_n)) ?? null;
  }, [seatIndex]);

  const getSeatFillColor = (seat: ConstituencyRow | null): string => {
    if (!seat) {
      return mode === "referendum" ? REFERENDUM_NULL_FILL_COLOR : ELECTION_NO_DATA_FILL_COLOR;
    }

    if (mode === "referendum") {
      return getReferendumSeatColor(seat);
    }

    if (getSeatElectionStatus(seat).isPostponed) {
      return POSTPONED_SEAT_FILL_COLOR;
    }

    return getSeatColor(seat);
  };

  const getSeatTooltip = (seat: ConstituencyRow | null, fallbackSeatName: string): string => {
    if (!seat) {
      return `<div class="px-2 py-1 font-sans"><span class="font-medium text-[var(--text-primary)]">${fallbackSeatName}</span><span class="block text-[10px] text-[var(--text-muted)]">No match</span></div>`;
    }

    if (mode === "election") {
      const status = getSeatElectionStatus(seat);
      const color = getSeatFillColor(seat);

      if (status.isPostponed) {
        return `
          <div class="px-2.5 py-1.5 font-sans">
            <div class="font-semibold text-xs text-[var(--text-primary)]">${seat.constituency}</div>
            <div class="text-[10px] text-[var(--text-muted)]">${seat.district} · ${seat.division}</div>
            <div class="mt-1 text-[9px] font-mono text-amber-600 dark:text-amber-400">
              ${status.label}
            </div>
          </div>
        `;
      }

      const voteShare = seat.winner_vote_share_pct !== null ? `${seat.winner_vote_share_pct.toFixed(1)}%` : "N/A";
      return `
        <div class="px-2.5 py-1.5 font-sans min-w-[150px]">
          <div class="flex items-center justify-between gap-3">
            <span class="font-semibold text-xs text-[var(--text-primary)]">${seat.constituency}</span>
            <span class="font-mono text-[9px] text-[var(--text-muted)]">${seat.district}</span>
          </div>
          <div class="mt-1 flex items-center gap-1.5 text-[11px]">
            <span class="inline-block h-2 w-2" style="background:${color}"></span>
            <span class="font-medium text-[var(--text-primary)]">${seat.winner_party}</span>
            <span class="text-[var(--text-muted)]">·</span>
            <span class="font-mono font-medium">${voteShare}</span>
          </div>
          <div class="mt-0.5 text-[10px] text-[var(--text-secondary)] truncate max-w-[190px]">
            ${seat.winner_candidate}
          </div>
        </div>
      `;
    }

    const result = getReferendumSeatResult(seat);
    const color = getReferendumSeatColor(seat);
    const yesVotes = formatVotes(seat.referendum_yes);
    const noVotes = formatVotes(seat.referendum_no);

    return `
      <div class="px-2.5 py-1.5 font-sans min-w-[150px]">
        <div class="flex items-center justify-between gap-3">
          <span class="font-semibold text-xs text-[var(--text-primary)]">${seat.constituency}</span>
          <span class="font-mono text-[9px] text-[var(--text-muted)]">${seat.district}</span>
        </div>
        <div class="mt-1 flex items-center gap-1.5 text-[11px]">
          <span class="inline-block h-2 w-2" style="background:${color}"></span>
          <span class="font-medium capitalize" style="color:${color}">Majority ${result ?? "Unknown"}</span>
        </div>
        <div class="mt-0.5 font-mono text-[10px] text-[var(--text-secondary)]">
          Yes: ${yesVotes} · No: ${noVotes}
        </div>
      </div>
    `;
  };

  const fillOpacity = mode === "referendum" ? 0.82 : 0.8;
  const emptyFillOpacity = mode === "referendum" ? 0.45 : 0.3;

  const selectedFeature = useMemo(() => {
    if (!geoJson || !selectedSeatKey) {
      return null;
    }

    return geoJson.features.find((feature) => {
      const seat = getSeatForFeature(feature);
      return seat?.seat_key === selectedSeatKey;
    }) ?? null;
  }, [geoJson, getSeatForFeature, selectedSeatKey]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--bg-canvas)]">
      {!geoJson ? (
        <div className="flex h-full items-center justify-center bg-[var(--bg-canvas)]">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            Loading Geospatial Boundaries...
          </span>
        </div>
      ) : (
        <MapContainer
          center={[23.685, 90.3563]}
          zoom={7}
          zoomSnap={0.25}
          zoomDelta={0.25}
          scrollWheelZoom={false}
          zoomControl={false}
          className="h-full w-full bg-[var(--bg-canvas)]"
          maxBounds={[
            [20.5, 87.0],
            [26.8, 93.0],
          ]}
        >
          <FitBoundsAfterResize geoJson={geoJson} />
          <FlyToSelectedSeat feature={selectedFeature} />
          <MapZoomControls geoJson={geoJson} />
          <MapBackgroundReset onClearSelection={onClearSelection} />

          <TileLayer
            key={theme}
            url={
              theme === "dark"
                ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            }
            opacity={theme === "dark" ? 0.75 : 0.85}
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          />

          <GeoJSON
            key={`features-${theme}`}
            data={geoJson as GeoJsonObject}
            style={(feature) => {
              const seat = getSeatForFeature(feature as BangladeshGeoFeature | undefined);

              return {
                color: theme === "dark" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.16)",
                weight: 0.5,
                fillColor: getSeatFillColor(seat),
                fillOpacity: seat ? fillOpacity : emptyFillOpacity,
                opacity: 1,
              };
            }}
            onEachFeature={(feature, layer) => {
              const seat = getSeatForFeature(feature as BangladeshGeoFeature);
              const title = getSeatTooltip(seat, feature.properties.cst_n);

              const styleLayer = layer instanceof L.Path ? layer : null;

              layer.bindTooltip(title, {
                direction: "top",
                sticky: true,
                opacity: 1,
              });

              layer.on({
                click: (event) => {
                  L.DomEvent.stopPropagation(event);
                  if (seat) {
                    onSelectSeat(seat.seat_key);
                  }
                },
                mouseover: () => {
                  if (!styleLayer) {
                    return;
                  }

                  styleLayer.setStyle({
                    weight: 1.5,
                    color: theme === "dark" ? "#ffffff" : "#000000",
                    fillOpacity: 0.92,
                  });
                },
                mouseout: () => {
                  if (!styleLayer) {
                    return;
                  }
                  styleLayer.setStyle({
                    weight: 0.5,
                    color: theme === "dark" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.16)",
                    fillOpacity: seat ? fillOpacity : emptyFillOpacity,
                  });
                },
              });
            }}
          />

          {selectedFeature ? (
            <GeoJSON
              key={`selected-${selectedSeatKey}-${theme}`}
              data={selectedFeature as GeoJsonObject}
              interactive={false}
              style={{
                className: "selected-seat-outline",
                color: theme === "dark" ? "#ffffff" : "#000000",
                weight: 2.5,
                opacity: 1,
                fillOpacity: 0,
              }}
            />
          ) : null}
        </MapContainer>
      )}

      {/* Sharp Boxy Legend */}
      <div className="absolute bottom-3 left-3 z-700 flex flex-wrap items-center gap-3 border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)] shadow-sm">
        {mode === "election" ? (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ backgroundColor: "#16a34a" }} /> BNP
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ backgroundColor: "#2563eb" }} /> Jamaat
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ backgroundColor: "#ea580c" }} /> NCP
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ backgroundColor: "#64748b" }} /> Others
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ backgroundColor: "#94a3b8" }} /> Postponed
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ backgroundColor: "#16a34a" }} /> Majority Yes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ backgroundColor: "#dc2626" }} /> Majority No
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ backgroundColor: "#64748b" }} /> Null
            </span>
          </>
        )}
      </div>
    </div>
  );
}