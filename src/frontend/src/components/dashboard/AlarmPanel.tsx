import { AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentRuntime, RigStatus } from "@/types/api";

interface Alert {
	level: "error" | "warning" | "info";
	message: string;
}

interface AlarmPanelProps {
	agents: AgentRuntime[];
	rigs: RigStatus[];
}

export function AlarmPanel({ agents, rigs }: AlarmPanelProps) {
	const alerts: Alert[] = [];

	// Check for agent errors
	agents.forEach((a) => {
		if (a.state === "error") {
			alerts.push({ level: "error", message: `${a.name}: Agent in error state` });
		}
		if (a.unread_mail > 5) {
			alerts.push({
				level: "warning",
				message: `${a.name}: ${a.unread_mail} unread messages`,
			});
		}
	});

	// Check for rig-level issues
	rigs.forEach((r) => {
		const rigAgents = r.agents || [];
		const runningAgents = rigAgents.filter((a) => a.running).length;
		const totalAgents = rigAgents.length;

		// Alert if rig has allocated workers but none are running
		if ((r.polecat_count > 0 || r.crew_count > 0) && runningAgents === 0 && totalAgents > 0) {
			alerts.push({
				level: "warning",
				message: `${r.name}: Workers allocated but none running`,
			});
		}
	});

	const errorCount = alerts.filter((a) => a.level === "error").length;
	const warningCount = alerts.filter((a) => a.level === "warning").length;

	return (
		<div className="bg-slate-900/80 border border-slate-700 rounded-lg p-3" data-testid="alarm-panel">
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<AlertTriangle
						size={16}
						className={errorCount > 0 ? "text-red-400" : "text-slate-400"}
					/>
					<span className="text-sm font-semibold text-slate-200">Alarms</span>
				</div>
				<div className="flex items-center gap-2">
					{errorCount > 0 && (
						<span
							className="text-xs px-2 py-0.5 bg-red-900 text-red-300 rounded-full font-mono"
							data-testid="error-count"
						>
							{errorCount} ERR
						</span>
					)}
					{warningCount > 0 && (
						<span
							className="text-xs px-2 py-0.5 bg-yellow-900 text-yellow-300 rounded-full font-mono"
							data-testid="warning-count"
						>
							{warningCount} WARN
						</span>
					)}
					{alerts.length === 0 && (
						<span
							className="text-xs px-2 py-0.5 bg-green-900 text-green-300 rounded-full"
							data-testid="all-ok"
						>
							ALL OK
						</span>
					)}
				</div>
			</div>

			<div className="max-h-32 overflow-y-auto space-y-1" data-testid="alerts-list">
				{alerts.length === 0 ? (
					<div className="text-xs text-slate-500 text-center py-2">No active alarms</div>
				) : (
					alerts.slice(0, 5).map((alert, i) => (
						<div
							key={i}
							className={cn(
								"text-xs px-2 py-1 rounded flex items-center gap-2",
								alert.level === "error"
									? "bg-red-900/30 text-red-300"
									: alert.level === "warning"
										? "bg-yellow-900/30 text-yellow-300"
										: "bg-blue-900/30 text-blue-300"
							)}
							data-testid={`alert-${alert.level}`}
						>
							{alert.level === "error" ? (
								<AlertCircle size={12} />
							) : alert.level === "warning" ? (
								<AlertTriangle size={12} />
							) : (
								<CheckCircle2 size={12} />
							)}
							<span className="truncate">{alert.message}</span>
						</div>
					))
				)}
			</div>
		</div>
	);
}
