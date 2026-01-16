import { runBdJson, runBd } from "../commands/runner.js";
import type {
	Bead,
	BeadFilters,
	ActionResult,
	BeadDetail,
	BeadComment,
	BeadDependency,
} from "../types/gasown.js";

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

// Bead Detail - get bead with full dependencies and comments
export async function getBeadDetail(
	beadId: string,
	townRoot?: string,
): Promise<BeadDetail> {
	// Get bead with its dependencies (blocked by)
	const beadResult = await runBdJson<
		Array<Bead & { dependencies?: BeadDependency[] }>
	>(["show", beadId], { cwd: townRoot });
	if (!beadResult || beadResult.length === 0) {
		throw new Error(`Bead not found: ${beadId}`);
	}

	const bead = beadResult[0];

	// Get dependents (what this bead blocks)
	const dependents = await runBdJson<BeadDependency[]>(
		["dep", "list", beadId, "--direction=up"],
		{ cwd: townRoot },
	);

	// Get comments
	const comments = await runBdJson<BeadComment[]>(["comments", beadId], {
		cwd: townRoot,
	});

	return {
		...bead,
		dependencies: bead.dependencies || [],
		dependents: dependents || [],
		comments: comments || [],
	};
}

// Get bead comments
export async function getBeadComments(
	beadId: string,
	townRoot?: string,
): Promise<BeadComment[]> {
	const comments = await runBdJson<BeadComment[]>(["comments", beadId], {
		cwd: townRoot,
	});
	return comments || [];
}

// Add a comment to a bead
export async function addBeadComment(
	beadId: string,
	content: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runBd(["comments", "add", beadId, content], {
		cwd: townRoot,
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

// Get bead dependencies (what this bead depends on)
export async function getBeadDependencies(
	beadId: string,
	townRoot?: string,
): Promise<BeadDependency[]> {
	const deps = await runBdJson<BeadDependency[]>(
		["dep", "list", beadId, "--direction=down"],
		{ cwd: townRoot },
	);
	return deps || [];
}

// Get bead dependents (what depends on this bead)
export async function getBeadDependents(
	beadId: string,
	townRoot?: string,
): Promise<BeadDependency[]> {
	const deps = await runBdJson<BeadDependency[]>(
		["dep", "list", beadId, "--direction=up"],
		{ cwd: townRoot },
	);
	return deps || [];
}

// Add a dependency
export async function addBeadDependency(
	beadId: string,
	dependsOnId: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runBd(["dep", "add", beadId, dependsOnId], {
		cwd: townRoot,
	});

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

// Remove a dependency
export async function removeBeadDependency(
	beadId: string,
	dependsOnId: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runBd(["dep", "remove", beadId, dependsOnId], {
		cwd: townRoot,
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

// Update bead fields
export async function updateBead(
	beadId: string,
	updates: {
		title?: string;
		description?: string;
		priority?: number;
		assignee?: string;
		labels?: string[];
	},
	townRoot?: string,
): Promise<ActionResult> {
	const args = ["update", beadId];

	if (updates.title) args.push(`--title=${updates.title}`);
	if (updates.description) args.push(`--description=${updates.description}`);
	if (updates.priority !== undefined)
		args.push(`--priority=${updates.priority}`);
	if (updates.assignee) args.push(`--assignee=${updates.assignee}`);
	if (updates.labels) {
		for (const label of updates.labels) {
			args.push(`--label=${label}`);
		}
	}

	const result = await runBd(args, { cwd: townRoot });

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
