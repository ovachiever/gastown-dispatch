/**
 * Town status service with caching and graceful degradation.
 *
 * Caching strategy:
 * - gt status: 5s TTL (within 2-5s range, using upper bound for large workspaces)
 * - Stale-while-revalidate: Serves cached data while fetching fresh data
 * - Graceful degradation: Continues to serve stale data during outages
 */

import { runGtJson } from "../commands/runner.js";
import { Cache } from "./cache.js";
import type { TownStatus } from "../types/gasown.js";

// TTL constants (in milliseconds)
const STATUS_TTL = 5_000; // 5 seconds (upper bound of 2-5s range for reliability)
const MAX_STALE_AGE = 60_000; // Serve stale data up to 1 minute during outages

export interface StatusResponse {
	initialized: boolean;
	status?: TownStatus;
	error?: string;
	stale?: boolean;
}

// Status cache with graceful degradation
let statusCache: Cache<TownStatus> | null = null;
let currentTownRoot: string | undefined;

/**
 * Get or create the status cache for a town root.
 */
function getCache(townRoot?: string): Cache<TownStatus> {
	// Reset cache if town root changes
	if (townRoot !== currentTownRoot) {
		statusCache = null;
		currentTownRoot = townRoot;
	}

	if (!statusCache) {
		statusCache = new Cache<TownStatus>(
			async () => {
				const status = await runGtJson<TownStatus>(["status"], {
					cwd: townRoot,
					timeout: 120_000, // Increase timeout to 120s for large workspaces (25+ rigs)
				});
				return status;
			},
			{
				ttl: STATUS_TTL,
				staleWhileRevalidate: true,
				maxStaleAge: MAX_STALE_AGE,
			},
		);
	}

	return statusCache;
}

/**
 * Get town status with caching and graceful degradation.
 */
export async function getTownStatus(
	townRoot?: string,
): Promise<StatusResponse> {
	const cache = getCache(townRoot);

	try {
		const status = await cache.get();
		const stats = cache.getStats();

		return {
			initialized: true,
			status,
			stale: cache.isDegraded(),
			error: stats.lastError || undefined,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);

		// Check for "not in workspace" error
		if (message.includes("not in a Gas Town workspace")) {
			return {
				initialized: false,
				error:
					"Not in a Gas Town workspace. Set GT_TOWN_ROOT or navigate to a Gas Town project.",
			};
		}

		// Try to return stale data if available
		const staleData = cache.getCached();
		if (staleData) {
			return {
				initialized: true,
				status: staleData,
				stale: true,
				error: message,
			};
		}

		// No data available
		return {
			initialized: false,
			error: message,
		};
	}
}

/**
 * Force invalidation of the status cache.
 */
export function invalidateStatusCache(): void {
	if (statusCache) {
		statusCache.invalidate();
	}
}

/**
 * Check if status is in degraded mode (serving stale data).
 */
export function isStatusDegraded(): boolean {
	return statusCache?.isDegraded() ?? false;
}

/**
 * Get status cache statistics for monitoring.
 */
export function getStatusCacheStats(): {
	hits: number;
	misses: number;
	staleHits: number;
	errors: number;
	lastFetch: number | null;
	lastError: string | null;
} | null {
	return statusCache?.getStats() ?? null;
}
