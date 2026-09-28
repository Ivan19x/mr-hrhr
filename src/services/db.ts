// Tiny IndexedDB wrapper (idb) shared by services. Keys are namespaced per
// local account so several people can use the same device.
import { openDB, type IDBPDatabase } from "idb";
import { currentUserSync } from "./authService";
import { freshStartReady } from "@/lib/freshStart";

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    // Wait for a pending fresh-start wipe before opening the database.
    dbPromise = freshStartReady.then(() => openDB("mrhrhr", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
        if (!db.objectStoreNames.contains("syncQueue")) db.createObjectStore("syncQueue", { autoIncrement: true });
      },
    }));
  }
  return dbPromise;
}

/** Prefix a key with the signed-in user's id. */
export function userKey(key: string): string {
  const u = currentUserSync();
  return `${u?.id ?? "_anon"}:${key}`;
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return (await db.get("kv", key)) as T | undefined;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put("kv", value, key);
}

export async function kvDel(key: string): Promise<void> {
  const db = await getDb();
  await db.delete("kv", key);
}

/** Delete every key belonging to one user. */
export async function deleteUserData(userId: string): Promise<void> {
  const db = await getDb();
  const keys = await db.getAllKeys("kv");
  await Promise.all(
    keys.filter((k): k is string => typeof k === "string" && k.startsWith(`${userId}:`)).map((k) => db.delete("kv", k)),
  );
}
