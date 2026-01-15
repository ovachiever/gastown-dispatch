// API Types - mirrors backend types

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

export interface ActionResult {
	success: boolean;
	message: string;
	data?: unknown;
	error?: string;
}

export interface StatusResponse {
	initialized: boolean;
	status?: TownStatus;
	error?: string;
}

export interface BeadFilters {
	status?: string;
	type?: string;
	assignee?: string;
	parent?: string;
	limit?: number;
}

// Merge Queue types
export interface MergeRequest {
	id: string;
	title: string;
	description?: string;
	status: string;
	priority: number;
	issue_type: string;
	created_at: string;
	updated_at: string;
	closed_at?: string;
	assignee?: string;
	blocked_by?: string[];
	blocked_by_count?: number;
	labels?: string[];
}

export interface MRStatusOutput {
	id: string;
	title: string;
	status: string;
	priority: number;
	type: string;
	assignee?: string;
	created_at: string;
	updated_at: string;
	closed_at?: string;
	branch?: string;
	target?: string;
	source_issue?: string;
	worker?: string;
	rig?: string;
	merge_commit?: string;
	close_reason?: string;
	depends_on?: MRDependencyInfo[];
	blocks?: MRDependencyInfo[];
}

export interface MRDependencyInfo {
	id: string;
	title: string;
	status: string;
	priority: number;
	type: string;
}

export interface MQListFilters {
	status?: string;
	worker?: string;
	epic?: string;
	ready?: boolean;
}

export interface MQNextOptions {
	strategy?: "priority" | "fifo";
}

export interface MQSummaryResponse {
	total: number;
	ready: number;
	blocked: number;
	in_progress: number;
	items: MergeRequest[];
}
