// Trade journal: every trade (campaign, timed, daily, practice) for the Analyst.
import type { TradeRecord } from "@/engine/analyst";
import { kvGet, kvSet, userKey } from "./db";

const MAX = 500;

export async function getJournal(): Promise<TradeRecord[]> {
  return (await kvGet<TradeRecord[]>(userKey("journal"))) ?? [];
}

export async function addTrade(t: TradeRecord): Promise<TradeRecord[]> {
  const list = [...(await getJournal()), t].slice(-MAX);
  await kvSet(userKey("journal"), list);
  return list;
}
