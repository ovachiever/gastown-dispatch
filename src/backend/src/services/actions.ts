import { runGt } from "../commands/runner.js";
import type {
	ActionResult,
	SlingRequest,
	RigAddRequest,
	CrewAddRequest,
} from "../types/gasown.js";
import { invalidateStatusCache } from "./status.js";

export async function startTown(townRoot?: string): Promise<ActionResult> {
	const result = await runGt(["start"], { cwd: townRoot, timeout: 60_000 });

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to start Gas Town",
			error: result.stderr,
		};
	}

	invalidateStatusCache();
	return {
		success: true,
		message: "Gas Town started",
	};
}

export async function shutdownTown(townRoot?: string): Promise<ActionResult> {
	const result = await runGt(["shutdown", "--yes"], { cwd: townRoot, timeout: 60_000 });

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to shutdown Gas Town",
			error: result.stderr,
		};
	}

	invalidateStatusCache();
	return {
		success: true,
		message: "Gas Town shutdown complete",
	};
}

export async function slingWork(
	request: SlingRequest,
	townRoot?: string,
): Promise<ActionResult> {
	const args = ["sling", request.bead_id, request.rig];

	if (request.formula) {
		args.push("--on", request.formula);
	}

	const result = await runGt(args, { cwd: townRoot });

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to sling work",
			error: result.stderr,
		};
	}

	invalidateStatusCache();
	return {
		success: true,
		message: `Slung ${request.bead_id} to ${request.rig}`,
	};
}

export async function addRig(
	request: RigAddRequest,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runGt(["rig", "add", request.name, request.url], {
		cwd: townRoot,
		timeout: 120_000, // Git clone can take a while
	});

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to add rig",
			error: result.stderr,
		};
	}

	invalidateStatusCache();
	return {
		success: true,
		message: `Added rig: ${request.name}`,
	};
}

export async function removeRig(
	rigName: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runGt(["rig", "remove", rigName], { cwd: townRoot });

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to remove rig",
			error: result.stderr,
		};
	}

	invalidateStatusCache();
	return {
		success: true,
		message: `Removed rig: ${rigName}`,
	};
}

export async function addCrew(
	request: CrewAddRequest,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runGt(
		["crew", "add", request.name, "--rig", request.rig],
		{
			cwd: townRoot,
		},
	);

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to add crew member",
			error: result.stderr,
		};
	}

	invalidateStatusCache();
	return {
		success: true,
		message: `Added crew member: ${request.name} to ${request.rig}`,
	};
}

export async function nudgeAgent(
	agentAddress: string,
	message: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runGt(["nudge", agentAddress, message], {
		cwd: townRoot,
	});

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to nudge agent",
			error: result.stderr,
		};
	}

	return {
		success: true,
		message: `Nudged ${agentAddress}`,
	};
}

export async function runDoctor(
	fix = false,
	townRoot?: string,
): Promise<ActionResult> {
	const args = ["doctor"];
	if (fix) {
		args.push("--fix");
	}

	const result = await runGt(args, { cwd: townRoot, timeout: 60_000 });

	return {
		success: result.exitCode === 0,
		message:
			result.exitCode === 0
				? "Health check passed"
				: "Health check found issues",
		data: {
			stdout: result.stdout,
			stderr: result.stderr,
		},
	};
}

export async function restartMayor(townRoot?: string): Promise<ActionResult> {
	// Stop Mayor first (graceful shutdown)
	const stopResult = await runGt(["mayor", "stop"], {
		cwd: townRoot,
		timeout: 30_000,
	});

	// Wait for clean shutdown
	await new Promise((resolve) => setTimeout(resolve, 1500));

	// Start Mayor again (detached tmux session)
	const startResult = await runGt(["mayor", "start"], {
		cwd: townRoot,
		timeout: 60_000,
	});

	if (startResult.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to restart Mayor",
			error: startResult.stderr || stopResult.stderr,
		};
	}

	invalidateStatusCache();
	return {
		success: true,
		message: "Mayor restarted successfully",
	};
}

export async function addPolecat(
	rigName: string,
	polecatName: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runGt(
		["polecat", "add", polecatName, "--rig", rigName],
		{
			cwd: townRoot,
			timeout: 60_000,
		},
	);

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to add polecat",
			error: result.stderr,
		};
	}

	invalidateStatusCache();
	return {
		success: true,
		message: `Added polecat: ${polecatName} to ${rigName}`,
	};
}

export async function removePolecat(
	rigName: string,
	polecatName: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runGt(["polecat", "remove", polecatName, "--rig", rigName], {
		cwd: townRoot,
		timeout: 30_000,
	});

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to remove polecat",
			error: result.stderr,
		};
	}

	invalidateStatusCache();
	return {
		success: true,
		message: `Removed polecat: ${polecatName} from ${rigName}`,
	};
}

export async function nukePolecat(
	rigName: string,
	polecatName: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runGt(["polecat", "nuke", polecatName, "--rig", rigName], {
		cwd: townRoot,
		timeout: 30_000,
	});

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to nuke polecat",
			error: result.stderr,
		};
	}

	invalidateStatusCache();
	return {
		success: true,
		message: `Nuked polecat: ${polecatName} from ${rigName}`,
	};
}
