import { useQuery } from "@tanstack/react-query";
import {
	RefreshCw,
	Play,
	Square,
	AlertTriangle,
	Activity,
	Zap,
	TrendingUp,
} from "lucide-react";
import { getStatus, startTown, shutdownTown } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SystemSchematic } from "@/components/dashboard/SystemSchematic";
import { useEffect, useRef, useState } from "react";

interface MetricData {
	value: number;
	history: number[];
}

interface ActivityEvent {
	id: string;
	timestamp: Date;
	type: "info" | "success" | "warning" | "error";
	message: string;
}

function MetricsPanel() {
	const { data: response } = useQuery({
		queryKey: ["status"],
		queryFn: getStatus,
		refetchInterval: 5_000,
	});

	const [metrics, setMetrics] = useState<{
		hooks: MetricData;
		polecats: MetricData;
		crew: MetricData;
	}>({
		hooks: { value: 0, history: [] },
		polecats: { value: 0, history: [] },
		crew: { value: 0, history: [] },
	});

	useEffect(() => {
		if (response?.status) {
			const status = response.status;
			setMetrics((prev) => ({
				hooks: {
					value: status.summary.active_hooks || 0,
					history: [
						...prev.hooks.history.slice(-19),
						status.summary.active_hooks || 0,
					],
				},
				polecats: {
					value: status.summary.polecat_count || 0,
					history: [
						...prev.polecats.history.slice(-19),
						status.summary.polecat_count || 0,
					],
				},
				crew: {
					value: status.summary.crew_count || 0,
					history: [
						...prev.crew.history.slice(-19),
						status.summary.crew_count || 0,
					],
				},
			}));
		}
	}, [response]);

	const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
		if (data.length < 2) return null;

		const max = Math.max(...data, 1);
		const min = Math.min(...data);
		const range = max - min || 1;
		const height = 40;
		const width = 100;
		const step = width / (data.length - 1);

		const points = data
			.map(
				(value, i) =>
					`${i * step},${height - ((value - min) / range) * height}`,
			)
			.join(" ");

		return (
			<svg className="w-24 h-10" viewBox={`0 0 ${width} ${height}`}>
				<polyline
					points={points}
					fill="none"
					stroke={color}
					strokeWidth="2"
					className="transition-all duration-300"
				/>
			</svg>
		);
	};

	const MetricCard = ({
		label,
		value,
		icon: Icon,
		data,
		color,
	}: {
		label: string;
		value: number;
		icon: typeof Activity;
		data: number[];
		color: string;
	}) => (
		<div className="bg-gt-surface/80 backdrop-blur-sm border border-gt-border rounded-lg p-4 transition-all duration-300 hover:bg-gt-surface">
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<Icon className="text-gt-muted" size={18} />
					<span className="text-sm text-gt-muted">{label}</span>
				</div>
				<span className={cn("text-2xl font-semibold", color)}>{value}</span>
			</div>
			<Sparkline data={data} color={color.replace("text-", "#")} />
		</div>
	);

	return (
		<div className="h-full p-4 space-y-4 overflow-y-auto">
			<h3 className="text-sm font-semibold text-gt-text flex items-center gap-2">
				<Activity size={16} />
				Real-Time Metrics
			</h3>
			<div className="space-y-3">
				<MetricCard
					label="Active Hooks"
					value={metrics.hooks.value}
					icon={Zap}
					data={metrics.hooks.history}
					color="text-gt-accent"
				/>
				<MetricCard
					label="Polecats"
					value={metrics.polecats.value}
					icon={Activity}
					data={metrics.polecats.history}
					color="text-blue-400"
				/>
				<MetricCard
					label="Crew Members"
					value={metrics.crew.value}
					icon={TrendingUp}
					data={metrics.crew.history}
					color="text-green-400"
				/>
			</div>
		</div>
	);
}

