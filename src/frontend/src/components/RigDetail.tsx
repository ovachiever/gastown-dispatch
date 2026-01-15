import {
	Server,
	Users,
	HardDrive,
	Activity,
	Package,
	Mail,
	Eye,
	Flame,
	Zap,
	ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RigStatus, AgentHookInfo } from "@/types/api";

interface RigDetailProps {
	rig: RigStatus;
	onSelectAgent?: (address: string) => void;
}

export function RigDetail({ rig, onSelectAgent }: RigDetailProps) {
	const agents = rig.agents || [];
	const hooks = rig.hooks || [];
	const runningAgents = agents.filter((a) => a.running).length;
	const workingAgents = agents.filter((a) => a.has_work).length;
	const totalMail = agents.reduce((sum, a) => sum + (a.unread_mail || 0), 0);

	// Get MQ status
	const mq = rig.mq;
	const mqTotal = mq ? mq.pending + mq.in_flight + mq.blocked : 0;

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

	const isActive = rig.polecat_count > 0 || rig.crew_count > 0;

	return (
		<div className="h-full flex flex-col bg-gt-bg">
			{/* Header */}
			<div className="p-6 border-b border-gt-border">
				<div className="flex items-start justify-between mb-4">
					<div>
						<div className="flex items-center gap-3 mb-2">
							<Server
								size={24}
								className={isActive ? "text-blue-400" : "text-slate-500"}
							/>
							<h2 className="text-2xl font-semibold">{rig.name}</h2>
							<div
								className={cn(
									"w-3 h-3 rounded-full",
									isActive ? "bg-green-400" : "bg-gray-500"
								)}
							/>
						</div>
						<div className="flex items-center gap-2">
							{rig.has_witness && (
								<span className="text-xs px-2 py-0.5 rounded bg-cyan-900/50 text-cyan-300 flex items-center gap-1">
									<Eye size={12} />
									Witness
								</span>
							)}
							{rig.has_refinery && (
								<span className="text-xs px-2 py-0.5 rounded bg-amber-900/50 text-amber-300 flex items-center gap-1">
									<Flame size={12} />
									Refinery
								</span>
							)}
						</div>
					</div>
					{mq && (
						<div className="text-right">
							<span
								className={cn(
									"text-xs px-2 py-1 rounded uppercase font-bold",
									mq.state === "processing"
										? "bg-blue-900/50 text-blue-300"
										: mq.state === "blocked"
											? "bg-red-900/50 text-red-300"
											: "bg-slate-800 text-slate-400"
								)}
							>
								{mq.state}
							</span>
						</div>
					)}
				</div>

				{/* Quick Stats */}
				<div className="grid grid-cols-4 gap-3 mt-4">
					<div className="bg-gt-surface rounded-lg p-3 border border-gt-border">
						<div className="text-xs text-gt-muted mb-1 flex items-center gap-1">
							<Users size={12} />
							Workers
						</div>
						<div className="font-medium">
							{rig.polecat_count} polecats, {rig.crew_count} crew
						</div>
					</div>
					<div className="bg-gt-surface rounded-lg p-3 border border-gt-border">
						<div className="text-xs text-gt-muted mb-1 flex items-center gap-1">
							<Activity size={12} />
							Running
						</div>
						<div className="font-medium">
							{runningAgents}/{agents.length} agents
						</div>
					</div>
					<div className="bg-gt-surface rounded-lg p-3 border border-gt-border">
						<div className="text-xs text-gt-muted mb-1 flex items-center gap-1">
							<Zap size={12} />
							Working
						</div>
						<div className={cn("font-medium", workingAgents > 0 && "text-green-400")}>
							{workingAgents} active
						</div>
					</div>
					<div className="bg-gt-surface rounded-lg p-3 border border-gt-border">
						<div className="text-xs text-gt-muted mb-1 flex items-center gap-1">
							<Mail size={12} />
							Mail
						</div>
						<div className={cn("font-medium", totalMail > 0 && "text-purple-400")}>
							{totalMail} unread
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-6 space-y-6">
				{/* Message Queue */}
				{mq && mqTotal > 0 && (
					<div className="bg-gt-surface rounded-lg p-4 border border-gt-border">
						<h3 className="text-sm font-medium text-gt-muted mb-3 flex items-center gap-2">
							<HardDrive size={14} />
							Message Queue
						</h3>
						<div className="flex items-center gap-4">
							<div className="flex-1 h-4 bg-black/30 rounded overflow-hidden flex">
								{mq.pending > 0 && (
									<div
										className="bg-green-500 h-full"
										style={{ width: `${(mq.pending / mqTotal) * 100}%` }}
										title={`${mq.pending} pending`}
									/>
								)}
								{mq.in_flight > 0 && (
									<div
										className="bg-blue-500 h-full"
										style={{ width: `${(mq.in_flight / mqTotal) * 100}%` }}
										title={`${mq.in_flight} in flight`}
									/>
								)}
								{mq.blocked > 0 && (
									<div
										className="bg-red-500 h-full"
										style={{ width: `${(mq.blocked / mqTotal) * 100}%` }}
										title={`${mq.blocked} blocked`}
									/>
								)}
							</div>
							<div className="text-xs text-gt-muted space-x-3">
								<span className="text-green-400">{mq.pending}p</span>
								<span className="text-blue-400">{mq.in_flight}f</span>
								<span className="text-red-400">{mq.blocked}b</span>
							</div>
						</div>
					</div>
				)}

				{/* Hooks / Active Work */}
				<div className="bg-gt-surface rounded-lg p-4 border border-gt-border">
					<h3 className="text-sm font-medium text-gt-muted mb-3 flex items-center gap-2">
						<Zap size={14} className="text-yellow-400" />
						Active Hooks
						{hooks.filter((h) => h.has_work).length > 0 && (
							<span className="text-xs px-1.5 py-0.5 bg-yellow-900/50 text-yellow-300 rounded-full">
								{hooks.filter((h) => h.has_work).length}
							</span>
						)}
					</h3>

					{hooks.length === 0 ? (
						<p className="text-sm text-gt-muted">No hooks configured</p>
					) : hooks.filter((h) => h.has_work).length === 0 ? (
						<p className="text-sm text-gt-muted">No active work on hooks</p>
					) : (
						<div className="space-y-3">
							{hooks
								.filter((h) => h.has_work)
								.map((hook) => (
									<HookCard key={hook.agent} hook={hook} />
								))}
						</div>
					)}
				</div>

				{/* Molecule Progress */}
				{hooks.some((h) => h.molecule) && (
					<div className="bg-gt-surface rounded-lg p-4 border border-gt-border">
						<h3 className="text-sm font-medium text-gt-muted mb-3 flex items-center gap-2">
							<Package size={14} className="text-purple-400" />
							Molecule Progress
						</h3>
						<div className="space-y-2">
							{hooks
								.filter((h) => h.molecule)
								.map((hook) => (
									<MoleculeCard key={hook.agent} hook={hook} />
								))}
						</div>
					</div>
				)}

				{/* Agents */}
				{agents.length > 0 && (
					<div className="bg-gt-surface rounded-lg p-4 border border-gt-border">
						<h3 className="text-sm font-medium text-gt-muted mb-3 flex items-center gap-2">
							<Users size={14} />
							Agents ({agents.length})
						</h3>
						<div className="space-y-2">
							{agents.map((agent) => (
								<button
									key={agent.address}
									onClick={() => onSelectAgent?.(agent.address)}
									className="w-full flex items-center justify-between p-2 rounded hover:bg-gt-border/50 transition-colors text-left"
								>
									<div className="flex items-center gap-3">
										<div
											className={cn(
												"w-2 h-2 rounded-full",
												agent.running ? "bg-green-400" : "bg-gray-500"
											)}
										/>
										<span className="font-medium">{agent.name}</span>
										<span className={cn("text-xs px-2 py-0.5 rounded", getRoleColor(agent.role))}>
											{agent.role}
										</span>
									</div>
									<div className="flex items-center gap-2 text-gt-muted">
										{agent.has_work && (
											<span className="text-xs text-green-400">working</span>
										)}
										{agent.unread_mail > 0 && (
											<span className="text-xs text-purple-400">
												{agent.unread_mail} mail
											</span>
										)}
										<ChevronRight size={14} />
									</div>
								</button>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function HookCard({ hook }: { hook: AgentHookInfo }) {
	const getRoleColor = (role: string) => {
		switch (role) {
			case "polecat":
				return "text-green-400";
			case "crew":
				return "text-pink-400";
			default:
				return "text-slate-400";
		}
	};

	return (
		<div className="bg-gt-bg rounded-lg p-3 border border-gt-border">
			<div className="flex items-start justify-between">
				<div className="flex-1">
					<div className="flex items-center gap-2 mb-1">
						<span className={cn("text-sm font-medium", getRoleColor(hook.role))}>
							{hook.agent}
						</span>
						<span className="text-xs px-1.5 py-0.5 bg-green-900/30 text-green-400 rounded">
							WORKING
						</span>
					</div>
					{hook.title && (
						<p className="text-sm text-gt-text">{hook.title}</p>
					)}
				</div>
			</div>
		</div>
	);
}

function MoleculeCard({ hook }: { hook: AgentHookInfo }) {
	return (
		<div className="flex items-center gap-3 p-2 bg-gt-bg rounded border border-gt-border">
			<Package size={16} className="text-purple-400 flex-shrink-0" />
			<div className="flex-1 min-w-0">
				<div className="text-xs text-gt-muted">{hook.agent}</div>
				<div className="text-sm font-mono text-purple-300 truncate">
					{hook.molecule}
				</div>
			</div>
			<div className="flex items-center gap-1">
				<div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
				<span className="text-xs text-purple-400">active</span>
			</div>
		</div>
	);
}
