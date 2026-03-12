export interface DatasetMeta {
  schema_version: string;
  generated_at: string;
  source_files: string[];
}

export interface ConstituencyRow {
  seat_key: string;
  constituency: string;
  district: string;
  division: string;
  alliance: string;
  winner_candidate: string;
  winner_party: string;
  winner_votes: number | null;
  runner_up_candidate: string;
  runner_up_party: string;
  runner_up_votes: number | null;
  total_valid_votes: number | null;
  candidate_count: number | null;
  cluster: number | null;
  geo_name: string | null;
  geo_code: number | null;
  Population_Total: number | null;
  Household_Total: number | null;
  pop_density: number | null;
  pop_total_loc: number | null;
  pop_rural: number | null;
  pop_urban: number | null;
  pop_male: number | null;
  pop_female: number | null;
  literacy_rate: number | null;
  literacy_male: number | null;
  literacy_female: number | null;
  internet_pct: number | null;
  internet_male_pct: number | null;
  internet_female_pct: number | null;
  mobile_phone_pct: number | null;
  employed_total: number | null;
  looking_for_work: number | null;
  neet_pct: number | null;
  financial_account_pct: number | null;
  pop_muslim: number | null;
  pop_hindu: number | null;
  sex_ratio: number | null;
  dependency_ratio: number | null;
  turnout_pct: number | null;
  winning_margin_pct: number | null;
  winner_vote_share_pct: number | null;
  urbanization_index: number | null;
  employment_rate_pct: number | null;
  competitiveness_index: number | null;
  muslim_majority_pct: number | null;
  hindu_pct: number | null;
  female_pct: number | null;
}

export interface ConstituencyDataset {
  meta: DatasetMeta;
  rows: ConstituencyRow[];
}

export interface PartySummary {
  party: string;
  seat_count: number;
  seat_share_pct: number;
}

export interface CompetitiveSeatsSummary {
  threshold_pct: number;
  count: number;
  share_pct: number;
}

export interface DivisionSummary {
  division: string;
  seat_count: number;
  parties: Record<string, number>;
}

export interface NationalAverages {
  turnout_pct: number | null;
  winning_margin_pct: number | null;
  candidate_count: number | null;
  winner_vote_share_pct: number | null;
  literacy_rate: number | null;
  internet_pct: number | null;
  urbanization_index: number | null;
  employment_rate_pct: number | null;
  neet_pct: number | null;
  financial_account_pct: number | null;
  pop_density: number | null;
  dependency_ratio: number | null;
  female_pct: number | null;
}

export interface ElectionSummary {
  total_seats: number;
  top_party: PartySummary;
  competitive_seats: CompetitiveSeatsSummary;
  avg_turnout: number | null;
  avg_margin: number | null;
  avg_candidate_count: number | null;
  seats_by_party: Record<string, number>;
  seats_by_alliance: Record<string, number>;
  seats_by_division: Record<string, Record<string, number>>;
  division_seat_counts: Record<string, number>;
  party_rankings: PartySummary[];
  divisions: DivisionSummary[];
  national_averages: NationalAverages;
}

export interface SummaryDataset {
  meta: DatasetMeta;
  summary: ElectionSummary;
}

export interface CorrelationDataset {
  meta: DatasetMeta;
  columns: string[];
  pearson: number[][];
  spearman: number[][];
}

export interface ClassificationResult {
  model: string;
  target: string;
  num_trees?: number;
  max_depth?: number;
  party_labels: string[];
  metrics: Record<string, number>;
  feature_importance: Record<string, number>;
}

export interface ClassificationDataset {
  meta: DatasetMeta;
  result: ClassificationResult;
}

export interface RegressionResult {
  model: string;
  target: string;
  r2: number;
  rmse: number;
  intercept: number;
  coefficients: Record<string, number>;
  features: string[];
}

export interface RegressionDataset {
  meta: DatasetMeta;
  result: RegressionResult;
}

export interface ClusterProfile {
  cluster: number;
  n: number;
  [key: string]: number;
}

export interface ClusterDataset {
  meta: DatasetMeta;
  profiles: ClusterProfile[];
}