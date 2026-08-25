import { clearOfflineQueueForUser, getDeviceId, listOfflineQueue, putOfflineQueueItem, removeOfflineQueueItem, type OfflineQueueItem } from "@/lib/offlineQueue";
import { trpc } from "@/lib/trpc";
import { belongsToQueueUser, createQueuedActivity, shouldRemoveAfterSync, type QueuedActivityInput } from "@shared/offlineQueueRules";
import { useCallback, useEffect, useState } from "react";

type EnqueueInput = Omit<QueuedActivityInput, "queueId" | "idempotencyKey" | "originUserId" | "sourceDeviceId" | "originalRecordedAt">;
export function useOfflineSync(enabled: boolean, userId: number | null) {
  const [items, setItems] = useState<OfflineQueueItem[]>([]); const [isOnline, setIsOnline] = useState(() => navigator.onLine); const [isSyncing, setIsSyncing] = useState(false); const syncMutation = trpc.challenge.syncOffline.useMutation();
  const refresh = useCallback(async () => setItems(await listOfflineQueue()), []);
  const protectOtherUsers = useCallback(async () => { const all = await listOfflineQueue(); const foreign = all.filter(item => !belongsToQueueUser(item, userId) && item.status !== "conflict"); await Promise.all(foreign.map(item => putOfflineQueueItem({ ...item, status: "conflict", lastError: "This pending activity belongs to a different signed-in user and cannot be synchronized by this account." }))); if (foreign.length) await refresh(); }, [refresh, userId]);
  const syncNow = useCallback(async () => {
    if (!enabled || !userId || !navigator.onLine || isSyncing) return [];
    await protectOtherUsers();
    const pending = (await listOfflineQueue()).filter(item => item.status === "pending" && belongsToQueueUser(item, userId));
    if (!pending.length) return [];
    setIsSyncing(true);
    try {
      await Promise.all(pending.map(item => putOfflineQueueItem({ ...item, status: "syncing", lastError: undefined })));
      setItems(await listOfflineQueue());
      const result = await syncMutation.mutateAsync({ items: pending.map(({ status: _status, createdAt: _createdAt, lastError: _lastError, ...activity }) => activity) });
      await Promise.all(result.results.map(async response => { const original = pending.find(item => item.queueId === response.queueId); if (!original) return; if (shouldRemoveAfterSync(response.status)) await removeOfflineQueueItem(response.queueId); else await putOfflineQueueItem({ ...original, status: "conflict", lastError: response.message || "This activity requires review." }); }));
      await refresh(); return result.results;
    } catch (error) { await Promise.all(pending.map(item => putOfflineQueueItem({ ...item, status: "pending", lastError: error instanceof Error ? error.message : "Connection unavailable. The activity remains safely saved on this device." }))); await refresh(); return []; }
    finally { setIsSyncing(false); }
  }, [enabled, isSyncing, protectOtherUsers, refresh, syncMutation, userId]);
  useEffect(() => { void protectOtherUsers(); void refresh(); const online = () => { setIsOnline(true); void syncNow(); }; const offline = () => setIsOnline(false); const visible = () => { if (document.visibilityState === "visible") void syncNow(); }; window.addEventListener("online", online); window.addEventListener("offline", offline); document.addEventListener("visibilitychange", visible); return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); document.removeEventListener("visibilitychange", visible); }; }, [protectOtherUsers, refresh, syncNow]);
  const enqueue = useCallback(async (input: EnqueueInput) => { if (!userId) throw new Error("Sign in before saving an activity on this device."); const queueId = crypto.randomUUID(); const queued = createQueuedActivity({ ...input, queueId, originUserId: userId, sourceDeviceId: getDeviceId() }); await putOfflineQueueItem({ ...queued, status: "pending", createdAt: new Date().toISOString() }); await refresh(); const results = await syncNow(); const receipt = results.find(result => result.queueId === queueId); return { queueId, entryIds: receipt?.entryIds, status: receipt?.status ?? "pending" }; }, [refresh, syncNow, userId]);
  const discard = useCallback(async (queueId: string) => { await removeOfflineQueueItem(queueId); await refresh(); }, [refresh]);
  const clearForCurrentUser = useCallback(async () => { if (userId) { await clearOfflineQueueForUser(userId); await refresh(); } }, [refresh, userId]);
  const pendingCount = items.filter(item => item.status === "pending" || item.status === "syncing").length; const conflictCount = items.filter(item => item.status === "conflict").length;
  return { items, isOnline, isSyncing, pendingCount, conflictCount, enqueue, discard, syncNow, clearForCurrentUser };
}
