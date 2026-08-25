import type { ChallengeAction } from "../drizzle/schema";

export const actionDefaults: Record<ChallengeAction, number> = {
  "English Interaction": 0.1,
  "Initiative Bonus": 0.2,
  "Portuguese Occurrence": -0.1,
};

export function calculateConvertedPoints(rawPoints: number, configuredCeiling: number, negativeFloor = -Infinity) {
  const cappedPositive = Math.min(rawPoints, configuredCeiling);
  return Math.max(cappedPositive, negativeFloor);
}

export function isChallengeAction(value: string): value is ChallengeAction {
  return Object.hasOwn(actionDefaults, value);
}

export function isInsideCooldown(recordedAtMs: number, cooldownSeconds: number, currentTimeMs: number) {
  return currentTimeMs - recordedAtMs < cooldownSeconds * 1000;
}

export function buildCancellationEvents(input: { entryId: number; previousPoints: string; actorUserId: number; reason: string }) {
  return {
    revision: {
      entryId: input.entryId,
      revisionType: "cancelled" as const,
      previousPoints: input.previousPoints,
      newPoints: "0.00",
      reason: input.reason,
      revisedByUserId: input.actorUserId,
    },
    audit: {
      actorUserId: input.actorUserId,
      eventType: "activity_entry_cancelled",
      resourceType: "activity_entry",
      resourceId: String(input.entryId),
      detail: input.reason,
    },
  };
}
