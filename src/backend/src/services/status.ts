import { runGtJson } from "../commands/runner.js";
import type { TownStatus } from "../types/gasown.js";

let statusCache: { data: TownStatus; timestamp: number } | null = null;
const CACHE_TTL = 5_000; // 5 seconds

export async function getTownStatus(townRoot?: string): Promise<TownStatus> {
  const now = Date.now();
  
  if (statusCache && now - statusCache.timestamp < CACHE_TTL) {
    return statusCache.data;
  }

  const status = await runGtJson<TownStatus>(["status"], {
    cwd: townRoot,
  });

  statusCache = { data: status, timestamp: now };
  return status;
}

export function invalidateStatusCache(): void {
  statusCache = null;
}
