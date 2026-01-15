import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  Plus,
  Filter,
  CircleDot,
  X,
  GitBranch,
  MessageSquare,
  Clock,
  User,
  Tag,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  Edit,
} from "lucide-react";
import {
  getBeads,
  getReadyBeads,
  getBead,
  createBead,
  updateBeadStatus,
  closeBead,
} from "@/lib/api";
import {
  cn,
  formatRelativeTime,
  getStatusColor,
  getPriorityLabel,
  getPriorityColor,
} from "@/lib/utils";
import type { BeadFilters, Bead } from "@/types/api";

export default function Beads() {
  const [filters, setFilters] = useState<BeadFilters>({ limit: 50 });
  const [view, setView] = useState<"all" | "ready">("all");
  const [selectedBeadId, setSelectedBeadId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

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

  // Fetch selected bead details
  const {
    data: selectedBead,
    isLoading: isLoadingBead,
    error: beadError,
  } = useQuery({
    queryKey: ["bead", selectedBeadId],
    queryFn: () => getBead(selectedBeadId!),
    enabled: !!selectedBeadId,
  });

  // Auto-select first bead if none selected
  useEffect(() => {
    if (beads && beads.length > 0 && !selectedBeadId) {
      setSelectedBeadId(beads[0].id);
    }
  }, [beads, selectedBeadId]);

  // SSE for real-time updates
  useEffect(() => {
    const eventSource = new EventSource("/api/beads/events");

    eventSource.addEventListener("bead-updated", () => {
      queryClient.invalidateQueries({ queryKey: ["beads"] });
      if (selectedBeadId) {
        queryClient.invalidateQueries({ queryKey: ["bead", selectedBeadId] });
      }
    });

    eventSource.addEventListener("bead-created", () => {
      queryClient.invalidateQueries({ queryKey: ["beads"] });
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient, selectedBeadId]);

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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gt-border">
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
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gt-accent text-black hover:bg-gt-accent/90 transition-colors"
          >
            <Plus size={16} />
            New Bead
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-gt-border">
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

      {/* Master-Detail Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Master List */}
        <div className="w-1/3 border-r border-gt-border overflow-y-auto">
          {!beads || beads.length === 0 ? (
            <div className="p-8 text-center">
              <CircleDot className="mx-auto text-gt-muted mb-4" size={48} />
              <p className="text-gt-muted mb-2">No beads found</p>
              <p className="text-sm text-gt-muted">
                {view === "ready"
                  ? "No unblocked work available."
                  : "Create a bead to track work."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gt-border">
              {beads.map((bead) => (
                <div
                  key={bead.id}
                  onClick={() => setSelectedBeadId(bead.id)}
                  className={cn(
                    "p-4 cursor-pointer transition-colors hover:bg-gt-surface/50",
                    selectedBeadId === bead.id && "bg-gt-surface border-l-2 border-gt-accent"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <CircleDot
                      className={cn("mt-1 flex-shrink-0", getStatusColor(bead.status))}
                      size={16}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{bead.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gt-muted flex-wrap">
                        <span className="font-mono">{bead.id}</span>
                        <span>·</span>
                        <span className={cn("font-medium", getPriorityColor(bead.priority))}>
                          {getPriorityLabel(bead.priority)}
                        </span>
                        <span>·</span>
                        <span className="capitalize">{bead.type}</span>
                      </div>
                      {bead.labels && bead.labels.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          {bead.labels.map((label) => (
                            <span
                              key={label}
                              className="px-2 py-0.5 text-xs bg-gt-border rounded-full"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gt-muted">
                        {bead.assignee && (
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {bead.assignee}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatRelativeTime(bead.updated_at || bead.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="flex-1 overflow-y-auto">
          {selectedBeadId ? (
            <BeadDetail
              bead={selectedBead}
              isLoading={isLoadingBead}
              error={beadError}
              onClose={() => setSelectedBeadId(null)}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["bead", selectedBeadId] })}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gt-muted">
              <p>Select a bead to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateBeadModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function BeadDetail({
  bead,
  isLoading,
  error,
  onClose,
  onRefresh,
}: {
  bead: Bead | undefined;
  isLoading: boolean;
  error: Error | null;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateBeadStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beads"] });
      onRefresh();
    },
  });

  const closeBeadMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      closeBead(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beads"] });
      onRefresh();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="animate-spin text-gt-muted" size={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">Failed to load bead: {error.message}</p>
          <button
            onClick={onRefresh}
            className="mt-2 text-sm text-red-300 hover:text-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!bead) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "closed":
        return <CheckCircle2 size={20} />;
      case "in_progress":
        return <Play size={20} />;
      case "hooked":
        return <AlertCircle size={20} />;
      default:
        return <CircleDot size={20} />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gt-border p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(getStatusColor(bead.status))}>
              {getStatusIcon(bead.status)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-gt-muted">{bead.id}</span>
                <span className={cn("text-xs font-medium uppercase px-2 py-0.5 rounded-full", getPriorityColor(bead.priority))}>
                  {getPriorityLabel(bead.priority)}
                </span>
                <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-gt-border">
                  {bead.type}
                </span>
              </div>
              <h2 className="text-2xl font-semibold mt-1">{bead.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gt-surface transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {bead.status !== "closed" && (
            <>
              {bead.status === "open" && (
                <button
                  onClick={() =>
                    updateStatusMutation.mutate({
                      id: bead.id,
                      status: "in_progress",
                    })
                  }
                  disabled={updateStatusMutation.isPending}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-gt-surface hover:bg-gt-border transition-colors disabled:opacity-50"
                >
                  <Play size={14} />
                  Start Work
                </button>
              )}
              {bead.status === "in_progress" && (
                <button
                  onClick={() =>
                    updateStatusMutation.mutate({
                      id: bead.id,
                      status: "open",
                    })
                  }
                  disabled={updateStatusMutation.isPending}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-gt-surface hover:bg-gt-border transition-colors disabled:opacity-50"
                >
                  <Pause size={14} />
                  Pause
                </button>
              )}
              <button
                onClick={() =>
                  closeBeadMutation.mutate({
                    id: bead.id,
                    reason: "Completed",
                  })
                }
                disabled={closeBeadMutation.isPending}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                Close
              </button>
            </>
          )}
          {bead.status === "closed" && (
            <button
              onClick={() =>
                updateStatusMutation.mutate({
                  id: bead.id,
                  status: "open",
                })
              }
              disabled={updateStatusMutation.isPending}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-gt-surface hover:bg-gt-border transition-colors disabled:opacity-50"
            >
              <Play size={14} />
              Reopen
            </button>
          )}
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-gt-surface hover:bg-gt-border transition-colors">
            <Edit size={14} />
            Edit
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Description */}
        <div>
          <h3 className="text-sm font-semibold text-gt-muted uppercase mb-2">
            Description
          </h3>
          {bead.description ? (
            <div className="prose prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{bead.description}</p>
            </div>
          ) : (
            <p className="text-gt-muted italic">No description provided</p>
          )}
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gt-muted uppercase mb-2">
              Status
            </h3>
            <div className="flex items-center gap-2">
              <CircleDot
                className={cn(getStatusColor(bead.status))}
                size={16}
              />
              <span className="capitalize">{bead.status.replace("_", " ")}</span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gt-muted uppercase mb-2">
              Assignee
            </h3>
            <div className="flex items-center gap-2">
              <User size={16} className="text-gt-muted" />
              <span>{bead.assignee || "Unassigned"}</span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gt-muted uppercase mb-2">
              Created
            </h3>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gt-muted" />
              <span>{formatRelativeTime(bead.created_at)}</span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gt-muted uppercase mb-2">
              Updated
            </h3>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gt-muted" />
              <span>{formatRelativeTime(bead.updated_at || bead.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Labels */}
        {bead.labels && bead.labels.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gt-muted uppercase mb-2">
              Labels
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {bead.labels.map((label) => (
                <span
                  key={label}
                  className="flex items-center gap-1 px-2 py-1 text-sm bg-gt-border rounded-full"
                >
                  <Tag size={12} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Dependencies */}
        <div>
          <h3 className="text-sm font-semibold text-gt-muted uppercase mb-2 flex items-center gap-2">
            <GitBranch size={14} />
            Dependencies
          </h3>
          <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
            <p className="text-sm text-gt-muted">
              No dependencies configured
            </p>
            <button className="mt-2 text-sm text-gt-accent hover:underline">
              Add dependency
            </button>
          </div>
        </div>

        {/* Activity */}
        <div>
          <h3 className="text-sm font-semibold text-gt-muted uppercase mb-2 flex items-center gap-2">
            <MessageSquare size={14} />
            Activity
          </h3>
          <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
            <p className="text-sm text-gt-muted">No activity yet</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateBeadModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("task");
  const [priority, setPriority] = useState<number>(2);

  const createMutation = useMutation({
    mutationFn: createBead,
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title,
      description: description || undefined,
      type,
      priority,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gt-surface border border-gt-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gt-border">
          <h2 className="text-xl font-semibold">Create New Bead</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gt-border transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gt-background border border-gt-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gt-accent"
              placeholder="Enter bead title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-gt-background border border-gt-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gt-accent resize-none"
              placeholder="Enter bead description (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 bg-gt-background border border-gt-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gt-accent"
              >
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="task">Task</option>
                <option value="epic">Epic</option>
                <option value="chore">Chore</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-gt-background border border-gt-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gt-accent"
              >
                <option value="1">P1 - Critical</option>
                <option value="2">P2 - High</option>
                <option value="3">P3 - Normal</option>
                <option value="4">P4 - Low</option>
              </select>
            </div>
          </div>

          {createMutation.error && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
              <p className="text-red-400 text-sm">
                {createMutation.error.message}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-4">
            <button
              type="submit"
              disabled={!title || createMutation.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-gt-accent text-black hover:bg-gt-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? "Creating..." : "Create Bead"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gt-surface hover:bg-gt-border transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
