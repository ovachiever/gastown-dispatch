// Gas Town types - mirrors Go types from internal/cmd

export interface TownStatus {
	name: string;
	location: string;
	overseer?: OverseerInfo;
	agents: AgentRuntime[];
	rigs: RigStatus[];
	summary: StatusSummary;
}

export interface OverseerInfo {
	name: string;
	email?: string;
	username?: string;
	source: string;
	unread_mail: number;
}

export interface AgentRuntime {
	name: string;
	address: string;
	session: string;
	role: string;
	running: boolean;
	has_work: boolean;
	work_title?: string;
	hook_bead?: string;
	state?: string;
	unread_mail: number;
	first_subject?: string;
}

export interface RigStatus {
	name: string;
	polecats: string[];
	polecat_count: number;
	crews: string[];
	crew_count: number;
	has_witness: boolean;
	has_refinery: boolean;
	hooks?: AgentHookInfo[];
	agents?: AgentRuntime[];
	mq?: MQSummary;
}

export interface AgentHookInfo {
	agent: string;
	role: string;
	has_work: boolean;
	molecule?: string;
	title?: string;
}

export interface MQSummary {
	pending: number;
	in_flight: number;
	blocked: number;
	state: "idle" | "processing" | "blocked";
	health: "healthy" | "stale" | "empty";
}

export interface StatusSummary {
	rig_count: number;
	polecat_count: number;
	crew_count: number;
	witness_count: number;
	refinery_count: number;
	active_hooks: number;
}

// Convoy types
export interface Convoy {
	id: string;
	title: string;
	status: "open" | "closed";
	description?: string;
	created_at: string;
	updated_at?: string;
	tracked_issues?: TrackedIssue[];
	progress?: string;
	completed?: number;
	total?: number;
	// Synthesis-related fields (populated for list view)
	formula?: string;
	molecule?: string;
	synthesis_ready?: boolean;
	is_stranded?: boolean;
}

export interface TrackedIssue {
	id: string;
	title: string;
	status: string;
	assignee?: string;
}

// Enhanced convoy types for detail view
export interface TrackedIssueDetail extends TrackedIssue {
	worker?: string;
	worker_age?: string;
	issue_type?: string;
	created_at?: string;
	dependency_type?: string;
}

export interface WorkerInfo {
	agent: string;
	issue_id: string;
	age: string;
}

export interface ConvoyDetail extends Convoy {
	formula?: string;
	notify?: string;
	molecule?: string;
	workers: WorkerInfo[];
	synthesis_ready: boolean;
	is_stranded: boolean;
	tracked_issues: TrackedIssueDetail[];
}

export interface StrandedConvoy {
	id: string;
	title: string;
	ready_count: number;
	ready_issues: string[];
}

export interface SynthesisStatus {
	convoy_id: string;
	ready: boolean;
	completed: number;
	total: number;
	incomplete_legs: { id: string; title: string; status: string }[];
}

export interface ConvoyCloseRequest {
	reason: string;
}

// Beads (Issue) types
export interface Bead {
	id: string;
	title: string;
	description?: string;
	status: "open" | "in_progress" | "hooked" | "closed";
	type: "bug" | "feature" | "task" | "epic" | "chore" | "convoy" | "agent";
	priority: number;
	assignee?: string;
	labels?: string[];
	parent?: string;
	created_at: string;
	updated_at?: string;
	created_by?: string;
}

export interface BeadFilters {
	status?: string;
	type?: string;
	assignee?: string;
	parent?: string;
	limit?: number;
}

// Agent types
export interface Agent {
	name: string;
	address: string;
	role:
		| "mayor"
		| "deacon"
		| "witness"
		| "refinery"
		| "polecat"
		| "crew"
		| "dog";
	rig?: string;
	session?: string;
	running: boolean;
	state?: "running" | "idle" | "stuck" | "done";
	hook_bead?: string;
	last_activity?: string;
}

// Log types
export type LogSource = "deacon" | "mayor" | "witness" | "refinery" | "polecat";

export interface LogEntry {
	timestamp: string;
	level: "info" | "warn" | "error" | "debug";
	message: string;
	source: LogSource;
	rig?: string;
	agent?: string;
}

// Action types
export interface ActionResult {
	success: boolean;
	message: string;
	data?: unknown;
	error?: string;
}

export interface SlingRequest {
	bead_id: string;
	rig: string;
	formula?: string;
}

export interface ConvoyCreateRequest {
	name: string;
	issues: string[];
	notify?: string;
	molecule?: string;
}

export interface RigAddRequest {
	name: string;
	url: string;
}

export interface CrewAddRequest {
	name: string;
	rig: string;
}

