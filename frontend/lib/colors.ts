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

const REFERENDUM_COLORS = {
  yes: "#2f9e44",
  no: "#d94841",
  null: "#6b7280",
} as const;

const REFERENDUM_SOFT_COLORS = {
  yes: "rgba(47, 158, 68, 0.14)",
  no: "rgba(217, 72, 65, 0.14)",
  null: "rgba(107, 114, 128, 0.18)",
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

export { ALLIANCE_COLORS, REFERENDUM_COLORS };