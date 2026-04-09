import type { ConstituencyRow } from "@/types/api";

interface PostponedSeatConfig {
  reason: string;
}

const POSTPONED_SEAT_CONFIG: Record<string, PostponedSeatConfig> = {
  "sherpur-3": {
    reason: "Polling was postponed after the seat was officially cancelled by the Election Commission.",
  },
};

export interface SeatElectionStatus {
  isPostponed: boolean;
  label: string;
  reason: string | null;
}

export function getSeatElectionStatus(seat: ConstituencyRow): SeatElectionStatus {
  const config = POSTPONED_SEAT_CONFIG[seat.seat_key];

  if (config) {
    return {
      isPostponed: true,
      label: "Election Postponed",
      reason: config.reason,
    };
  }

  return {
    isPostponed: false,
    label: "Completed",
    reason: null,
  };
}
