export const offlineQueueStatuses = ["pending", "syncing", "conflict"] as const;
export type OfflineQueueStatus = (typeof offlineQueueStatuses)[number];

export type QueuedActivityInput = {
  queueId: string;
  idempotencyKey: string;
  originUserId: number;
  studentIds: number[];
  classId: number;
  subjectId: number;
  cycleId?: number;
  action: "English Interaction" | "Initiative Bonus" | "Portuguese Occurrence";
  note?: string;
  confirmedPortugueseOccurrence: boolean;
  sourceDeviceId: string;
  originalRecordedAt: string;
};

export function createQueuedActivity(input: Omit<QueuedActivityInput, "idempotencyKey" | "originalRecordedAt"> & { originalRecordedAt?: string }) {
  return { ...input, idempotencyKey: input.queueId, originalRecordedAt: input.originalRecordedAt ?? new Date().toISOString() } satisfies QueuedActivityInput;
}

export function belongsToQueueUser(item: Pick<QueuedActivityInput, "originUserId">, userId: number | null) {
  return userId !== null && item.originUserId === userId;
}

export function shouldRemoveAfterSync(status: "synced" | "conflict") {
  return status === "synced";
}
