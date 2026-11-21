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
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const updateTheme = () => {
      const current = document.documentElement.getAttribute("data-theme");
      setTheme(current === "light" ? "light" : "dark");
    };
    updateTheme();
    window.addEventListener("themechange", updateTheme);
    return () => window.removeEventListener("themechange", updateTheme);
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

  const tileUrl =
    theme === "light"
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
      : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";

  const strokeColor = theme === "light" ? "#0f172a" : "#f8fafc";

  if (!seat) {
    return (
      <div className="flex h-44 flex-col items-center justify-center border border-dashed border-[var(--border)] bg-[var(--bg-canvas)] px-6 text-center">
        <p className="font-mono text-[11px] tracking-wide text-[var(--text-muted)]">
          Select a constituency to inspect cartographic boundary
        </p>
      </div>
    );
  }

  if (!geoJson) {
    return (
      <div className="flex h-44 items-center justify-center border border-[var(--border)] bg-[var(--bg-canvas)]">
        <span className="font-mono text-[10px] tracking-widest text-[var(--text-muted)] uppercase">
          Loading Cartography...
        </span>
      </div>
    );
  }

  const feature = findGeoFeatureForSeat(geoJson, seat);

  if (!feature) {
    return (
      <div className="flex h-44 items-center justify-center border border-dashed border-[var(--border)] bg-[var(--bg-canvas)] px-4 text-center font-mono text-xs text-[var(--text-muted)]">
        Boundary geometry unavailable for this constituency.
      </div>
    );
  }

  const featureKey =
    mode === "referendum"
      ? `${feature.properties.cst}-${mode}-${seat.referendum_result ?? "null"}-${seat.referendum_yes ?? "na"}-${seat.referendum_no ?? "na"}-${theme}`
      : `${feature.properties.cst}-${mode}-${seat.alliance ?? "none"}-${seat.winner_party ?? "none"}-${theme}`;

  const fillColor = mode === "referendum" ? getReferendumSeatColor(seat) : getSeatColor(seat);

  return (
    <div className="relative h-44 overflow-hidden border border-[var(--border)] bg-[var(--bg-canvas)]">
      {/* Editorial badge */}
      <div className="pointer-events-none absolute left-2 top-2 z-1000 flex items-center gap-1.5 border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--text-primary)]">
        <span
          className="h-1.5 w-1.5"
          style={{ backgroundColor: strokeColor }}
        />
        Boundary · CST #{feature.properties.cst}
      </div>

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
        className="h-full w-full bg-[var(--bg-canvas)]"
      >
        <FitSelectedFeature feature={feature} />
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url={tileUrl}
          opacity={theme === "light" ? 0.9 : 0.8}
        />
        <GeoJSON
          key={featureKey}
          data={feature as GeoJsonObject}
          style={{
            color: strokeColor,
            weight: 2,
            fillColor,
            fillOpacity: 0.75,
          }}
        />
      </MapContainer>
    </div>
  );
}
