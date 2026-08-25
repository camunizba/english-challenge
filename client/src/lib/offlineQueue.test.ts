import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { clearOfflineQueueForUser, listOfflineQueue, putOfflineQueueItem, removeOfflineQueueItem, type OfflineQueueItem } from "./offlineQueue";

function resetQueueDatabase() {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("english-challenge-offline");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Queue database reset was blocked."));
  });
}

function item(queueId: string, originUserId: number): OfflineQueueItem {
  return {
    queueId,
    idempotencyKey: queueId,
    originUserId,
    studentIds: [11],
    classId: 2,
    subjectId: 3,
    action: "English Interaction",
    confirmedPortugueseOccurrence: false,
    sourceDeviceId: "device-12345678",
    originalRecordedAt: "2026-08-25T13:00:00.000Z",
    status: "pending",
    createdAt: "2026-08-25T13:00:01.000Z",
  };
}

describe("IndexedDB offline activity queue", () => {
  beforeEach(async () => { await resetQueueDatabase(); });

  it("persists a pending activity across independent database connections", async () => {
    await putOfflineQueueItem(item("queue-00000001", 7));
    const saved = await listOfflineQueue();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ queueId: "queue-00000001", idempotencyKey: "queue-00000001", originUserId: 7, status: "pending" });
  });

  it("removes an item only after an explicit confirmed removal operation", async () => {
    await putOfflineQueueItem(item("queue-00000002", 7));
    expect(await listOfflineQueue()).toHaveLength(1);
    await removeOfflineQueueItem("queue-00000002");
    expect(await listOfflineQueue()).toEqual([]);
  });

  it("clears only the signed-out user's queue on a shared device", async () => {
    await putOfflineQueueItem(item("queue-00000003", 7));
    await putOfflineQueueItem(item("queue-00000004", 8));
    await clearOfflineQueueForUser(7);
    const remaining = await listOfflineQueue();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].originUserId).toBe(8);
  });
});
