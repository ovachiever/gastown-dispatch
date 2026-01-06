import { runGtJson, runGt } from "../commands/runner.js";
import type { Convoy, ConvoyCreateRequest, ActionResult } from "../types/gasown.js";

export async function listConvoys(
  status?: "open" | "closed",
  townRoot?: string
): Promise<Convoy[]> {
  const args = ["convoy", "list"];
  if (status) {
    args.push(`--status=${status}`);
  }
  return runGtJson<Convoy[]>(args, { cwd: townRoot });
}

export async function getConvoyStatus(
  convoyId: string,
  townRoot?: string
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
  townRoot?: string
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
  townRoot?: string
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
