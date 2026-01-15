import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  GitPullRequest,
  Clock,
  User,
  RefreshCw,
  GitBranch,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { getBeads, getBead } from "@/lib/api";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Bead } from "@/types/api";

// Fetch beads that are merge requests or have review-related labels
async function getMergeRequestBeads(): Promise<Bead[]> {
  // Fetch all beads and filter for MR-related ones
  const allBeads = await getBeads({ limit: 100 });

  return allBeads.filter((bead) => {
    // Include merge-request type beads
    if (bead.type === "merge-request") return true;

    // Include beads with review/merge labels
    if (bead.labels?.some((label) =>
      ["merge", "code-review", "review", "pr", "pull-request"].includes(label.toLowerCase())
    )) return true;

    // Include beads with "Review" or "Merge" in title
    if (bead.title.toLowerCase().includes("review") ||
        bead.title.toLowerCase().includes("merge")) return true;

    return false;
  });
}

// Parse MR metadata from description
function parseMRMetadata(bead: Bead): {
  sourceBranch?: string;
  targetBranch?: string;
  linkedIssue?: string;
  commits?: string[];
} {
  const description = bead.description || "";

  // Extract Source: branch_name
  const sourceMatch = description.match(/Source:\s*([^\n]+)/i);
  const sourceBranch = sourceMatch?.[1]?.trim() || bead.source_branch;

  // Extract Target: branch_name
  const targetMatch = description.match(/Target:\s*([^\n]+)/i);
  const targetBranch = targetMatch?.[1]?.trim() || bead.target_branch;

  // Extract Issue: id
  const issueMatch = description.match(/Issue:\s*([^\n\s(]+)/i);
  const linkedIssue = issueMatch?.[1]?.trim() || bead.linked_issue;

  // Extract Commits: hash1, hash2
  const commitsMatch = description.match(/Commits?:\s*([^\n]+)/i);
  const commits = commitsMatch?.[1]?.split(",").map((c) => c.trim()) || bead.commits;

  return { sourceBranch, targetBranch, linkedIssue, commits };
}

function getReviewStatusIcon(status: string) {
  switch (status) {
    case "closed":
      return <CheckCircle2 size={16} className="text-green-400" />;
    case "in_progress":
    case "hooked":
      return <AlertCircle size={16} className="text-blue-400" />;
    default:
      return <GitPullRequest size={16} className="text-yellow-400" />;
  }
}

function getReviewStatusLabel(status: string) {
  switch (status) {
    case "closed":
      return "Merged";
    case "in_progress":
      return "In Review";
    case "hooked":
      return "Being Reviewed";
    default:
      return "Pending Review";
  }
}

function getReviewStatusColor(status: string) {
  switch (status) {
    case "closed":
      return "bg-green-500/20 text-green-400";
    case "in_progress":
      return "bg-blue-500/20 text-blue-400";
    case "hooked":
      return "bg-purple-500/20 text-purple-400";
    default:
      return "bg-yellow-500/20 text-yellow-400";
  }
}

export default function Reviews() {
  const [selectedBeadId, setSelectedBeadId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const queryClient = useQueryClient();

  const {
    data: mrBeads,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["merge-requests"],
    queryFn: getMergeRequestBeads,
    refetchInterval: 10_000,
  });

  // Fetch selected bead details
  const { data: selectedBead, isLoading: isLoadingBead } = useQuery({
    queryKey: ["bead", selectedBeadId],
    queryFn: () => getBead(selectedBeadId!),
    enabled: !!selectedBeadId,
  });

  // Filter beads by status
  const filteredBeads = mrBeads?.filter((bead) => {
    if (!statusFilter) return true;
    if (statusFilter === "pending") return bead.status === "open";
    if (statusFilter === "in_review") return bead.status === "in_progress" || bead.status === "hooked";
    if (statusFilter === "merged") return bead.status === "closed";
    return true;
  }) || [];

  // Group beads by status for display
  const pendingReviews = filteredBeads.filter((b) => b.status === "open");
  const inReview = filteredBeads.filter((b) => b.status === "in_progress" || b.status === "hooked");
  const merged = filteredBeads.filter((b) => b.status === "closed");

  // Auto-select first bead if none selected
  useEffect(() => {
    if (filteredBeads.length > 0 && !selectedBeadId) {
      setSelectedBeadId(filteredBeads[0].id);
    }
  }, [filteredBeads, selectedBeadId]);

  // SSE for real-time updates
  useEffect(() => {
    const eventSource = new EventSource("/api/beads/events");

    eventSource.addEventListener("bead-updated", () => {
      queryClient.invalidateQueries({ queryKey: ["merge-requests"] });
      if (selectedBeadId) {
        queryClient.invalidateQueries({ queryKey: ["bead", selectedBeadId] });
      }
    });

    eventSource.addEventListener("bead-created", () => {
      queryClient.invalidateQueries({ queryKey: ["merge-requests"] });
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
          <p className="text-red-400">Failed to load reviews: {(error as Error).message}</p>
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
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <GitPullRequest className="text-blue-400" size={24} />
            Code Reviews
          </h2>
          <p className="text-sm text-gt-muted mt-1">
            Merge requests and code reviews from Gas Town
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gt-surface border border-gt-border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">All Status</option>
            <option value="pending">Pending Review</option>
            <option value="in_review">In Review</option>
            <option value="merged">Merged</option>
          </select>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg bg-gt-surface hover:bg-gt-border transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className={cn(isFetching && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-gt-border bg-gt-surface/30">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          <span className="text-sm text-gt-muted">Pending: {pendingReviews.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-sm text-gt-muted">In Review: {inReview.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-sm text-gt-muted">Merged: {merged.length}</span>
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Master List */}
        <div className="w-1/3 border-r border-gt-border overflow-y-auto">
          {filteredBeads.length === 0 ? (
            <div className="p-8 text-center">
              <GitPullRequest className="mx-auto text-gt-muted mb-4" size={48} />
              <p className="text-gt-muted mb-2">No merge requests found</p>
              <p className="text-sm text-gt-muted">
                Create merge-request beads or add review labels to beads
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gt-border">
              {filteredBeads.map((bead) => {
                const metadata = parseMRMetadata(bead);
                return (
                  <div
                    key={bead.id}
                    onClick={() => setSelectedBeadId(bead.id)}
                    className={cn(
                      "p-4 cursor-pointer transition-colors hover:bg-gt-surface/50",
                      selectedBeadId === bead.id && "bg-gt-surface border-l-2 border-gt-accent"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {getReviewStatusIcon(bead.status)}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{bead.title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gt-muted flex-wrap">
                          <span className="font-mono">{bead.id}</span>
                          {metadata.sourceBranch && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <GitBranch size={10} />
                                {metadata.sourceBranch.split("/").pop()}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gt-muted">
                          {bead.assignee && (
                            <span className="flex items-center gap-1">
                              <User size={12} />
                              {bead.assignee.split("/").pop()}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatRelativeTime(bead.updated_at || bead.created_at)}
                          </span>
                        </div>
                      </div>
                      <span className={cn("px-2 py-1 text-xs rounded", getReviewStatusColor(bead.status))}>
                        {getReviewStatusLabel(bead.status)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="flex-1 overflow-y-auto">
          {selectedBeadId && selectedBead ? (
            <MRDetail bead={selectedBead} isLoading={isLoadingBead} />
          ) : (
            <div className="flex items-center justify-center h-full text-gt-muted">
              <p>Select a merge request to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MRDetail({ bead, isLoading }: { bead: Bead; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="animate-spin text-gt-muted" size={24} />
      </div>
    );
  }

  const metadata = parseMRMetadata(bead);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gt-border p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {getReviewStatusIcon(bead.status)}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-gt-muted">{bead.id}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded", getReviewStatusColor(bead.status))}>
                  {getReviewStatusLabel(bead.status)}
                </span>
              </div>
              <h2 className="text-xl font-semibold mt-1">{bead.title}</h2>
            </div>
          </div>
        </div>

        {/* Branch info */}
        {(metadata.sourceBranch || metadata.targetBranch) && (
          <div className="flex items-center gap-2 text-sm">
            <GitBranch size={14} className="text-gt-muted" />
            {metadata.sourceBranch && (
              <span className="font-mono bg-gt-surface px-2 py-0.5 rounded text-blue-400">
                {metadata.sourceBranch}
              </span>
            )}
            {metadata.targetBranch && (
              <>
                <span className="text-gt-muted">→</span>
                <span className="font-mono bg-gt-surface px-2 py-0.5 rounded text-green-400">
                  {metadata.targetBranch}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Description */}
        <div>
          <h3 className="text-sm font-semibold text-gt-muted uppercase mb-2">
            Description
          </h3>
          {bead.description ? (
            <div className="prose prose-invert max-w-none bg-gt-surface border border-gt-border rounded-lg p-4">
              <p className="whitespace-pre-wrap text-sm">{bead.description}</p>
            </div>
          ) : (
            <p className="text-gt-muted italic">No description provided</p>
          )}
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-4">
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
              Created By
            </h3>
            <div className="flex items-center gap-2">
              <User size={16} className="text-gt-muted" />
              <span>{bead.created_by || "Unknown"}</span>
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

        {/* Linked Issue */}
        {metadata.linkedIssue && (
          <div>
            <h3 className="text-sm font-semibold text-gt-muted uppercase mb-2">
              Linked Issue
            </h3>
            <div className="bg-gt-surface border border-gt-border rounded-lg p-3">
              <span className="font-mono text-blue-400">{metadata.linkedIssue}</span>
            </div>
          </div>
        )}

        {/* Commits */}
        {metadata.commits && metadata.commits.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gt-muted uppercase mb-2">
              Commits
            </h3>
            <div className="bg-gt-surface border border-gt-border rounded-lg p-3 space-y-2">
              {metadata.commits.map((commit, i) => (
                <div key={i} className="flex items-center gap-2 text-sm font-mono">
                  <span className="text-yellow-400">{commit.slice(0, 7)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  className="px-2 py-1 text-sm bg-gt-border rounded-full"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
