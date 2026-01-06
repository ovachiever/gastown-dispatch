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
}

export interface TrackedIssue {
  id: string;
  title: string;
  status: string;
  assignee?: string;
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
  role: "mayor" | "deacon" | "witness" | "refinery" | "polecat" | "crew" | "dog";
  rig?: string;
  session?: string;
  running: boolean;
  state?: "running" | "idle" | "stuck" | "done";
  hook_bead?: string;
  last_activity?: string;
}

// Log types
export type LogSource =
  | "deacon"
  | "mayor"
  | "witness"
  | "refinery"
  | "polecat";

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
