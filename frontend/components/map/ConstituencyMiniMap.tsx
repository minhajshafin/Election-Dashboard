"use client";

import { useEffect, useState } from "react";
import type { GeoJsonObject } from "geojson";
import L from "leaflet";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";

import { getReferendumSeatColor, getSeatColor } from "@/lib/colors";
import {
  fetchBangladeshGeoJson,
  findGeoFeatureForSeat,
  type BangladeshGeoFeature,
  type GeoResolvableSeat,
} from "@/lib/geo";

type MiniMapSeat = GeoResolvableSeat & {
  alliance?: string | null;
  winner_party?: string | null;
  referendum_result?: "yes" | "no" | null;
  referendum_yes?: number | null;
  referendum_no?: number | null;
};

interface ConstituencyMiniMapProps {
  seat: MiniMapSeat | null;
  mode: "election" | "referendum";
}

function FitSelectedFeature({ feature }: { feature: BangladeshGeoFeature | null }) {
  const map = useMap();

  useEffect(() => {
    if (!feature) {
      return;
    }

    const bounds = L.geoJSON(feature as GeoJsonObject).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.35));
    }
  }, [feature, map]);

  return null;
}

export function ConstituencyMiniMap({ seat, mode }: ConstituencyMiniMapProps) {
  const [geoJson, setGeoJson] = useState<import("@/lib/geo").BangladeshGeoJson | null>(null);

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

  if (!seat) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-md border border-dashed border-white/10 bg-[#0e0f12] px-6 text-center">
        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-[#d4af37]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <p className="font-mono text-[11px] tracking-wide text-[#9c9888]">
          Select a constituency to inspect boundary geometry
        </p>
      </div>
    );
  }

  if (!geoJson) {
    return (
      <div className="flex h-56 items-center justify-center rounded-md border border-white/10 bg-[#0e0f12] animate-pulse">
        <span className="font-mono text-[10px] tracking-widest text-[#5a5848] uppercase">Loading Cartography...</span>
      </div>
    );
  }

  const feature = findGeoFeatureForSeat(geoJson, seat);

  if (!feature) {
    return (
      <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-white/10 bg-[#0e0f12] px-4 text-center font-mono text-xs text-[#9c9888]">
        Boundary geometry unavailable for this constituency.
      </div>
    );
  }

  const featureKey =
    mode === "referendum"
      ? `${feature.properties.cst}-${mode}-${seat.referendum_result ?? "null"}-${seat.referendum_yes ?? "na"}-${seat.referendum_no ?? "na"}`
      : `${feature.properties.cst}-${mode}-${seat.alliance ?? "none"}-${seat.winner_party ?? "none"}`;

  const fillColor = mode === "referendum" ? getReferendumSeatColor(seat) : getSeatColor(seat);

  return (
    <div className="relative h-56 overflow-hidden rounded-md border border-white/10 bg-[#0b0c0e]">
      {/* Editorial badge */}
      <div className="pointer-events-none absolute left-2.5 top-2.5 z-1000 flex items-center gap-1.5 rounded bg-[#0b0c0e]/85 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-[#d4af37] backdrop-blur-md border border-white/10">
        <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
        Boundary Geometry · CST #{feature.properties.cst}
      </div>

      {/* Atmospheric perimeter vignette overlay */}
      <div className="pointer-events-none absolute inset-0 z-500 shadow-[inset_0_0_32px_rgba(11,12,14,0.95)]" />

      <MapContainer
        key={featureKey}
        center={[23.685, 90.3563]}
        zoom={10}
        zoomControl={false}
        dragging={false}
        doubleClickZoom={false}
        scrollWheelZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        className="h-full w-full bg-[#0b0c0e]"
      >
        <FitSelectedFeature feature={feature} />
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          opacity={0.8}
        />
        <GeoJSON
          key={featureKey}
          data={feature as GeoJsonObject}
          style={{
            color: "#f5d77f",
            weight: 2.2,
            fillColor,
            fillOpacity: 0.76,
          }}
        />
      </MapContainer>
    </div>
  );
}