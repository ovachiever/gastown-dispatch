import { GitPullRequest, Clock, User, MessageSquare } from "lucide-react";

export default function Reviews() {
  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <GitPullRequest className="text-blue-400" size={24} />
            Code Reviews
          </h2>
          <p className="text-sm text-gt-muted mt-1">
            Pull requests awaiting review or approval
          </p>
        </div>
      </div>

      {/* Placeholder content */}
      <div className="bg-gt-surface border border-gt-border rounded-lg p-8 text-center">
        <GitPullRequest className="mx-auto text-gt-muted mb-4" size={48} />
        <h3 className="text-lg font-medium mb-2">Code Review UI</h3>
        <p className="text-gt-muted max-w-md mx-auto">
          This page will display pull requests requiring review, with status tracking,
          reviewer assignments, and approval workflows.
        </p>
        <p className="text-xs text-gt-muted mt-4">
          Implementation pending: gtdispat-ct5
        </p>
      </div>

      {/* Example structure for future implementation */}
      <div className="space-y-2 opacity-50">
        <h3 className="text-sm font-semibold text-gt-muted uppercase">
          Awaiting Review
        </h3>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-gt-surface border border-gt-border rounded-lg p-4 flex items-center gap-4"
          >
            <GitPullRequest className="text-blue-400" size={20} />
            <div className="flex-1">
              <div className="font-medium">Example PR #{i}</div>
              <div className="text-sm text-gt-muted flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1">
                  <User size={12} />
                  author
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  2h ago
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare size={12} />
                  0 comments
                </span>
              </div>
            </div>
            <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded">
              Pending
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
