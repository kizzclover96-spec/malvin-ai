import { doc, setDoc, getDoc } from "firebase/firestore";
import { firestore } from "../firebase";

/* ============================================================================
   LOCAL-FIRST STORAGE
   ----------------------------------------------------------------------------
   Documents and Presentations both follow this flow:

     User edits  →  IndexedDB write (instant)  →  UI updates immediately
                          ↓ (debounced, ~1.5s after the last edit)
                    Firestore write (backup/sync)

   IndexedDB (not localStorage — localStorage is a bad fit for anything
   beyond small config, since it's synchronous, string-only, and capped
   around 5MB) holds the actual working copy, so typing never waits on a
   network round trip and editing still works offline. Firestore is purely
   backup/sync/recovery — it's never on the critical path of a keystroke.
============================================================================ */

const DB_NAME = "malvinLocalFirst";
const DB_VERSION = 1;
export const STORE_DOCUMENTS = "documents";
export const STORE_PRESENTATIONS = "presentations";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) db.createObjectStore(STORE_DOCUMENTS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORE_PRESENTATIONS)) db.createObjectStore(STORE_PRESENTATIONS, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function saveLocal<T extends { id: string }>(store: string, data: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put({ ...data, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocal<T>(store: string, id: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function listLocal<T>(store: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteLocal(store: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* -------------------------- debounced Firestore sync -------------------------- */

const timers: Record<string, ReturnType<typeof setTimeout>> = {};

/**
 * Schedules a Firestore write ~1.5s after the last call for this key,
 * so rapid edits (typing, dragging a shape) collapse into one network
 * write instead of one per keystroke. Call flushFirestoreSync() to force
 * an immediate write (e.g. on an explicit "Save" tap or before navigating
 * away) instead of waiting out the debounce window.
 */
export function scheduleFirestoreSync(businessId: string, collectionName: string, id: string, data: Record<string, any>, delayMs = 1500) {
  const key = `${collectionName}/${id}`;
  if (timers[key]) clearTimeout(timers[key]);
  timers[key] = setTimeout(() => {
    delete timers[key];
    setDoc(doc(firestore, "business", businessId, collectionName, id), data, { merge: true }).catch(() => {
      // Best-effort — the IndexedDB copy is still the source of truth for
      // the person actively editing; a failed backup write isn't worth
      // interrupting them over. It'll retry on the next edit.
    });
  }, delayMs);
}

export function flushFirestoreSync(businessId: string, collectionName: string, id: string, data: Record<string, any>) {
  const key = `${collectionName}/${id}`;
  if (timers[key]) {
    clearTimeout(timers[key]);
    delete timers[key];
  }
  return setDoc(doc(firestore, "business", businessId, collectionName, id), data, { merge: true });
}

export async function fetchFromFirestore<T>(businessId: string, collectionName: string, id: string): Promise<T | null> {
  const snap = await getDoc(doc(firestore, "business", businessId, collectionName, id));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as any) } as T) : null;
}
