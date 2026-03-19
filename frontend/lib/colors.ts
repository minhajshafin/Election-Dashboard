const ALLIANCE_COLORS = {
  bnp: "#4a9e7a",
  jamaat: "#2a6aaa",
  others: "#c9a84c",
  neutral: "#475569",
} as const;

const ALLIANCE_SOFT_COLORS = {
  bnp: "rgba(74, 158, 122, 0.14)",
  jamaat: "rgba(42, 106, 170, 0.14)",
  others: "rgba(201, 168, 76, 0.14)",
  neutral: "rgba(71, 85, 105, 0.14)",
} as const;

const PARTY_COLORS = {
  ncp: "#c0572a",
} as const;

const PARTY_SOFT_COLORS = {
  ncp: "rgba(192, 87, 42, 0.14)",
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

function isNcpParty(party: string | null | undefined): boolean {
  if (!party) {
    return false;
  }

  const normalized = party.toLowerCase();
  return normalized.includes("national citizens party") || normalized.includes(" ncp") || normalized === "ncp";
}

export function getSeatColor(seat: { winner_party?: string | null; alliance?: string | null }): string {
  if (isNcpParty(seat.winner_party)) {
    return PARTY_COLORS.ncp;
  }

  return getAllianceColor(seat.alliance);
}

export function getSeatSoftColor(seat: { winner_party?: string | null; alliance?: string | null }): string {
  if (isNcpParty(seat.winner_party)) {
    return PARTY_SOFT_COLORS.ncp;
  }

  return getAllianceSoftColor(seat.alliance);
}

export { ALLIANCE_COLORS };