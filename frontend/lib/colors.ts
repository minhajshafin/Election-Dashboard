const ALLIANCE_COLORS = {
  bnp: "#0d7645",
  jamaat: "#1d4ed8",
  others: "#475569",
  neutral: "#64748b",
} as const;

const ALLIANCE_SOFT_COLORS = {
  bnp: "rgba(13, 118, 69, 0.12)",
  jamaat: "rgba(29, 78, 216, 0.12)",
  others: "rgba(71, 85, 105, 0.12)",
  neutral: "rgba(100, 116, 139, 0.12)",
} as const;

const PARTY_COLORS = {
  ncp: "#c2410c",
} as const;

const PARTY_SOFT_COLORS = {
  ncp: "rgba(194, 65, 12, 0.12)",
} as const;

const REFERENDUM_COLORS = {
  yes: "#059669",
  no: "#dc2626",
  null: "#64748b",
} as const;

const REFERENDUM_SOFT_COLORS = {
  yes: "rgba(5, 150, 105, 0.12)",
  no: "rgba(220, 38, 38, 0.12)",
  null: "rgba(100, 116, 139, 0.12)",
} as const;

export const DEFAULT_DIVISION_COLORS: Record<string, string> = {
  Barishal: "#ea580c",
  Chattogram: "#1d4ed8",
  Dhaka: "#059669",
  Khulna: "#b45309",
  Mymensingh: "#e11d48",
  Rajshahi: "#0891b2",
  Rangpur: "#7c3aed",
  Sylhet: "#4d7c0f",
};

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

type ReferendumSeat = {
  referendum_result?: "yes" | "no" | null;
  referendum_yes?: number | null;
  referendum_no?: number | null;
};

export function getReferendumSeatResult(seat: ReferendumSeat | null | undefined): "yes" | "no" | null {
  if (!seat) {
    return null;
  }

  if (seat.referendum_result === "yes" || seat.referendum_result === "no") {
    return seat.referendum_result;
  }

  if (seat.referendum_yes === null || seat.referendum_no === null) {
    return null;
  }

  if (seat.referendum_yes === undefined || seat.referendum_no === undefined) {
    return null;
  }

  if (seat.referendum_yes > seat.referendum_no) {
    return "yes";
  }

  if (seat.referendum_no > seat.referendum_yes) {
    return "no";
  }

  return null;
}

export function getReferendumSeatColor(seat: ReferendumSeat | null | undefined): string {
  const result = getReferendumSeatResult(seat);
  if (result === "yes") {
    return REFERENDUM_COLORS.yes;
  }
  if (result === "no") {
    return REFERENDUM_COLORS.no;
  }
  return REFERENDUM_COLORS.null;
}

export function getReferendumSeatSoftColor(seat: ReferendumSeat | null | undefined): string {
  const result = getReferendumSeatResult(seat);
  if (result === "yes") {
    return REFERENDUM_SOFT_COLORS.yes;
  }
  if (result === "no") {
    return REFERENDUM_SOFT_COLORS.no;
  }
  return REFERENDUM_SOFT_COLORS.null;
}

export { ALLIANCE_COLORS, PARTY_COLORS, REFERENDUM_COLORS };