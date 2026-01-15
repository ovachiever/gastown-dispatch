import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { AlertTriangle, Clock, User, GitBranch, CheckCircle2 } from "lucide-react";

export interface StallItem {
	id: string;
	name: string;
	type: "agent" | "step";
	duration: string; // Human readable duration like "2h 15m"
	durationMs: number; // Duration in milliseconds for sorting
	title?: string;
	state?: string;
}

export interface StallDetectorProps {
	items: StallItem[];
	thresholdMs?: number; // Threshold in milliseconds (default 30 minutes)
	className?: string;
}

/**
 * Stall Detector - Shows agents/steps with no progress beyond threshold
 * Displays items that have been stuck for longer than the configured threshold
 */
export function StallDetector({
	items,
	thresholdMs = 30 * 60 * 1000, // 30 minutes default
	className,
}: StallDetectorProps) {
	const { stalledItems, warningItems, healthyCount, criticalCount, warningCount } = useMemo(() => {
		// Items over 2x threshold are critical
		const critical = items.filter(item => item.durationMs >= thresholdMs * 2);
		// Items over threshold but under 2x are warnings
		const warning = items.filter(item => item.durationMs >= thresholdMs && item.durationMs < thresholdMs * 2);
		// Items under threshold are healthy (but still tracked)
		const healthy = items.filter(item => item.durationMs < thresholdMs);

		return {
			stalledItems: critical,
			warningItems: warning,
			healthyCount: healthy.length,
			criticalCount: critical.length,
			warningCount: warning.length,
		};
	}, [items, thresholdMs]);

	const allStalled = [...stalledItems, ...warningItems].sort((a, b) => b.durationMs - a.durationMs);
	const hasStalls = allStalled.length > 0;

	const getStatusInfo = () => {
		if (criticalCount > 0) {
			return {
				color: "text-red-400",
				bgColor: "bg-red-900/50",
				borderColor: "border-red-700",
				label: "STALLS DETECTED",
				icon: AlertTriangle,
			};
		}
		if (warningCount > 0) {
			return {
				color: "text-yellow-400",
				bgColor: "bg-yellow-900/50",
				borderColor: "border-yellow-700",
				label: "SLOW PROGRESS",
				icon: Clock,
			};
		}
		return {
			color: "text-green-400",
			bgColor: "bg-green-900/50",
			borderColor: "border-green-700",
			label: "ALL FLOWING",
			icon: CheckCircle2,
		};
	};

	const statusInfo = getStatusInfo();
	const StatusIcon = statusInfo.icon;

	return (
		<div className={cn("bg-slate-900/80 border border-slate-700 rounded-lg p-3", className)}>
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<Clock size={16} className="text-orange-400" />
					<span className="text-sm font-semibold text-slate-200">Stall Detector</span>
				</div>
				<span className={cn(
					"text-xs px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1",
					statusInfo.bgColor,
					statusInfo.color
				)}>
					<StatusIcon size={10} />
					{statusInfo.label}
				</span>
			</div>

			{/* Summary stats */}
			<div className="flex items-center justify-between mb-3 px-2">
				<div className="flex items-center gap-4">
					<div className="text-center">
						<div className={cn(
							"font-mono text-xl font-bold",
							criticalCount > 0 ? "text-red-400" : "text-slate-600"
						)}>
							{criticalCount}
						</div>
						<div className="text-[9px] text-slate-500 uppercase">Critical</div>
					</div>
					<div className="text-center">
						<div className={cn(
							"font-mono text-xl font-bold",
							warningCount > 0 ? "text-yellow-400" : "text-slate-600"
						)}>
							{warningCount}
						</div>
						<div className="text-[9px] text-slate-500 uppercase">Warning</div>
					</div>
					<div className="text-center">
						<div className="font-mono text-xl font-bold text-green-400">
							{healthyCount}
						</div>
						<div className="text-[9px] text-slate-500 uppercase">Healthy</div>
					</div>
				</div>

				{/* Threshold indicator */}
				<div className="text-right">
					<div className="text-[10px] text-slate-500">Threshold</div>
					<div className="font-mono text-sm text-slate-400">
						{formatDuration(thresholdMs)}
					</div>
				</div>
			</div>

			{/* Stalled items list */}
			<div className="max-h-40 overflow-y-auto space-y-1">
				{!hasStalls ? (
					<div className="flex flex-col items-center justify-center py-4 text-slate-500">
						<CheckCircle2 size={24} className="text-green-500 mb-2" />
						<span className="text-xs">No stalls detected</span>
						<span className="text-[10px] text-slate-600">
							{items.length > 0 ? `${items.length} items progressing normally` : "No active work"}
						</span>
					</div>
				) : (
					allStalled.slice(0, 5).map((item) => {
						const isCritical = item.durationMs >= thresholdMs * 2;
						return (
							<div
								key={`${item.type}-${item.id}`}
								className={cn(
									"flex items-center gap-2 px-2 py-1.5 rounded text-xs",
									isCritical
										? "bg-red-900/30 border border-red-800"
										: "bg-yellow-900/20 border border-yellow-800/50"
								)}
							>
								{item.type === "agent" ? (
									<User size={12} className={isCritical ? "text-red-400" : "text-yellow-400"} />
								) : (
									<GitBranch size={12} className={isCritical ? "text-red-400" : "text-yellow-400"} />
								)}

								<div className="flex-1 min-w-0">
									<div className={cn(
										"font-mono truncate",
										isCritical ? "text-red-300" : "text-yellow-300"
									)}>
										{item.name}
									</div>
									{item.title && (
										<div className="text-[10px] text-slate-500 truncate">
											{item.title}
										</div>
									)}
								</div>

								<div className={cn(
									"font-mono text-right flex-shrink-0",
									isCritical ? "text-red-400" : "text-yellow-400"
								)}>
									{item.duration}
								</div>

								{isCritical && (
									<AlertTriangle size={12} className="text-red-400 animate-pulse flex-shrink-0" />
								)}
							</div>
						);
					})
				)}

				{allStalled.length > 5 && (
					<div className="text-center text-[10px] text-slate-500 pt-1">
						+{allStalled.length - 5} more stalled items
					</div>
				)}
			</div>
		</div>
	);
}

