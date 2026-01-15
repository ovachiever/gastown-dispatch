import { useQuery } from "@tanstack/react-query";
import {
  TestTube,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Zap,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { getBeads, getStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Bead, AgentRuntime } from "@/types/api";

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

function WorkInProgressCard({ bead, agent }: { bead: Bead; agent?: AgentRuntime }) {
  const isHooked = bead.status === "hooked";

  return (
    <div
      className={cn(
        "bg-gt-surface border rounded-lg p-4 transition-all",
        isHooked ? "border-blue-500/50" : "border-yellow-500/50"
      )}
    >
      <div className="flex items-center gap-3">
        {isHooked ? (
          <Loader2 size={20} className="text-blue-400 animate-spin" />
        ) : (
          <Zap size={20} className="text-yellow-400" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{bead.title}</div>
          <div className="text-xs text-gt-muted flex items-center gap-3 mt-1">
            <span className="font-mono">{bead.id}</span>
            {bead.assignee && (
              <span className="truncate">{bead.assignee}</span>
            )}
            {agent && agent.running && (
              <span className="text-green-400">Active</span>
            )}
          </div>
        </div>
        <span
          className={cn(
            "px-2 py-1 text-xs rounded shrink-0",
            isHooked
              ? "bg-blue-500/20 text-blue-400"
              : "bg-yellow-500/20 text-yellow-400"
          )}
        >
          {isHooked ? "Running" : "In Progress"}
        </span>
      </div>
      {bead.updated_at && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gt-border text-xs text-gt-muted">
          <Clock size={12} />
          <span>Updated {formatTimeAgo(bead.updated_at)}</span>
        </div>
      )}
    </div>
  );
}

export default function Tests() {
  const {
    data: beads = [],
    isLoading: loadingBeads,
    refetch: refetchBeads,
    isFetching: fetchingBeads,
  } = useQuery({
    queryKey: ["beads"],
    queryFn: () => getBeads({ limit: 100 }),
    refetchInterval: 10_000,
  });

  const {
    data: statusResponse,
    isLoading: loadingStatus,
    refetch: refetchStatus,
    isFetching: fetchingStatus,
  } = useQuery({
    queryKey: ["status"],
    queryFn: getStatus,
    refetchInterval: 5_000,
  });

  const isLoading = loadingBeads || loadingStatus;
  const isFetching = fetchingBeads || fetchingStatus;

  const refetch = () => {
    refetchBeads();
    refetchStatus();
  };

  const status = statusResponse?.status;
  const agents = status?.agents || [];

  // Get work in progress (hooked or in_progress beads)
  const workInProgress = beads.filter(
    (b) => b.status === "hooked" || b.status === "in_progress"
  );

  // Get recently closed beads (completed work)
  const recentlyCompleted = beads
    .filter((b) => b.status === "closed")
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at).getTime() -
        new Date(a.updated_at || a.created_at).getTime()
    )
    .slice(0, 5);

  // Count stats
  const hookedCount = beads.filter((b) => b.status === "hooked").length;
  const inProgressCount = beads.filter((b) => b.status === "in_progress").length;
  const closedCount = beads.filter((b) => b.status === "closed").length;
  const openCount = beads.filter((b) => b.status === "open").length;

  // Find agent for a bead
  const getAgentForBead = (bead: Bead): AgentRuntime | undefined => {
    return agents.find(
      (a) => a.hook_bead === bead.id || a.work_title === bead.title
    );
  };

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
            <TestTube className="text-yellow-400" size={24} />
            Work Status
          </h2>
          <p className="text-sm text-gt-muted mt-1">
            Active work items and completion status
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
            <Loader2 size={16} className="text-blue-400 animate-spin" />
            <span className="text-sm text-gt-muted">Running</span>
          </div>
          <div className="text-2xl font-bold text-gt-accent">{hookedCount}</div>
        </div>
        <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-yellow-400" />
            <span className="text-sm text-gt-muted">In Progress</span>
          </div>
          <div className="text-2xl font-bold text-gt-accent">
            {inProgressCount}
          </div>
        </div>
        <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-green-400" />
            <span className="text-sm text-gt-muted">Completed</span>
          </div>
          <div className="text-2xl font-bold text-gt-accent">{closedCount}</div>
        </div>
        <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} className="text-orange-400" />
            <span className="text-sm text-gt-muted">Open</span>
          </div>
          <div className="text-2xl font-bold text-gt-accent">{openCount}</div>
        </div>
      </div>

      {/* Active Work */}
      <div>
        <h3 className="text-sm font-semibold text-gt-muted uppercase mb-3 flex items-center gap-2">
          {workInProgress.length > 0 && (
            <Loader2 size={14} className="animate-spin" />
          )}
          Active Work ({workInProgress.length})
        </h3>
        {workInProgress.length > 0 ? (
          <div className="space-y-3">
            {workInProgress.map((bead) => (
              <WorkInProgressCard
                key={bead.id}
                bead={bead}
                agent={getAgentForBead(bead)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gt-surface border border-gt-border rounded-lg p-8 text-center">
            <Zap className="mx-auto text-gt-muted mb-4" size={32} />
            <p className="text-gt-muted">No active work items</p>
            <p className="text-xs text-gt-muted mt-2">
              Work will appear here when agents start processing beads
            </p>
          </div>
        )}
      </div>

      {/* Recently Completed */}
      <div>
        <h3 className="text-sm font-semibold text-gt-muted uppercase mb-3">
          Recently Completed ({recentlyCompleted.length})
        </h3>
        {recentlyCompleted.length > 0 ? (
          <div className="space-y-2">
            {recentlyCompleted.map((bead) => (
              <div
                key={bead.id}
                className="bg-gt-surface border border-gt-border rounded-lg p-4 flex items-center gap-4"
              >
                <CheckCircle className="text-green-400 shrink-0" size={20} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{bead.title}</div>
                  <div className="text-sm text-gt-muted flex items-center gap-4 mt-1">
                    <span className="font-mono text-xs">{bead.id}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatTimeAgo(bead.updated_at || bead.created_at)}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded shrink-0">
                  Completed
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gt-surface border border-gt-border rounded-lg p-6 text-center">
            <p className="text-gt-muted text-sm">No recently completed items</p>
          </div>
        )}
      </div>

      {/* GitHub Actions Integration Notice */}
      <div className="bg-gt-surface border border-dashed border-gt-border rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-gt-bg rounded-lg">
            <ExternalLink size={20} className="text-gt-muted" />
          </div>
          <div>
            <h4 className="font-medium mb-1">GitHub Actions Integration</h4>
            <p className="text-sm text-gt-muted">
              Connect GitHub Actions to track CI test runs, view test coverage,
              and monitor test failures directly from your repository.
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
