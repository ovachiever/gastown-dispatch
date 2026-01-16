import { runGtJson, runGt, runBd } from "../commands/runner.js";
import { listRigs, type RigInfo } from "./rigs.js";
import { findTownRoot } from "../config/townRoot.js";
import * as fs from "fs";
import * as path from "path";
import type {
	Convoy,
	ConvoyCreateRequest,
	ActionResult,
	ConvoyDetail,
	TrackedIssueDetail,
	WorkerInfo,
	StrandedConvoy,
	SynthesisStatus,
} from "../types/gasown.js";

// Cache rig list for prefix lookups (refresh every 60s)
let rigCache: { rigs: RigInfo[]; timestamp: number } | null = null;
const RIG_CACHE_TTL = 60_000;

async function getCachedRigs(townRoot?: string): Promise<RigInfo[]> {
	if (rigCache && Date.now() - rigCache.timestamp < RIG_CACHE_TTL) {
		return rigCache.rigs;
	}
	const result = await listRigs(townRoot);
	rigCache = { rigs: result.rigs, timestamp: Date.now() };
	return result.rigs;
}

/**
 * Find the rig that owns an issue based on its prefix.
 * e.g., "frfood-xxx" -> rig with beadPrefix "frfood"
 */
function findRigByIssueId(issueId: string, rigs: RigInfo[]): RigInfo | null {
	const dashIdx = issueId.lastIndexOf("-");
	if (dashIdx === -1) return null;
	const prefix = issueId.slice(0, dashIdx);
	return rigs.find((r) => r.beadPrefix === prefix) || null;
}

/**
 * Get the actual beads directory for a rig, following redirects if present.
 */
function getBeadsPath(rigName: string, townRoot: string): string {
	const rigPath = path.join(townRoot, rigName);
	const beadsDir = path.join(rigPath, ".beads");
	const redirectFile = path.join(beadsDir, "redirect");

	if (fs.existsSync(redirectFile)) {
		const redirect = fs.readFileSync(redirectFile, "utf-8").trim();
		return path.join(rigPath, redirect);
	}
	return beadsDir;
}

/**
 * Resolve external/unknown tracked issues by querying their actual rig's beads DB.
 * This is a workaround for gt#285 where gt convoy status doesn't resolve cross-rig issues.
 */
async function resolveTrackedIssues(
	tracked: TrackedIssueDetail[],
	townRoot?: string,
): Promise<TrackedIssueDetail[]> {
	const root = townRoot || findTownRoot() || "/Users/erik/gt";
	const rigs = await getCachedRigs(root);

	const resolved = await Promise.all(
		tracked.map(async (issue) => {
			// Only resolve if status is unknown (gt#285 workaround)
			if (issue.status !== "unknown") {
				return issue;
			}

			const rig = findRigByIssueId(issue.id, rigs);
			if (!rig) {
				console.debug(
					`[convoy] Could not find rig for issue ${issue.id} (gt#285 workaround)`,
				);
				return issue;
			}

			try {
				const beadsPath = getBeadsPath(rig.name, root);
				console.debug(
					`[convoy] Resolving external issue ${issue.id} from ${rig.name} (gt#285 workaround)`,
				);

				const result = await runBd(["show", issue.id, "--json"], {
					cwd: beadsPath,
					timeout: 5000,
				});

				if (result.exitCode === 0) {
					const data = JSON.parse(result.stdout);
					// bd show --json returns an array
					const beadData = Array.isArray(data) ? data[0] : data;
					if (beadData) {
						return {
							...issue,
							title: beadData.title || issue.title,
							status: beadData.status || issue.status,
							assignee: beadData.assignee || issue.assignee,
							issue_type: beadData.type || issue.issue_type,
						};
					}
				}
			} catch (err) {
				console.debug(
					`[convoy] Failed to resolve issue ${issue.id}: ${err} (gt#285 workaround)`,
				);
			}

			return issue;
		}),
	);

	return resolved;
}

