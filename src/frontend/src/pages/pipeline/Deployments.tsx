import { useQuery } from "@tanstack/react-query";
import {
  Rocket,
  CheckCircle,
  Clock,
  Server,
  Globe,
  Loader2,
  Package,
  GitBranch,
} from "lucide-react";
import { getConvoys, getStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Convoy, RigStatus } from "@/types/api";

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function Deployments() {
  const { data: statusResponse } = useQuery({
    queryKey: ["status"],
    queryFn: getStatus,
    refetchInterval: 10000,
  });

  const { data: openConvoys } = useQuery({
    queryKey: ["convoys", "open"],
    queryFn: () => getConvoys("open"),
    refetchInterval: 10000,
  });

  const { data: closedConvoys, isLoading } = useQuery({
    queryKey: ["convoys", "closed"],
    queryFn: () => getConvoys("closed"),
    refetchInterval: 30000,
  });

  const rigs = statusResponse?.status?.rigs || [];
  const deployingConvoys = openConvoys?.filter(
    (c) => c.progress && c.progress !== "0/0"
  ) || [];

  // Sort closed convoys by date (most recent first)
  const recentDeployments = [...(closedConvoys || [])].sort((a, b) => {
    const dateA = new Date(a.updated_at || a.created_at).getTime();
    const dateB = new Date(b.updated_at || b.created_at).getTime();
    return dateB - dateA;
  });

  // Get latest deployment per "environment" (we'll use first word of convoy as env indicator)
  const latestByEnv = new Map<string, Convoy>();
  recentDeployments.forEach((convoy) => {
    const env = convoy.title.split(/[\s-_]/)[0].toLowerCase();
    if (!latestByEnv.has(env)) {
      latestByEnv.set(env, convoy);
    }
  });

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Rocket className="text-green-400" size={24} />
            Deployments
          </h2>
          <p className="text-sm text-gt-muted mt-1">
            Convoy completions and synthesis history
          </p>
        </div>
      </div>

      {/* Environment status cards */}
      <div>
        <h3 className="text-sm font-semibold text-gt-muted uppercase mb-3">
          Rigs (Environments)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rigs.length > 0 ? (
            rigs.map((rig) => <EnvironmentCard key={rig.name} rig={rig} />)
          ) : (
            <div className="col-span-2 bg-gt-surface border border-gt-border rounded-lg p-6 text-center">
              <Server className="mx-auto text-gt-muted mb-2" size={32} />
              <p className="text-gt-muted">No rigs configured</p>
            </div>
          )}
        </div>
      </div>

      {/* Currently deploying */}
      {deployingConvoys.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gt-muted uppercase mb-3">
            In Progress
          </h3>
          <div className="space-y-2">
            {deployingConvoys.map((convoy) => (
              <DeploymentCard key={convoy.id} convoy={convoy} status="deploying" />
            ))}
          </div>
        </div>
      )}

      {/* Recent deployments */}
      {isLoading ? (
        <div className="bg-gt-surface border border-gt-border rounded-lg p-8 text-center">
          <Loader2 className="mx-auto text-gt-muted mb-4 animate-spin" size={32} />
          <p className="text-gt-muted">Loading deployment history...</p>
        </div>
      ) : recentDeployments.length === 0 ? (
        <div className="bg-gt-surface border border-gt-border rounded-lg p-8 text-center">
          <Rocket className="mx-auto text-gt-muted mb-4" size={48} />
          <h3 className="text-lg font-medium mb-2">No Deployments Yet</h3>
          <p className="text-gt-muted max-w-md mx-auto">
            Completed convoys will appear here as deployments. Create and close
            convoys to see your deployment history.
          </p>
        </div>
      ) : (
        <div>
          <h3 className="text-sm font-semibold text-gt-muted uppercase mb-3">
            Recent Deployments
          </h3>
          <div className="space-y-2">
            {recentDeployments.slice(0, 10).map((convoy) => (
              <DeploymentCard key={convoy.id} convoy={convoy} status="deployed" />
            ))}
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="text-green-400" size={16} />
            <span className="text-sm text-gt-muted">Total Deployments</span>
          </div>
          <div className="text-2xl font-bold">{recentDeployments.length}</div>
        </div>
        <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="text-yellow-400" size={16} />
            <span className="text-sm text-gt-muted">In Progress</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400">
            {deployingConvoys.length}
          </div>
        </div>
        <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Server className="text-blue-400" size={16} />
            <span className="text-sm text-gt-muted">Active Rigs</span>
          </div>
          <div className="text-2xl font-bold">{rigs.length}</div>
        </div>
        <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="text-purple-400" size={16} />
            <span className="text-sm text-gt-muted">Active Polecats</span>
          </div>
          <div className="text-2xl font-bold">
            {rigs.reduce((sum, rig) => sum + rig.polecat_count, 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

function EnvironmentCard({ rig }: { rig: RigStatus }) {
  const isHealthy = rig.mq?.health === "healthy" || rig.mq?.health === undefined;
  const hasActivity = rig.mq && (rig.mq.in_flight > 0 || rig.mq.pending > 0);

  return (
    <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-green-400" />
          <span className="font-medium">{rig.name}</span>
        </div>
        {isHealthy ? (
          <CheckCircle size={16} className="text-green-400" />
        ) : (
          <Clock size={16} className="text-yellow-400" />
        )}
      </div>
      <div className="text-sm text-gt-muted space-y-1">
        <div className="flex items-center justify-between">
          <span>Polecats</span>
          <span className="font-medium text-gt-text">{rig.polecat_count}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Crews</span>
          <span className="font-medium text-gt-text">{rig.crew_count}</span>
        </div>
        {rig.mq && (
          <div className="flex items-center justify-between">
            <span>Queue</span>
            <span className="font-medium text-gt-text">
              {rig.mq.in_flight} running, {rig.mq.pending} pending
            </span>
          </div>
        )}
      </div>
      {hasActivity && (
        <div className="mt-3 pt-3 border-t border-gt-border">
          <div className="flex items-center gap-2 text-xs text-yellow-400">
            <Loader2 size={12} className="animate-spin" />
            <span>Work in progress</span>
          </div>
        </div>
      )}
    </div>
  );
}

function DeploymentCard({
  convoy,
  status,
}: {
  convoy: Convoy;
  status: "deployed" | "deploying";
}) {
  const isDeploying = status === "deploying";

  return (
    <div className="bg-gt-surface border border-gt-border rounded-lg p-4 flex items-center gap-4">
      {isDeploying ? (
        <Loader2 className="text-yellow-400 animate-spin" size={20} />
      ) : (
        <CheckCircle className="text-green-400" size={20} />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{convoy.title}</div>
        <div className="text-sm text-gt-muted flex items-center gap-4 mt-1">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {convoy.updated_at
              ? formatTimeAgo(convoy.updated_at)
              : formatTimeAgo(convoy.created_at)}
          </span>
          {convoy.progress && (
            <span className="flex items-center gap-1">
              <Package size={12} />
              {convoy.progress}
            </span>
          )}
        </div>
      </div>
      <span
        className={cn(
          "px-2 py-1 text-xs rounded",
          isDeploying
            ? "bg-yellow-500/20 text-yellow-400"
            : "bg-green-500/20 text-green-400"
        )}
      >
        {isDeploying ? "Deploying" : "Success"}
      </span>
    </div>
  );
}
