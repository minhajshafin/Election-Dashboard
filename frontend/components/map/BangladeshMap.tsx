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
      map.fitBounds(bounds, { animate: true });
    }
  };

  return (
    <div className="absolute right-3.5 top-3.5 z-1000 flex flex-col overflow-hidden rounded-md border border-white/10 bg-[#0e0f12]/85 backdrop-blur-md shadow-xl">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        title="Zoom In"
        className="flex h-7 w-7 items-center justify-center font-mono text-sm text-[#d4d4d8] hover:bg-white/10 hover:text-white transition-colors border-b border-white/5"
      >
        +
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        title="Zoom Out"
        className="flex h-7 w-7 items-center justify-center font-mono text-sm text-[#d4d4d8] hover:bg-white/10 hover:text-white transition-colors border-b border-white/5"
      >
        −
      </button>
      <button
        type="button"
        onClick={handleReset}
        title="Reset Map View"
        className="flex h-7 w-7 items-center justify-center text-[#d4d4d8] hover:bg-white/10 hover:text-[#d4af37] transition-colors"
      >
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
      });

      // Slightly tighter than exact bounds fit so geometry reads edge-to-edge.
      map.setZoom(map.getZoom(), { animate: false });
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
      return `<div class="px-2 py-1 font-sans"><span class="font-medium text-white">${fallbackSeatName}</span><span class="block text-[10px] text-zinc-400">No constituency match</span></div>`;
    }

    if (mode === "election") {
      const status = getSeatElectionStatus(seat);
      const color = getSeatFillColor(seat);

      if (status.isPostponed) {
        return `
          <div class="px-2 py-1 font-sans">
            <div class="font-semibold text-xs text-amber-200">${seat.constituency}</div>
            <div class="text-[10px] text-zinc-400">${seat.district} · ${seat.division} Division</div>
            <div class="mt-1 inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-mono text-amber-300 border border-amber-500/20">
              ${status.label}
            </div>
          </div>
        `;
      }

      const voteShare = seat.winner_vote_share_pct !== null ? `${seat.winner_vote_share_pct.toFixed(1)}%` : "N/A";
      return `
        <div class="px-2.5 py-1.5 font-sans min-w-[150px]">
          <div class="flex items-center justify-between gap-3">
            <span class="font-semibold text-xs text-white">${seat.constituency}</span>
            <span class="font-mono text-[9px] text-zinc-400">${seat.district}</span>
          </div>
          <div class="mt-1 flex items-center gap-1.5 text-[11px]">
            <span class="h-2 w-2 rounded-full" style="background:${color};box-shadow:0 0 6px ${color}99"></span>
            <span class="font-medium text-zinc-200">${seat.winner_party}</span>
            <span class="text-zinc-500">·</span>
            <span class="font-mono font-medium text-[#d4af37]">${voteShare}</span>
          </div>
          <div class="mt-0.5 text-[10px] text-zinc-400 truncate max-w-[190px]">
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
          <span class="font-semibold text-xs text-white">${seat.constituency}</span>
          <span class="font-mono text-[9px] text-zinc-400">${seat.district}</span>
        </div>
        <div class="mt-1 flex items-center gap-1.5 text-[11px]">
          <span class="h-2 w-2 rounded-full" style="background:${color};box-shadow:0 0 6px ${color}99"></span>
          <span class="font-medium capitalize" style="color:${color}">Majority ${result ?? "Unknown"}</span>
        </div>
        <div class="mt-0.5 font-mono text-[10px] text-zinc-300">
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
    <div className="relative h-full w-full overflow-hidden bg-[#0b0c0e]">
      {/* Perimeter atmospheric vignette */}
      <div className="pointer-events-none absolute inset-0 z-400 shadow-[inset_0_0_48px_rgba(11,12,14,0.9)]" />

      {!geoJson ? (
        <div className="flex h-full items-center justify-center bg-[#0b0c0e]">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#d4af37] border-t-transparent" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#5a5848]">Loading Bangladesh Geospatial Data...</span>
          </div>
        </div>
      ) : (
        <MapContainer
          center={[23.685, 90.3563]}
          zoom={7}
          zoomSnap={0.25}
          zoomDelta={0.25}
          scrollWheelZoom={false}
          zoomControl={false}
          className="h-full w-full bg-[#0b0c0e]"
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
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            opacity={0.7}
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          />

          <GeoJSON
            data={geoJson as GeoJsonObject}
            style={(feature) => {
              const seat = getSeatForFeature(feature as BangladeshGeoFeature | undefined);

              return {
                color: "rgba(255,255,255,0.18)",
                weight: 0.65,
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
                    weight: 1.8,
                    color: "#ffffff",
                    fillOpacity: 0.94,
                  });
                },
                mouseout: () => {
                  if (!styleLayer) {
                    return;
                  }
                  styleLayer.setStyle({
                    weight: 0.65,
                    color: "rgba(255,255,255,0.18)",
                    fillOpacity: seat ? fillOpacity : emptyFillOpacity,
                  });
                },
              });
            }}
          />

          {selectedFeature ? (
            <GeoJSON
              key={`selected-${selectedSeatKey}`}
              data={selectedFeature as GeoJsonObject}
              interactive={false}
              style={{
                className: "selected-seat-outline",
                color: "#f5d77f",
                weight: 3.5,
                opacity: 1,
                fillOpacity: 0,
              }}
            />
          ) : null}
        </MapContainer>
      )}

      {/* Floating Glassmorphic Legend */}
      <div className="absolute bottom-4 left-4 z-700 flex flex-wrap items-center gap-3.5 rounded-lg border border-white/10 bg-[#0b0c0e]/85 px-3.5 py-2 font-mono text-[10px] uppercase tracking-wider text-[#a1a1aa] backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
        {mode === "election" ? (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#2ec486] shadow-[0_0_6px_#2ec48688]" /> BNP
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#3b82f6] shadow-[0_0_6px_#3b82f688]" /> Jamaat
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#e25822] shadow-[0_0_6px_#e2582288]" /> NCP
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_6px_#d4af3788]" /> Other Parties
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#64748b]" /> Postponed
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b98188]" /> Majority Yes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#f43f5e] shadow-[0_0_6px_#f43f5e88]" /> Majority No
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#64748b]" /> Null / Missing
            </span>
          </>
        )}
      </div>
    </div>
  );
}