import { getTownStatus } from "./status.js";
import { getReadyBeads, getBlockedBeads, listBeads } from "./beads.js";
import { listConvoys, getStrandedConvoys } from "./convoys.js";
import type {
	TownTelemetrySnapshot,
	AgentsLane,
	AgentSnapshot,
	WorkLane,
	WorkItem,
	ConvoysLane,
	ConvoySnapshot,
	SystemLane,
	RigSnapshot,
	BeadFilters,
} from "../types/gasown.js";

const TOP_ITEMS_LIMIT = 10;

export async function getTelemetrySnapshot(
	townRoot?: string,
): Promise<TownTelemetrySnapshot> {
	const timestamp = new Date().toISOString();

	// Collect all data in parallel for efficiency
	const [statusResponse, readyBeads, blockedBeads, inProgressBeads, openConvoys, strandedConvoys] =
		await Promise.all([
			getTownStatus(townRoot),
			getReadyBeads(townRoot).catch(() => []),
			getBlockedBeads(townRoot).catch(() => []),
			listBeads({ status: "in_progress" } as BeadFilters, townRoot).catch(() => []),
			listConvoys("open", townRoot).catch(() => []),
			getStrandedConvoys(townRoot).catch(() => []),
		]);

	const status = statusResponse.status;
	const townName = status?.name || "Unknown";

	// Build agents lane
	const agentsLane = buildAgentsLane(status?.agents || []);

	// Build work lane
	const workLane = buildWorkLane(readyBeads, inProgressBeads, blockedBeads, status?.agents || []);

	// Build convoys lane
	const convoysLane = buildConvoysLane(openConvoys, strandedConvoys);

	// Build system lane
	const systemLane = buildSystemLane(status, statusResponse.initialized);

	return {
		timestamp,
		town_name: townName,
		lanes: {
			agents: agentsLane,
			work: workLane,
			convoys: convoysLane,
			system: systemLane,
		},
	};
}

