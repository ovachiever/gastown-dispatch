import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle,
  Server,
  Users,
  Zap,
  AlertTriangle,
  Radio,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { getStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { RigStatus, AgentRuntime } from "@/types/api";

function StatusBadge({ healthy, label }: { healthy: boolean; label: string }) {
  return (
    <span
      className={cn(
        "px-2 py-0.5 text-xs rounded-full font-medium",
        healthy
          ? "bg-green-500/20 text-green-400"
          : "bg-red-500/20 text-red-400"
      )}
    >
      {label}
    </span>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtext,
  status,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  status?: "healthy" | "warning" | "error";
}) {
  const statusColors = {
    healthy: "text-green-400",
    warning: "text-yellow-400",
    error: "text-red-400",
  };

  return (
    <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon
            size={16}
            className={status ? statusColors[status] : "text-orange-400"}
          />
          <span className="text-sm text-gt-muted">{label}</span>
        </div>
        {status && (
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              status === "healthy" && "bg-green-400",
              status === "warning" && "bg-yellow-400 animate-pulse",
              status === "error" && "bg-red-400 animate-pulse"
            )}
          />
        )}
      </div>
      <div className="text-2xl font-bold text-gt-accent">{value}</div>
      {subtext && <div className="text-xs text-gt-muted mt-1">{subtext}</div>}
    </div>
  );
}

function RigHealthCard({ rig }: { rig: RigStatus }) {
  const rigAgents = rig.agents || [];
  const runningAgents = rigAgents.filter((a) => a.running).length;
  const totalAgents = rigAgents.length;
  const workingAgents = rigAgents.filter((a) => a.has_work).length;
  const isActive = rig.polecat_count > 0 || rig.crew_count > 0;

  const healthStatus = !isActive
    ? "idle"
    : runningAgents === 0
      ? "error"
      : runningAgents < totalAgents
        ? "warning"
        : "healthy";

  return (
    <div
      className={cn(
        "bg-gt-surface border rounded-lg p-4 transition-all",
        healthStatus === "healthy" && "border-green-500/50",
        healthStatus === "warning" && "border-yellow-500/50",
        healthStatus === "error" && "border-red-500/50",
        healthStatus === "idle" && "border-gt-border opacity-60"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Server
            size={16}
            className={cn(
              healthStatus === "healthy" && "text-green-400",
              healthStatus === "warning" && "text-yellow-400",
              healthStatus === "error" && "text-red-400",
              healthStatus === "idle" && "text-gt-muted"
            )}
          />
          <span className="font-medium">{rig.name}</span>
        </div>
        <StatusBadge
          healthy={healthStatus === "healthy" || healthStatus === "idle"}
          label={healthStatus === "idle" ? "Idle" : healthStatus === "healthy" ? "Healthy" : healthStatus === "warning" ? "Degraded" : "Down"}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <div className="text-lg font-mono font-bold text-gt-accent">
            {runningAgents}/{totalAgents}
          </div>
          <div className="text-gt-muted">Running</div>
        </div>
        <div>
          <div className="text-lg font-mono font-bold text-blue-400">
            {workingAgents}
          </div>
          <div className="text-gt-muted">Working</div>
        </div>
        <div>
          <div className="text-lg font-mono font-bold text-purple-400">
            {rig.polecat_count + rig.crew_count}
          </div>
          <div className="text-gt-muted">Workers</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gt-border">
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded",
            rig.has_witness
              ? "bg-green-900/50 text-green-400"
              : "bg-gt-bg text-gt-muted"
          )}
        >
          WITNESS
        </span>
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded",
            rig.has_refinery
              ? "bg-purple-900/50 text-purple-400"
              : "bg-gt-bg text-gt-muted"
          )}
        >
          REFINERY
        </span>
      </div>
    </div>
  );
}

function AgentHealthRow({ agent }: { agent: AgentRuntime }) {
  const isHealthy = agent.running;
  const hasWork = agent.has_work;

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-gt-bg rounded">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            isHealthy ? "bg-green-400" : "bg-red-400"
          )}
        />
        <span className="font-mono text-sm">{agent.name}</span>
        <span className="text-xs text-gt-muted">({agent.role})</span>
      </div>
      <div className="flex items-center gap-2">
        {hasWork && (
          <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
            Working
          </span>
        )}
        {agent.unread_mail > 0 && (
          <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
            {agent.unread_mail} mail
          </span>
        )}
        <StatusBadge healthy={isHealthy} label={isHealthy ? "Online" : "Offline"} />
      </div>
    </div>
  );
}

