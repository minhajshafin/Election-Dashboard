import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import type { BangladeshGeoJson } from "@/lib/geo";
import type {
  ClassificationDataset,
  ClusterDataset,
  ConstituencyDataset,
  CorrelationDataset,
  RegressionDataset,
  SummaryDataset,
} from "@/types/api";

const DATA_DIR = path.join(process.cwd(), "public", "data");
const GEOJSON_PATH = path.join(
  process.cwd(),
  "public",
  "geojson",
  "GRED_20190215_Bangladesh_2008.geojson",
);

async function readDatasetFile<T>(fileName: string): Promise<T> {
  const filePath = path.join(DATA_DIR, fileName);
  const raw = await readFile(filePath, "utf-8");

  return JSON.parse(raw) as T;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf-8");

  return JSON.parse(raw) as T;
}

export const getConstituencyDataset = cache(async (): Promise<ConstituencyDataset> => {
  return readDatasetFile<ConstituencyDataset>("constituencies.json");
});

export const getSummaryDataset = cache(async (): Promise<SummaryDataset> => {
  return readDatasetFile<SummaryDataset>("summary.json");
});

export const getCorrelationDataset = cache(async (): Promise<CorrelationDataset> => {
  return readDatasetFile<CorrelationDataset>("correlation.json");
});

export const getClassificationDataset = cache(async (): Promise<ClassificationDataset> => {
  return readDatasetFile<ClassificationDataset>("classification.json");
});

export const getRegressionDataset = cache(async (): Promise<RegressionDataset> => {
  return readDatasetFile<RegressionDataset>("regression.json");
});

export const getClusterDataset = cache(async (): Promise<ClusterDataset> => {
  return readDatasetFile<ClusterDataset>("clusters.json");
});

export const getBangladeshGeoJson = cache(async (): Promise<BangladeshGeoJson> => {
  return readJsonFile<BangladeshGeoJson>(GEOJSON_PATH);
});

export const getLandingPageData = cache(async () => {
  const [summaryDataset, constituencyDataset, geoJson] = await Promise.all([
    getSummaryDataset(),
    getConstituencyDataset(),
    getBangladeshGeoJson(),
  ]);

  return {
    summaryDataset,
    constituencyDataset,
    geoJson,
  };
});
