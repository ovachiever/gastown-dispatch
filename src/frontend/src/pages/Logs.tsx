import { useState } from "react";
import { RefreshCw, Download, Search, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

type LogSource = "deacon" | "mayor" | "witness" | "refinery" | "polecat";

export default function Logs() {
  const [source, setSource] = useState<LogSource>("deacon");
  const [search, setSearch] = useState("");

  // TODO: Implement log streaming via SSE
  const logs: string[] = [];
  const isLoading = false;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gt-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold">Logs</h1>
            <p className="text-sm text-gt-muted">
              Real-time logs from Gas Town agents
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-lg bg-gt-surface hover:bg-gt-border transition-colors"
              title="Download"
            >
              <Download size={18} />
            </button>
            <button
              className="p-2 rounded-lg bg-gt-surface hover:bg-gt-border transition-colors"
              title="Refresh"
            >
              <RefreshCw size={18} className={cn(isLoading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Source selector */}
        <div className="flex items-center gap-4">
          <div className="flex bg-gt-surface border border-gt-border rounded-lg overflow-hidden">
            {(["deacon", "mayor", "witness", "refinery", "polecat"] as LogSource[]).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={cn(
                    "px-3 py-1.5 text-sm capitalize transition-colors",
                    source === s
                      ? "bg-gt-accent text-black"
                      : "hover:bg-gt-border"
                  )}
                >
                  {s}
                </button>
              )
            )}
          </div>

          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gt-muted"
              size={16}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter logs..."
              className="w-full bg-gt-surface border border-gt-border rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-gt-accent"
            />
          </div>
        </div>
      </div>

      {/* Log content */}
      <div className="flex-1 overflow-auto p-4 font-mono text-sm">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <ScrollText className="mx-auto text-gt-muted mb-4" size={48} />
              <p className="text-gt-muted mb-2">No logs available</p>
              <p className="text-sm text-gt-muted">
                Log streaming will be implemented in a future update.
              </p>
              <p className="text-sm text-gt-muted mt-4">
                For now, use: <code className="bg-gt-surface px-2 py-0.5 rounded">gt log {source}</code>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((line, i) => (
              <div
                key={i}
                className={cn(
                  "py-0.5",
                  line.includes("ERROR") && "text-red-400",
                  line.includes("WARN") && "text-yellow-400"
                )}
              >
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
