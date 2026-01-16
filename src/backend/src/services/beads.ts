import path from "path";
import { runBdJson, runBd } from "../commands/runner.js";
import type {
	Bead,
	BeadFilters,
	ActionResult,
	BeadDetail,
	DependencyInfo,
	BeadComment,
} from "../types/gasown.js";

// Extract rig name from issue ID (e.g., "gtdispat-17a" -> "gtdispat")
function getRigFromIssueId(issueId: string): string | undefined {
	const match = issueId.match(/^([^-]+)-/);
	return match ? match[1] : undefined;
}

// Get the rig path for an issue ID
function getRigPath(issueId: string, townRoot?: string): string | undefined {
	const rigName = getRigFromIssueId(issueId);
	if (!rigName) return townRoot;
	const basePath = townRoot || process.env.GT_TOWN_ROOT || `${process.env.HOME}/gt`;
	return path.join(basePath, rigName);
}

export async function listBeads(
	filters: BeadFilters = {},
	townRoot?: string,
): Promise<Bead[]> {
	const args = ["list"];

	if (filters.status) {
		args.push(`--status=${filters.status}`);
	}
	if (filters.type) {
		args.push(`--type=${filters.type}`);
	}
	if (filters.assignee) {
		args.push(`--assignee=${filters.assignee}`);
	}
	if (filters.parent) {
		args.push(`--parent=${filters.parent}`);
	}
	if (filters.limit) {
		args.push(`--limit=${filters.limit}`);
	}

	return runBdJson<Bead[]>(args, { cwd: townRoot });
}

export async function getReadyBeads(townRoot?: string): Promise<Bead[]> {
	return runBdJson<Bead[]>(["ready"], { cwd: townRoot });
}

export async function getBlockedBeads(townRoot?: string): Promise<Bead[]> {
	return runBdJson<Bead[]>(["blocked"], { cwd: townRoot });
}

export async function getBead(
	beadId: string,
	townRoot?: string,
): Promise<Bead> {
	const beads = await runBdJson<Bead[]>(["show", beadId], { cwd: townRoot });
	if (!beads || beads.length === 0) {
		throw new Error(`Bead not found: ${beadId}`);
	}
	return beads[0];
}

export async function createBead(
	title: string,
	options: {
		description?: string;
		type?: string;
		priority?: number;
		parent?: string;
	} = {},
	townRoot?: string,
): Promise<ActionResult> {
	const args = ["create", `--title=${title}`];

	if (options.description) {
		args.push(`--description=${options.description}`);
	}
	if (options.type) {
		args.push(`--type=${options.type}`);
	}
	if (options.priority !== undefined) {
		args.push(`--priority=${options.priority}`);
	}
	if (options.parent) {
		args.push(`--parent=${options.parent}`);
	}

	const result = await runBd([...args, "--json"], { cwd: townRoot });

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to create bead",
			error: result.stderr,
		};
	}

	try {
		const created = JSON.parse(result.stdout) as Bead;
		return {
			success: true,
			message: `Created bead: ${created.id}`,
			data: created,
		};
	} catch {
		return {
			success: true,
			message: "Bead created",
		};
	}
}

export async function updateBeadStatus(
	beadId: string,
	status: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runBd(["update", beadId, `--status=${status}`], {
		cwd: townRoot,
	});

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to update bead status",
			error: result.stderr,
		};
	}

	return {
		success: true,
		message: `Updated ${beadId} status to ${status}`,
	};
}

export async function closeBead(
	beadId: string,
	reason?: string,
	townRoot?: string,
): Promise<ActionResult> {
	const args = ["close", beadId];
	if (reason) {
		args.push("--reason", reason);
	}

	const result = await runBd(args, { cwd: townRoot });

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to close bead",
			error: result.stderr,
		};
	}

	return {
		success: true,
		message: `Closed bead: ${beadId}`,
	};
}

