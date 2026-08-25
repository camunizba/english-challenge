import type { OfflineQueueStatus, QueuedActivityInput } from "@shared/offlineQueueRules";

export type OfflineQueueItem = QueuedActivityInput & { status: OfflineQueueStatus; createdAt: string; lastError?: string };
const DATABASE_NAME = "english-challenge-offline";
const STORE_NAME = "activity-queue";
const DEVICE_KEY = "english-challenge-device-id";

function openQueueDatabase() { return new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open(DATABASE_NAME, 1); request.onupgradeneeded = () => { const database = request.result; if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "queueId" }); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error ?? new Error("Unable to open the offline queue.")); }); }
function completeRequest<T>(request: IDBRequest<T>) { return new Promise<T>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error ?? new Error("Offline queue operation failed.")); }); }
export function getDeviceId() { const existing = localStorage.getItem(DEVICE_KEY); if (existing) return existing; const created = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, created); return created; }
export async function listOfflineQueue() { const database = await openQueueDatabase(); const transaction = database.transaction(STORE_NAME, "readonly"); const items = await completeRequest(transaction.objectStore(STORE_NAME).getAll()) as OfflineQueueItem[]; database.close(); return items.sort((left, right) => left.createdAt.localeCompare(right.createdAt)); }
export async function putOfflineQueueItem(item: OfflineQueueItem) { const database = await openQueueDatabase(); const transaction = database.transaction(STORE_NAME, "readwrite"); await completeRequest(transaction.objectStore(STORE_NAME).put(item)); database.close(); }
export async function removeOfflineQueueItem(queueId: string) { const database = await openQueueDatabase(); const transaction = database.transaction(STORE_NAME, "readwrite"); await completeRequest(transaction.objectStore(STORE_NAME).delete(queueId)); database.close(); }
export async function clearOfflineQueueForUser(originUserId: number) { const items = await listOfflineQueue(); await Promise.all(items.filter(item => item.originUserId === originUserId).map(item => removeOfflineQueueItem(item.queueId))); }