// Dispatch (Mayor chat) types
export interface DispatchMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: string;
	context?: DispatchContext;
	actions?: DispatchAction[];
}

export interface DispatchContext {
	scope: "town" | "rig" | "convoy" | "bead";
	rig?: string;
	convoy_id?: string;
	bead_id?: string;
}

export interface DispatchAction {
	type: string;
	description: string;
	command?: string;
	result?: ActionResult;
	created_id?: string;
}

export interface DispatchSession {
	id: string;
	messages: DispatchMessage[];
	context: DispatchContext;
	created_at: string;
	updated_at: string;
}

// Telemetry Snapshot types - single source of truth for Overview
export interface TownTelemetrySnapshot {
	timestamp: string;
	town_name: string;
	lanes: {
		agents: AgentsLane;
		work: WorkLane;
		convoys: ConvoysLane;
		system: SystemLane;
	};
}

export interface AgentsLane {
	summary: {
		total: number;
		running: number;
		idle: number;
		with_work: number;
	};
	top_items: AgentSnapshot[];
}

export interface AgentSnapshot {
	name: string;
	role: string;
	rig?: string;
	running: boolean;
	state?: string;
	has_work: boolean;
	work_id?: string;
	work_title?: string;
	unread_mail: number;
}

export interface WorkLane {
	summary: {
		ready: number;
		in_progress: number;
		blocked: number;
		total_open: number;
	};
	top_items: WorkItem[];
}

export interface WorkItem {
	id: string;
	title: string;
	status: string;
	type: string;
	priority: number;
	assignee?: string;
	worker?: string;
}

export interface ConvoysLane {
	summary: {
		open: number;
		stranded: number;
		synthesis_ready: number;
	};
	top_items: ConvoySnapshot[];
}

export interface ConvoySnapshot {
	id: string;
	title: string;
	progress: string;
	completed: number;
	total: number;
	is_stranded: boolean;
	synthesis_ready: boolean;
	active_workers: number;
}

export interface SystemLane {
	health: "healthy" | "degraded" | "offline";
	summary: {
		rig_count: number;
		polecat_count: number;
		crew_count: number;
		witness_count: number;
		refinery_count: number;
		active_hooks: number;
	};
	message_queue: {
		pending: number;
		in_flight: number;
		blocked: number;
		state: "idle" | "processing" | "blocked";
	};
	rigs: RigSnapshot[];
}

export interface RigSnapshot {
	name: string;
	polecat_count: number;
	crew_count: number;
	has_witness: boolean;
	has_refinery: boolean;
	mq_state?: "idle" | "processing" | "blocked";
	hooks_active: number;
}

// MR (Merge Request) types for analytics
export type MRStatus =
	| "pending"
	| "in_flight"
	| "in_progress"
	| "merged"
	| "failed"
	| "rejected";

export interface MergeRequest {
	id: string;
	rig: string;
	branch: string;
	issue_id: string;
	issue_title?: string;
	status: MRStatus;
	created_at: string;
	updated_at?: string;
	error?: string;
	retry_count: number;
	blocked_by_count?: number;
}

export interface ReworkLoop {
	issue_id: string;
	issue_title: string;
	rig: string;
	cycle_count: number;
	time_stuck_ms: number;
	time_stuck_display: string;
	first_failure_at: string;
	last_failure_at?: string;
	current_status: MRStatus;
	mr_id: string;
}

export interface ReworkLoopSummary {
	total_loops: number;
	total_time_stuck_ms: number;
	loops: ReworkLoop[];
	worst_offenders: ReworkLoop[];
}

// MQ (Merge Queue) types
export interface MQListFilters {
	status?: "open" | "in_progress" | "closed";
	ready?: boolean;
	worker?: string;
	epic?: string;
}

export interface MRStatusOutput {
	id: string;
	status: MRStatus;
	branch: string;
	created_at: string;
	updated_at?: string;
	error?: string;
}

export interface MQNextOptions {
	strategy?: "priority" | "fifo";
}

// Patrol (Deacon) types
export type DeaconState = "running" | "paused" | "stopped" | "error";
export type BootStatus = "booting" | "ready" | "failed" | "degraded";

export interface DeaconHeartbeat {
	timestamp: string;
	state: DeaconState;
	uptime_ms: number;
	last_patrol?: string;
	error?: string;
}

export interface PatrolPausedState {
	paused: boolean;
	paused_at?: string;
	reason?: string;
}

export interface PatrolStatus {
	heartbeat: DeaconHeartbeat | null;
	boot: BootStatus | null;
	deacon_state: DeaconState | null;
	patrol_muted: boolean;
	patrol_paused: PatrolPausedState | null;
	degraded_mode: boolean;
	operational_mode: "normal" | "degraded" | "offline";
}
