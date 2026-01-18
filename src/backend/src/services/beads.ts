import { runBdJson, runBd } from "../commands/runner.js";
import type { Bead, BeadFilters, ActionResult } from "../types/gasown.js";

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

// =====================
// Dependencies
// =====================

export interface BeadDependency {
	id: string;
	title: string;
	status: string;
	type: string;
	priority: number;
}

export async function getBeadDependencies(
	beadId: string,
	townRoot?: string,
): Promise<{ blocks: BeadDependency[]; blocked_by: BeadDependency[] }> {
	// Get dependencies (issues this bead depends on)
	const blocked_by = await runBdJson<BeadDependency[]>(
		["dep", "list", beadId, "--depends-on"],
		{ cwd: townRoot },
	);

	// Get issues this bead blocks
	const blocks = await runBdJson<BeadDependency[]>(
		["dep", "list", beadId, "--blocks"],
		{ cwd: townRoot },
	);

	return { blocks, blocked_by };
}

export async function addBeadDependency(
	beadId: string,
	dependsOn: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runBd(["dep", "add", beadId, dependsOn], {
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
		message: `Added dependency: ${beadId} depends on ${dependsOn}`,
	};
}

export async function removeBeadDependency(
	beadId: string,
	dependsOn: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runBd(["dep", "remove", beadId, dependsOn], {
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
		message: `Removed dependency: ${beadId} no longer depends on ${dependsOn}`,
	};
}

// =====================
// Comments
// =====================

export interface BeadComment {
	id: string;
	author: string;
	body: string;
	created_at: string;
}

export async function getBeadComments(
	beadId: string,
	townRoot?: string,
): Promise<BeadComment[]> {
	return runBdJson<BeadComment[]>(["comments", beadId], { cwd: townRoot });
}

export async function addBeadComment(
	beadId: string,
	comment: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runBd(["comments", "add", beadId, comment], {
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
