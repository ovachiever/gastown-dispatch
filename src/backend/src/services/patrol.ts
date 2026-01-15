import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { runGtJson, runGt } from "../commands/runner.js";
import { findTownRoot } from "../config/townRoot.js";
import type {
	DeaconHeartbeat,
	DeaconState,
	BootStatus,
	PatrolPausedState,
	PatrolStatus,
	ActionResult,
} from "../types/gasown.js";

/**
 * Read a JSON file safely, returning null if it doesn't exist or fails to parse.
 */
async function readJsonFile<T>(filePath: string): Promise<T | null> {
	try {
		await access(filePath);
		const content = await readFile(filePath, "utf-8");
		return JSON.parse(content) as T;
	} catch {
		return null;
	}
}

/**
 * Get the deacon heartbeat status.
 * Reads from ~/gt/deacon/heartbeat.json
 */
export async function getDeaconHeartbeat(
	townRoot?: string,
): Promise<DeaconHeartbeat | null> {
	const root = townRoot || findTownRoot();
	if (!root) return null;

	const heartbeatPath = join(root, "deacon", "heartbeat.json");
	return readJsonFile<DeaconHeartbeat>(heartbeatPath);
}

/**
 * Get the deacon state.
 * Reads from ~/gt/deacon/state.json
 */
export async function getDeaconState(
	townRoot?: string,
): Promise<DeaconState | null> {
	const root = townRoot || findTownRoot();
	if (!root) return null;

	const statePath = join(root, "deacon", "state.json");
	return readJsonFile<DeaconState>(statePath);
}

/**
 * Get Boot (deacon watchdog) status.
 * Uses gt boot status --json
 */
export async function getBootStatus(
	townRoot?: string,
): Promise<BootStatus | null> {
	try {
		return await runGtJson<BootStatus>(["boot", "status"], {
			cwd: townRoot,
		});
	} catch {
		return null;
	}
}

/**
 * Check if patrol is paused/muted.
 * Reads from ~/gt/.runtime/deacon/paused.json
 */
export async function getPatrolPausedState(
	townRoot?: string,
): Promise<PatrolPausedState | null> {
	const root = townRoot || findTownRoot();
	if (!root) return null;

	const pausedPath = join(root, ".runtime", "deacon", "paused.json");
	return readJsonFile<PatrolPausedState>(pausedPath);
}

/**
 * Determine the operational mode based on various status signals.
 */
function determineOperationalMode(
	bootStatus: BootStatus | null,
	heartbeat: DeaconHeartbeat | null,
	patrolPaused: PatrolPausedState | null,
): "normal" | "degraded" | "offline" {
	// If boot indicates degraded mode, use that
	if (bootStatus?.degraded) {
		return "degraded";
	}

	// If patrol is paused, consider it degraded
	if (patrolPaused?.paused) {
		return "degraded";
	}

	// If we have a recent heartbeat, we're normal
	if (heartbeat?.timestamp) {
		const heartbeatAge =
			Date.now() - new Date(heartbeat.timestamp).getTime();
		// If heartbeat is older than 10 minutes, consider degraded
		if (heartbeatAge > 10 * 60 * 1000) {
			return "degraded";
		}
		return "normal";
	}

	// No heartbeat at all - could be offline or just not started
	return "offline";
}

/**
 * Get the full patrol status including all watchdog chain signals.
 */
export async function getPatrolStatus(
	townRoot?: string,
): Promise<PatrolStatus> {
	const [heartbeat, deaconState, bootStatus, patrolPaused] = await Promise.all(
		[
			getDeaconHeartbeat(townRoot),
			getDeaconState(townRoot),
			getBootStatus(townRoot),
			getPatrolPausedState(townRoot),
		],
	);

	const operationalMode = determineOperationalMode(
		bootStatus,
		heartbeat,
		patrolPaused,
	);

	return {
		heartbeat,
		boot: bootStatus,
		deacon_state: deaconState,
		patrol_muted: patrolPaused?.paused ?? false,
		patrol_paused: patrolPaused,
		degraded_mode: bootStatus?.degraded ?? false,
		operational_mode: operationalMode,
	};
}

/**
 * Pause the deacon patrol.
 */
export async function pausePatrol(
	reason?: string,
	townRoot?: string,
): Promise<ActionResult> {
	try {
		const args = ["deacon", "pause"];
		if (reason) {
			args.push("--reason", reason);
		}
		const result = await runGt(args, { cwd: townRoot });
		if (result.exitCode !== 0) {
			return {
				success: false,
				message: "Failed to pause patrol",
				error: result.stderr,
			};
		}
		return { success: true, message: "Patrol paused" };
	} catch (err) {
		return {
			success: false,
			message: "Failed to pause patrol",
			error: err instanceof Error ? err.message : String(err),
		};
	}
}

/**
 * Resume the deacon patrol.
 */
export async function resumePatrol(townRoot?: string): Promise<ActionResult> {
	try {
		const result = await runGt(["deacon", "resume"], { cwd: townRoot });
		if (result.exitCode !== 0) {
			return {
				success: false,
				message: "Failed to resume patrol",
				error: result.stderr,
			};
		}
		return { success: true, message: "Patrol resumed" };
	} catch (err) {
		return {
			success: false,
			message: "Failed to resume patrol",
			error: err instanceof Error ? err.message : String(err),
		};
	}
}
