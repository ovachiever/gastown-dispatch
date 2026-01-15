import { Activity, CheckCircle, Cpu, HardDrive, Wifi } from "lucide-react";

export default function Monitoring() {
  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="text-orange-400" size={24} />
            Production Monitoring
          </h2>
          <p className="text-sm text-gt-muted mt-1">
            System health and performance metrics
          </p>
        </div>
      </div>

      {/* Placeholder content */}
      <div className="bg-gt-surface border border-gt-border rounded-lg p-8 text-center">
        <Activity className="mx-auto text-gt-muted mb-4" size={48} />
        <h3 className="text-lg font-medium mb-2">Monitoring UI</h3>
        <p className="text-gt-muted max-w-md mx-auto">
          This page will display real-time metrics, alerts, error tracking,
          and performance dashboards.
        </p>
        <p className="text-xs text-gt-muted mt-4">
          Implementation pending: gtdispat-lmr
        </p>
      </div>

      {/* Example structure for future implementation */}
      <div className="space-y-4 opacity-50">
        <h3 className="text-sm font-semibold text-gt-muted uppercase">
          System Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: "API", icon: Wifi, status: "healthy", metric: "45ms avg" },
            { name: "Database", icon: HardDrive, status: "healthy", metric: "12ms avg" },
            { name: "Workers", icon: Cpu, status: "healthy", metric: "3 active" },
          ].map((service) => (
            <div
              key={service.name}
              className="bg-gt-surface border border-gt-border rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <service.icon size={16} className="text-orange-400" />
                  <span className="font-medium">{service.name}</span>
                </div>
                <CheckCircle size={16} className="text-green-400" />
              </div>
              <div className="text-sm text-gt-muted">{service.metric}</div>
            </div>
          ))}
        </div>

        <h3 className="text-sm font-semibold text-gt-muted uppercase mt-6">
          Recent Alerts
        </h3>
        <div className="bg-gt-surface border border-gt-border rounded-lg p-4 text-center">
          <CheckCircle className="mx-auto text-green-400 mb-2" size={24} />
          <p className="text-sm text-gt-muted">No active alerts</p>
        </div>

        <h3 className="text-sm font-semibold text-gt-muted uppercase mt-6">
          Key Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Uptime", value: "99.9%" },
            { label: "Requests/min", value: "1.2k" },
            { label: "Error Rate", value: "0.1%" },
            { label: "P95 Latency", value: "120ms" },
          ].map((metric) => (
            <div
              key={metric.label}
              className="bg-gt-surface border border-gt-border rounded-lg p-4 text-center"
            >
              <div className="text-2xl font-bold text-gt-accent">{metric.value}</div>
              <div className="text-sm text-gt-muted">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
