// One-time wipe of all local game data when the data format changes (e.g. the
// switch to real-chart levels). Bump DATA_VERSION to force everyone to start fresh.
const DATA_VERSION = "3-real-charts";
const VERSION_KEY = "mrhrhr.dataVersion";
const DB_NAME = "mrhrhr";

function wipe(): Promise<void> {
  // Local accounts, sessions and settings in localStorage.
  for (const k of Object.keys(localStorage)) if (k.startsWith("mrhrhr.")) localStorage.removeItem(k);
  // Profiles, journals and sync queue in IndexedDB.
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}

/** Resolves once old data (if any) has been cleared. The IndexedDB layer waits on this. */
export const freshStartReady: Promise<void> =
  typeof window === "undefined"
    ? Promise.resolve()
    : localStorage.getItem(VERSION_KEY) === DATA_VERSION
      ? Promise.resolve()
      : wipe().then(() => localStorage.setItem(VERSION_KEY, DATA_VERSION));
