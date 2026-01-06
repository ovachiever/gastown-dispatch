import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Plus, ChevronRight, Truck } from "lucide-react";
import { getConvoys } from "@/lib/api";
import { cn, formatRelativeTime, getStatusColor } from "@/lib/utils";

export default function Convoys() {
  const {
    data: convoys,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["convoys"],
    queryFn: () => getConvoys(),
    refetchInterval: 10_000,
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <RefreshCw className="animate-spin text-gt-muted" size={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">Failed to load convoys: {error.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm text-red-300 hover:text-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Convoys</h1>
          <p className="text-sm text-gt-muted">
            Track batched work across rigs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg bg-gt-surface hover:bg-gt-border transition-colors"
            title="Refresh"
          >
            <RefreshCw
              size={18}
              className={cn(isFetching && "animate-spin")}
            />
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gt-accent text-black hover:bg-gt-accent/90 transition-colors">
            <Plus size={16} />
            New Convoy
          </button>
        </div>
      </div>

      {/* Convoy list */}
      {!convoys || convoys.length === 0 ? (
        <div className="bg-gt-surface border border-gt-border rounded-lg p-8 text-center">
          <Truck className="mx-auto text-gt-muted mb-4" size={48} />
          <p className="text-gt-muted mb-2">No active convoys</p>
          <p className="text-sm text-gt-muted">
            Create a convoy to start tracking batched work.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {convoys.map((convoy) => (
            <div
              key={convoy.id}
              className="bg-gt-surface border border-gt-border rounded-lg p-4 hover:border-gt-accent/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Truck className="text-gt-accent" size={20} />
                  <div>
                    <h3 className="font-medium">{convoy.title}</h3>
                    <p className="text-sm text-gt-muted">{convoy.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={cn("text-sm", getStatusColor(convoy.status))}>
                    {convoy.status}
                  </span>
                  {convoy.progress && (
                    <span className="text-sm text-gt-muted">
                      {convoy.progress}
                    </span>
                  )}
                  <span className="text-sm text-gt-muted">
                    {formatRelativeTime(convoy.created_at)}
                  </span>
                  <ChevronRight className="text-gt-muted" size={18} />
                </div>
              </div>

              {/* Progress bar */}
              {convoy.total && convoy.total > 0 && (
                <div className="mt-3">
                  <div className="h-1.5 bg-gt-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gt-accent rounded-full transition-all"
                      style={{
                        width: `${((convoy.completed || 0) / convoy.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Tracked issues */}
              {convoy.tracked_issues && convoy.tracked_issues.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {convoy.tracked_issues.slice(0, 5).map((issue) => (
                    <span
                      key={issue.id}
                      className={cn(
                        "text-xs px-2 py-1 rounded",
                        issue.status === "closed"
                          ? "bg-green-900/30 text-green-300"
                          : issue.status === "in_progress" || issue.status === "hooked"
                          ? "bg-amber-900/30 text-amber-300"
                          : "bg-gt-bg text-gt-muted"
                      )}
                    >
                      {issue.id}
                    </span>
                  ))}
                  {convoy.tracked_issues.length > 5 && (
                    <span className="text-xs px-2 py-1 bg-gt-bg text-gt-muted rounded">
                      +{convoy.tracked_issues.length - 5} more
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
