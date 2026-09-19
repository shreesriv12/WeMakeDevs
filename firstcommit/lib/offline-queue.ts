"use client";

const DB = "shikshamesh-offline";
const STORE = "actions";
export type QueuedAction = { id: string; createdAt: string; type: "orchestrate"; payload: { query: string } };

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await database();
  return new Promise<T>((resolve, reject) => {
    const request = action(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOrchestration(query: string) {
  const action: QueuedAction = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), type: "orchestrate", payload: { query } };
  await transaction("readwrite", (store) => store.put(action));
  return action;
}

async function allActions(): Promise<QueuedAction[]> {
  return transaction("readonly", (store) => store.getAll());
}

export async function flushQueuedActions() {
  if (!navigator.onLine) return { delivered: 0, remaining: (await allActions()).length };
  let delivered = 0;
  for (const action of await allActions()) {
    try {
      const response = await fetch("/api/orchestrate", { method: "POST", headers: { "content-type": "application/json", "x-shikshamesh-replayed": "true" }, body: JSON.stringify(action.payload) });
      if (!response.ok) continue;
      await transaction("readwrite", (store) => store.delete(action.id)); delivered++;
    } catch { break; }
  }
  return { delivered, remaining: (await allActions()).length };
}
