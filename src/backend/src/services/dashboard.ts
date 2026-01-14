import { EventEmitter } from "events";
import { getTownStatus } from "./status.js";
import { getReadyBeads } from "./beads.js";
import type { StreamClient } from "./streaming.js";

export interface DashboardMetrics {
	timestamp: string;
	agent_status: {
		total: number;
		running: number;
		idle: number;
		with_work: number;
		agents: Array<{
			name: string;
			role: string;
			running: boolean;
			has_work: boolean;
			work_title?: string;
			state?: string;
		}>;
	};
	work_activity: {
		ready_count: number;
		in_progress_count: number;
		recent_beads: Array<{
			id: string;
			title: string;
			status: string;
			assignee?: string;
			updated_at?: string;
		}>;
	};
	system_health: {
		status: "healthy" | "degraded" | "offline";
		rig_count: number;
		polecat_count: number;
		active_hooks: number;
		message_queue?: {
			pending: number;
			in_flight: number;
			state: string;
		};
	};
	recent_events: Array<{
		timestamp: string;
		type: string;
		message: string;
		severity: "info" | "warning" | "error";
	}>;
}

class DashboardStreamer extends EventEmitter {
	private clients: Map<string, StreamClient> = new Map();
	private pollInterval: NodeJS.Timeout | null = null;
	private townRoot: string | undefined;
	private lastMetrics: DashboardMetrics | null = null;
	private eventLog: Array<{
		timestamp: string;
		type: string;
		message: string;
		severity: "info" | "warning" | "error";
	}> = [];
	private maxEventLogSize = 20;

	addClient(client: StreamClient, townRoot?: string): void {
		this.clients.set(client.id, client);
		this.townRoot = townRoot;

		// Send initial metrics if available
		if (this.lastMetrics) {
			client.send("metrics", this.lastMetrics);
		}

		// Start polling when first client connects
		if (this.clients.size === 1) {
			this.startPolling();
		}
	}

	removeClient(id: string): void {
		this.clients.delete(id);

		// Stop polling when no clients
		if (this.clients.size === 0) {
			this.stopPolling();
		}
	}

	private startPolling(): void {
		if (this.pollInterval) return;

		// Initial poll
		this.pollMetrics();

		// Poll every 3 seconds (within the 2-5 second requirement)
		this.pollInterval = setInterval(() => {
			this.pollMetrics();
		}, 3000);
	}

	private stopPolling(): void {
		if (this.pollInterval) {
			clearInterval(this.pollInterval);
			this.pollInterval = null;
		}
	}

	private async pollMetrics(): Promise<void> {
		try {
			const metrics = await this.collectMetrics();
			this.lastMetrics = metrics;

			// Detect changes and add events
			this.detectChanges(metrics);

			// Broadcast to all clients
			this.broadcast("metrics", metrics);
		} catch (err) {
			console.error("Dashboard metrics poll error:", err);
			this.addEvent(
				"error",
				"Failed to collect dashboard metrics",
				"error",
			);
		}
	}

