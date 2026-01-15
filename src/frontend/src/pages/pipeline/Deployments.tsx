import { Rocket, CheckCircle, Clock, Server, Globe } from "lucide-react";

export default function Deployments() {
  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Rocket className="text-green-400" size={24} />
            Deployments
          </h2>
          <p className="text-sm text-gt-muted mt-1">
            Deployment history and status
          </p>
        </div>
      </div>

      {/* Placeholder content */}
      <div className="bg-gt-surface border border-gt-border rounded-lg p-8 text-center">
        <Rocket className="mx-auto text-gt-muted mb-4" size={48} />
        <h3 className="text-lg font-medium mb-2">Deployment UI</h3>
        <p className="text-gt-muted max-w-md mx-auto">
          This page will display deployment history, rollback controls,
          environment status, and deployment triggers.
        </p>
        <p className="text-xs text-gt-muted mt-4">
          Implementation pending: gtdispat-9cn
        </p>
      </div>

      {/* Example structure for future implementation */}
      <div className="space-y-4 opacity-50">
        <h3 className="text-sm font-semibold text-gt-muted uppercase">
          Environments
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: "Production", status: "deployed", version: "v1.2.3", time: "2h ago" },
            { name: "Staging", status: "deployed", version: "v1.2.4", time: "30m ago" },
          ].map((env) => (
            <div
              key={env.name}
              className="bg-gt-surface border border-gt-border rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-green-400" />
                  <span className="font-medium">{env.name}</span>
                </div>
                <CheckCircle size={16} className="text-green-400" />
              </div>
              <div className="text-sm text-gt-muted flex items-center gap-4">
                <span>{env.version}</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {env.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-sm font-semibold text-gt-muted uppercase mt-6">
          Recent Deployments
        </h3>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-gt-surface border border-gt-border rounded-lg p-4 flex items-center gap-4"
          >
            <CheckCircle className="text-green-400" size={20} />
            <div className="flex-1">
              <div className="font-medium">Deploy v1.2.{4 - i}</div>
              <div className="text-sm text-gt-muted flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1">
                  <Server size={12} />
                  Production
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {i * 2}h ago
                </span>
              </div>
            </div>
            <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">
              Success
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
