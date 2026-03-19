"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GeoJsonObject } from "geojson";
import L from "leaflet";
import { GeoJSON, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";

import { getSeatColor } from "@/lib/colors";
import {
  type BangladeshGeoFeature,
  type BangladeshGeoJson,
  fetchBangladeshGeoJson,
  normalizeGeoLookupName,
} from "@/lib/geo";
import type { ConstituencyRow } from "@/types/api";

interface BangladeshMapProps {
  seats: ConstituencyRow[];
  selectedSeatKey: string | null;
  onSelectSeat: (seatKey: string) => void;
  onClearSelection: () => void;
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
      return "#94a3b8";
    }

    return getSeatColor(seat);
  };

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
          className="h-full w-full"
          maxBounds={[
            [21.5, 87.5],
            [25.5, 95.5],
          ]}
        >
          <FitBoundsAfterResize geoJson={geoJson} />
          <MapBackgroundReset onClearSelection={onClearSelection} />

          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            opacity={0.2}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          <GeoJSON
            data={geoJson as GeoJsonObject}
            style={(feature) => {
              const seat = getSeatForFeature(feature as BangladeshGeoFeature | undefined);

              return {
                color: "rgba(255,255,255,0.2)",
                weight: 0.7,
                fillColor: getSeatFillColor(seat),
                fillOpacity: seat ? 0.8 : 0.35,
                opacity: 1,
              };
            }}
            onEachFeature={(feature, layer) => {
              const seat = getSeatForFeature(feature as BangladeshGeoFeature);
              const title = seat
                ? `${seat.constituency} · ${seat.winner_party} · ${seat.winner_vote_share_pct ?? "N/A"}%`
                : `${feature.properties.cst_n} · No election data`;

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
                    fillOpacity: seat ? 0.8 : 0.35,
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
      <div className="absolute bottom-4 left-4 flex gap-4 border border-white/10 bg-[#0d0d0b]/90 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#9c9888]">
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
      </div>
    </div>
  );
}