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

const ELECTION_NO_DATA_FILL_COLOR = "#94a3b8";
const POSTPONED_SEAT_FILL_COLOR = "#6b7280";
const REFERENDUM_NULL_FILL_COLOR = "#6b7280";

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
      return mode === "referendum"
        ? `${fallbackSeatName} · No constituency match`
        : `${fallbackSeatName} · No election data`;
    }

    if (mode === "election") {
      const status = getSeatElectionStatus(seat);

      if (status.isPostponed) {
        return `${seat.constituency} · ${status.label} · ${status.reason}`;
      }

      return `${seat.constituency} · ${seat.winner_party} · ${seat.winner_vote_share_pct ?? "N/A"}%`;
    }

    const result = getReferendumSeatResult(seat);
    const yesVotes = formatVotes(seat.referendum_yes);
    const noVotes = formatVotes(seat.referendum_no);

    if (result === "yes") {
      return `${seat.constituency} · Majority YES · Yes ${yesVotes} / No ${noVotes}`;
    }

    if (result === "no") {
      return `${seat.constituency} · Majority NO · Yes ${yesVotes} / No ${noVotes}`;
    }

    return `${seat.constituency} · Referendum unavailable · Yes ${yesVotes} / No ${noVotes}`;
  };

  const fillOpacity = mode === "referendum" ? 0.82 : 0.8;
  const emptyFillOpacity = mode === "referendum" ? 0.5 : 0.35;

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
    <div className="relative h-full w-full overflow-hidden bg-[#141412]">
      {!geoJson ? (
        <div className="h-full border border-white/10 bg-[#141412] animate-pulse" />
      ) : (
        <MapContainer
          center={[23.685, 90.3563]}
          zoom={7}
          zoomSnap={0.25}
          zoomDelta={0.25}
          scrollWheelZoom={false}
          zoomControl={false}
          className="h-full w-full bg-[#0d0d0b]"
          maxBounds={[
            [21.5, 87.5],
            [25.5, 95.5],
          ]}
        >
          <FitBoundsAfterResize geoJson={geoJson} />
          <MapBackgroundReset onClearSelection={onClearSelection} />

          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            opacity={0.75}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          <GeoJSON
            data={geoJson as GeoJsonObject}
            style={(feature) => {
              const seat = getSeatForFeature(feature as BangladeshGeoFeature | undefined);

              return {
                color: "rgba(255,255,255,0.2)",
                weight: 0.7,
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
                opacity: 0.94,
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
                    weight: 1.4,
                    fillOpacity: 0.92,
                  });
                },
                mouseout: () => {
                  if (!styleLayer) {
                    return;
                  }
                  styleLayer.setStyle({
                    weight: 0.7,
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
                color: "#fff3b0",
                weight: 4,
                opacity: 1,
                fillOpacity: 0,
              }}
            />
          ) : null}
        </MapContainer>
      )}
      <div className="absolute bottom-4 left-4 z-700 flex flex-wrap gap-4 border border-white/20 bg-[#0d0d0b] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#9c9888] shadow-[0_10px_24px_rgba(0,0,0,0.45)]">
        {mode === "election" ? (
          <>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#4a9e7a]" /> BNP
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#2a6aaa]" /> Jamaat
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#c0572a]" /> NCP
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#c9a84c]" /> Other Parties
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#6b7280]" /> Postponed
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#2f9e44]" /> Majority Yes
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#d94841]" /> Majority No
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#6b7280]" /> Null / Missing
            </span>
          </>
        )}
      </div>
    </div>
  );
}