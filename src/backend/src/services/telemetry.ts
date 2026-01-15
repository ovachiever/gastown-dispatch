import { EventEmitter } from "events";
import { getTownStatus } from "./status.js";
import { getReadyBeads, getBlockedBeads } from "./beads.js";
import type { StreamClient } from "./streaming.js";
import type { TownStatus, AgentRuntime, RigStatus } from "../types/gasown.js";

// Message types for the telemetry stream
export interface TelemetrySnapshot {
	type: "snapshot";
	timestamp: string;
	agents: {
		total: number;
		running: number;
		idle: number;
		with_work: number;
		stuck: number;
		items: AgentTelemetry[];
	};
	rigs: {
		total: number;
		healthy: number;
		degraded: number;
		items: RigTelemetry[];
	};
	work: {
		ready: number;
		blocked: number;
		in_progress: number;
	};
	system: {
		status: "healthy" | "degraded" | "offline";
		message_queue: {
			pending: number;
			in_flight: number;
		};
	};
}

export interface AgentTelemetry {
	name: string;
	role: string;
	rig?: string;
	running: boolean;
	has_work: boolean;
	work_id?: string;
	work_title?: string;
	state?: string;
}

export interface RigTelemetry {
	name: string;
	polecat_count: number;
	crew_count: number;
	has_witness: boolean;
	has_refinery: boolean;
	mq_pending: number;
	mq_in_flight: number;
	mq_state: string;
	mq_health: string;
}

export interface TelemetryEvent {
	type: "event";
	timestamp: string;
	category: "agent" | "work" | "system" | "rig";
	event_type: string;
	message: string;
	data?: Record<string, unknown>;
}

export interface TelemetryAlert {
	type: "alert";
	timestamp: string;
	severity: "warning" | "critical";
	category: "agent" | "work" | "system" | "rig";
	code: string;
	message: string;
	data?: Record<string, unknown>;
}

type TelemetryMessage = TelemetrySnapshot | TelemetryEvent | TelemetryAlert;

class TelemetryStreamer extends EventEmitter {
	private clients: Map<string, StreamClient> = new Map();
	private pollInterval: NodeJS.Timeout | null = null;
	private townRoot: string | undefined;
	private lastSnapshot: TelemetrySnapshot | null = null;
	private previousStatus: TownStatus | null = null;
	private alertState: Map<string, number> = new Map(); // Track alert timestamps to avoid spam

