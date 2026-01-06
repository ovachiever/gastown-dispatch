import { runGtJson, runGt } from "../commands/runner.js";
import type { TownStatus } from "../types/gasown.js";

let statusCache: { data: TownStatus; timestamp: number } | null = null;
const CACHE_TTL = 5_000; // 5 seconds

export interface StatusResponse {
	initialized: boolean;
	status?: TownStatus;
	error?: string;
}

export async function getTownStatus(
	townRoot?: string,
): Promise<StatusResponse> {
	const now = Date.now();

	if (statusCache && now - statusCache.timestamp < CACHE_TTL) {
		return { initialized: true, status: statusCache.data };
	}

	try {
		const status = await runGtJson<TownStatus>(["status"], {
			cwd: townRoot,
		});

		statusCache = { data: status, timestamp: now };
		return { initialized: true, status };
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

		// Re-throw other errors
		throw err;
	}
}

export function invalidateStatusCache(): void {
	statusCache = null;
}