export async function listConvoys(
	status?: "open" | "closed",
	townRoot?: string,
): Promise<Convoy[]> {
	const args = ["convoy", "list"];
	if (status) {
		args.push(`--status=${status}`);
	}
	const convoys = await runGtJson<Convoy[]>(args, { cwd: townRoot });

	// Fetch detailed status for each convoy in parallel to get tracking info
	const enrichedConvoys = await Promise.all(
		convoys.map(async (convoy) => {
			try {
				const detailed = await runGtJson<Convoy>(
					["convoy", "status", convoy.id],
					{ cwd: townRoot },
				);
				// gt convoy status returns array with single element
				const statusData = Array.isArray(detailed) ? detailed[0] : detailed;
				return {
					...convoy,
					...statusData,
					// Map 'tracked' to 'tracked_issues' for frontend compatibility
					tracked_issues: (statusData as any).tracked?.map((t: any) => ({
						id: t.id,
						title: t.title,
						status: t.status,
						assignee: t.assignee,
					})),
				};
			} catch {
				// If status fetch fails, return basic convoy
				return convoy;
			}
		}),
	);

	// Enrich each convoy with synthesis-related fields from description
	return enrichedConvoys.map((convoy) => {
		const metadata = parseConvoyDescription(convoy.description);
		const completed = convoy.completed ?? 0;
		const total = convoy.total ?? 0;

		// Determine synthesis readiness (all issues completed)
		const synthesisReady = total > 0 && completed === total;

		// Determine if stranded (has open unassigned issues)
		const isStranded = convoy.tracked_issues?.some(
			(t: { status: string; assignee?: string }) =>
				t.status === "open" && !t.assignee,
		);

		return {
			...convoy,
			formula: metadata.formula,
			molecule: metadata.molecule,
			synthesis_ready: synthesisReady,
			is_stranded: isStranded,
		};
	});
}

export async function getConvoyStatus(
	convoyId: string,
	townRoot?: string,
): Promise<Convoy> {
	const convoys = await runGtJson<Convoy[]>(["convoy", "status", convoyId], {
		cwd: townRoot,
	});
	if (!convoys || convoys.length === 0) {
		throw new Error(`Convoy not found: ${convoyId}`);
	}
	return convoys[0];
}

export async function createConvoy(
	request: ConvoyCreateRequest,
	townRoot?: string,
): Promise<ActionResult> {
	const args = ["convoy", "create", request.name, ...request.issues];

	if (request.notify) {
		args.push("--notify", request.notify);
	}
	if (request.molecule) {
		args.push("--molecule", request.molecule);
	}

	const result = await runGt(args, { cwd: townRoot });

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to create convoy",
			error: result.stderr,
		};
	}

	// Parse convoy ID from output
	const match = result.stdout.match(/Created convoy: (hq-cv-\w+)/);
	const convoyId = match ? match[1] : undefined;

	return {
		success: true,
		message: `Convoy created${convoyId ? `: ${convoyId}` : ""}`,
		data: { convoy_id: convoyId },
	};
}

export async function addToConvoy(
	convoyId: string,
	issueIds: string[],
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runGt(["convoy", "add", convoyId, ...issueIds], {
		cwd: townRoot,
	});

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to add issues to convoy",
			error: result.stderr,
		};
	}

	return {
		success: true,
		message: `Added ${issueIds.length} issue(s) to convoy ${convoyId}`,
	};
}

// Raw response from gt convoy status --json
interface ConvoyStatusResponse {
	id: string;
	title: string;
	status: string;
	tracked: Array<{
		id: string;
		title: string;
		status: string;
		issue_type?: string;
		assignee?: string;
		worker?: string;
		worker_age?: string;
		dependency_type?: string;
	}>;
	completed: number;
	total: number;
}

// Parse structured fields from convoy description
function parseConvoyDescription(description?: string): {
	formula?: string;
	notify?: string;
	molecule?: string;
} {
	const result: { formula?: string; notify?: string; molecule?: string } = {};
	if (!description) return result;

	for (const line of description.split("\n")) {
		const colonIdx = line.indexOf(":");
		if (colonIdx === -1) continue;

		const key = line.slice(0, colonIdx).trim().toLowerCase();
		const value = line.slice(colonIdx + 1).trim();

		if (key === "formula" || key === "formula_path") {
			result.formula = value;
		} else if (key === "notify") {
			result.notify = value;
		} else if (key === "molecule") {
			result.molecule = value;
		}
	}

	return result;
}

