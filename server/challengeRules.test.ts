import { describe, expect, it } from "vitest";
import { buildCancellationEvents, calculateConvertedPoints, isChallengeAction, isInsideCooldown } from "./challengeRules";

describe("challenge scoring rules", () => {
  it("caps converted points while preserving the uncapped value for participation", () => {
    expect(calculateConvertedPoints(2.6, 1)).toBe(1);
    expect(calculateConvertedPoints(0.8, 1)).toBe(0.8);
  });

  it("recognizes only the required activity labels", () => {
    expect(isChallengeAction("English Interaction")).toBe(true);
    expect(isChallengeAction("Initiative Bonus")).toBe(true);
    expect(isChallengeAction("Portuguese Occurrence")).toBe(true);
    expect(isChallengeAction("Positive point")).toBe(false);
  });

  it("rejects a matching entry during the configured cooldown only", () => {
    expect(isInsideCooldown(10_000, 15, 24_999)).toBe(true);
    expect(isInsideCooldown(10_000, 15, 25_000)).toBe(false);
  });

  it("preserves the original points in an auditable cancellation revision", () => {
    const events = buildCancellationEvents({ entryId: 14, previousPoints: "0.20", actorUserId: 7, reason: "Undo requested within the configured window." });
    expect(events.revision).toMatchObject({ entryId: 14, previousPoints: "0.20", newPoints: "0.00", revisionType: "cancelled" });
    expect(events.audit).toMatchObject({ eventType: "activity_entry_cancelled", resourceId: "14", actorUserId: 7 });
  });
});
