"use client";

import { useEffect } from "react";
import type { GeoJsonObject } from "geojson";
import L from "leaflet";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";

import { getAllianceColor } from "@/lib/colors";
import type { BangladeshGeoFeature } from "@/lib/geo";

interface ConstituencyMiniMapProps {
  feature: BangladeshGeoFeature | null;
  alliance: string;
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

export function ConstituencyMiniMap({ feature, alliance }: ConstituencyMiniMapProps) {
  if (!feature) {
    return (
      <div className="flex h-48 items-center justify-center rounded-[22px] border border-dashed border-[#cebfa8] bg-[#f4ede1] text-sm text-[#6d5d4d]">
        Select a constituency to preview its exact boundary.
      </div>
    );
  }

  return (
    <div className="h-48 overflow-hidden rounded-[22px] border border-white/60 bg-[#efe7da] shadow-inner">
      <MapContainer
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
          data={feature as GeoJsonObject}
          style={{
            color: "#fff7ed",
            weight: 2,
            fillColor: getAllianceColor(alliance),
            fillOpacity: 0.8,
          }}
        />
      </MapContainer>
    </div>
  );
}