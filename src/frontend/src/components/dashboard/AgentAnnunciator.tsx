import { Activity, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RigStatus, AgentRuntime } from "@/types/api";
import { AgentTile, getAgentStatus } from "./AgentTile";

export interface AgentAnnunciatorProps {
	rigs: RigStatus[];
	onAgentClick?: (agent: AgentRuntime, rigName: string) => void;
}

/**
 * AgentAnnunciator - SCADA-style annunciator panel showing agent status tiles.
 *
 * Displays a grid of backlit tiles, each representing an agent. The panel
 * header shows aggregate status (working/fault/idle counts) with an overall
 * status indicator.
 */
export function AgentAnnunciator({ rigs, onAgentClick }: AgentAnnunciatorProps) {
	// Collect all agents with their rig info
	const agentsWithRig: { agent: AgentRuntime; rigName: string }[] = [];
	for (const rig of rigs) {
		if (rig.agents) {
			for (const agent of rig.agents) {
				agentsWithRig.push({ agent, rigName: rig.name });
			}
		}
	}

	// Sort: working first, then fault, then idle, then offline
	agentsWithRig.sort((a, b) => {
		const statusOrder = { working: 0, fault: 1, idle: 2, offline: 3 };
		const aStatus = getAgentStatus(a.agent);
		const bStatus = getAgentStatus(b.agent);
		return statusOrder[aStatus] - statusOrder[bStatus];
	});

	// Calculate aggregate stats
	const stats = agentsWithRig.reduce(
		(acc, { agent }) => {
			const status = getAgentStatus(agent);
			acc[status]++;
			acc.total++;
			return acc;
		},
		{ working: 0, idle: 0, fault: 0, offline: 0, total: 0 }
	);

	// Overall status: fault if any faults, working if any working, otherwise idle
	const overallStatus = stats.fault > 0 ? "fault" : stats.working > 0 ? "ok" : "idle";

	if (agentsWithRig.length === 0) {
		return (
			<div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex-1 overflow-hidden flex flex-col">
				<div className="flex items-center gap-2 mb-4">
					<Activity size={16} className="text-cyan-400" />
					<span className="text-sm font-semibold text-slate-200">Agent Status</span>
				</div>
				<div className="flex-1 flex items-center justify-center">
					<span className="text-sm text-slate-500">No agents running</span>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex-1 overflow-hidden flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2">
					<Activity size={16} className="text-cyan-400" />
					<span className="text-sm font-semibold text-slate-200">Agent Status</span>
					<span className="text-xs text-slate-400">({stats.total} agents)</span>
				</div>

				{/* Summary stats */}
				<div className="flex items-center gap-3">
					{stats.working > 0 && (
						<div className="flex items-center gap-1 text-xs">
							<span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
							<span className="text-green-400 font-mono">{stats.working}</span>
							<span className="text-slate-500">work</span>
						</div>
					)}
					{stats.fault > 0 && (
						<div className="flex items-center gap-1 text-xs">
							<span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
							<span className="text-red-400 font-mono">{stats.fault}</span>
							<span className="text-slate-500">fault</span>
						</div>
					)}
					{stats.idle > 0 && (
						<div className="flex items-center gap-1 text-xs">
							<span className="w-2 h-2 rounded-full bg-amber-500/60" />
							<span className="text-amber-400 font-mono">{stats.idle}</span>
							<span className="text-slate-500">idle</span>
						</div>
					)}

					{/* Overall status indicator */}
					<div className={cn(
						"flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase",
						overallStatus === "ok" && "bg-green-900/50 text-green-400",
						overallStatus === "fault" && "bg-red-900/50 text-red-400 animate-pulse",
						overallStatus === "idle" && "bg-slate-800 text-slate-400"
					)}>
						{overallStatus === "ok" && <CheckCircle2 size={12} />}
						{overallStatus === "fault" && <AlertTriangle size={12} />}
						<span>{overallStatus === "ok" ? "OK" : overallStatus === "fault" ? "ALERT" : "IDLE"}</span>
					</div>
				</div>
			</div>

			{/* Tile grid */}
			<div className="overflow-y-auto flex-1 px-1">
				<div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 justify-items-center py-2">
					{agentsWithRig.map(({ agent, rigName }) => (
						<AgentTile
							key={`${rigName}-${agent.name}`}
							agent={agent}
							rigName={rigName}
							onClick={() => onAgentClick?.(agent, rigName)}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
