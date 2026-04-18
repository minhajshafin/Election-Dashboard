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
      <div className="flex h-56 items-center justify-center border border-dashed border-white/15 bg-[#141412] px-4 text-center text-sm text-[#9c9888]">
        Select a constituency to preview its exact boundary.
      </div>
    );
  }

  if (!geoJson) {
    return <div className="h-56 border border-white/10 bg-[#141412] animate-pulse" />;
  }

  const feature = findGeoFeatureForSeat(geoJson, seat);

  if (!feature) {
    return (
      <div className="flex h-56 items-center justify-center border border-dashed border-white/15 bg-[#141412] px-4 text-center text-sm text-[#9c9888]">
        Boundary geometry not found for this constituency.
      </div>
    );
  }

  const featureKey =
    mode === "referendum"
      ? `${feature.properties.cst}-${mode}-${seat.referendum_result ?? "null"}-${seat.referendum_yes ?? "na"}-${seat.referendum_no ?? "na"}`
      : `${feature.properties.cst}-${mode}-${seat.alliance ?? "none"}-${seat.winner_party ?? "none"}`;

  const fillColor = mode === "referendum" ? getReferendumSeatColor(seat) : getSeatColor(seat);

  return (
    <div className="h-56 overflow-hidden border border-white/10 bg-[#141412]">
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
        className="h-full w-full"
      >
        <FitSelectedFeature feature={feature} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON
          key={featureKey}
          data={feature as GeoJsonObject}
          style={{
            color: "#c9a84c",
            weight: 2,
            fillColor,
            fillOpacity: 0.86,
          }}
        />
      </MapContainer>
    </div>
  );
}