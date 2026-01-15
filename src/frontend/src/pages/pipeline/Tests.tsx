import { TestTube, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

export default function Tests() {
  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TestTube className="text-yellow-400" size={24} />
            Test Results
          </h2>
          <p className="text-sm text-gt-muted mt-1">
            CI/CD test runs and results
          </p>
        </div>
      </div>

      {/* Placeholder content */}
      <div className="bg-gt-surface border border-gt-border rounded-lg p-8 text-center">
        <TestTube className="mx-auto text-gt-muted mb-4" size={48} />
        <h3 className="text-lg font-medium mb-2">Test Results UI</h3>
        <p className="text-gt-muted max-w-md mx-auto">
          This page will display test run results, failure analysis,
          test coverage metrics, and historical trends.
        </p>
        <p className="text-xs text-gt-muted mt-4">
          Implementation pending: gtdispat-wz2
        </p>
      </div>

      {/* Example structure for future implementation */}
      <div className="space-y-2 opacity-50">
        <h3 className="text-sm font-semibold text-gt-muted uppercase">
          Recent Test Runs
        </h3>
        {[
          { status: "running", icon: Loader2, color: "text-yellow-400", bg: "bg-yellow-500/20" },
          { status: "passed", icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/20" },
          { status: "failed", icon: XCircle, color: "text-red-400", bg: "bg-red-500/20" },
        ].map((run, i) => (
          <div
            key={i}
            className="bg-gt-surface border border-gt-border rounded-lg p-4 flex items-center gap-4"
          >
            <run.icon
              className={`${run.color} ${run.status === "running" ? "animate-spin" : ""}`}
              size={20}
            />
            <div className="flex-1">
              <div className="font-medium">Test Run #{3 - i}</div>
              <div className="text-sm text-gt-muted flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {i === 0 ? "Running" : `${i * 30}m ago`}
                </span>
                <span>42 tests</span>
              </div>
            </div>
            <span className={`px-2 py-1 text-xs ${run.bg} ${run.color} rounded capitalize`}>
              {run.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
