import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle,
  AlertCircle,
  Users,
  Server,
  Loader2,
  XCircle,
  Clock,
  Mail,
  Zap,
} from "lucide-react";
import { getStatus, getReadyBeads, getBlockedBeads } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { RigStatus, AgentRuntime } from "@/types/api";

export default function Monitoring() {
  const {
    data: statusResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["status"],
    queryFn: getStatus,
    refetchInterval: 5000, // More frequent for monitoring
  });

  const { data: readyBeads } = useQuery({
    queryKey: ["beads", "ready"],
    queryFn: getReadyBeads,
    refetchInterval: 10000,
  });

  const { data: blockedBeads } = useQuery({
    queryKey: ["beads", "blocked"],
    queryFn: getBlockedBeads,
    refetchInterval: 10000,
  });

  const status = statusResponse?.status;
  const agents = status?.agents || [];
  const rigs = status?.rigs || [];
  const summary = status?.summary;

  // Calculate health metrics
  const runningAgents = agents.filter((a) => a.running);
  const agentsWithWork = agents.filter((a) => a.has_work);
  const totalMQPending = rigs.reduce((sum, rig) => sum + (rig.mq?.pending || 0), 0);
  const totalMQBlocked = rigs.reduce((sum, rig) => sum + (rig.mq?.blocked || 0), 0);
  const totalMQInFlight = rigs.reduce(
    (sum, rig) => sum + (rig.mq?.in_flight || 0),
    0
  );

  // Determine overall health
  const hasBlockedWork = totalMQBlocked > 0 || (blockedBeads?.length || 0) > 0;
  const overallHealth = !statusResponse?.initialized
    ? "disconnected"
    : hasBlockedWork
      ? "warning"
      : "healthy";

  if (isLoading) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto text-gt-muted mb-4 animate-spin" size={48} />
          <p className="text-gt-muted">Connecting to Gas Town...</p>
        </div>
      </div>
    );
  }

  if (error || !statusResponse?.initialized) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="mx-auto text-red-400 mb-4" size={48} />
          <h3 className="text-lg font-medium mb-2">Connection Error</h3>
          <p className="text-gt-muted">
            {error?.message || "Unable to connect to Gas Town. Check that GT_TOWN_ROOT is set correctly."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="text-orange-400" size={24} />
            System Monitoring
          </h2>
          <p className="text-sm text-gt-muted mt-1">
            Gas Town health and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-3 h-3 rounded-full",
              overallHealth === "healthy"
                ? "bg-green-400"
                : overallHealth === "warning"
                  ? "bg-yellow-400"
                  : "bg-red-400"
            )}
          />
          <span className="text-sm capitalize">{overallHealth}</span>
        </div>
      </div>

      {/* Overall status banner */}
      <div
        className={cn(
          "rounded-lg p-4 border",
          overallHealth === "healthy"
            ? "bg-green-500/10 border-green-500/30"
            : overallHealth === "warning"
              ? "bg-yellow-500/10 border-yellow-500/30"
              : "bg-red-500/10 border-red-500/30"
        )}
      >
        <div className="flex items-center gap-3">
          {overallHealth === "healthy" ? (
            <CheckCircle className="text-green-400" size={24} />
          ) : overallHealth === "warning" ? (
            <AlertCircle className="text-yellow-400" size={24} />
          ) : (
            <XCircle className="text-red-400" size={24} />
          )}
          <div>
            <div className="font-medium">
              {overallHealth === "healthy"
                ? "All Systems Operational"
                : overallHealth === "warning"
                  ? "Some Issues Detected"
                  : "System Disconnected"}
            </div>
            <div className="text-sm text-gt-muted">
              {status?.name || "Gas Town"} • {status?.location || "Unknown location"}
            </div>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          label="Active Agents"
          value={runningAgents.length}
          total={agents.length}
          color="text-blue-400"
        />
        <MetricCard
          icon={Zap}
          label="Work in Progress"
          value={agentsWithWork.length}
          color="text-yellow-400"
        />
        <MetricCard
          icon={Clock}
          label="Queue Pending"
          value={totalMQPending}
          color="text-orange-400"
        />
        <MetricCard
          icon={AlertCircle}
          label="Blocked"
          value={totalMQBlocked + (blockedBeads?.length || 0)}
          color={totalMQBlocked > 0 ? "text-red-400" : "text-gt-muted"}
        />
      </div>

      {/* Agent status grid */}
      <div>
        <h3 className="text-sm font-semibold text-gt-muted uppercase mb-3">
          Agent Status
        </h3>
        {agents.length === 0 ? (
          <div className="bg-gt-surface border border-gt-border rounded-lg p-6 text-center">
            <Users className="mx-auto text-gt-muted mb-2" size={32} />
            <p className="text-gt-muted">No agents registered</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((agent) => (
              <AgentStatusCard key={agent.name} agent={agent} />
            ))}
          </div>
        )}
      </div>

      {/* Rig health grid */}
      <div>
        <h3 className="text-sm font-semibold text-gt-muted uppercase mb-3">
          Rig Health
        </h3>
        {rigs.length === 0 ? (
          <div className="bg-gt-surface border border-gt-border rounded-lg p-6 text-center">
            <Server className="mx-auto text-gt-muted mb-2" size={32} />
            <p className="text-gt-muted">No rigs configured</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rigs.map((rig) => (
              <RigHealthCard key={rig.name} rig={rig} />
            ))}
          </div>
        )}
      </div>

      {/* Summary stats */}
      {summary && (
        <div>
          <h3 className="text-sm font-semibold text-gt-muted uppercase mb-3">
            Town Summary
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            <SummaryCard label="Rigs" value={summary.rig_count} />
            <SummaryCard label="Polecats" value={summary.polecat_count} />
            <SummaryCard label="Crews" value={summary.crew_count} />
            <SummaryCard label="Witnesses" value={summary.witness_count} />
            <SummaryCard label="Refineries" value={summary.refinery_count} />
            <SummaryCard label="Active Hooks" value={summary.active_hooks} />
          </div>
        </div>
      )}

      {/* Work queue summary */}
      <div>
        <h3 className="text-sm font-semibold text-gt-muted uppercase mb-3">
          Work Queue
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="text-green-400" size={16} />
              <span className="text-sm text-gt-muted">Ready to Work</span>
            </div>
            <div className="text-2xl font-bold">{readyBeads?.length || 0}</div>
            <p className="text-xs text-gt-muted mt-1">Beads with no blockers</p>
          </div>
          <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="text-yellow-400" size={16} />
              <span className="text-sm text-gt-muted">In Flight</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">
              {totalMQInFlight}
            </div>
            <p className="text-xs text-gt-muted mt-1">Currently being processed</p>
          </div>
          <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="text-red-400" size={16} />
              <span className="text-sm text-gt-muted">Blocked</span>
            </div>
            <div className="text-2xl font-bold text-red-400">
              {blockedBeads?.length || 0}
            </div>
            <p className="text-xs text-gt-muted mt-1">Waiting on dependencies</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  total,
  color,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  total?: number;
  color: string;
}) {
  return (
    <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={color} size={16} />
        <span className="text-sm text-gt-muted">{label}</span>
      </div>
      <div className="text-2xl font-bold">
        {value}
        {total !== undefined && (
          <span className="text-sm font-normal text-gt-muted">/{total}</span>
        )}
      </div>
    </div>
  );
}

