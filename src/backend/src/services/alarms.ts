import { getStrandedConvoys } from "./convoys.js";
import { getTownStatus } from "./status.js";
import { runCommand } from "../commands/runner.js";
import { findTownRoot } from "../config/townRoot.js";
import type { StrandedConvoy, RigStatus } from "../types/gasown.js";

export interface DerivedAlarm {
	type: "stranded_convoy" | "blocked_queue" | "stale_heartbeat" | "stuck_polecat" | "rework_loop";
	level: "error" | "warning" | "info";
	message: string;
	details?: string[];
	rig?: string;
	convoy_id?: string;
	agent?: string;
}

export interface AlarmsResponse {
	alarms: DerivedAlarm[];
	summary: {
		total: number;
		errors: number;
		warnings: number;
	};
}

// Check for dependency cycles using bv
async function checkForCycles(townRoot?: string): Promise<DerivedAlarm[]> {
	const root = townRoot || findTownRoot();
	if (!root) return [];

	try {
		const result = await runCommand("bv", ["--robot-insights"], {
			cwd: root,
			timeout: 5000,
		});

		if (result.exitCode !== 0) return [];

		const insights = JSON.parse(result.stdout);
		const cycles = insights?.Cycles;

		if (cycles && Array.isArray(cycles) && cycles.length > 0) {
			return cycles.map((cycle: string[]) => ({
				type: "rework_loop" as const,
				level: "error" as const,
				message: `Dependency cycle detected: ${cycle.length} beads in loop`,
				details: cycle,
			}));
		}
	} catch {
		// bv not available or failed - skip cycle detection
	}

	return [];
}

// Derive alarms from stranded convoys
function deriveStrandedConvoyAlarms(stranded: StrandedConvoy[]): DerivedAlarm[] {
	return stranded.map((convoy) => ({
		type: "stranded_convoy" as const,
		level: "warning" as const,
		message: `Convoy ${convoy.id.slice(0, 12)} has ${convoy.ready_count} stranded leg(s)`,
		convoy_id: convoy.id,
		details: convoy.ready_issues.slice(0, 5),
	}));
}

// Derive alarms from rig MQ status
function deriveMQAlarms(rigs: RigStatus[]): DerivedAlarm[] {
	const alarms: DerivedAlarm[] = [];

	for (const rig of rigs) {
		const mq = rig.mq;
		if (!mq) continue;

		// Check for blocked queue
		if (mq.blocked > 0 || mq.state === "blocked") {
			alarms.push({
				type: "blocked_queue",
				level: "error",
				message: `${rig.name}: Merge queue blocked (${mq.blocked} items)`,
				rig: rig.name,
			});
		}

		// Check for stale heartbeat
		if (mq.health === "stale") {
			alarms.push({
				type: "stale_heartbeat",
				level: "warning",
				message: `${rig.name}: Stale heartbeat detected`,
				rig: rig.name,
			});
		}
	}

	return alarms;
}

// Derive alarms from agent status - stuck polecats
function deriveAgentAlarms(rigs: RigStatus[]): DerivedAlarm[] {
	const alarms: DerivedAlarm[] = [];

	for (const rig of rigs) {
		const agents = rig.agents || [];

		for (const agent of agents) {
			// Stuck polecat: has work but not running, or in error state with work
			if (agent.has_work && !agent.running) {
				alarms.push({
					type: "stuck_polecat",
					level: "warning",
					message: `${agent.name}: Has work but not running`,
					rig: rig.name,
					agent: agent.name,
					details: agent.work_title ? [agent.work_title] : undefined,
				});
			}

			// Error state with work
			if (agent.state === "error" && agent.has_work) {
				alarms.push({
					type: "stuck_polecat",
					level: "error",
					message: `${agent.name}: In error state with pending work`,
					rig: rig.name,
					agent: agent.name,
					details: agent.work_title ? [agent.work_title] : undefined,
				});
			}
		}
	}

	return alarms;
}

export async function getDerivedAlarms(townRoot?: string): Promise<AlarmsResponse> {
	const alarms: DerivedAlarm[] = [];

	try {
		// Fetch data in parallel
		const [strandedResult, statusResult, cycleAlarms] = await Promise.all([
			getStrandedConvoys(townRoot).catch(() => [] as StrandedConvoy[]),
			getTownStatus(townRoot).catch(() => ({ initialized: false, status: undefined })),
			checkForCycles(townRoot),
		]);

		// Add stranded convoy alarms
		if (strandedResult.length > 0) {
			alarms.push(...deriveStrandedConvoyAlarms(strandedResult));
		}

		// Add cycle alarms (rework loops)
		alarms.push(...cycleAlarms);

		// If we have status, derive MQ and agent alarms
		if (statusResult.initialized && statusResult.status) {
			const status = statusResult.status;

			// MQ alarms (blocked queue, stale heartbeat)
			alarms.push(...deriveMQAlarms(status.rigs));

			// Agent alarms (stuck polecats)
			alarms.push(...deriveAgentAlarms(status.rigs));
		}
	} catch {
		// Error fetching alarm data - return what we have
	}

	// Calculate summary
	const errors = alarms.filter((a) => a.level === "error").length;
	const warnings = alarms.filter((a) => a.level === "warning").length;

	return {
		alarms,
		summary: {
			total: alarms.length,
			errors,
			warnings,
		},
	};
}