export async function listRigBeads(
	rigName: string,
	filters: BeadFilters = {},
	townRoot?: string,
): Promise<Bead[]> {
	const path = await import("path");
	const rigPath = path.join(
		townRoot || process.env.GT_TOWN_ROOT || `${process.env.HOME}/gt`,
		rigName,
	);
	return listBeads(filters, rigPath);
}

export async function getReadyRigBeads(
	rigName: string,
	townRoot?: string,
): Promise<Bead[]> {
	const path = await import("path");
	const rigPath = path.join(
		townRoot || process.env.GT_TOWN_ROOT || `${process.env.HOME}/gt`,
		rigName,
	);
	return runBdJson<Bead[]>(["ready"], { cwd: rigPath });
}

export async function getAllRigBeads(
	rigNames: string[],
	filters: BeadFilters = {},
	townRoot?: string,
): Promise<Record<string, Bead[]>> {
	const results: Record<string, Bead[]> = {};

	await Promise.all(
		rigNames.map(async (rigName) => {
			try {
				results[rigName] = await listRigBeads(rigName, filters, townRoot);
			} catch {
				results[rigName] = [];
			}
		}),
	);

	return results;
}

// Raw dependency item from bd CLI
interface RawDependency {
	id: string;
	title: string;
	status: string;
	issue_type?: string;
	priority?: number;
	dependency_type?: string;
}

export async function getBeadDetail(
	beadId: string,
	townRoot?: string,
): Promise<BeadDetail> {
	// Get the bead first
	const bead = await getBead(beadId, townRoot);

	// Get the rig path for rig-specific commands
	const rigPath = getRigPath(beadId, townRoot);

	// Get dependencies (what this bead depends on / is blocked by)
	const blockedByRaw = await runBdJson<RawDependency[]>(
		["dep", "list", beadId, "--direction", "down"],
		{ cwd: rigPath },
	);

	// Get dependents (what depends on this bead / this bead blocks)
	const blocksRaw = await runBdJson<RawDependency[]>(
		["dep", "list", beadId, "--direction", "up"],
		{ cwd: rigPath },
	);

	// Get comments
	const comments = await runBdJson<BeadComment[]>(["comments", beadId], {
		cwd: rigPath,
	});

	// Transform dependencies to include direction
	const blocked_by: DependencyInfo[] = (blockedByRaw || []).map((dep) => ({
		id: dep.id,
		title: dep.title,
		status: dep.status,
		issue_type: dep.issue_type,
		priority: dep.priority,
		dependency_type: dep.dependency_type || "blocks",
		direction: "blocked_by" as const,
	}));

	const blocks: DependencyInfo[] = (blocksRaw || []).map((dep) => ({
		id: dep.id,
		title: dep.title,
		status: dep.status,
		issue_type: dep.issue_type,
		priority: dep.priority,
		dependency_type: dep.dependency_type || "blocks",
		direction: "blocks" as const,
	}));

	return {
		...bead,
		blocks,
		blocked_by,
		comments: comments || [],
	};
}

export async function getBeadDependencies(
	beadId: string,
	townRoot?: string,
): Promise<{ blocks: DependencyInfo[]; blocked_by: DependencyInfo[] }> {
	const rigPath = getRigPath(beadId, townRoot);

	// Get dependencies (what this bead depends on)
	const blockedByRaw = await runBdJson<RawDependency[]>(
		["dep", "list", beadId, "--direction", "down"],
		{ cwd: rigPath },
	);

	// Get dependents (what depends on this bead)
	const blocksRaw = await runBdJson<RawDependency[]>(
		["dep", "list", beadId, "--direction", "up"],
		{ cwd: rigPath },
	);

	const blocked_by: DependencyInfo[] = (blockedByRaw || []).map((dep) => ({
		id: dep.id,
		title: dep.title,
		status: dep.status,
		issue_type: dep.issue_type,
		priority: dep.priority,
		dependency_type: dep.dependency_type || "blocks",
		direction: "blocked_by" as const,
	}));

	const blocks: DependencyInfo[] = (blocksRaw || []).map((dep) => ({
		id: dep.id,
		title: dep.title,
		status: dep.status,
		issue_type: dep.issue_type,
		priority: dep.priority,
		dependency_type: dep.dependency_type || "blocks",
		direction: "blocks" as const,
	}));

	return { blocks, blocked_by };
}