function ActivityStream() {
	const { data: response } = useQuery({
		queryKey: ["status"],
		queryFn: getStatus,
		refetchInterval: 5_000,
	});

	const [events, setEvents] = useState<ActivityEvent[]>([]);
	const prevAgentsRef = useRef<any[]>([]);

	useEffect(() => {
		if (response?.status?.agents) {
			const currentAgents = response.status.agents;
			const prevAgents = prevAgentsRef.current;

			if (prevAgents.length > 0) {
				const newEvents: ActivityEvent[] = [];

				currentAgents.forEach((agent) => {
					const prevAgent = prevAgents.find((a) => a.address === agent.address);

					if (!prevAgent) {
						newEvents.push({
							id: `${Date.now()}-${agent.address}-new`,
							timestamp: new Date(),
							type: "info",
							message: `Agent ${agent.name} (${agent.role}) initialized`,
						});
					} else {
						if (!prevAgent.running && agent.running) {
							newEvents.push({
								id: `${Date.now()}-${agent.address}-start`,
								timestamp: new Date(),
								type: "success",
								message: `Agent ${agent.name} started`,
							});
						} else if (prevAgent.running && !agent.running) {
							newEvents.push({
								id: `${Date.now()}-${agent.address}-stop`,
								timestamp: new Date(),
								type: "warning",
								message: `Agent ${agent.name} stopped`,
							});
						}

						if (!prevAgent.has_work && agent.has_work) {
							newEvents.push({
								id: `${Date.now()}-${agent.address}-work`,
								timestamp: new Date(),
								type: "info",
								message: `${agent.name} received work: ${agent.work_title || "untitled"}`,
							});
						}
					}
				});

				if (newEvents.length > 0) {
					setEvents((prev) => [...newEvents, ...prev].slice(0, 50));
				}
			}

			prevAgentsRef.current = currentAgents;
		}
	}, [response]);

	const getEventColor = (type: ActivityEvent["type"]) => {
		switch (type) {
			case "success":
				return "text-green-400";
			case "warning":
				return "text-yellow-400";
			case "error":
				return "text-red-400";
			default:
				return "text-gt-muted";
		}
	};

	const getEventIcon = (type: ActivityEvent["type"]) => {
		switch (type) {
			case "success":
				return "✓";
			case "warning":
				return "⚠";
			case "error":
				return "✕";
			default:
				return "•";
		}
	};

	return (
		<div className="h-full p-4 overflow-y-auto">
			<h3 className="text-sm font-semibold text-gt-text mb-4 flex items-center gap-2">
				<Zap size={16} />
				Activity Stream
			</h3>
			{events.length === 0 ? (
				<div className="text-center text-gt-muted text-sm py-8">
					<Activity className="mx-auto mb-2 opacity-50" size={24} />
					<p>No recent activity</p>
					<p className="text-xs mt-1">Events will appear here in real-time</p>
				</div>
			) : (
				<div className="space-y-2">
					{events.map((event) => (
						<div
							key={event.id}
							className="bg-gt-surface/50 backdrop-blur-sm border border-gt-border rounded p-3 transition-all duration-300 hover:bg-gt-surface animate-in fade-in slide-in-from-top-2"
						>
							<div className="flex items-start gap-2">
								<span className={cn("text-sm font-bold", getEventColor(event.type))}>
									{getEventIcon(event.type)}
								</span>
								<div className="flex-1 min-w-0">
									<p className="text-sm text-gt-text break-words">
										{event.message}
									</p>
									<p className="text-xs text-gt-muted mt-1">
										{event.timestamp.toLocaleTimeString()}
									</p>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export default function Overview() {
	const {
		data: response,
		isLoading,
		error,
		refetch,
		isFetching,
	} = useQuery({
		queryKey: ["status"],
		queryFn: getStatus,
		refetchInterval: 10_000,
	});

	const handleStart = async () => {
		await startTown();
		refetch();
	};

	const handleShutdown = async () => {
		if (confirm("Are you sure you want to shutdown Gas Town?")) {
			await shutdownTown();
			refetch();
		}
	};

	if (isLoading) {
		return (
			<div className="h-full flex items-center justify-center">
				<RefreshCw className="animate-spin text-gt-muted" size={24} />
			</div>
		);
	}

	if (error) {
		return (
			<div className="h-full flex items-center justify-center p-6">
				<div className="bg-red-900/20 border border-red-500 rounded-lg p-4 max-w-md">
					<p className="text-red-400">Failed to load status: {error.message}</p>
					<button
						onClick={() => refetch()}
						className="mt-2 text-sm text-red-300 hover:text-red-200"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	if (!response?.initialized) {
		return (
			<div className="h-full flex items-center justify-center p-6">
				<div className="bg-amber-900/20 border border-amber-500 rounded-lg p-6 max-w-lg">
					<div className="flex items-center gap-3 mb-3">
						<AlertTriangle className="text-amber-400" size={24} />
						<h2 className="text-lg font-medium text-amber-300">
							Gas Town Not Configured
						</h2>
					</div>
					<p className="text-amber-200/80 mb-4">
						{response?.error || "Not connected to a Gas Town workspace."}
					</p>
					<p className="text-sm text-gt-muted">
						Set the{" "}
						<code className="bg-gt-surface px-1 rounded">GT_TOWN_ROOT</code>{" "}
						environment variable or start the server from within a Gas Town
						project directory.
					</p>
				</div>
			</div>
		);
	}

	const status = response.status;
	const deaconRunning = status?.agents.some(
		(a) => a.role === "deacon" && a.running,
	);

	return (
		<div className="h-screen flex flex-col overflow-hidden">
			{/* Header */}
			<div className="flex-none border-b border-gt-border bg-gt-bg">
				<div className="flex items-center justify-between p-4">
					<div>
						<h1 className="text-xl font-semibold">
							{status?.name || "Gas Town"}
						</h1>
						<p className="text-xs text-gt-muted">{status?.location}</p>
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={() => refetch()}
							disabled={isFetching}
							className="p-2 rounded-lg bg-gt-surface hover:bg-gt-border transition-colors disabled:opacity-50"
							title="Refresh"
						>
							<RefreshCw size={18} className={cn(isFetching && "animate-spin")} />
						</button>
						{deaconRunning ? (
							<button
								onClick={handleShutdown}
								className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
							>
								<Square size={16} />
								<span className="text-sm">Shutdown</span>
							</button>
						) : (
							<button
								onClick={handleStart}
								className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition-colors"
							>
								<Play size={16} />
								<span className="text-sm">Start</span>
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Main content area with 60/40 split */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* System Schematic - 60% height */}
				<div className="h-[60%] border-b border-gt-border bg-gt-bg/50">
					<SystemSchematic />
				</div>

				{/* Bottom panels - 40% height split horizontally */}
				<div className="h-[40%] flex flex-row">
					{/* Metrics Panel - Left side */}
					<div className="w-1/2 border-r border-gt-border bg-gt-bg/30">
						<MetricsPanel />
					</div>

					{/* Activity Stream - Right side */}
					<div className="w-1/2 bg-gt-bg/30">
						<ActivityStream />
					</div>
				</div>
			</div>
		</div>
	);
}
