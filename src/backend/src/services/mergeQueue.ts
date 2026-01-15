import { runGtJson, runGt } from "../commands/runner.js";
import { findTownRoot } from "../config/townRoot.js";

// MR status from gt mq list
export interface MergeRequest {
	id: string;
	status: "ready" | "in_progress" | "blocked" | "merged" | "rejected";
	priority: string; // P0, P1, P2, etc.
	branch: string;
	worker: string;
	age: string;
	blocked_by?: string;
	convoy_id?: string;
	bead_ids?: string[];
	created_at?: string;
	submitted_by?: string;
}

export interface MergeQueueListResponse {
	rig: string;
	requests: MergeRequest[];
	summary: {
		total: number;
		ready: number;
		in_progress: number;
		blocked: number;
	};
}

export interface NextMergeRequest {
	rig: string;
	request: MergeRequest | null;
	strategy: "priority" | "fifo";
}

export interface MergeRequestDetail extends MergeRequest {
	title?: string;
	description?: string;
	commits?: string[];
	checks?: {
		name: string;
		status: "pending" | "success" | "failure";
	}[];
}

function getTownRoot(townRoot?: string): string {
	return townRoot || findTownRoot() || process.env.GT_TOWN_ROOT || "/Users/erik/gt";
}

export async function getMergeQueueList(
	rig: string,
	options?: {
		status?: "open" | "in_progress" | "closed";
		ready?: boolean;
		worker?: string;
		epic?: string;
	},
	townRoot?: string
): Promise<MergeQueueListResponse> {
	const root = getTownRoot(townRoot);
	const args = ["mq", "list", rig];

	if (options?.status) {
		args.push("--status", options.status);
	}
	if (options?.ready) {
		args.push("--ready");
	}
	if (options?.worker) {
		args.push("--worker", options.worker);
	}
	if (options?.epic) {
		args.push("--epic", options.epic);
	}

	try {
		const requests = await runGtJson<MergeRequest[] | null>(args, { cwd: root });

		const requestList = requests || [];
		const summary = {
			total: requestList.length,
			ready: requestList.filter((r) => r.status === "ready").length,
			in_progress: requestList.filter((r) => r.status === "in_progress").length,
			blocked: requestList.filter((r) => r.status === "blocked").length,
		};

		return { rig, requests: requestList, summary };
	} catch (error) {
		// If the command fails (e.g., no queue), return empty
		return {
			rig,
			requests: [],
			summary: { total: 0, ready: 0, in_progress: 0, blocked: 0 },
		};
	}
}

export async function getNextMergeRequest(
	rig: string,
	strategy: "priority" | "fifo" = "priority",
	townRoot?: string
): Promise<NextMergeRequest> {
	const root = getTownRoot(townRoot);
	const args = ["mq", "next", rig, "--strategy", strategy];

	try {
		const request = await runGtJson<MergeRequest | null>(args, { cwd: root });
		return { rig, request, strategy };
	} catch {
		return { rig, request: null, strategy };
	}
}

export async function getMergeRequestStatus(
	mrId: string,
	townRoot?: string
): Promise<MergeRequestDetail | null> {
	const root = getTownRoot(townRoot);

	try {
		return await runGtJson<MergeRequestDetail>(["mq", "status", mrId], {
			cwd: root,
		});
	} catch {
		return null;
	}
}

export async function getAllRigsMergeQueues(
	rigNames: string[],
	townRoot?: string
): Promise<Record<string, MergeQueueListResponse>> {
	const result: Record<string, MergeQueueListResponse> = {};

	await Promise.all(
		rigNames.map(async (rig) => {
			result[rig] = await getMergeQueueList(rig, {}, townRoot);
		})
	);

	return result;
}
