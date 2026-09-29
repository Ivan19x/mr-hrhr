// Supabase connection (the future backend: accounts, cloud progress, real leaderboards).
// Configured by two public environment variables (set them in Vercel and in .env.local):
//   VITE_SUPABASE_URL          e.g. https://abcd1234.supabase.co
//   VITE_SUPABASE_ANON_KEY     the project's publishable / anon key (safe in the browser)
// Without them the game runs exactly as before: local accounts on this device.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const key = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;

export type CloudStatus = { state: "off" } | { state: "ok"; players: number | null } | { state: "error"; message: string };

/** Checks that the project is reachable and the MR_HRHR tables exist (supabase/schema.sql). */
export async function checkCloud(): Promise<CloudStatus> {
  if (!supabase) return { state: "off" };
  const { data, error } = await supabase.rpc("player_count");
  if (error) return { state: "error", message: error.message };
  return { state: "ok", players: typeof data === "number" ? data : Number(data ?? 0) };
}
