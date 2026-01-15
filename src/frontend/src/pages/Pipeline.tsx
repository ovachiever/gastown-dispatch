import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  GitPullRequest,
  GitMerge,
  TestTube,
  Rocket,
  Activity,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const pipelineStages = [
  { to: "/pipeline/reviews", icon: GitPullRequest, label: "Reviews", color: "text-blue-400" },
  { to: "/pipeline/merge-queue", icon: GitMerge, label: "Merge Queue", color: "text-purple-400" },
  { to: "/pipeline/tests", icon: TestTube, label: "Tests", color: "text-yellow-400" },
  { to: "/pipeline/deployments", icon: Rocket, label: "Deployments", color: "text-green-400" },
  { to: "/pipeline/monitoring", icon: Activity, label: "Monitoring", color: "text-orange-400" },
];

export default function Pipeline() {
  const location = useLocation();
  const isOverview = location.pathname === "/pipeline";

  return (
    <div className="flex flex-col h-full">
      {/* Header with stage tabs */}
      <div className="border-b border-gt-border">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-semibold">Pipeline</h1>
          <p className="text-sm text-gt-muted">
            Track code from review to production
          </p>
        </div>

        {/* Stage navigation */}
        <div className="flex items-center gap-1 px-6 pb-2 overflow-x-auto">
          <NavLink
            to="/pipeline"
            end
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap",
                isActive
                  ? "bg-gt-surface text-gt-accent"
                  : "text-gt-muted hover:text-gt-text hover:bg-gt-surface/50"
              )
            }
          >
            Overview
          </NavLink>
          {pipelineStages.map((stage, index) => (
            <div key={stage.to} className="flex items-center">
              {index > 0 || true ? (
                <ArrowRight size={14} className="mx-1 text-gt-border" />
              ) : null}
              <NavLink
                to={stage.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-gt-surface text-gt-accent"
                      : "text-gt-muted hover:text-gt-text hover:bg-gt-surface/50"
                  )
                }
              >
                <stage.icon size={16} className={stage.color} />
                {stage.label}
              </NavLink>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isOverview ? <PipelineOverview /> : <Outlet />}
      </div>
    </div>
  );
}

function PipelineOverview() {
  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Flow visualization */}
      <div className="bg-gt-surface border border-gt-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Pipeline Flow</h2>
        <div className="flex items-center justify-between">
          {pipelineStages.map((stage, index) => (
            <div key={stage.to} className="flex items-center">
              <NavLink
                to={stage.to}
                className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gt-border/50 transition-colors group"
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center bg-gt-background border-2 border-gt-border group-hover:border-gt-accent transition-colors",
                    stage.color
                  )}
                >
                  <stage.icon size={24} />
                </div>
                <span className="text-sm font-medium">{stage.label}</span>
                <StageStatus stage={stage.label} />
              </NavLink>
              {index < pipelineStages.length - 1 && (
                <ArrowRight size={24} className="text-gt-border mx-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stage summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pipelineStages.map((stage) => (
          <NavLink
            key={stage.to}
            to={stage.to}
            className="bg-gt-surface border border-gt-border rounded-lg p-4 hover:border-gt-accent transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              <stage.icon size={20} className={stage.color} />
              <h3 className="font-semibold">{stage.label}</h3>
            </div>
            <StageSummary stage={stage.label} />
          </NavLink>
        ))}
      </div>
    </div>
  );
}

function StageStatus({ stage }: { stage: string }) {
  // Placeholder - will be replaced with real data
  const statuses: Record<string, { count: number; status: string }> = {
    Reviews: { count: 3, status: "pending" },
    "Merge Queue": { count: 1, status: "queued" },
    Tests: { count: 2, status: "running" },
    Deployments: { count: 0, status: "idle" },
    Monitoring: { count: 0, status: "healthy" },
  };

  const data = statuses[stage] || { count: 0, status: "unknown" };

  return (
    <span className="text-xs text-gt-muted">
      {data.count > 0 ? `${data.count} ${data.status}` : data.status}
    </span>
  );
}

function StageSummary({ stage }: { stage: string }) {
  // Placeholder summaries - will be replaced with real data
  const summaries: Record<string, string> = {
    Reviews: "3 PRs awaiting review, 1 approved",
    "Merge Queue": "1 PR in queue, estimated 5 min",
    Tests: "2 test runs in progress",
    Deployments: "Last deployment: 2h ago",
    Monitoring: "All systems operational",
  };

  return (
    <p className="text-sm text-gt-muted">
      {summaries[stage] || "No data available"}
    </p>
  );
}
