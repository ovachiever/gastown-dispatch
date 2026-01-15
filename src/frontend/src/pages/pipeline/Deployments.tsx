import { useQuery } from "@tanstack/react-query";
import {
  Rocket,
  CheckCircle,
  Clock,
  Truck,
  Package,
  RefreshCw,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { getConvoys } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Convoy } from "@/types/api";

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
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

function ConvoyDeploymentCard({ convoy }: { convoy: Convoy }) {
  const completed = convoy.completed || 0;
  const total = convoy.total || 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isComplete = convoy.status === "closed";

  return (
    <div
      className={cn(
        "bg-gt-surface border rounded-lg p-4 transition-all",
        isComplete ? "border-green-500/50" : "border-blue-500/50"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {isComplete ? (
            <CheckCircle size={20} className="text-green-400" />
          ) : (
            <Loader2 size={20} className="text-blue-400 animate-spin" />
          )}
          <div>
            <div className="font-medium">{convoy.title}</div>
            <div className="text-xs text-gt-muted font-mono">{convoy.id}</div>
          </div>
        </div>
        <span
          className={cn(
            "px-2 py-1 text-xs rounded font-medium",
            isComplete
              ? "bg-green-500/20 text-green-400"
              : "bg-blue-500/20 text-blue-400"
          )}
        >
          {isComplete ? "Deployed" : "In Progress"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gt-muted">Progress</span>
          <span className="font-mono">
            {completed}/{total} issues ({progress}%)
          </span>
        </div>
        <div className="h-2 bg-gt-bg rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500",
              isComplete ? "bg-green-500" : "bg-blue-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tracked issues preview */}
      {convoy.tracked_issues && convoy.tracked_issues.length > 0 && (
        <div className="space-y-1">
          {convoy.tracked_issues.slice(0, 3).map((issue) => (
            <div
              key={issue.id}
              className="flex items-center justify-between text-xs py-1 px-2 bg-gt-bg rounded"
            >
              <span className="truncate flex-1">{issue.title}</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] ml-2",
                  issue.status === "closed"
                    ? "bg-green-500/20 text-green-400"
                    : issue.status === "in_progress" || issue.status === "hooked"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-yellow-500/20 text-yellow-400"
                )}
              >
                {issue.status}
              </span>
            </div>
          ))}
          {convoy.tracked_issues.length > 3 && (
            <div className="text-xs text-gt-muted text-center py-1">
              +{convoy.tracked_issues.length - 3} more issues
            </div>
          )}
        </div>
      )}

      {/* Timestamp */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gt-border text-xs text-gt-muted">
        <Clock size={12} />
        <span>
          {isComplete ? "Completed" : "Started"}{" "}
          {formatTimeAgo(convoy.updated_at || convoy.created_at)}
        </span>
      </div>
    </div>
  );
}

export default function Deployments() {
  const {
    data: openConvoys = [],
    isLoading: loadingOpen,
    refetch: refetchOpen,
    isFetching: fetchingOpen,
  } = useQuery({
    queryKey: ["convoys", "open"],
    queryFn: () => getConvoys("open"),
    refetchInterval: 10_000,
  });

  const {
    data: closedConvoys = [],
    isLoading: loadingClosed,
    refetch: refetchClosed,
    isFetching: fetchingClosed,
  } = useQuery({
    queryKey: ["convoys", "closed"],
    queryFn: () => getConvoys("closed"),
    refetchInterval: 30_000,
  });

  const isLoading = loadingOpen || loadingClosed;
  const isFetching = fetchingOpen || fetchingClosed;

  const refetch = () => {
    refetchOpen();
    refetchClosed();
  };

  // Sort closed convoys by most recent first
  const recentDeployments = [...closedConvoys]
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at).getTime() -
        new Date(a.updated_at || a.created_at).getTime()
    )
    .slice(0, 10);

  if (isLoading) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <RefreshCw className="animate-spin text-gt-muted" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Rocket className="text-green-400" size={24} />
            Deployments
          </h2>
          <p className="text-sm text-gt-muted mt-1">
            Convoy synthesis and deployment history
          </p>
        </div>
        <button
          onClick={refetch}
          disabled={isFetching}
          className="p-2 bg-gt-surface border border-gt-border rounded-lg hover:bg-gt-border transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={cn(isFetching && "animate-spin")} />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 size={16} className="text-blue-400" />
            <span className="text-sm text-gt-muted">In Progress</span>
          </div>
          <div className="text-2xl font-bold text-gt-accent">
            {openConvoys.length}
          </div>
        </div>
        <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-green-400" />
            <span className="text-sm text-gt-muted">Deployed</span>
          </div>
          <div className="text-2xl font-bold text-gt-accent">
            {closedConvoys.length}
          </div>
        </div>
        <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package size={16} className="text-purple-400" />
            <span className="text-sm text-gt-muted">Total Issues</span>
          </div>
          <div className="text-2xl font-bold text-gt-accent">
            {[...openConvoys, ...closedConvoys].reduce(
              (sum, c) => sum + (c.total || 0),
              0
            )}
          </div>
        </div>
        <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck size={16} className="text-orange-400" />
            <span className="text-sm text-gt-muted">Active Convoys</span>
          </div>
          <div className="text-2xl font-bold text-gt-accent">
            {openConvoys.length + closedConvoys.length}
          </div>
        </div>
      </div>

      {/* Active Deployments */}
      {openConvoys.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gt-muted uppercase mb-3 flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            Active Deployments ({openConvoys.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openConvoys.map((convoy) => (
              <ConvoyDeploymentCard key={convoy.id} convoy={convoy} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Deployments */}
      <div>
        <h3 className="text-sm font-semibold text-gt-muted uppercase mb-3">
          Recent Deployments ({recentDeployments.length})
        </h3>
        {recentDeployments.length > 0 ? (
          <div className="space-y-3">
            {recentDeployments.map((convoy) => (
              <div
                key={convoy.id}
                className="bg-gt-surface border border-gt-border rounded-lg p-4 flex items-center gap-4"
              >
                <CheckCircle className="text-green-400 shrink-0" size={20} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{convoy.title}</div>
                  <div className="text-sm text-gt-muted flex items-center gap-4 mt-1">
                    <span className="font-mono text-xs">{convoy.id}</span>
                    <span className="flex items-center gap-1">
                      <Package size={12} />
                      {convoy.total || 0} issues
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatTimeAgo(convoy.updated_at || convoy.created_at)}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded shrink-0">
                  Success
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gt-surface border border-gt-border rounded-lg p-8 text-center">
            <Truck className="mx-auto text-gt-muted mb-4" size={32} />
            <p className="text-gt-muted">No deployments yet</p>
            <p className="text-xs text-gt-muted mt-2">
              Convoys will appear here once they are synthesized and closed
            </p>
          </div>
        )}
      </div>

      {/* GitHub Integration Notice */}
      <div className="bg-gt-surface border border-dashed border-gt-border rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-gt-bg rounded-lg">
            <ExternalLink size={20} className="text-gt-muted" />
          </div>
          <div>
            <h4 className="font-medium mb-1">GitHub Actions Integration</h4>
            <p className="text-sm text-gt-muted">
              Connect GitHub Actions to track CI/CD deployments directly from
              your repository. This will show deployment status for production,
              staging, and preview environments.
            </p>
            <p className="text-xs text-gt-muted mt-2">
              Optional integration - not currently configured
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
