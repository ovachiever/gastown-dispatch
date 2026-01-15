import { runGt } from "../commands/runner.js";
import { listRigs, type RigInfo } from "./rigs.js";
import type {
	MergeRequest,
	MRStatus,
	ReworkLoop,
	ReworkLoopSummary,
} from "../types/gasown.js";

// Raw MR data from gt mq list --json
interface RawMR {
	id: string;
	branch: string;
	issue_id?: string;
	title?: string;
	status: string;
	created_at?: string;
	updated_at?: string;
	error?: string;
	retry_count?: number;
}

/**
 * Format milliseconds into human-readable duration
 */
function formatDuration(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) {
		const remainingHours = hours % 24;
		return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
	}
	if (hours > 0) {
		const remainingMinutes = minutes % 60;
		return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
	}
	if (minutes > 0) {
		return `${minutes}m`;
	}
	return `${seconds}s`;
}

/**
 * Normalize MR status from gt mq output
 */
function normalizeMRStatus(status: string): MRStatus {
	const lower = status.toLowerCase();
	if (lower === "pending" || lower === "queued") return "pending";
	if (lower === "in_flight" || lower === "processing" || lower === "in-flight") return "in_flight";
	if (lower === "merged" || lower === "success") return "merged";
	if (lower === "failed" || lower === "error") return "failed";
	if (lower === "rejected") return "rejected";
	return "pending";
}

/**
 * Extract issue ID from MR branch name
 * Branch patterns: polecat/name/issue-id, polecat-name-issue-id, etc.
 */
function extractIssueId(branch: string, mrIssueId?: string): string {
	if (mrIssueId) return mrIssueId;

	// Try to extract from branch name
	// Pattern: polecat/name/prefix-xxx or similar
	const parts = branch.split("/");
	const lastPart = parts[parts.length - 1];

	// Look for patterns like "gp-abc", "gtdispat-xyz"
	const issueMatch = lastPart.match(/([a-z]+-[a-z0-9]+)$/i);
	if (issueMatch) {
		return issueMatch[1];
	}

	return branch; // Fallback to branch name
}

/**
 * Get merge requests from a rig
 */
async function getMergeRequestsForRig(
	rig: RigInfo,
	townRoot?: string,
): Promise<MergeRequest[]> {
	try {
		const result = await runGt(["mq", "list", rig.name, "--json"], {
			cwd: townRoot,
			timeout: 10000,
		});

		if (result.exitCode !== 0 || !result.stdout || result.stdout === "null") {
			return [];
		}

		const rawMRs: RawMR[] = JSON.parse(result.stdout);
		if (!Array.isArray(rawMRs)) {
			return [];
		}

		return rawMRs.map((raw) => ({
			id: raw.id,
			rig: rig.name,
			branch: raw.branch,
			issue_id: extractIssueId(raw.branch, raw.issue_id),
			issue_title: raw.title,
			status: normalizeMRStatus(raw.status),
			created_at: raw.created_at || new Date().toISOString(),
			updated_at: raw.updated_at,
			error: raw.error,
			retry_count: raw.retry_count || 0,
		}));
	} catch (err) {
		console.debug(`[analytics] Failed to get MRs for ${rig.name}:`, err);
		return [];
	}
}

/**
 * Get all merge requests across all rigs
 */
export async function getAllMergeRequests(
	townRoot?: string,
): Promise<MergeRequest[]> {
	const rigsResult = await listRigs(townRoot);
	const allMRs: MergeRequest[] = [];

	// Query all rigs in parallel
	const results = await Promise.all(
		rigsResult.rigs.map((rig) => getMergeRequestsForRig(rig, townRoot)),
	);

	for (const rigMRs of results) {
		allMRs.push(...rigMRs);
	}

	return allMRs;
}

/**
 * Detect rework loops from merge request data.
 * A rework loop is when an issue has:
 * 1. A failed MR with retry_count > 0, OR
 * 2. Multiple failed MR attempts
 */
export async function detectReworkLoops(
	townRoot?: string,
): Promise<ReworkLoopSummary> {
	const allMRs = await getAllMergeRequests(townRoot);

	// Group MRs by issue ID to detect loops
	const issueMap = new Map<string, MergeRequest[]>();
	for (const mr of allMRs) {
		const existing = issueMap.get(mr.issue_id) || [];
		existing.push(mr);
		issueMap.set(mr.issue_id, existing);
	}

	const loops: ReworkLoop[] = [];
	const now = Date.now();

	for (const [issueId, mrs] of issueMap) {
		// Sort by created_at to get chronological order
		mrs.sort((a, b) =>
			new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
		);

		// Count failures and retries
		const failedMRs = mrs.filter((mr) => mr.status === "failed" || mr.status === "rejected");
		const totalRetries = mrs.reduce((sum, mr) => sum + mr.retry_count, 0);
		const cycleCount = failedMRs.length + totalRetries;

		// Only include if there's evidence of a rework loop (at least 1 retry or failure)
		if (cycleCount > 0) {
			const firstMR = mrs[0];
			const lastMR = mrs[mrs.length - 1];
			const failedMR = failedMRs[failedMRs.length - 1] || lastMR;

			const firstTime = new Date(firstMR.created_at).getTime();
			const timeStuckMs = now - firstTime;

			loops.push({
				issue_id: issueId,
				issue_title: lastMR.issue_title || issueId,
				rig: lastMR.rig,
				cycle_count: cycleCount,
				time_stuck_ms: timeStuckMs,
				time_stuck_display: formatDuration(timeStuckMs),
				first_failure_at: firstMR.created_at,
				last_failure_at: failedMR.updated_at || failedMR.created_at,
				current_status: lastMR.status,
				mr_id: lastMR.id,
			});
		}
	}

	// Sort by cycle count (most cycles first), then by time stuck
	loops.sort((a, b) => {
		if (b.cycle_count !== a.cycle_count) {
			return b.cycle_count - a.cycle_count;
		}
		return b.time_stuck_ms - a.time_stuck_ms;
	});

	// Calculate totals
	const totalTimeStuckMs = loops.reduce((sum, loop) => sum + loop.time_stuck_ms, 0);

	return {
		total_loops: loops.length,
		total_time_stuck_ms: totalTimeStuckMs,
		loops,
		worst_offenders: loops.slice(0, 5),
	};
}

/**
 * Get merge requests that are currently in a failed state
 * These are candidates for retry
 */
export async function getFailedMergeRequests(
	townRoot?: string,
): Promise<MergeRequest[]> {
	const allMRs = await getAllMergeRequests(townRoot);
	return allMRs.filter((mr) => mr.status === "failed");
}