	addClient(client: StreamClient, townRoot?: string): void {
		this.clients.set(client.id, client);
		this.townRoot = townRoot;

		// Send initial snapshot if available
		if (this.lastSnapshot) {
			client.send("snapshot", this.lastSnapshot);
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
		this.poll();

		// Poll every 5 seconds for snapshots
		this.pollInterval = setInterval(() => {
			this.poll();
		}, 5000);
	}

	private stopPolling(): void {
		if (this.pollInterval) {
			clearInterval(this.pollInterval);
			this.pollInterval = null;
		}
		this.previousStatus = null;
		this.alertState.clear();
	}

	private async poll(): Promise<void> {
		try {
			const [statusResponse, readyBeads, blockedBeads] = await Promise.all([
				getTownStatus(this.townRoot),
				getReadyBeads(this.townRoot).catch(() => []),
				getBlockedBeads(this.townRoot).catch(() => []),
			]);

			const status = statusResponse.status;

			// Build and broadcast snapshot
			const snapshot = this.buildSnapshot(
				status,
				statusResponse.initialized,
				readyBeads.length,
				blockedBeads.length,
			);
			this.lastSnapshot = snapshot;
			this.broadcast("snapshot", snapshot);

			// Detect changes and emit events
			if (status && this.previousStatus) {
				this.detectChanges(this.previousStatus, status);
			}

			// Check for alert conditions
			this.checkAlerts(snapshot, status);

			// Update previous status for next comparison
			this.previousStatus = status || null;
		} catch (err) {
			console.error("Telemetry poll error:", err);
			this.emitEvent("system", "error", "Failed to collect telemetry", {
				error: err instanceof Error ? err.message : String(err),
			});
		}
	}

	private buildSnapshot(
		status: TownStatus | undefined,
		initialized: boolean,
		readyCount: number,
		blockedCount: number,
	): TelemetrySnapshot {
		const timestamp = new Date().toISOString();
		const agents = status?.agents || [];
		const rigs = status?.rigs || [];

		// Calculate agent metrics
		const runningAgents = agents.filter((a) => a.running);
		const idleAgents = runningAgents.filter((a) => !a.has_work);
		const withWork = agents.filter((a) => a.has_work);
		const stuckAgents = agents.filter((a) => a.state === "stuck");

		// Calculate rig metrics
		const mqSummaries = rigs.map((r) => r.mq).filter((mq) => mq !== undefined);
		const totalPending = mqSummaries.reduce((sum, mq) => sum + (mq?.pending || 0), 0);
		const totalInFlight = mqSummaries.reduce((sum, mq) => sum + (mq?.in_flight || 0), 0);
		const healthyRigs = rigs.filter((r) => !r.mq || r.mq.health === "healthy").length;
		const degradedRigs = rigs.filter((r) => r.mq?.health === "stale" || r.mq?.state === "blocked").length;

		// Determine system status
		let systemStatus: "healthy" | "degraded" | "offline" = "healthy";
		if (!initialized) {
			systemStatus = "offline";
		} else if (degradedRigs > 0 || stuckAgents.length > 0) {
			systemStatus = "degraded";
		}

		return {
			type: "snapshot",
			timestamp,
			agents: {
				total: agents.length,
				running: runningAgents.length,
				idle: idleAgents.length,
				with_work: withWork.length,
				stuck: stuckAgents.length,
				items: agents.map((a) => this.mapAgentTelemetry(a, rigs)),
			},
			rigs: {
				total: rigs.length,
				healthy: healthyRigs,
				degraded: degradedRigs,
				items: rigs.map((r) => this.mapRigTelemetry(r)),
			},
			work: {
				ready: readyCount,
				blocked: blockedCount,
				in_progress: withWork.length,
			},
			system: {
				status: systemStatus,
				message_queue: {
					pending: totalPending,
					in_flight: totalInFlight,
				},
			},
		};
	}

	private mapAgentTelemetry(agent: AgentRuntime, rigs: RigStatus[]): AgentTelemetry {
		// Find which rig this agent belongs to
		const rig = rigs.find((r) =>
			r.agents?.some((a) => a.name === agent.name) ||
			r.hooks?.some((h) => h.agent === agent.name)
		);

		return {
			name: agent.name,
			role: agent.role,
			rig: rig?.name,
			running: agent.running,
			has_work: agent.has_work,
			work_id: agent.hook_bead,
			work_title: agent.work_title,
			state: agent.state,
		};
	}

	private mapRigTelemetry(rig: RigStatus): RigTelemetry {
		return {
			name: rig.name,
			polecat_count: rig.polecat_count,
			crew_count: rig.crew_count,
			has_witness: rig.has_witness,
			has_refinery: rig.has_refinery,
			mq_pending: rig.mq?.pending || 0,
			mq_in_flight: rig.mq?.in_flight || 0,
			mq_state: rig.mq?.state || "idle",
			mq_health: rig.mq?.health || "healthy",
		};
	}

	private detectChanges(prev: TownStatus, curr: TownStatus): void {
		// Detect agent changes
		for (const agent of curr.agents) {
			const prevAgent = prev.agents.find((a) => a.name === agent.name);

			if (!prevAgent) {
				this.emitEvent("agent", "joined", `Agent ${agent.name} joined`, {
					agent: agent.name,
					role: agent.role,
				});
			} else if (prevAgent.running !== agent.running) {
				this.emitEvent(
					"agent",
					agent.running ? "started" : "stopped",
					`Agent ${agent.name} ${agent.running ? "started" : "stopped"}`,
					{ agent: agent.name },
				);
			} else if (!prevAgent.has_work && agent.has_work) {
				this.emitEvent("work", "started", `${agent.name} started work: ${agent.work_title || agent.hook_bead}`, {
					agent: agent.name,
					bead_id: agent.hook_bead,
					title: agent.work_title,
				});
			} else if (prevAgent.has_work && !agent.has_work) {
				this.emitEvent("work", "completed", `${agent.name} completed work`, {
					agent: agent.name,
					bead_id: prevAgent.hook_bead,
				});
			} else if (prevAgent.state !== agent.state && agent.state) {
				this.emitEvent("agent", "state_changed", `${agent.name} state: ${agent.state}`, {
					agent: agent.name,
					old_state: prevAgent.state,
					new_state: agent.state,
				});
			}
		}

		// Detect agents that left
		for (const prevAgent of prev.agents) {
			if (!curr.agents.find((a) => a.name === prevAgent.name)) {
				this.emitEvent("agent", "left", `Agent ${prevAgent.name} left`, {
					agent: prevAgent.name,
				});
			}
		}

		// Detect rig changes
		for (const rig of curr.rigs) {
			const prevRig = prev.rigs.find((r) => r.name === rig.name);
			if (!prevRig) {
				this.emitEvent("rig", "added", `Rig ${rig.name} added`, { rig: rig.name });
			} else if (prevRig.mq?.state !== rig.mq?.state && rig.mq?.state === "blocked") {
				this.emitEvent("rig", "blocked", `Rig ${rig.name} message queue blocked`, {
					rig: rig.name,
				});
			}
		}
	}

	private checkAlerts(snapshot: TelemetrySnapshot, _status?: TownStatus): void {
		const now = Date.now();
		const ALERT_COOLDOWN = 60_000; // 1 minute cooldown per alert type

		// Helper to emit alert with cooldown
		const maybeAlert = (
			code: string,
			severity: "warning" | "critical",
			category: TelemetryAlert["category"],
			message: string,
			data?: Record<string, unknown>,
		) => {
			const lastEmit = this.alertState.get(code) || 0;
			if (now - lastEmit > ALERT_COOLDOWN) {
				this.emitAlert(severity, category, code, message, data);
				this.alertState.set(code, now);
			}
		};

		// System offline
		if (snapshot.system.status === "offline") {
			maybeAlert("system_offline", "critical", "system", "Gas Town is not initialized");
		}

		// Stuck agents
		if (snapshot.agents.stuck > 0) {
			const stuckNames = snapshot.agents.items
				.filter((a) => a.state === "stuck")
				.map((a) => a.name);
			maybeAlert("agents_stuck", "warning", "agent", `${snapshot.agents.stuck} agent(s) stuck: ${stuckNames.join(", ")}`, {
				agents: stuckNames,
			});
		}

		// High message queue depth
		if (snapshot.system.message_queue.pending > 50) {
			maybeAlert("mq_backlog", "warning", "system", `High message queue backlog: ${snapshot.system.message_queue.pending} pending`, {
				pending: snapshot.system.message_queue.pending,
			});
		}

		// Degraded rigs
		if (snapshot.rigs.degraded > 0) {
			const degradedNames = snapshot.rigs.items
				.filter((r) => r.mq_health === "stale" || r.mq_state === "blocked")
				.map((r) => r.name);
			maybeAlert("rigs_degraded", "warning", "rig", `${snapshot.rigs.degraded} rig(s) degraded: ${degradedNames.join(", ")}`, {
				rigs: degradedNames,
			});
		}

		// Large work backlog
		if (snapshot.work.ready > 100) {
			maybeAlert("work_backlog", "warning", "work", `Large work backlog: ${snapshot.work.ready} items ready`, {
				ready: snapshot.work.ready,
			});
		}

		// No running agents when there's work
		if (snapshot.agents.running === 0 && snapshot.work.ready > 0) {
			maybeAlert("no_agents", "critical", "agent", `No running agents but ${snapshot.work.ready} work items ready`, {
				ready: snapshot.work.ready,
			});
		}

		// Clear alerts that no longer apply
		if (snapshot.system.status !== "offline") {
			this.alertState.delete("system_offline");
		}
		if (snapshot.agents.stuck === 0) {
			this.alertState.delete("agents_stuck");
		}
		if (snapshot.system.message_queue.pending <= 50) {
			this.alertState.delete("mq_backlog");
		}
		if (snapshot.rigs.degraded === 0) {
			this.alertState.delete("rigs_degraded");
		}
		if (snapshot.work.ready <= 100) {
			this.alertState.delete("work_backlog");
		}
		if (snapshot.agents.running > 0 || snapshot.work.ready === 0) {
			this.alertState.delete("no_agents");
		}
	}

	private emitEvent(
		category: TelemetryEvent["category"],
		event_type: string,
		message: string,
		data?: Record<string, unknown>,
	): void {
		const event: TelemetryEvent = {
			type: "event",
			timestamp: new Date().toISOString(),
			category,
			event_type,
			message,
			data,
		};
		this.broadcast("event", event);
		this.emit("event", event);
	}

	private emitAlert(
		severity: TelemetryAlert["severity"],
		category: TelemetryAlert["category"],
		code: string,
		message: string,
		data?: Record<string, unknown>,
	): void {
		const alert: TelemetryAlert = {
			type: "alert",
			timestamp: new Date().toISOString(),
			severity,
			category,
			code,
			message,
			data,
		};
		this.broadcast("alert", alert);
		this.emit("alert", alert);
	}

	private broadcast(event: string, data: TelemetryMessage): void {
		for (const client of this.clients.values()) {
			client.send(event, data);
		}
	}

	hasClients(): boolean {
		return this.clients.size > 0;
	}

	getLastSnapshot(): TelemetrySnapshot | null {
		return this.lastSnapshot;
	}
}

// Singleton instance
export const telemetryStreamer = new TelemetryStreamer();