/**
 * Format milliseconds into human-readable duration
 */
function formatDuration(ms: number): string {
	const minutes = Math.floor(ms / (1000 * 60));
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) {
		return `${days}d ${hours % 24}h`;
	}
	if (hours > 0) {
		return `${hours}h ${minutes % 60}m`;
	}
	return `${minutes}m`;
}

/**
 * Helper to calculate stall items from agents and beads
 */
export function calculateStallItems(
	agents: Array<{
		name: string;
		has_work: boolean;
		work_title?: string;
		state?: string;
		running: boolean;
	}>,
	beads: Array<{
		id: string;
		title: string;
		status: string;
		updated_at?: string;
	}>,
	now: Date = new Date()
): StallItem[] {
	const items: StallItem[] = [];

	// Check agents with work that might be stuck
	for (const agent of agents) {
		if (agent.has_work && agent.running) {
			// For agents, we consider them "stalled" if they've been working
			// Since we don't have start time, we use state as indicator
			if (agent.state === "stuck") {
				items.push({
					id: agent.name,
					name: agent.name,
					type: "agent",
					duration: "stuck",
					durationMs: Number.MAX_SAFE_INTEGER, // Always show stuck agents as critical
					title: agent.work_title,
					state: agent.state,
				});
			}
		}
	}

	// Check beads that are in_progress or hooked
	for (const bead of beads) {
		if (bead.status === "in_progress" || bead.status === "hooked") {
			const updatedAt = bead.updated_at ? new Date(bead.updated_at) : null;
			if (updatedAt) {
				const durationMs = now.getTime() - updatedAt.getTime();
				items.push({
					id: bead.id,
					name: bead.id,
					type: "step",
					duration: formatDuration(durationMs),
					durationMs,
					title: bead.title,
				});
			}
		}
	}

	return items.sort((a, b) => b.durationMs - a.durationMs);
}
