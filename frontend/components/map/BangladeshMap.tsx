"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GeoJsonObject } from "geojson";
import L from "leaflet";
import { GeoJSON, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";

import {
  ALLIANCE_COLORS,
  PARTY_COLORS,
  REFERENDUM_COLORS,
  getReferendumSeatColor,
  getReferendumSeatResult,
  getSeatColor,
} from "@/lib/colors";
import { getSeatElectionStatus } from "@/lib/electionStatus";
import {
  type BangladeshGeoFeature,
  type BangladeshGeoJson,
  fetchBangladeshGeoJson,
  normalizeGeoLookupName,
} from "@/lib/geo";
import type { ConstituencyRow } from "@/types/api";
import { useTheme } from "@/lib/useTheme";

interface BangladeshMapProps {
  seats: ConstituencyRow[];
  mode: "election" | "referendum";
  selectedSeatKey: string | null;
  activeDivision?: string;
  searchQuery?: string;
  matchingDivision?: string | null;
  matchingSeatKeys?: string[] | null;
  onSelectSeat: (seatKey: string) => void;
  onClearSelection: () => void;
}

const ELECTION_NO_DATA_FILL_COLOR_LIGHT = "#cbd5e1";
const ELECTION_NO_DATA_FILL_COLOR_DARK = "#272a30";
const POSTPONED_SEAT_FILL_COLOR = "#64748b";
const REFERENDUM_NULL_FILL_COLOR_LIGHT = "#cbd5e1";
const REFERENDUM_NULL_FILL_COLOR_DARK = "#272a30";

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

function FlyToActiveDivision({
  activeDivision,
  geoJson,
  getSeatForFeature,
  isSearchActive,
}: {
  activeDivision: string | undefined;
  geoJson: BangladeshGeoJson | null;
  getSeatForFeature: (feature?: BangladeshGeoFeature) => ConstituencyRow | null;
  isSearchActive: boolean;
}) {
  const map = useMap();
  const prevDivisionRef = useRef<string | undefined>(undefined);

  // Pre-calculate division bounding boxes once so flying to a division is instantaneous
  const divisionBoundsMap = useMemo(() => {
    if (!geoJson) return new Map<string, L.LatLngBounds>();
    const divisionFeaturesMap = new Map<string, BangladeshGeoFeature[]>();
    for (const f of geoJson.features) {
      const seat = getSeatForFeature(f);
      if (seat?.division) {
        let list = divisionFeaturesMap.get(seat.division);
        if (!list) {
          list = [];
          divisionFeaturesMap.set(seat.division, list);
        }
        list.push(f);
      }
    }
    const boundsMap = new Map<string, L.LatLngBounds>();
    for (const [divName, features] of divisionFeaturesMap.entries()) {
      const b = L.geoJSON({ type: "FeatureCollection", features } as unknown as GeoJsonObject).getBounds();
      if (b.isValid()) {
        boundsMap.set(divName, b);
      }
    }
    const countryBounds = L.geoJSON(geoJson as unknown as GeoJsonObject).getBounds();
    if (countryBounds.isValid()) {
      boundsMap.set("All Divisions", countryBounds);
    }
    return boundsMap;
  }, [geoJson, getSeatForFeature]);

  useEffect(() => {
    if (!geoJson || !activeDivision || isSearchActive) {
      return;
    }

    if (prevDivisionRef.current === activeDivision) {
      return;
    }
    const isInitialMount = prevDivisionRef.current === undefined;
    prevDivisionRef.current = activeDivision;

    if (isInitialMount && activeDivision === "All Divisions") {
      return;
    }

    const bounds = divisionBoundsMap.get(activeDivision);
    if (!bounds || !bounds.isValid()) {
      return;
    }

    if (activeDivision === "All Divisions") {
      map.flyToBounds(bounds, {
        padding: [4, 4],
        duration: 0.7,
        easeLinearity: 0.25,
      });
    } else {
      map.flyToBounds(bounds.pad(0.06), {
        duration: 0.7,
        easeLinearity: 0.25,
      });
    }
  }, [activeDivision, divisionBoundsMap, geoJson, isSearchActive, map]);

  return null;
}

function FlyToSearchHighlight({
  matchingDivision,
  matchingDivisionFeatures,
  matchingSeatFeatures,
  geoJson,
  selectedSeatKey,
}: {
  matchingDivision: string | null;
  matchingDivisionFeatures: BangladeshGeoFeature[];
  matchingSeatFeatures: BangladeshGeoFeature[];
  geoJson: BangladeshGeoJson | null;
  selectedSeatKey: string | null;
}) {
  const map = useMap();
  const prevTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!geoJson) return;

    // 1. Division match
    if (matchingDivision && matchingDivisionFeatures.length > 0) {
      const targetKey = `div:${matchingDivision.toLowerCase()}`;
      if (prevTargetRef.current === targetKey) return;
      prevTargetRef.current = targetKey;

      const bounds = L.geoJSON({
        type: "FeatureCollection",
        features: matchingDivisionFeatures,
      } as unknown as GeoJsonObject).getBounds();

      if (bounds.isValid()) {
        map.flyToBounds(bounds.pad(0.06), {
          duration: 0.7,
          easeLinearity: 0.25,
        });
      }
      return;
    }

    // 2. Seat match (1 to 15 seats)
    if (!matchingDivision && matchingSeatFeatures.length >= 1 && matchingSeatFeatures.length <= 15) {
      const targetKey = `seats:${matchingSeatFeatures.map((f) => f.properties.cst).sort().join(",")}`;
      if (prevTargetRef.current === targetKey) return;
      prevTargetRef.current = targetKey;

      const bounds = L.geoJSON({
        type: "FeatureCollection",
        features: matchingSeatFeatures,
      } as unknown as GeoJsonObject).getBounds();

      if (bounds.isValid()) {
        const pad = matchingSeatFeatures.length === 1 ? 0.9 : 0.2;
        map.flyToBounds(bounds.pad(pad), {
          duration: 0.7,
          easeLinearity: 0.25,
        });
      }
      return;
    }

    // 3. Search was cleared -> fly back to country bounds if no seat is selected
    if (!matchingDivision && matchingSeatFeatures.length === 0 && prevTargetRef.current !== null) {
      prevTargetRef.current = null;
      if (!selectedSeatKey) {
        const countryBounds = L.geoJSON(geoJson as unknown as GeoJsonObject).getBounds();
        if (countryBounds.isValid()) {
          map.flyToBounds(countryBounds, {
            padding: [4, 4],
            duration: 0.7,
            easeLinearity: 0.25,
          });
        }
      }
    }
  }, [matchingDivision, matchingDivisionFeatures, matchingSeatFeatures, geoJson, map, selectedSeatKey]);

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
  activeDivision,
  matchingDivision = null,
  matchingSeatKeys = null,
  onSelectSeat,
  onClearSelection,
}: BangladeshMapProps) {
  const [geoJson, setGeoJson] = useState<BangladeshGeoJson | null>(null);
  const theme = useTheme();

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

  const getSeatFillColor = useCallback((seat: ConstituencyRow | null): string => {
    if (!seat) {
      if (mode === "referendum") {
        return theme === "dark" ? REFERENDUM_NULL_FILL_COLOR_DARK : REFERENDUM_NULL_FILL_COLOR_LIGHT;
      }
      return theme === "dark" ? ELECTION_NO_DATA_FILL_COLOR_DARK : ELECTION_NO_DATA_FILL_COLOR_LIGHT;
    }

    if (mode === "referendum") {
      return getReferendumSeatColor(seat);
    }

    if (getSeatElectionStatus(seat).isPostponed) {
      return POSTPONED_SEAT_FILL_COLOR;
    }

    return getSeatColor(seat);
  }, [mode, theme]);

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

  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);

  const matchingDivisionFeatures = useMemo(() => {
    if (!geoJson || !matchingDivision) {
      return [];
    }

    return geoJson.features.filter((feature) => {
      const seat = getSeatForFeature(feature);
      return seat?.division.toLowerCase() === matchingDivision.toLowerCase();
    });
  }, [geoJson, matchingDivision, getSeatForFeature]);

  const matchingSeatFeatures = useMemo(() => {
    if (!geoJson || !matchingSeatKeys || matchingSeatKeys.length === 0) {
      return [];
    }

    const keysSet = new Set(matchingSeatKeys);
    return geoJson.features.filter((feature) => {
      const seat = getSeatForFeature(feature);
      return seat && keysSet.has(seat.seat_key);
    });
  }, [geoJson, matchingSeatKeys, getSeatForFeature]);

  const isSearchActive = Boolean(
    (matchingDivision && matchingDivisionFeatures.length > 0) ||
    (matchingSeatKeys && matchingSeatKeys.length > 0)
  );

  const matchingSeatKeysSet = useMemo(() => {
    return matchingSeatKeys && matchingSeatKeys.length > 0 ? new Set(matchingSeatKeys) : null;
  }, [matchingSeatKeys]);

  const getFeatureStyle = useCallback(
    (feature?: BangladeshGeoFeature | GeoJsonObject | unknown): L.PathOptions => {
      const seat = getSeatForFeature(feature as BangladeshGeoFeature | undefined);
      const isSelected = selectedSeatKey && seat?.seat_key === selectedSeatKey;

      if (isSelected) {
        return {
          color: theme === "dark" ? "#ffffff" : "#000000",
          weight: 2.0,
          fillColor: getSeatFillColor(seat),
          fillOpacity: 1.0,
          opacity: 1,
        };
      }

      if (isSearchActive) {
        if (matchingDivision) {
          const isDivisionMatch =
            seat && seat.division.toLowerCase() === matchingDivision.toLowerCase();
          return {
            color: isDivisionMatch
              ? (theme === "dark" ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)")
              : (theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
            weight: isDivisionMatch ? 0.9 : 0.3,
            fillColor: getSeatFillColor(seat),
            fillOpacity: isDivisionMatch
              ? (seat ? fillOpacity : emptyFillOpacity)
              : (seat ? fillOpacity : emptyFillOpacity) * 0.12,
            opacity: isDivisionMatch ? 1 : 0.2,
          };
        }

        if (matchingSeatKeysSet) {
          const isSeatMatch = seat && matchingSeatKeysSet.has(seat.seat_key);
          return {
            color: isSeatMatch
              ? (theme === "dark" ? "#ffffff" : "#000000")
              : (theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
            weight: isSeatMatch ? 1.8 : 0.3,
            fillColor: getSeatFillColor(seat),
            fillOpacity: isSeatMatch
              ? 0.95
              : (seat ? fillOpacity : emptyFillOpacity) * 0.12,
            opacity: isSeatMatch ? 1 : 0.2,
          };
        }
      }

      const isOtherDivision =
        activeDivision && activeDivision !== "All Divisions" && seat && seat.division !== activeDivision;

      return {
        color: theme === "dark" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.22)",
        weight: 0.5,
        fillColor: getSeatFillColor(seat),
        fillOpacity: isOtherDivision
          ? (seat ? fillOpacity : emptyFillOpacity) * 0.22
          : (seat ? fillOpacity : emptyFillOpacity),
        opacity: isOtherDivision ? 0.35 : 1,
      };
    },
    [
      selectedSeatKey,
      isSearchActive,
      matchingDivision,
      matchingSeatKeysSet,
      activeDivision,
      emptyFillOpacity,
      fillOpacity,
      getSeatFillColor,
      getSeatForFeature,
      theme,
    ]
  );

  // Update styles smoothly without tearing down the GeoJSON layer
  useEffect(() => {
    if (geoJsonLayerRef.current) {
      geoJsonLayerRef.current.setStyle(getFeatureStyle);
    }
  }, [getFeatureStyle]);

  const selectedFeature = useMemo(() => {
    if (!geoJson || !selectedSeatKey) {
      return null;
    }

    return geoJson.features.find((feature) => {
      const seat = getSeatForFeature(feature);
      return seat?.seat_key === selectedSeatKey;
    }) ?? null;
  }, [geoJson, getSeatForFeature, selectedSeatKey]);

  const activeDivisionFeatures = useMemo(() => {
    if (!geoJson || !activeDivision || activeDivision === "All Divisions") {
      return [];
    }

    return geoJson.features.filter((feature) => {
      const seat = getSeatForFeature(feature);
      return seat?.division === activeDivision;
    });
  }, [geoJson, activeDivision, getSeatForFeature]);

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
          <FlyToActiveDivision
            activeDivision={activeDivision}
            geoJson={geoJson}
            getSeatForFeature={getSeatForFeature}
            isSearchActive={isSearchActive}
          />
          <FlyToSearchHighlight
            matchingDivision={matchingDivision}
            matchingDivisionFeatures={matchingDivisionFeatures}
            matchingSeatFeatures={matchingSeatFeatures}
            geoJson={geoJson}
            selectedSeatKey={selectedSeatKey}
          />
          <MapZoomControls geoJson={geoJson} />
          <MapBackgroundReset onClearSelection={onClearSelection} />

          <TileLayer
            key={theme}
            url={
              theme === "dark"
                ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            }
            opacity={theme === "dark" ? 0.75 : 0.95}
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          />

          <GeoJSON
            ref={geoJsonLayerRef}
            key={`features-${theme}-${mode}`}
            data={geoJson as GeoJsonObject}
            style={getFeatureStyle}
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
                  if (!L.Browser.ie && !L.Browser.opera) {
                    styleLayer.bringToFront();
                  }
                },
                mouseout: () => {
                  if (!styleLayer) {
                    return;
                  }
                  if (geoJsonLayerRef.current) {
                    geoJsonLayerRef.current.resetStyle(styleLayer);
                  } else {
                    styleLayer.setStyle({
                      weight: 0.5,
                      color: theme === "dark" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.22)",
                      fillOpacity: seat ? fillOpacity : emptyFillOpacity,
                    });
                  }
                },
              });
            }}
          />

          {!isSearchActive && activeDivisionFeatures.length > 0 ? (
            <GeoJSON
              key={`division-outline-${activeDivision}-${theme}`}
              data={
                {
                  type: "FeatureCollection",
                  features: activeDivisionFeatures,
                } as unknown as GeoJsonObject
              }
              interactive={false}
              style={{
                color: theme === "dark" ? "#f3f4f6" : "#0f172a",
                weight: 1.8,
                opacity: 1,
                fillOpacity: 0,
              }}
            />
          ) : null}

          {matchingDivision && matchingDivisionFeatures.length > 0 ? (
            <GeoJSON
              key={`search-division-${matchingDivision}-${theme}`}
              data={
                {
                  type: "FeatureCollection",
                  features: matchingDivisionFeatures,
                } as unknown as GeoJsonObject
              }
              interactive={false}
              style={{
                color: theme === "dark" ? "#f3f4f6" : "#0f172a",
                weight: 2.2,
                opacity: 1,
                fillOpacity: 0,
              }}
            />
          ) : null}

          {!matchingDivision && matchingSeatFeatures.length > 0 && matchingSeatFeatures.length <= 15 ? (
            <GeoJSON
              key={`search-seats-${matchingSeatFeatures.map((f) => f.properties.cst).join("-")}-${theme}`}
              data={
                {
                  type: "FeatureCollection",
                  features: matchingSeatFeatures,
                } as unknown as GeoJsonObject
              }
              interactive={false}
              style={{
                color: theme === "dark" ? "#38bdf8" : "#0284c7",
                weight: 2.2,
                opacity: 1,
                fillOpacity: 0,
              }}
            />
          ) : null}

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
      <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 z-700 flex flex-wrap items-center gap-2 sm:gap-3 max-w-[calc(100%-16px)] sm:max-w-none border border-[var(--border)] bg-[var(--bg-surface)] px-2 sm:px-3 py-1 sm:py-1.5 font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-[var(--text-secondary)] shadow-sm">
        {mode === "election" ? (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ backgroundColor: ALLIANCE_COLORS.bnp }} /> BNP
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ backgroundColor: ALLIANCE_COLORS.jamaat }} /> Jamaat
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ backgroundColor: PARTY_COLORS.ncp }} /> NCP
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ backgroundColor: ALLIANCE_COLORS.others }} /> Others
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ backgroundColor: ALLIANCE_COLORS.neutral }} /> Postponed
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ backgroundColor: REFERENDUM_COLORS.yes }} /> Majority Yes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ backgroundColor: REFERENDUM_COLORS.no }} /> Majority No
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ backgroundColor: REFERENDUM_COLORS.null }} /> Null
            </span>
          </>
        )}
      </div>
    </div>
  );
}