export async function getConvoyDetail(
	convoyId: string,
	townRoot?: string,
): Promise<ConvoyDetail> {
	// Get detailed status using gt convoy status which includes worker info
	const result = await runGt(["convoy", "status", convoyId, "--json"], {
		cwd: townRoot,
	});

	if (result.exitCode !== 0) {
		throw new Error(`Convoy not found: ${convoyId}`);
	}

	let statusData: ConvoyStatusResponse;
	try {
		statusData = JSON.parse(result.stdout);
	} catch {
		throw new Error(`Failed to parse convoy status: ${result.stdout}`);
	}

	// Get convoy description for metadata
	const convoys = await runGtJson<Convoy[]>(["convoy", "list", "--json"], {
		cwd: townRoot,
	});
	const convoyBasic = convoys?.find((c) => c.id === convoyId);
	const metadata = parseConvoyDescription(convoyBasic?.description);

	// Transform tracked issues
	let trackedIssues: TrackedIssueDetail[] = (statusData.tracked || []).map(
		(t) => ({
			id: t.id,
			title: t.title,
			status: t.status,
			assignee: t.assignee,
			worker: t.worker,
			worker_age: t.worker_age,
			issue_type: t.issue_type,
			dependency_type: t.dependency_type,
		}),
	);

	// Resolve external issues that gt couldn't look up (gt#285 workaround)
	trackedIssues = await resolveTrackedIssues(trackedIssues, townRoot);

	// Extract workers from tracked issues
	const workers: WorkerInfo[] = trackedIssues
		.filter((t) => t.worker)
		.map((t) => ({
			agent: t.worker!,
			issue_id: t.id,
			age: t.worker_age || "",
		}));

	// Check synthesis readiness
	const completed = trackedIssues.filter((t) => t.status === "closed").length;
	const total = trackedIssues.length;
	const synthesisReady = total > 0 && completed === total;

	// Check if stranded (has open unassigned issues)
	const isStranded = trackedIssues.some(
		(t) => t.status === "open" && !t.assignee && !t.worker,
	);

	return {
		id: statusData.id,
		title: statusData.title,
		status: statusData.status as "open" | "closed",
		description: convoyBasic?.description,
		created_at: convoyBasic?.created_at || "",
		updated_at: convoyBasic?.updated_at,
		progress: `${completed}/${total}`,
		completed,
		total,
		formula: metadata.formula,
		notify: metadata.notify,
		molecule: metadata.molecule,
		workers,
		synthesis_ready: synthesisReady,
		is_stranded: isStranded,
		tracked_issues: trackedIssues,
	};
}

export async function getStrandedConvoys(
	townRoot?: string,
): Promise<StrandedConvoy[]> {
	const result = await runGt(["convoy", "stranded", "--json"], {
		cwd: townRoot,
	});

	if (result.exitCode !== 0) {
		return [];
	}

	try {
		return JSON.parse(result.stdout) || [];
	} catch {
		return [];
	}
}

export async function closeConvoy(
	convoyId: string,
	reason: string,
	townRoot?: string,
): Promise<ActionResult> {
	// Close convoy via bd close
	const closeResult = await runGt(
		["--", "bd", "close", convoyId, "-r", reason || "Manually closed"],
		{ cwd: townRoot },
	);

	if (closeResult.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to close convoy",
			error: closeResult.stderr,
		};
	}

	return {
		success: true,
		message: `Convoy ${convoyId} closed`,
	};
}

export async function getSynthesisStatus(
	convoyId: string,
	townRoot?: string,
): Promise<SynthesisStatus> {
	const detail = await getConvoyDetail(convoyId, townRoot);

	const incompletLegs = detail.tracked_issues
		.filter((t) => t.status !== "closed")
		.map((t) => ({
			id: t.id,
			title: t.title,
			status: t.status,
		}));

	return {
		convoy_id: convoyId,
		ready: detail.synthesis_ready,
		completed: detail.completed || 0,
		total: detail.total || 0,
		incomplete_legs: incompletLegs,
	};
}

export async function startSynthesis(
	convoyId: string,
	targetRig?: string,
	townRoot?: string,
): Promise<ActionResult> {
	const args = ["synthesis", "start", convoyId];
	if (targetRig) {
		args.push("--rig", targetRig);
	}

	const result = await runGt(args, { cwd: townRoot });

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to start synthesis",
			error: result.stderr,
		};
	}

	return {
		success: true,
		message: `Synthesis started for ${convoyId}`,
		data: { output: result.stdout },
	};
}

export async function removeFromConvoy(
	convoyId: string,
	issueId: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runGt(["--", "bd", "dep", "rm", convoyId, issueId], {
		cwd: townRoot,
	});

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to remove issue from convoy",
			error: result.stderr,
		};
	}

	return {
		success: true,
		message: `Removed ${issueId} from convoy ${convoyId}`,
	};
}
