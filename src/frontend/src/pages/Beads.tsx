import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Plus, Filter, CircleDot } from "lucide-react";
import { getBeads, getReadyBeads } from "@/lib/api";
import { cn, formatRelativeTime, getStatusColor, getPriorityLabel, getPriorityColor } from "@/lib/utils";
import type { BeadFilters } from "@/types/api";

export default function Beads() {
  const [filters, setFilters] = useState<BeadFilters>({ limit: 50 });
  const [view, setView] = useState<"all" | "ready">("all");

  const {
    data: beads,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["beads", view, filters],
    queryFn: () => (view === "ready" ? getReadyBeads() : getBeads(filters)),
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
          <p className="text-red-400">Failed to load beads: {error.message}</p>
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
          <h1 className="text-2xl font-semibold">Beads</h1>
          <p className="text-sm text-gt-muted">
            Track issues, tasks, and work items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gt-surface border border-gt-border rounded-lg overflow-hidden">
            <button
              onClick={() => setView("all")}
              className={cn(
                "px-3 py-1.5 text-sm transition-colors",
                view === "all"
                  ? "bg-gt-accent text-black"
                  : "hover:bg-gt-border"
              )}
            >
              All
            </button>
            <button
              onClick={() => setView("ready")}
              className={cn(
                "px-3 py-1.5 text-sm transition-colors",
                view === "ready"
                  ? "bg-gt-accent text-black"
                  : "hover:bg-gt-border"
              )}
            >
              Ready
            </button>
          </div>
          <button
            className="p-2 rounded-lg bg-gt-surface hover:bg-gt-border transition-colors"
            title="Filters"
          >
            <Filter size={18} />
          </button>
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
            New Bead
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        <select
          value={filters.status || ""}
          onChange={(e) =>
            setFilters({ ...filters, status: e.target.value || undefined })
          }
          className="bg-gt-surface border border-gt-border rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="hooked">Hooked</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={filters.type || ""}
          onChange={(e) =>
            setFilters({ ...filters, type: e.target.value || undefined })
          }
          className="bg-gt-surface border border-gt-border rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">All types</option>
          <option value="bug">Bug</option>
          <option value="feature">Feature</option>
          <option value="task">Task</option>
          <option value="epic">Epic</option>
          <option value="chore">Chore</option>
        </select>
      </div>

      {/* Bead list */}
      {!beads || beads.length === 0 ? (
        <div className="bg-gt-surface border border-gt-border rounded-lg p-8 text-center">
          <CircleDot className="mx-auto text-gt-muted mb-4" size={48} />
          <p className="text-gt-muted mb-2">No beads found</p>
          <p className="text-sm text-gt-muted">
            {view === "ready"
              ? "No unblocked work available."
              : "Create a bead to track work."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {beads.map((bead) => (
            <div
              key={bead.id}
              className="bg-gt-surface border border-gt-border rounded-lg p-3 hover:border-gt-accent/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <CircleDot
                    className={cn("mt-0.5", getStatusColor(bead.status))}
                    size={16}
                  />
                  <div>
                    <h3 className="font-medium">{bead.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gt-muted">
                      <span>{bead.id}</span>
                      <span>·</span>
                      <span className={getPriorityColor(bead.priority)}>
                        {getPriorityLabel(bead.priority)}
                      </span>
                      <span>·</span>
                      <span className="capitalize">{bead.type}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {bead.assignee && (
                    <span className="text-gt-muted">{bead.assignee}</span>
                  )}
                  <span className="text-gt-muted">
                    {formatRelativeTime(bead.updated_at || bead.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
