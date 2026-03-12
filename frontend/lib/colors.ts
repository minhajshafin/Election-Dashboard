const ALLIANCE_COLORS = {
  bnp: "#14532d",
  jamaat: "#0f766e",
  others: "#b45309",
  neutral: "#475569",
} as const;

const ALLIANCE_SOFT_COLORS = {
  bnp: "rgba(20, 83, 45, 0.14)",
  jamaat: "rgba(15, 118, 110, 0.14)",
  others: "rgba(180, 83, 9, 0.14)",
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