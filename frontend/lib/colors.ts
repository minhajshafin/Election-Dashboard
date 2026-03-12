const ALLIANCE_COLORS = {
  bnp: "#4a9e7a",
  jamaat: "#2a6aaa",
  others: "#c0572a",
  neutral: "#475569",
} as const;

const ALLIANCE_SOFT_COLORS = {
  bnp: "rgba(74, 158, 122, 0.14)",
  jamaat: "rgba(42, 106, 170, 0.14)",
  others: "rgba(192, 87, 42, 0.14)",
  neutral: "rgba(71, 85, 105, 0.14)",
} as const;

export type AllianceKey = keyof typeof ALLIANCE_COLORS;

export function getAllianceColor(alliance: string | null | undefined): string {
  if (!alliance) {
    return ALLIANCE_COLORS.neutral;
  }

  const key = alliance.toLowerCase() as AllianceKey;
  return ALLIANCE_COLORS[key] ?? ALLIANCE_COLORS.neutral;
}

export function getAllianceSoftColor(alliance: string | null | undefined): string {
  if (!alliance) {
    return ALLIANCE_SOFT_COLORS.neutral;
  }

  const key = alliance.toLowerCase() as AllianceKey;
  return ALLIANCE_SOFT_COLORS[key] ?? ALLIANCE_SOFT_COLORS.neutral;
}

export { ALLIANCE_COLORS };