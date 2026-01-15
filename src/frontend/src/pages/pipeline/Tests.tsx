import { useQuery } from "@tanstack/react-query";
import {
  TestTube,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { getBeads, getStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Bead, RigStatus } from "@/types/api";

// Filter beads that are likely test/CI related
function isTestRelated(bead: Bead): boolean {
  const testLabels = ["test", "testing", "ci", "qa", "validation", "verify"];
  const hasTestLabel = bead.labels?.some((label) =>
    testLabels.some((t) => label.toLowerCase().includes(t))
  );
  const hasTestInTitle =
    bead.title.toLowerCase().includes("test") ||
    bead.title.toLowerCase().includes("ci") ||
    bead.title.toLowerCase().includes("validation");
  return hasTestLabel || hasTestInTitle;
}

// Map bead status to test run status
function getTestStatus(bead: Bead): "running" | "passed" | "failed" | "pending" {
  if (bead.status === "in_progress" || bead.status === "hooked") return "running";
  if (bead.status === "closed") return "passed";
  return "pending";
}

function getStatusConfig(status: "running" | "passed" | "failed" | "pending") {
  switch (status) {
    case "running":
      return {
        icon: Loader2,
        color: "text-yellow-400",
        bg: "bg-yellow-500/20",
        animate: true,
      };
    case "passed":
      return {
        icon: CheckCircle,
        color: "text-green-400",
        bg: "bg-green-500/20",
        animate: false,
      };
    case "failed":
      return {
        icon: XCircle,
        color: "text-red-400",
        bg: "bg-red-500/20",
        animate: false,
      };
    default:
      return {
        icon: Clock,
        color: "text-gt-muted",
        bg: "bg-gt-surface",
        animate: false,
      };
  }
}

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

export default function Tests() {
  const { data: statusResponse } = useQuery({
    queryKey: ["status"],
    queryFn: getStatus,
    refetchInterval: 10000,
  });

  const { data: beads, isLoading } = useQuery({
    queryKey: ["beads"],
    queryFn: () => getBeads({ limit: 100 }),
    refetchInterval: 10000,
  });

  const testBeads = beads?.filter(isTestRelated) || [];
  const activeTests = testBeads.filter(
    (b) => b.status === "in_progress" || b.status === "hooked"
  );
  const completedTests = testBeads.filter((b) => b.status === "closed");
  const pendingTests = testBeads.filter((b) => b.status === "open");

  // Get MQ stats from rigs for "test queue" visualization
  const rigs = statusResponse?.status?.rigs || [];
  const totalPending = rigs.reduce((sum, rig) => sum + (rig.mq?.pending || 0), 0);
  const totalInFlight = rigs.reduce(
    (sum, rig) => sum + (rig.mq?.in_flight || 0),
    0
  );

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TestTube className="text-yellow-400" size={24} />
            Test Results
          </h2>
          <p className="text-sm text-gt-muted mt-1">
            CI/CD activity and validation status
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="text-yellow-400" size={16} />
            <span className="text-sm text-gt-muted">Running</span>
          </div>
          <div className="text-2xl font-bold">{activeTests.length}</div>
        </div>
        <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="text-green-400" size={16} />
            <span className="text-sm text-gt-muted">Passed</span>
          </div>
          <div className="text-2xl font-bold text-green-400">
            {completedTests.length}
          </div>
        </div>
        <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="text-gt-muted" size={16} />
            <span className="text-sm text-gt-muted">Pending</span>
          </div>
          <div className="text-2xl font-bold">{pendingTests.length}</div>
        </div>
        <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="text-blue-400" size={16} />
            <span className="text-sm text-gt-muted">In Queue</span>
          </div>
          <div className="text-2xl font-bold">{totalPending + totalInFlight}</div>
        </div>
      </div>

      {/* Test runs list */}
      {isLoading ? (
        <div className="bg-gt-surface border border-gt-border rounded-lg p-8 text-center">
          <Loader2 className="mx-auto text-gt-muted mb-4 animate-spin" size={32} />
          <p className="text-gt-muted">Loading test results...</p>
        </div>
      ) : testBeads.length === 0 ? (
        <div className="bg-gt-surface border border-gt-border rounded-lg p-8 text-center">
          <TestTube className="mx-auto text-gt-muted mb-4" size={48} />
          <h3 className="text-lg font-medium mb-2">No Test Activity</h3>
          <p className="text-gt-muted max-w-md mx-auto">
            No test-related beads found. Test runs will appear here when beads are
            labeled with "test", "ci", or "validation".
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active tests */}
          {activeTests.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gt-muted uppercase mb-2">
                Currently Running
              </h3>
              <div className="space-y-2">
                {activeTests.map((bead) => (
                  <TestRunCard key={bead.id} bead={bead} />
                ))}
              </div>
            </div>
          )}

          {/* Recent completed */}
          {completedTests.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gt-muted uppercase mb-2">
                Recently Completed
              </h3>
              <div className="space-y-2">
                {completedTests.slice(0, 5).map((bead) => (
                  <TestRunCard key={bead.id} bead={bead} />
                ))}
              </div>
            </div>
          )}

          {/* Pending */}
          {pendingTests.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gt-muted uppercase mb-2">
                Queued
              </h3>
              <div className="space-y-2">
                {pendingTests.slice(0, 5).map((bead) => (
                  <TestRunCard key={bead.id} bead={bead} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rig test queues */}
      {rigs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gt-muted uppercase mb-2">
            Rig Queues
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rigs.map((rig) => (
              <RigQueueCard key={rig.name} rig={rig} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TestRunCard({ bead }: { bead: Bead }) {
  const status = getTestStatus(bead);
  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <div className="bg-gt-surface border border-gt-border rounded-lg p-4 flex items-center gap-4">
      <Icon
        className={cn(config.color, config.animate && "animate-spin")}
        size={20}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{bead.title}</div>
        <div className="text-sm text-gt-muted flex items-center gap-4 mt-1">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {bead.updated_at
              ? formatTimeAgo(bead.updated_at)
              : formatTimeAgo(bead.created_at)}
          </span>
          {bead.assignee && <span>{bead.assignee}</span>}
          {bead.labels && bead.labels.length > 0 && (
            <span className="text-xs">{bead.labels.join(", ")}</span>
          )}
        </div>
      </div>
      <span className={cn("px-2 py-1 text-xs rounded capitalize", config.bg, config.color)}>
        {status}
      </span>
    </div>
  );
}

function RigQueueCard({ rig }: { rig: RigStatus }) {
  const mq = rig.mq;
  const healthColor =
    mq?.health === "healthy"
      ? "text-green-400"
      : mq?.health === "stale"
        ? "text-yellow-400"
        : "text-gt-muted";

  return (
    <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium">{rig.name}</span>
        <span className={cn("text-xs capitalize", healthColor)}>
          {mq?.health || "unknown"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold">{mq?.pending || 0}</div>
          <div className="text-xs text-gt-muted">Pending</div>
        </div>
        <div>
          <div className="text-lg font-bold text-yellow-400">
            {mq?.in_flight || 0}
          </div>
          <div className="text-xs text-gt-muted">Running</div>
        </div>
        <div>
          <div className="text-lg font-bold text-red-400">{mq?.blocked || 0}</div>
          <div className="text-xs text-gt-muted">Blocked</div>
        </div>
      </div>
    </div>
  );
}