	private async collectMetrics(): Promise<DashboardMetrics> {
		const timestamp = new Date().toISOString();

		// Collect data in parallel
		const [statusResponse, readyBeads] = await Promise.all([
			getTownStatus(this.townRoot),
			getReadyBeads(this.townRoot).catch(() => []),
		]);

		const status = statusResponse.status;

		// Calculate agent status
		const agents = status?.agents || [];
		const agentStatus = {
			total: agents.length,
			running: agents.filter((a) => a.running).length,
			idle: agents.filter((a) => a.running && !a.has_work).length,
			with_work: agents.filter((a) => a.has_work).length,
			agents: agents.map((a) => ({
				name: a.name,
				role: a.role,
				running: a.running,
				has_work: a.has_work,
				work_title: a.work_title,
				state: a.state,
			})),
		};

		// Work activity - combine ready beads with in-progress info from agents
		const inProgressBeads = agents
			.filter((a) => a.has_work && a.hook_bead)
			.map((a) => ({
				id: a.hook_bead || "",
				title: a.work_title || "Unknown",
				status: "in_progress",
				assignee: a.name,
				updated_at: new Date().toISOString(),
			}));

		const recentReadyBeads = readyBeads.slice(0, 10).map((b) => ({
			id: b.id,
			title: b.title,
			status: b.status,
			assignee: b.assignee,
			updated_at: b.updated_at,
		}));

		const workActivity = {
			ready_count: readyBeads.length,
			in_progress_count: inProgressBeads.length,
			recent_beads: [...inProgressBeads, ...recentReadyBeads].slice(0, 10),
		};

		// System health
		const summary = status?.summary;
		const rigs = status?.rigs || [];
		const mqSummaries = rigs.map((r) => r.mq).filter((mq) => mq !== undefined);
		const totalPending = mqSummaries.reduce((sum, mq) => sum + (mq?.pending || 0), 0);
		const totalInFlight = mqSummaries.reduce((sum, mq) => sum + (mq?.in_flight || 0), 0);
		const hasBlockedMQ = mqSummaries.some((mq) => mq?.state === "blocked");

		const systemHealth = {
			status: (!statusResponse.initialized
				? "offline"
				: hasBlockedMQ
					? "degraded"
					: "healthy") as "healthy" | "degraded" | "offline",
			rig_count: summary?.rig_count || 0,
			polecat_count: summary?.polecat_count || 0,
			active_hooks: summary?.active_hooks || 0,
			message_queue: {
				pending: totalPending,
				in_flight: totalInFlight,
				state: hasBlockedMQ ? "blocked" : totalInFlight > 0 ? "processing" : "idle",
			},
		};

		return {
			timestamp,
			agent_status: agentStatus,
			work_activity: workActivity,
			system_health: systemHealth,
			recent_events: [...this.eventLog].slice(-10),
		};
	}

	private detectChanges(current: DashboardMetrics): void {
		if (!this.lastMetrics) return;

		const prev = this.lastMetrics;

		// Detect agent state changes
		for (const agent of current.agent_status.agents) {
			const prevAgent = prev.agent_status.agents.find((a) => a.name === agent.name);

			if (!prevAgent) {
				this.addEvent(
					"agent",
					`Agent ${agent.name} (${agent.role}) joined`,
					"info",
				);
			} else if (prevAgent.running !== agent.running) {
				if (agent.running) {
					this.addEvent(
						"agent",
						`Agent ${agent.name} started`,
						"info",
					);
				} else {
					this.addEvent(
						"agent",
						`Agent ${agent.name} stopped`,
						"warning",
					);
				}
			} else if (!prevAgent.has_work && agent.has_work) {
				this.addEvent(
					"work",
					`${agent.name} started: ${agent.work_title || "work"}`,
					"info",
				);
			} else if (prevAgent.has_work && !agent.has_work) {
				this.addEvent(
					"work",
					`${agent.name} completed work`,
					"info",
				);
			}
		}

		// Detect system health changes
		if (prev.system_health.status !== current.system_health.status) {
			const severity = current.system_health.status === "healthy" ? "info" : current.system_health.status === "degraded" ? "warning" : "error";
			this.addEvent(
				"system",
				`System status: ${current.system_health.status}`,
				severity,
			);
		}

		// Detect work queue changes (significant)
		const readyDiff = current.work_activity.ready_count - prev.work_activity.ready_count;
		if (Math.abs(readyDiff) >= 5) {
			this.addEvent(
				"work",
				`Work queue ${readyDiff > 0 ? "increased" : "decreased"} by ${Math.abs(readyDiff)}`,
				readyDiff > 10 ? "warning" : "info",
			);
		}
	}

	private addEvent(
		type: string,
		message: string,
		severity: "info" | "warning" | "error",
	): void {
		const event = {
			timestamp: new Date().toISOString(),
			type,
			message,
			severity,
		};

		this.eventLog.push(event);

		// Trim to max size
		if (this.eventLog.length > this.maxEventLogSize) {
			this.eventLog.shift();
		}

		// Broadcast event separately
		this.broadcast("event", event);
	}

	private broadcast(event: string, data: unknown): void {
		for (const client of this.clients.values()) {
			client.send(event, data);
		}
		this.emit(event, data);
	}

	hasClients(): boolean {
		return this.clients.size > 0;
	}
}

// Singleton instance
export const dashboardStreamer = new DashboardStreamer();
