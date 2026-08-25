import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const database = vi.hoisted(() => ({
  cancelActivityEntry: vi.fn(), createActivityEntries: vi.fn(), createEntryAppeal: vi.fn(), findRecentDuplicate: vi.fn(), getChallengeSnapshot: vi.fn(), getConversionExport: vi.fn(), getMyStudentStatement: vi.fn(), getStudentStatement: vi.fn(), getCurrentRule: vi.fn(), getEntriesByBatchIdempotencyKey: vi.fn(), listReferenceData: vi.fn(), importStudents: vi.fn(), searchActiveStudents: vi.fn(), teacherCanRecord: vi.fn(), createManagedClass: vi.fn(), createManagedSubject: vi.fn(), getManagementData: vi.fn(), setTeacherAssignments: vi.fn(), updateManagedUser: vi.fn(),
}));

vi.mock("./db", () => database);

import { appRouter } from "./routers";

function callerFor(userId = 7) {
  return appRouter.createCaller({ user: { id: userId, openId: `user-${userId}`, name: "Teacher", email: "teacher@example.com", loginMethod: "manus", role: "teacher", accessStatus: "active", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext);
}

const queuedItem = { queueId: "queue-12345678", originUserId: 7, studentIds: [11], classId: 2, subjectId: 3, action: "English Interaction" as const, confirmedPortugueseOccurrence: false, idempotencyKey: "queue-12345678", sourceDeviceId: "device-12345678", originalRecordedAt: "2026-08-25T13:00:00.000Z" };

describe("challenge.syncOffline", () => {
  beforeEach(() => { vi.clearAllMocks(); database.getEntriesByBatchIdempotencyKey.mockResolvedValue([]); database.teacherCanRecord.mockResolvedValue(true); database.getCurrentRule.mockResolvedValue({ points: "0.10", cooldownSeconds: 15 }); database.findRecentDuplicate.mockResolvedValue(undefined); database.createActivityEntries.mockResolvedValue({ created: 1, entryIds: [41], undoExpiresAt: new Date() }); });

  it("keeps an item as conflict when a different account tries to synchronize it", async () => {
    const result = await callerFor(8).challenge.syncOffline({ items: [queuedItem] });
    expect(result.results).toEqual([{ queueId: "queue-12345678", status: "conflict", message: "This offline activity belongs to a different signed-in user." }]);
    expect(database.createActivityEntries).not.toHaveBeenCalled();
  });

  it("reuses the existing entries when an idempotency key is retried", async () => {
    database.getEntriesByBatchIdempotencyKey.mockResolvedValue([{ id: 41 }]);
    const result = await callerFor().challenge.syncOffline({ items: [queuedItem] });
    expect(result.results).toEqual([{ queueId: "queue-12345678", status: "synced", entryIds: [41] }]);
    expect(database.createActivityEntries).not.toHaveBeenCalled();
  });
});
