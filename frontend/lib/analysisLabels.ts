const ANALYSIS_LABELS: Record<string, string> = {
  turnout_pct: "Voter Turnout (%)",
  winning_margin_pct: "Winning Margin (%)",
  winner_vote_share_pct: "Winner Vote Share (%)",
  competitiveness_index: "Race Competitiveness",
  candidate_count: "No. of Candidates",
  winner_votes: "Winner Votes",
  total_valid_votes: "Total Valid Votes",

  literacy_rate: "Literacy Rate (%)",
  literacy_female: "Female Literacy Rate (%)",
  internet_pct: "Internet Access (%)",
  internet_male_pct: "Male Internet Access (%)",
  internet_female_pct: "Female Internet Access (%)",
  mobile_phone_pct: "Mobile Phone Usage (%)",
  mobile_pct: "Mobile Phone Usage (%)",
  urban_pct: "Urban Population (%)",
  urbanization_index: "Urbanisation Index (%)",
  pop_density: "Population Density",
  neet_pct: "Youth NEET Rate (%)",
  financial_account_pct: "Financial Inclusion (%)",
  financial_inclusion_pct: "Financial Inclusion (%)",
  employment_rate_pct: "Employment Rate (%)",
  dependency_ratio: "Dependency Ratio",
  sex_ratio: "Sex Ratio (M per 100F)",

  muslim_majority_pct: "Muslim Population (%)",
  hindu_pct: "Hindu Population (%)",
  female_pct: "Female Population (%)",
  pop_rural: "Rural Population",
  pop_urban: "Urban Population",

  agri_share_pct: "Agriculture Employment Share (%)",
  industry_share_pct: "Industry Employment Share (%)",
  service_share_pct: "Service Employment Share (%)",
  pucca_house_pct: "Pucca Housing (%)",
  gender_ratio: "Gender Voter Ratio (M/F)",
  referendum_approval_pct: "Referendum Approval (%)",
};

export function getAnalysisLabel(key: string): string {
  return ANALYSIS_LABELS[key] ?? key;
}
