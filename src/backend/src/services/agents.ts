/**
 * Agent service - API for agent data and operations.
 *
 * Wraps gt commands:
 * - gt status --json (for agent list)
 * - gt peek (for terminal output)
 * - gt mail inbox (for agent mailbox)
 * - gt polecat list/status (for polecat info)
 */

import { runGt, runGtJson } from "../commands/runner.js";
import type {
	ActionResult,
	AgentRuntime,
	TownStatus,
	AgentDetail,
	MailPreview,
	PolecatStatus,
} from "../types/gasown.js";

/**
 * List all agents across the town.
 */
export async function listAgents(townRoot?: string): Promise<AgentRuntime[]> {
	const status = await runGtJson<TownStatus>(["status"], { cwd: townRoot });

	// Flatten agents: town-level + per-rig agents
	const agents: AgentRuntime[] = [...(status.agents || [])];

	for (const rig of status.rigs || []) {
		if (rig.agents) {
			agents.push(...rig.agents);
		}
	}

	return agents;
}

/**
 * Get detailed info for a single agent.
 */
export async function getAgentDetail(
	address: string,
	townRoot?: string,
): Promise<AgentDetail | null> {
	const agents = await listAgents(townRoot);
	const agent = agents.find((a) => a.address === address);

	if (!agent) {
		return null;
	}

	// Get mail preview for this agent
	let mailPreview: MailPreview[] = [];
	let mailCount = 0;
	try {
		const mailResult = await runGt(["mail", "inbox", address, "--json"], {
			cwd: townRoot,
			timeout: 10_000,
		});
		if (mailResult.exitCode === 0 && mailResult.stdout.trim()) {
			const messages = JSON.parse(mailResult.stdout);
			if (Array.isArray(messages)) {
				mailCount = messages.length;
				mailPreview = messages.slice(0, 5).map((m: Record<string, unknown>) => ({
					id: m.id as string,
					from: m.from as string,
					subject: m.subject as string,
					timestamp: m.timestamp as string,
					read: m.read as boolean,
				}));
			}
		}
	} catch {
		// Mail fetch failed, use unread_mail from status
		mailCount = agent.unread_mail || 0;
	}

	return {
		...agent,
		mail_count: mailCount,
		mail_preview: mailPreview,
	};
}

/**
 * Get mailbox for an agent.
 */
export async function getAgentMail(
	address: string,
	townRoot?: string,
): Promise<{ messages: MailPreview[]; unread_count: number; total_count: number }> {
	const result = await runGt(["mail", "inbox", address, "--json"], {
		cwd: townRoot,
		timeout: 15_000,
	});

	if (result.exitCode !== 0) {
		return { messages: [], unread_count: 0, total_count: 0 };
	}

	try {
		const messages = JSON.parse(result.stdout);
		if (Array.isArray(messages)) {
			const mailList = messages.map((m: Record<string, unknown>) => ({
				id: m.id as string,
				from: m.from as string,
				subject: m.subject as string,
				timestamp: m.timestamp as string,
				read: m.read as boolean,
			}));
			return {
				messages: mailList,
				unread_count: mailList.filter((m) => !m.read).length,
				total_count: mailList.length,
			};
		}
	} catch {
		// Parse error
	}

	return { messages: [], unread_count: 0, total_count: 0 };
}

/**
 * Get recent terminal output for an agent (peek).
 */
export async function peekAgent(
	address: string,
	lines: number = 100,
	townRoot?: string,
): Promise<{ output: string; lines: number }> {
	const result = await runGt(["peek", address, "-n", String(lines)], {
		cwd: townRoot,
		timeout: 10_000,
	});

	if (result.exitCode !== 0) {
		return { output: result.stderr || "Failed to peek agent", lines: 0 };
	}

	const outputLines = result.stdout.split("\n");
	return {
		output: result.stdout,
		lines: outputLines.length,
	};
}

/**
 * Send nudge message to an agent.
 */
export async function nudgeAgent(
	address: string,
	message: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runGt(["nudge", address, message], {
		cwd: townRoot,
		timeout: 10_000,
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
		message: `Nudged ${address}`,
	};
}

/**
 * List polecats in a rig.
 */
export async function listPolecats(
	rigName: string,
	townRoot?: string,
): Promise<PolecatStatus[]> {
	const result = await runGt(["polecat", "list", rigName, "--json"], {
		cwd: townRoot,
		timeout: 10_000,
	});

	if (result.exitCode !== 0 || !result.stdout.trim()) {
		return [];
	}

	try {
		const data = JSON.parse(result.stdout);
		if (Array.isArray(data)) {
			return data.map((p: Record<string, unknown>) => ({
				name: p.name as string,
				rig: rigName,
				address: `${rigName}/${p.name}`,
				state: (p.state as PolecatStatus["state"]) || "idle",
				session_running: p.session_running as boolean || false,
				has_work: p.has_work as boolean || false,
				work_id: p.work_id as string | undefined,
				work_title: p.work_title as string | undefined,
				branch: p.branch as string | undefined,
				worktree: p.worktree as string | undefined,
				created_at: p.created_at as string | undefined,
				last_activity: p.last_activity as string | undefined,
			}));
		}
	} catch {
		// Parse error
	}

	return [];
}

/**
 * Get detailed status for a single polecat.
 */
export async function getPolecatStatus(
	rigName: string,
	polecatName: string,
	townRoot?: string,
): Promise<PolecatStatus | null> {
	const address = `${rigName}/${polecatName}`;
	const result = await runGt(["polecat", "status", address, "--json"], {
		cwd: townRoot,
		timeout: 10_000,
	});

	if (result.exitCode !== 0 || !result.stdout.trim()) {
		return null;
	}

	try {
		const p = JSON.parse(result.stdout) as Record<string, unknown>;
		return {
			name: polecatName,
			rig: rigName,
			address,
			state: (p.state as PolecatStatus["state"]) || "idle",
			session_running: p.session_running as boolean || false,
			has_work: p.has_work as boolean || false,
			work_id: p.work_id as string | undefined,
			work_title: p.work_title as string | undefined,
			branch: p.branch as string | undefined,
			worktree: p.worktree as string | undefined,
			created_at: p.created_at as string | undefined,
			last_activity: p.last_activity as string | undefined,
		};
	} catch {
		// Parse error
	}

	return null;
}
