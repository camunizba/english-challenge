import { describe, expect, it } from "vitest";
import { belongsToQueueUser, createQueuedActivity, shouldRemoveAfterSync } from "../shared/offlineQueueRules";

describe("offline queue rules", () => {
  it("uses a stable queue identifier as the idempotency key and preserves original time", () => {
    const item = createQueuedActivity({ queueId: "queue-12345678", originUserId: 7, studentIds: [1, 2], classId: 1, subjectId: 1, action: "English Interaction", confirmedPortugueseOccurrence: false, sourceDeviceId: "device-12345678", originalRecordedAt: "2026-08-25T13:00:00.000Z" });
    expect(item.idempotencyKey).toBe("queue-12345678");
    expect(item.originalRecordedAt).toBe("2026-08-25T13:00:00.000Z");
  });

  it("does not allow a second account on the device to claim a queued entry", () => {
    const item = createQueuedActivity({ queueId: "queue-12345678", originUserId: 7, studentIds: [1], classId: 1, subjectId: 1, action: "English Interaction", confirmedPortugueseOccurrence: false, sourceDeviceId: "device-12345678" });
    expect(belongsToQueueUser(item, 7)).toBe(true);
    expect(belongsToQueueUser(item, 8)).toBe(false);
    expect(belongsToQueueUser(item, null)).toBe(false);
  });

  it("only removes a local queue item after the server confirms synchronization", () => {
    expect(shouldRemoveAfterSync("synced")).toBe(true);
    expect(shouldRemoveAfterSync("conflict")).toBe(false);
  });
});