export default function Monitoring() {
  const {
    data: statusResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["status"],
    queryFn: getStatus,
    refetchInterval: 5_000,
  });

  const status = statusResponse?.status;
  const isConnected = statusResponse?.initialized && status;

  // Calculate summary metrics
  const totalRigs = status?.rigs?.length || 0;
  const activeRigs =
    status?.rigs?.filter((r) => r.polecat_count > 0 || r.crew_count > 0)
      .length || 0;
  const totalAgents = status?.agents?.length || 0;
  const runningAgents = status?.agents?.filter((a) => a.running).length || 0;
  const workingAgents = status?.agents?.filter((a) => a.has_work).length || 0;
  const totalWorkers =
    (status?.summary?.polecat_count || 0) + (status?.summary?.crew_count || 0);
  const activeHooks = status?.summary?.active_hooks || 0;

  // Check for alerts
  const alerts: { level: "error" | "warning"; message: string }[] = [];
  status?.agents?.forEach((a) => {
    if (!a.running && (a.name === "mayor" || a.name === "deacon")) {
      alerts.push({ level: "error", message: `${a.name} is not running` });
    }
    if (a.unread_mail > 10) {
      alerts.push({
        level: "warning",
        message: `${a.name} has ${a.unread_mail} unread messages`,
      });
    }
  });

  if (isLoading) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <RefreshCw className="animate-spin text-gt-muted" size={32} />
      </div>
    );
  }

  if (error || !isConnected) {
    return (
      <div className="p-6 space-y-6 overflow-y-auto h-full">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="text-orange-400" size={24} />
              System Monitoring
            </h2>
            <p className="text-sm text-gt-muted mt-1">
              Gas Town system health and metrics
            </p>
          </div>
        </div>

        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-8 text-center">
          <WifiOff className="mx-auto text-red-400 mb-4" size={48} />
          <h3 className="text-lg font-medium mb-2 text-red-400">
            Connection Error
          </h3>
          <p className="text-gt-muted max-w-md mx-auto">
            Unable to connect to Gas Town backend. Make sure the server is running.
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-gt-surface border border-gt-border rounded-lg hover:bg-gt-border transition-colors"
          >
            Retry Connection
          </button>
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
            Gas Town system health and metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gt-surface rounded-lg">
            <Wifi size={14} className="text-green-400" />
            <span className="text-xs text-green-400">Connected</span>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 bg-gt-surface border border-gt-border rounded-lg hover:bg-gt-border transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={cn(isFetching && "animate-spin")}
            />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg",
                alert.level === "error"
                  ? "bg-red-500/10 border border-red-500/50"
                  : "bg-yellow-500/10 border border-yellow-500/50"
              )}
            >
              <AlertTriangle
                size={16}
                className={
                  alert.level === "error" ? "text-red-400" : "text-yellow-400"
                }
              />
              <span
                className={
                  alert.level === "error" ? "text-red-400" : "text-yellow-400"
                }
              >
                {alert.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {alerts.length === 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/50">
          <CheckCircle size={16} className="text-green-400" />
          <span className="text-green-400">All systems operational</span>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Server}
          label="Rigs"
          value={`${activeRigs}/${totalRigs}`}
          subtext="Active / Total"
          status={activeRigs === 0 && totalRigs > 0 ? "warning" : "healthy"}
        />
        <MetricCard
          icon={Users}
          label="Workers"
          value={totalWorkers}
          subtext={`${workingAgents} with active work`}
          status={totalWorkers > 0 ? "healthy" : "warning"}
        />
        <MetricCard
          icon={Zap}
          label="Active Hooks"
          value={activeHooks}
          subtext="Running processes"
          status={activeHooks > 0 ? "healthy" : undefined}
        />
        <MetricCard
          icon={Radio}
          label="Agents"
          value={`${runningAgents}/${totalAgents}`}
          subtext="Running / Total"
          status={runningAgents < totalAgents ? "warning" : "healthy"}
        />
      </div>

      {/* Global Agents */}
      <div>
        <h3 className="text-sm font-semibold text-gt-muted uppercase mb-3">
          Core Services
        </h3>
        <div className="bg-gt-surface border border-gt-border rounded-lg divide-y divide-gt-border">
          {status?.agents
            ?.filter((a) => a.name === "mayor" || a.name === "deacon")
            .map((agent) => (
              <AgentHealthRow key={agent.name} agent={agent} />
            ))}
        </div>
      </div>

      {/* Rig Health */}
      <div>
        <h3 className="text-sm font-semibold text-gt-muted uppercase mb-3">
          Rig Health ({status?.rigs?.length || 0} rigs)
        </h3>
        {status?.rigs && status.rigs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {status.rigs.map((rig) => (
              <RigHealthCard key={rig.name} rig={rig} />
            ))}
          </div>
        ) : (
          <div className="bg-gt-surface border border-gt-border rounded-lg p-8 text-center">
            <Server className="mx-auto text-gt-muted mb-4" size={32} />
            <p className="text-gt-muted">No rigs configured</p>
          </div>
        )}
      </div>
    </div>
  );
}
