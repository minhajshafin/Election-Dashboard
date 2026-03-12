import type { ConstituencyRow } from "@/types/api";

export interface BangladeshGeoProperties {
  ctr_n: string;
  ctr: number;
  yr: number;
  cst_n: string;
  cst: number;
}

export interface BangladeshGeometry {
  type: string;
  coordinates: unknown;
}

export interface BangladeshGeoFeature {
  type: "Feature";
  properties: BangladeshGeoProperties;
  geometry: BangladeshGeometry;
}

export interface BangladeshGeoJson {
  type: "FeatureCollection";
  features: BangladeshGeoFeature[];
}

export type GeoResolvableSeat = Pick<ConstituencyRow, "constituency" | "geo_name" | "geo_code">;

const GEO_NAME_PREFIX_REPLACEMENTS: Record<string, string> = {
  "Barisal ": "Barishal ",
  "Bogra ": "Bogura ",
  "Chapai Nababganj ": "Chapainawabganj ",
  "Chittagong ": "Chattogram ",
  "Comilla ": "Cumilla ",
  "Jessore ": "Jashore ",
  "Cox's Bazar ": "Coxs Bazar ",
  "Cox?s Bazar ": "Coxs Bazar ",
  "Maulvibazar ": "Moulvibazar ",
};

const GEO_NAME_EXACT_REPLACEMENTS: Record<string, string> = {
  "Parbatya Bandarban": "Bandarban 1",
  "Parbatya Khagrachari": "Khagrachhari 1",
  "Parbatya Rangamati": "Rangamati 1",
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeGeoLookupName(value: string): string {
  const normalizedValue = normalizeWhitespace(value.replaceAll("-", " "));

  if (normalizedValue in GEO_NAME_EXACT_REPLACEMENTS) {
    return GEO_NAME_EXACT_REPLACEMENTS[normalizedValue];
  }

  for (const [from, to] of Object.entries(GEO_NAME_PREFIX_REPLACEMENTS)) {
    if (normalizedValue.startsWith(from)) {
      return `${to}${normalizedValue.slice(from.length)}`;
    }
  }

  return normalizedValue;
}

export function getSeatLookupName(seat: GeoResolvableSeat): string {
  return normalizeGeoLookupName(seat.constituency);
}

export function getSeatGeoReference(seat: GeoResolvableSeat): {
  geoCode: number | null;
  geoName: string | null;
  lookupName: string;
} {
  return {
    geoCode: seat.geo_code,
    geoName: seat.geo_name,
    lookupName: getSeatLookupName(seat),
  };
}

export function buildGeoFeatureIndexes(geoJson: BangladeshGeoJson) {
  const byCode = new Map<number, BangladeshGeoFeature>();
  const byLookupName = new Map<string, BangladeshGeoFeature>();

  for (const feature of geoJson.features) {
    byCode.set(feature.properties.cst, feature);
    byLookupName.set(normalizeGeoLookupName(feature.properties.cst_n), feature);
  }

  return {
    byCode,
    byLookupName,
  };
}

export function findGeoFeatureForSeat(
  geoJson: BangladeshGeoJson,
  seat: GeoResolvableSeat,
): BangladeshGeoFeature | null {
  const indexes = buildGeoFeatureIndexes(geoJson);

  if (seat.geo_code !== null) {
    const byCodeMatch = indexes.byCode.get(seat.geo_code);
    if (byCodeMatch) {
      return byCodeMatch;
    }
  }

  if (seat.geo_name) {
    const byGeoNameMatch = indexes.byLookupName.get(normalizeGeoLookupName(seat.geo_name));
    if (byGeoNameMatch) {
      return byGeoNameMatch;
    }
  }

  return indexes.byLookupName.get(getSeatLookupName(seat)) ?? null;
}

export function findGeoFeatureByCode(
  geoJson: BangladeshGeoJson,
  geoCode: number,
): BangladeshGeoFeature | null {
  return buildGeoFeatureIndexes(geoJson).byCode.get(geoCode) ?? null;
}

export function findGeoFeatureByName(
  geoJson: BangladeshGeoJson,
  name: string,
): BangladeshGeoFeature | null {
  return buildGeoFeatureIndexes(geoJson).byLookupName.get(normalizeGeoLookupName(name)) ?? null;
}
