import { useSearchParams } from "react-router-dom";
import { GitMerge, Clock, Loader2 } from "lucide-react";

export default function MergeQueue() {
  const [searchParams] = useSearchParams();
  const rigFilter = searchParams.get("rig");

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <GitMerge className="text-purple-400" size={24} />
            Merge Queue
          </h2>
          <p className="text-sm text-gt-muted mt-1">
            Approved PRs queued for merge
            {rigFilter && <span className="ml-2 text-gt-accent">• Filtered by {rigFilter}</span>}
          </p>
        </div>
      </div>

      {/* Placeholder content */}
      <div className="bg-gt-surface border border-gt-border rounded-lg p-8 text-center">
        <GitMerge className="mx-auto text-gt-muted mb-4" size={48} />
        <h3 className="text-lg font-medium mb-2">Merge Queue UI</h3>
        <p className="text-gt-muted max-w-md mx-auto">
          This page will display the merge queue with position tracking,
          estimated merge times, and conflict detection.
        </p>
        <p className="text-xs text-gt-muted mt-4">
          Implementation pending: gtdispat-mp5
        </p>
      </div>

      {/* Example structure for future implementation */}
      <div className="space-y-2 opacity-50">
        <h3 className="text-sm font-semibold text-gt-muted uppercase">
          Queue Position
        </h3>
        {[1].map((i) => (
          <div
            key={i}
            className="bg-gt-surface border border-gt-border rounded-lg p-4 flex items-center gap-4"
          >
            <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              {i}
            </div>
            <div className="flex-1">
              <div className="font-medium">Example PR in queue</div>
              <div className="text-sm text-gt-muted flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  Est. 5 min
                </span>
                <span className="flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" />
                  Running checks
                </span>
              </div>
            </div>
            <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded">
              Queued
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
