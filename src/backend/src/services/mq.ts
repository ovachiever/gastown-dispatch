import { runGtJson } from "../commands/runner.js";
import type {
	MergeRequest,
	MRStatusOutput,
	MQListFilters,
	MQNextOptions,
} from "../types/gasown.js";

/**
 * List merge requests in the merge queue for a rig.
 */
export async function listMergeQueue(
	rig: string,
	filters: MQListFilters = {},
	townRoot?: string,
): Promise<MergeRequest[]> {
	const args = ["mq", "list", rig];

	if (filters.status) {
		args.push(`--status=${filters.status}`);
	}
	if (filters.worker) {
		args.push(`--worker=${filters.worker}`);
	}
	if (filters.epic) {
		args.push(`--epic=${filters.epic}`);
	}
	if (filters.ready) {
		args.push("--ready");
	}

	try {
		return await runGtJson<MergeRequest[]>(args, { cwd: townRoot });
	} catch {
		// Return empty array if no MRs or command fails gracefully
		return [];
	}
}

/**
 * Get detailed status of a merge request.
 */
export async function getMergeRequestStatus(
	mrId: string,
	townRoot?: string,
): Promise<MRStatusOutput | null> {
	try {
		return await runGtJson<MRStatusOutput>(["mq", "status", mrId], {
			cwd: townRoot,
		});
	} catch {
		return null;
	}
}

/**
 * Get the next merge request to process based on priority.
 */
export async function getNextMergeRequest(
	rig: string,
	options: MQNextOptions = {},
	townRoot?: string,
): Promise<MergeRequest | null> {
	const args = ["mq", "next", rig];

	if (options.strategy) {
		args.push(`--strategy=${options.strategy}`);
	}

	try {
		return await runGtJson<MergeRequest>(args, { cwd: townRoot });
	} catch {
		return null;
	}
}

/**
 * Get merge queue summary for a rig (list with counts).
 */
export async function getMergeQueueSummary(
	rig: string,
	townRoot?: string,
): Promise<{
	total: number;
	ready: number;
	blocked: number;
	in_progress: number;
	items: MergeRequest[];
}> {
	const allItems = await listMergeQueue(rig, {}, townRoot);
	const readyItems = await listMergeQueue(rig, { ready: true }, townRoot);

	const blocked = allItems.filter(
		(mr) => mr.blocked_by_count && mr.blocked_by_count > 0,
	).length;
	const inProgress = allItems.filter(
		(mr) => mr.status === "in_progress",
	).length;

	return {
		total: allItems.length,
		ready: readyItems.length,
		blocked,
		in_progress: inProgress,
		items: allItems,
	};
}
