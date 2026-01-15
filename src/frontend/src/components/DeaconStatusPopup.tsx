import { X, Server, Activity, AlertTriangle, Pause, Play } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPatrolStatus, pausePatrol, resumePatrol } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PatrolStatus } from "@/types/api";

interface DeaconStatusPopupProps {
	onClose: () => void;
}

function formatUptime(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) {
		return `${days}d ${hours % 24}h`;
	}
	if (hours > 0) {
		return `${hours}h ${minutes % 60}m`;
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds % 60}s`;
	}
	return `${seconds}s`;
}

function formatTimestamp(timestamp: string): string {
	const date = new Date(timestamp);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSeconds = Math.floor(diffMs / 1000);
	const diffMinutes = Math.floor(diffSeconds / 60);

	if (diffMinutes < 1) {
		return "just now";
	}
	if (diffMinutes < 60) {
		return `${diffMinutes}m ago`;
	}
	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) {
		return `${diffHours}h ago`;
	}
	return date.toLocaleString();
}

function StatusBadge({ status }: { status: PatrolStatus["operational_mode"] }) {
	const config = {
		normal: { label: "Normal", color: "bg-green-500/20 text-green-400 border-green-500/30" },
		degraded: { label: "Degraded", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
		offline: { label: "Offline", color: "bg-red-500/20 text-red-400 border-red-500/30" },
	};
	const { label, color } = config[status];

	return (
		<span className={cn("px-2 py-0.5 text-xs font-medium rounded border", color)}>
			{label}
		</span>
	);
}

function DeaconStateBadge({ state }: { state: PatrolStatus["deacon_state"] }) {
	if (!state) return <span className="text-slate-500">Unknown</span>;

	const config = {
		running: { icon: Activity, color: "text-green-400" },
		paused: { icon: Pause, color: "text-yellow-400" },
		stopped: { icon: X, color: "text-red-400" },
		error: { icon: AlertTriangle, color: "text-red-400" },
	};
	const { icon: Icon, color } = config[state];

	return (
		<span className={cn("flex items-center gap-1", color)}>
			<Icon size={14} />
			<span className="capitalize">{state}</span>
		</span>
	);
}

export function DeaconStatusPopup({ onClose }: DeaconStatusPopupProps) {
	const queryClient = useQueryClient();

	const { data: status, isLoading, error } = useQuery({
		queryKey: ["patrol-status"],
		queryFn: getPatrolStatus,
		refetchInterval: 5000, // Refresh every 5 seconds
	});

	const pauseMutation = useMutation({
		mutationFn: () => pausePatrol("Manual pause from dashboard"),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["patrol-status"] });
		},
	});

	const resumeMutation = useMutation({
		mutationFn: resumePatrol,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["patrol-status"] });
		},
	});

	const isPaused = status?.patrol_paused?.paused ?? false;
	const canTogglePause = status?.operational_mode !== "offline";

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
			<div
				className="bg-gt-surface border border-gt-border rounded-lg shadow-xl max-w-md w-full"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gt-border">
					<div className="flex items-center gap-2">
						<Server size={20} className="text-blue-400" />
						<h2 className="text-lg font-semibold">Deacon Status</h2>
					</div>
					<button
						onClick={onClose}
						className="p-1 hover:bg-gt-border rounded transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				{/* Content */}
				<div className="p-4 space-y-4">
					{isLoading && (
						<div className="text-center py-8 text-slate-400">
							Loading status...
						</div>
					)}

					{error && (
						<div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
							<p className="text-sm text-red-400">
								Failed to fetch deacon status
							</p>
						</div>
					)}

					{status && (
						<>
							{/* Operational Mode */}
							<div className="flex items-center justify-between">
								<span className="text-slate-400 text-sm">Operational Mode</span>
								<StatusBadge status={status.operational_mode} />
							</div>

							{/* Deacon State */}
							<div className="flex items-center justify-between">
								<span className="text-slate-400 text-sm">Deacon State</span>
								<DeaconStateBadge state={status.deacon_state} />
							</div>

							{/* Boot Status */}
							{status.boot && (
								<div className="flex items-center justify-between">
									<span className="text-slate-400 text-sm">Boot Status</span>
									<span className={cn(
										"capitalize",
										status.boot === "ready" ? "text-green-400" :
										status.boot === "booting" ? "text-yellow-400" :
										"text-red-400"
									)}>
										{status.boot}
									</span>
								</div>
							)}

							{/* Heartbeat Info */}
							{status.heartbeat && (
								<div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
									<div className="flex items-center gap-2 text-sm font-medium">
										<Activity size={14} className="text-blue-400" />
										Heartbeat
									</div>
									<div className="grid grid-cols-2 gap-2 text-sm">
										<div>
											<span className="text-slate-400">Last Beat:</span>
											<span className="ml-2 text-slate-200">
												{formatTimestamp(status.heartbeat.timestamp)}
											</span>
										</div>
										<div>
											<span className="text-slate-400">Uptime:</span>
											<span className="ml-2 text-slate-200">
												{formatUptime(status.heartbeat.uptime_ms)}
											</span>
										</div>
									</div>
									{status.heartbeat.last_patrol && (
										<div className="text-sm">
											<span className="text-slate-400">Last Patrol:</span>
											<span className="ml-2 text-slate-200">
												{formatTimestamp(status.heartbeat.last_patrol)}
											</span>
										</div>
									)}
									{status.heartbeat.error && (
										<div className="mt-2 text-sm text-red-400 flex items-start gap-2">
											<AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
											{status.heartbeat.error}
										</div>
									)}
								</div>
							)}

							{/* Patrol Paused Info */}
							{status.patrol_paused?.paused && (
								<div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
									<div className="flex items-center gap-2 text-yellow-400 font-medium text-sm">
										<Pause size={14} />
										Patrol Paused
									</div>
									{status.patrol_paused.reason && (
										<p className="text-sm text-slate-300 mt-1">
											{status.patrol_paused.reason}
										</p>
									)}
									{status.patrol_paused.paused_at && (
										<p className="text-xs text-slate-400 mt-1">
											Since {formatTimestamp(status.patrol_paused.paused_at)}
										</p>
									)}
								</div>
							)}

							{/* Degraded Mode Warning */}
							{status.degraded_mode && (
								<div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
									<AlertTriangle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
									<div className="text-sm text-yellow-400">
										System is running in degraded mode. Some features may be limited.
									</div>
								</div>
							)}

							{/* Actions */}
							<div className="pt-2 border-t border-gt-border flex justify-end gap-2">
								{isPaused ? (
									<button
										onClick={() => resumeMutation.mutate()}
										disabled={!canTogglePause || resumeMutation.isPending}
										className={cn(
											"px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2",
											(!canTogglePause || resumeMutation.isPending) && "opacity-50 cursor-not-allowed"
										)}
									>
										<Play size={16} />
										{resumeMutation.isPending ? "Resuming..." : "Resume Patrol"}
									</button>
								) : (
									<button
										onClick={() => pauseMutation.mutate()}
										disabled={!canTogglePause || pauseMutation.isPending}
										className={cn(
											"px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors flex items-center gap-2",
											(!canTogglePause || pauseMutation.isPending) && "opacity-50 cursor-not-allowed"
										)}
									>
										<Pause size={16} />
										{pauseMutation.isPending ? "Pausing..." : "Pause Patrol"}
									</button>
								)}
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
