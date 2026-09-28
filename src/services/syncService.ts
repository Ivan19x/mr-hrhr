// Sync queue: every completed level adds an ActionLog record in IndexedDB.
// The real backend drains this queue; for now it just tracks pending count.
import type { ActionLog } from "@/types/game";
import { getDb } from "./db";

export async function enqueue(log: ActionLog): Promise<void> {
  const db = await getDb();
  await db.add("syncQueue", log);
}

export async function pendingCount(): Promise<number> {
  const db = await getDb();
  return db.count("syncQueue");
}

export async function drainQueue(): Promise<number> {
  const db = await getDb();
  const n = await db.count("syncQueue");
  await db.clear("syncQueue");
  return n;
}