function buildAgentsLane(
	agents: Array<{
		name: string;
		role: string;
		running: boolean;
		has_work: boolean;
		work_title?: string;
		hook_bead?: string;
		state?: string;
		unread_mail: number;
		address?: string;
	}>,
): AgentsLane {
	const running = agents.filter((a) => a.running);
	const idle = running.filter((a) => !a.has_work);
	const withWork = agents.filter((a) => a.has_work);

	// Sort by: has_work (desc), running (desc), then by name
	const sortedAgents = [...agents].sort((a, b) => {
		if (a.has_work !== b.has_work) return b.has_work ? 1 : -1;
		if (a.running !== b.running) return b.running ? 1 : -1;
		return a.name.localeCompare(b.name);
	});

	const topItems: AgentSnapshot[] = sortedAgents.slice(0, TOP_ITEMS_LIMIT).map((a) => {
		// Extract rig from address (format: rig/role/name)
		const rigMatch = a.address?.match(/^([^/]+)\//);
		return {
			name: a.name,
			role: a.role,
			rig: rigMatch?.[1],
			running: a.running,
			state: a.state,
			has_work: a.has_work,
			work_id: a.hook_bead,
			work_title: a.work_title,
			unread_mail: a.unread_mail,
		};
	});

	return {
		summary: {
			total: agents.length,
			running: running.length,
			idle: idle.length,
			with_work: withWork.length,
		},
		top_items: topItems,
	};
}

function buildWorkLane(
	readyBeads: Array<{ id: string; title: string; status: string; type: string; priority: number; assignee?: string }>,
	inProgressBeads: Array<{ id: string; title: string; status: string; type: string; priority: number; assignee?: string }>,
	blockedBeads: Array<{ id: string; title: string; status: string; type: string; priority: number; assignee?: string }>,
	agents: Array<{ has_work: boolean; hook_bead?: string; name: string }>,
): WorkLane {
	// Build a map of bead -> worker
	const beadToWorker = new Map<string, string>();
	for (const agent of agents) {
		if (agent.has_work && agent.hook_bead) {
			beadToWorker.set(agent.hook_bead, agent.name);
		}
	}

	// Combine and sort beads by priority (lower = higher priority)
	const allOpenBeads = [...inProgressBeads, ...readyBeads];
	const sortedBeads = allOpenBeads.sort((a, b) => {
		// In-progress first, then by priority
		if (a.status !== b.status) {
			if (a.status === "in_progress" || a.status === "hooked") return -1;
			if (b.status === "in_progress" || b.status === "hooked") return 1;
		}
		return a.priority - b.priority;
	});

	const topItems: WorkItem[] = sortedBeads.slice(0, TOP_ITEMS_LIMIT).map((b) => ({
		id: b.id,
		title: b.title,
		status: b.status,
		type: b.type,
		priority: b.priority,
		assignee: b.assignee,
		worker: beadToWorker.get(b.id),
	}));

	return {
		summary: {
			ready: readyBeads.length,
			in_progress: inProgressBeads.length,
			blocked: blockedBeads.length,
			total_open: readyBeads.length + inProgressBeads.length,
		},
		top_items: topItems,
	};
}

function buildConvoysLane(
	openConvoys: Array<{
		id: string;
		title: string;
		progress?: string;
		completed?: number;
		total?: number;
		tracked_issues?: Array<{ id: string; title: string; status: string; assignee?: string }>;
	}>,
	strandedConvoys: Array<{ id: string }>,
): ConvoysLane {
	const strandedIds = new Set(strandedConvoys.map((c) => c.id));

	// Calculate synthesis ready (all issues closed)
	const synthesisReadyCount = openConvoys.filter(
		(c) => c.total && c.total > 0 && c.completed === c.total,
	).length;

	const topItems: ConvoySnapshot[] = openConvoys.slice(0, TOP_ITEMS_LIMIT).map((c) => {
		const isStranded = strandedIds.has(c.id);
		const synthesisReady = c.total ? c.completed === c.total : false;
		// Worker info requires detailed convoy lookup - count assigned issues as proxy
		const activeWorkers = c.tracked_issues?.filter((i) => i.assignee).length || 0;

		return {
			id: c.id,
			title: c.title,
			progress: c.progress || `${c.completed || 0}/${c.total || 0}`,
			completed: c.completed || 0,
			total: c.total || 0,
			is_stranded: isStranded,
			synthesis_ready: synthesisReady,
			active_workers: activeWorkers,
		};
	});

	return {
		summary: {
			open: openConvoys.length,
			stranded: strandedConvoys.length,
			synthesis_ready: synthesisReadyCount,
		},
		top_items: topItems,
	};
}

function buildSystemLane(
	status: {
		summary?: {
			rig_count: number;
			polecat_count: number;
			crew_count: number;
			witness_count: number;
			refinery_count: number;
			active_hooks: number;
		};
		rigs?: Array<{
			name: string;
			polecat_count: number;
			crew_count: number;
			has_witness: boolean;
			has_refinery: boolean;
			hooks?: Array<{ has_work: boolean }>;
			mq?: {
				pending: number;
				in_flight: number;
				blocked: number;
				state: "idle" | "processing" | "blocked";
			};
		}>;
	} | undefined,
	initialized: boolean,
): SystemLane {
	const summary = status?.summary;
	const rigs = status?.rigs || [];

	// Aggregate MQ stats
	const totalPending = rigs.reduce((sum, r) => sum + (r.mq?.pending || 0), 0);
	const totalInFlight = rigs.reduce((sum, r) => sum + (r.mq?.in_flight || 0), 0);
	const totalBlocked = rigs.reduce((sum, r) => sum + (r.mq?.blocked || 0), 0);
	const hasBlockedMQ = rigs.some((r) => r.mq?.state === "blocked");

	// Determine overall health
	let health: "healthy" | "degraded" | "offline" = "healthy";
	if (!initialized) {
		health = "offline";
	} else if (hasBlockedMQ || totalBlocked > 0) {
		health = "degraded";
	}

	// Determine MQ state
	let mqState: "idle" | "processing" | "blocked" = "idle";
	if (hasBlockedMQ) {
		mqState = "blocked";
	} else if (totalInFlight > 0) {
		mqState = "processing";
	}

	const rigSnapshots: RigSnapshot[] = rigs.map((r) => ({
		name: r.name,
		polecat_count: r.polecat_count,
		crew_count: r.crew_count,
		has_witness: r.has_witness,
		has_refinery: r.has_refinery,
		mq_state: r.mq?.state,
		hooks_active: r.hooks?.filter((h) => h.has_work).length || 0,
	}));

	return {
		health,
		summary: {
			rig_count: summary?.rig_count || 0,
			polecat_count: summary?.polecat_count || 0,
			crew_count: summary?.crew_count || 0,
			witness_count: summary?.witness_count || 0,
			refinery_count: summary?.refinery_count || 0,
			active_hooks: summary?.active_hooks || 0,
		},
		message_queue: {
			pending: totalPending,
			in_flight: totalInFlight,
			blocked: totalBlocked,
			state: mqState,
		},
		rigs: rigSnapshots,
	};
}
