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
      <div className="flex h-56 items-center justify-center border border-dashed border-white/15 bg-[#141412] px-4 text-center text-sm text-[#9c9888]">
        Select a constituency to preview its exact boundary.
      </div>
    );
  }

  return (
    <div className="h-56 overflow-hidden border border-white/10 bg-[#141412]">
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
            color: "#c9a84c",
            weight: 2,
            fillColor: getAllianceColor(alliance),
            fillOpacity: 0.86,
          }}
        />
      </MapContainer>
    </div>
  );
}