function AgentStatusCard({ agent }: { agent: AgentRuntime }) {
  const statusColor = agent.running
    ? agent.has_work
      ? "text-yellow-400"
      : "text-green-400"
    : "text-gt-muted";
  const statusBg = agent.running
    ? agent.has_work
      ? "bg-yellow-500/20"
      : "bg-green-500/20"
    : "bg-gt-surface";
  const statusText = agent.running
    ? agent.has_work
      ? "Working"
      : "Idle"
    : "Offline";

  return (
    <div className="bg-gt-surface border border-gt-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm truncate">{agent.name}</span>
        <span className={cn("px-2 py-0.5 text-xs rounded", statusBg, statusColor)}>
          {statusText}
        </span>
      </div>
      <div className="text-xs text-gt-muted space-y-1">
        <div className="flex items-center justify-between">
          <span>Role</span>
          <span className="capitalize">{agent.role}</span>
        </div>
        {agent.has_work && agent.work_title && (
          <div className="truncate text-yellow-400" title={agent.work_title}>
            {agent.work_title}
          </div>
        )}
        {agent.unread_mail > 0 && (
          <div className="flex items-center gap-1 text-blue-400">
            <Mail size={10} />
            {agent.unread_mail} unread
          </div>
        )}
      </div>
    </div>
  );
}

function RigHealthCard({ rig }: { rig: RigStatus }) {
  const mq = rig.mq;
  const health = mq?.health || "unknown";
  const healthColor =
    health === "healthy"
      ? "text-green-400"
      : health === "stale"
        ? "text-yellow-400"
        : "text-gt-muted";
  const healthBg =
    health === "healthy"
      ? "bg-green-500/20"
      : health === "stale"
        ? "bg-yellow-500/20"
        : "bg-gt-surface";

  return (
    <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Server size={16} className="text-blue-400" />
          <span className="font-medium">{rig.name}</span>
        </div>
        <span className={cn("px-2 py-0.5 text-xs rounded capitalize", healthBg, healthColor)}>
          {health}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-gt-muted">
          <span>Polecats</span>
          <span className="text-gt-text">{rig.polecat_count}</span>
        </div>
        <div className="flex items-center justify-between text-gt-muted">
          <span>Crews</span>
          <span className="text-gt-text">{rig.crew_count}</span>
        </div>

        {mq && (
          <>
            <div className="border-t border-gt-border pt-2 mt-2">
              <div className="text-xs text-gt-muted mb-1">Message Queue</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="font-bold">{mq.pending}</div>
                  <div className="text-xs text-gt-muted">Pending</div>
                </div>
                <div>
                  <div className="font-bold text-yellow-400">{mq.in_flight}</div>
                  <div className="text-xs text-gt-muted">Active</div>
                </div>
                <div>
                  <div className="font-bold text-red-400">{mq.blocked}</div>
                  <div className="text-xs text-gt-muted">Blocked</div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex items-center gap-2 text-xs pt-1">
          {rig.has_witness && (
            <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
              Witness
            </span>
          )}
          {rig.has_refinery && (
            <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">
              Refinery
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gt-surface border border-gt-border rounded-lg p-3 text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-gt-muted">{label}</div>
    </div>
  );
}
