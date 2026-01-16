import { useMemo } from "react";
import { Users, CheckCircle2, AlertTriangle } from "lucide-react";
import type { AgentRuntime, RigStatus } from "@/types/api";
import { AgentTile, getAgentStatus } from "./AgentTile";

export interface AgentAnnunciatorProps {
	rigs: RigStatus[];
	onAgentClick?: (agent: AgentRuntime, rigName: string) => void;
}

export function AgentAnnunciator({ rigs, onAgentClick }: AgentAnnunciatorProps) {
	// Build a map of agent -> rig for display
	const agentRigMap = useMemo(() => {
		const map = new Map<string, string>();
		for (const rig of rigs) {
			for (const agent of rig.agents || []) {
				map.set(agent.name, rig.name);
			}
		}
		return map;
	}, [rigs]);

	// Collect all agents from rigs (includes polecats and crew)
	const allAgents = useMemo(() => {
		const agents: AgentRuntime[] = [];
		for (const rig of rigs) {
			for (const agent of rig.agents || []) {
				agents.push(agent);
			}
		}
		// Sort: working first, then idle, then offline, then by name
		return agents.sort((a, b) => {
			const statusOrder = { working: 0, error: 1, idle: 2, offline: 3 };
			const aStatus = getAgentStatus(a);
			const bStatus = getAgentStatus(b);
			if (statusOrder[aStatus] !== statusOrder[bStatus]) {
				return statusOrder[aStatus] - statusOrder[bStatus];
			}
			return a.name.localeCompare(b.name);
		});
	}, [rigs]);

	// Calculate overall status
	const statusSummary = useMemo(() => {
		const counts = { working: 0, idle: 0, error: 0, offline: 0 };
		for (const agent of allAgents) {
			counts[getAgentStatus(agent)]++;
		}
		return counts;
	}, [allAgents]);

	const hasIssues = statusSummary.error > 0;
	const hasWorking = statusSummary.working > 0;

	return (
		<div
			className="bg-slate-900/60 border-2 border-slate-600 rounded-lg p-4 flex-1 overflow-hidden flex flex-col"
			role="region"
			aria-label="Agent Status Annunciator Panel"
		>
			{/* Header */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2">
					<Users size={16} className="text-cyan-400" />
					<span className="text-sm font-semibold text-slate-200">Agent Status</span>
					<span className="text-xs text-slate-400">({allAgents.length} agents)</span>
				</div>

				{/* Overall status indicator */}
				<div className="flex items-center gap-2">
					{hasIssues ? (
						<span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-red-900/50 text-red-400 rounded-full">
							<AlertTriangle size={12} />
							{statusSummary.error} FAULT
						</span>
					) : hasWorking ? (
						<span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-900/50 text-green-400 rounded-full animate-pulse">
							<CheckCircle2 size={12} />
							OK
						</span>
					) : (
						<span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full">
							IDLE
						</span>
					)}

					{/* Mini status counts */}
					<div className="flex items-center gap-1.5 text-[10px] font-mono">
						<span className="text-green-400" title="Working">{statusSummary.working}w</span>
						<span className="text-amber-400" title="Idle">{statusSummary.idle}i</span>
						{statusSummary.error > 0 && (
							<span className="text-red-400" title="Error">{statusSummary.error}e</span>
						)}
					</div>
				</div>
			</div>

			{/* Agent grid */}
			<div className="overflow-y-auto flex-1">
				{allAgents.length === 0 ? (
					<div className="text-sm text-slate-500 text-center py-8">
						No agents running
					</div>
				) : (
					<div
						className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
						role="list"
						aria-label="Agent tiles"
					>
						{allAgents.map((agent) => (
							<div key={`${agent.name}-${agentRigMap.get(agent.name)}`} role="listitem">
								<AgentTile
									agent={agent}
									rigName={agentRigMap.get(agent.name) || "unknown"}
									onClick={() => onAgentClick?.(agent, agentRigMap.get(agent.name) || "unknown")}
								/>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Legend */}
			<div
				className="flex items-center justify-end gap-4 mt-3 pt-2 border-t border-slate-700 text-[10px]"
				role="legend"
				aria-label="Status color legend"
			>
				<div className="flex items-center gap-1" title="Agent is actively working on a task">
					<div className="w-2 h-2 rounded-full bg-green-400" aria-hidden="true" />
					<span className="text-slate-400">Working</span>
				</div>
				<div className="flex items-center gap-1" title="Agent is running but has no assigned work">
					<div className="w-2 h-2 rounded-full bg-amber-400" aria-hidden="true" />
					<span className="text-slate-400">Idle</span>
				</div>
				<div className="flex items-center gap-1" title="Agent has encountered an error or is stuck">
					<div className="w-2 h-2 rounded-full bg-red-400" aria-hidden="true" />
					<span className="text-slate-400">Fault</span>
				</div>
				<div className="flex items-center gap-1" title="Agent process is not running">
					<div className="w-2 h-2 rounded-full bg-slate-600" aria-hidden="true" />
					<span className="text-slate-400">Offline</span>
				</div>
			</div>
		</div>
	);
}
