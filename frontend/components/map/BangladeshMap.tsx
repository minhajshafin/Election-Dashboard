"use client";

import { useEffect, useMemo } from "react";
import type { GeoJsonObject } from "geojson";
import L from "leaflet";
import { GeoJSON, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";

import { getAllianceColor } from "@/lib/colors";
import {
  type BangladeshGeoFeature,
  type BangladeshGeoJson,
  normalizeGeoLookupName,
} from "@/lib/geo";
import type { ConstituencyRow } from "@/types/api";

interface BangladeshMapProps {
  geoJson: BangladeshGeoJson;
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

function FitBoundsToBangladesh({ geoJson }: { geoJson: BangladeshGeoJson }) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.geoJSON(geoJson as GeoJsonObject).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [0, 0], maxZoom: 8 });
    }
  }, [map, geoJson]);

  return null;
}

export function BangladeshMap({
  geoJson,
  seats,
  selectedSeatKey,
  onSelectSeat,
  onClearSelection,
}: BangladeshMapProps) {
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

  const getSeatForFeature = (feature?: BangladeshGeoFeature) => {
    if (!feature) {
      return null;
    }

    const geoCode = feature.properties.cst;
    const byCode = seatIndex.byGeoCode.get(geoCode);
    if (byCode) {
      return byCode;
    }

    return seatIndex.byName.get(normalizeGeoLookupName(feature.properties.cst_n)) ?? null;
  };

  return (
    <div className="relative h-155 overflow-hidden rounded-[28px] border border-white/60 bg-[#f3efe5] shadow-[0_24px_80px_rgba(37,28,17,0.12)]">
      <MapContainer
        center={[23.685, 90.3563]}
        zoom={7}
        scrollWheelZoom={false}
        zoomControl={false}
        className="h-full w-full"
        maxBounds={[
          [25.5, 95.5],
          [21.5, 87.5],
        ]}
      >
        <FitBoundsToBangladesh geoJson={geoJson} />
        <MapBackgroundReset onClearSelection={onClearSelection} />
        
        <GeoJSON
          data={geoJson as GeoJsonObject}
          style={(feature) => {
            const seat = getSeatForFeature(feature as BangladeshGeoFeature | undefined);
            const selected = seat?.seat_key === selectedSeatKey;

            return {
              color: selected ? "#fff7ed" : "rgba(255,255,255,0.88)",
              weight: selected ? 2.8 : 1,
              fillColor: seat ? getAllianceColor(seat.alliance) : "#94a3b8",
              fillOpacity: selected ? 0.88 : seat ? 0.72 : 0.38,
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
                  weight: seat?.seat_key === selectedSeatKey ? 2.8 : 1.8,
                  fillOpacity: 0.9,
                });
              },
              mouseout: () => {
                if (!styleLayer) {
                  return;
                }

                const selected = seat?.seat_key === selectedSeatKey;
                styleLayer.setStyle({
                  weight: selected ? 2.8 : 1,
                  fillOpacity: selected ? 0.88 : seat ? 0.72 : 0.38,
                });
              },
            });
          }}
        />
      </MapContainer>
      <div className="absolute bottom-4 left-4 flex gap-2 rounded-full border border-white/70 bg-white/82 px-3 py-2 text-xs text-[#4b4034] shadow-sm backdrop-blur-sm">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#14532d]" /> BNP
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#0f766e]" /> Jamaat
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#b45309]" /> Others
        </span>
      </div>
    </div>
  );
}