export async function addBeadDependency(
	beadId: string,
	dependsOnId: string,
	type?: string,
	townRoot?: string,
): Promise<ActionResult> {
	const rigPath = getRigPath(beadId, townRoot);
	const args = ["dep", "add", beadId, dependsOnId];
	if (type) {
		args.push(`--type=${type}`);
	}

	const result = await runBd(args, { cwd: rigPath });

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to add dependency",
			error: result.stderr,
		};
	}

	return {
		success: true,
		message: `Added dependency: ${beadId} depends on ${dependsOnId}`,
	};
}

export async function removeBeadDependency(
	beadId: string,
	dependsOnId: string,
	townRoot?: string,
): Promise<ActionResult> {
	const rigPath = getRigPath(beadId, townRoot);
	const result = await runBd(["dep", "remove", beadId, dependsOnId], {
		cwd: rigPath,
	});

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to remove dependency",
			error: result.stderr,
		};
	}

	return {
		success: true,
		message: `Removed dependency: ${beadId} no longer depends on ${dependsOnId}`,
	};
}

export async function getBeadComments(
	beadId: string,
	townRoot?: string,
): Promise<BeadComment[]> {
	const rigPath = getRigPath(beadId, townRoot);
	const comments = await runBdJson<BeadComment[]>(["comments", beadId], {
		cwd: rigPath,
	});
	return comments || [];
}

export async function addBeadComment(
	beadId: string,
	content: string,
	townRoot?: string,
): Promise<ActionResult> {
	const rigPath = getRigPath(beadId, townRoot);
	const result = await runBd(["comments", "add", beadId, content], {
		cwd: rigPath,
	});

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to add comment",
			error: result.stderr,
		};
	}

	return {
		success: true,
		message: "Comment added",
	};
}

export async function updateBead(
	beadId: string,
	updates: {
		title?: string;
		description?: string;
		status?: string;
		type?: string;
		priority?: number;
		assignee?: string;
		labels?: string[];
		parent?: string;
	},
	townRoot?: string,
): Promise<ActionResult> {
	const rigPath = getRigPath(beadId, townRoot);
	const args = ["update", beadId];

	if (updates.title) {
		args.push(`--title=${updates.title}`);
	}
	if (updates.description) {
		args.push(`--description=${updates.description}`);
	}
	if (updates.status) {
		args.push(`--status=${updates.status}`);
	}
	if (updates.type) {
		args.push(`--type=${updates.type}`);
	}
	if (updates.priority !== undefined) {
		args.push(`--priority=${updates.priority}`);
	}
	if (updates.assignee !== undefined) {
		args.push(`--assignee=${updates.assignee}`);
	}
	if (updates.labels) {
		args.push(`--set-labels=${updates.labels.join(",")}`);
	}
	if (updates.parent !== undefined) {
		args.push(`--parent=${updates.parent}`);
	}

	const result = await runBd(args, { cwd: rigPath });

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to update bead",
			error: result.stderr,
		};
	}

	return {
		success: true,
		message: `Updated bead: ${beadId}`,
	};
}

export async function assignBead(
	beadId: string,
	assignee: string,
	townRoot?: string,
): Promise<ActionResult> {
	const rigPath = getRigPath(beadId, townRoot);
	const result = await runBd(["update", beadId, `--assignee=${assignee}`], {
		cwd: rigPath,
	});

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to assign bead",
			error: result.stderr,
		};
	}

	return {
		success: true,
		message: `Assigned ${beadId} to ${assignee}`,
	};
}
