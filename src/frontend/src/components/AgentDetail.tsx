import { Terminal, MessageSquare, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentRuntime } from "@/types/api";

interface AgentDetailProps {
	agent: AgentRuntime;
	onNudge: (address: string) => void;
	onTerminal: (address: string) => void;
	onRemove: (address: string) => void;
	onNuke: (address: string) => void;
}

export function AgentDetail({
	agent,
	onNudge,
	onTerminal,
	onRemove,
	onNuke,
}: AgentDetailProps) {
	const getRoleColor = (role: string) => {
		switch (role) {
			case "mayor":
				return "bg-purple-900/50 text-purple-300";
			case "deacon":
				return "bg-blue-900/50 text-blue-300";
			case "witness":
				return "bg-cyan-900/50 text-cyan-300";
			case "refinery":
				return "bg-amber-900/50 text-amber-300";
			case "polecat":
				return "bg-green-900/50 text-green-300";
			case "crew":
				return "bg-pink-900/50 text-pink-300";
			default:
				return "bg-gray-800 text-gray-300";
		}
	};

	const isPolecat = agent.role === "polecat";

	return (
		<div className="h-full flex flex-col bg-gt-bg">
			{/* Header */}
			<div className="p-6 border-b border-gt-border">
				<div className="flex items-start justify-between mb-4">
					<div>
						<div className="flex items-center gap-3 mb-2">
							<div
								className={cn(
									"w-3 h-3 rounded-full",
									agent.running ? "bg-green-400" : "bg-gray-500",
								)}
							/>
							<h2 className="text-2xl font-semibold">{agent.name}</h2>
							<span className={cn("text-sm px-3 py-1 rounded", getRoleColor(agent.role))}>
								{agent.role}
							</span>
						</div>
						<p className="text-sm text-gt-muted font-mono">{agent.address}</p>
					</div>
					{agent.state && (
						<span className="px-3 py-1 text-sm bg-gt-surface rounded border border-gt-border">
							{agent.state}
						</span>
					)}
				</div>

				{/* Quick Stats */}
				<div className="grid grid-cols-2 gap-4 mt-4">
					<div className="bg-gt-surface rounded-lg p-3 border border-gt-border">
						<div className="text-xs text-gt-muted mb-1">Status</div>
						<div className="font-medium">
							{agent.running ? "Running" : "Stopped"}
						</div>
					</div>
					<div className="bg-gt-surface rounded-lg p-3 border border-gt-border">
						<div className="text-xs text-gt-muted mb-1">Session</div>
						<div className="font-mono text-sm truncate">{agent.session}</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-6 space-y-6">
				{/* Work Info */}
				{agent.has_work && (
					<div className="bg-gt-surface rounded-lg p-4 border border-gt-border">
						<h3 className="text-sm font-medium text-gt-muted mb-2">Current Work</h3>
						<div className="flex items-start gap-2">
							<span className="text-blue-400">📌</span>
							<div className="flex-1">
								<p className="font-medium">{agent.work_title || "Untitled"}</p>
								{agent.hook_bead && (
									<p className="text-sm text-gt-muted mt-1">Bead: {agent.hook_bead}</p>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Mail Info */}
				{agent.unread_mail > 0 && (
					<div className="bg-amber-900/20 rounded-lg p-4 border border-amber-500/30">
						<h3 className="text-sm font-medium text-amber-300 mb-2">
							Unread Mail ({agent.unread_mail})
						</h3>
						{agent.first_subject && (
							<p className="text-sm text-amber-200/80">
								Latest: {agent.first_subject}
							</p>
						)}
					</div>
				)}

				{/* Actions */}
				<div>
					<h3 className="text-sm font-medium text-gt-muted mb-3">Actions</h3>
					<div className="grid grid-cols-2 gap-2">
						<button
							onClick={() => onTerminal(agent.address)}
							className="flex items-center justify-center gap-2 px-4 py-3 bg-gt-surface hover:bg-gt-border rounded-lg transition-colors border border-gt-border"
						>
							<Terminal size={18} />
							<span>Terminal</span>
						</button>
						<button
							onClick={() => onNudge(agent.address)}
							className="flex items-center justify-center gap-2 px-4 py-3 bg-gt-surface hover:bg-gt-border rounded-lg transition-colors border border-gt-border"
						>
							<MessageSquare size={18} />
							<span>Nudge</span>
						</button>
					</div>
				</div>

				{/* Polecat-specific actions */}
				{isPolecat && (
					<div>
						<h3 className="text-sm font-medium text-gt-muted mb-3">
							Polecat Management
						</h3>
						<div className="space-y-2">
							<button
								onClick={() => onRemove(agent.address)}
								className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gt-surface hover:bg-gt-border rounded-lg transition-colors border border-gt-border text-orange-400"
							>
								<Trash2 size={18} />
								<span>Remove (graceful)</span>
							</button>
							<button
								onClick={() => onNuke(agent.address)}
								className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-900/20 hover:bg-red-900/30 rounded-lg transition-colors border border-red-500/30 text-red-400"
							>
								<AlertTriangle size={18} />
								<span>Nuke (force)</span>
							</button>
						</div>
						<p className="text-xs text-gt-muted mt-2">
							Remove gracefully stops the polecat. Nuke forcefully destroys it including
							worktree and branch.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
