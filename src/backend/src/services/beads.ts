import { runBdJson, runBd } from "../commands/runner.js";
import type { Bead, BeadFilters, ActionResult } from "../types/gasown.js";

export async function listBeads(
  filters: BeadFilters = {},
  townRoot?: string
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

export async function getBead(beadId: string, townRoot?: string): Promise<Bead> {
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
  townRoot?: string
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
  townRoot?: string
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
  townRoot?: string
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
