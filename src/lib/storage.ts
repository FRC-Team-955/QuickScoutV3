import { initialSession, type Session } from "./model";

const opened = new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open("quickscout-v3", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("session");
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
  request.onblocked = () => reject(new Error("Close other QuickScout tabs to open local storage."));
});

// One transaction saves the report and its upload entry together.
export async function changeSession(change: (current: Session) => Session): Promise<Session> {
  const db = await opened;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("session", "readwrite");
    const store = transaction.objectStore("session");
    const request = store.get("current");
    let next: Session;
    request.onsuccess = () => {
      try {
        // Additive defaults keep the first prototype's reports and draft intact.
        const stored = request.result;
        next = change(stored ? { ...initialSession(), ...stored } : initialSession());
        store.put(next, "current");
      } catch (error) {
        transaction.abort();
        reject(error);
      }
    };
    transaction.oncomplete = () => resolve(next);
    transaction.onabort = () => reject(transaction.error ?? new Error("Local save failed."));
    transaction.onerror = () => reject(transaction.error);
  });
}

// TODO: IndexedDB schema migrations and persistent-storage recovery.
