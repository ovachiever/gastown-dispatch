import { cn } from "@/lib/utils";
import { Sparkline } from "./Sparkline";
import { Gauge } from "./Gauge";
import { Counter } from "./Counter";
import { Activity, CheckCircle2, Cpu, Zap } from "lucide-react";
import { useEffect, useState } from "react";

export interface DashboardMetrics {
	timestamp: string;
	agent_status: {
		total: number;
		running: number;
		idle: number;
		with_work: number;
	};
	work_activity: {
		ready_count: number;
		in_progress_count: number;
	};
	system_health: {
		status: "healthy" | "degraded" | "offline";
		rig_count: number;
		polecat_count: number;
		active_hooks: number;
		message_queue?: {
			pending: number;
			in_flight: number;
		};
	};
}

interface MetricCardProps {
	title: string;
	icon: React.ReactNode;
	children: React.ReactNode;
	className?: string;
}

function MetricCard({ title, icon, children, className }: MetricCardProps) {
	return (
		<div
			className={cn(
				"flex flex-col gap-2 rounded-lg border border-gt-text/20 bg-gt-bg p-4",
				className,
			)}
		>
			<div className="flex items-center gap-2 text-sm text-gt-text/60">
				{icon}
				<span>{title}</span>
			</div>
			<div className="flex-1">{children}</div>
		</div>
	);
}

interface MetricsPanelProps {
	metrics?: DashboardMetrics;
	className?: string;
}

export function MetricsPanel({ metrics, className }: MetricsPanelProps) {
	const [workHistory, setWorkHistory] = useState<number[]>([]);
	const [queueHistory, setQueueHistory] = useState<number[]>([]);

	useEffect(() => {
		if (!metrics) return;

		// Track work activity history for sparkline (keep last 20 data points)
		setWorkHistory((prev) => {
			const next = [...prev, metrics.work_activity.in_progress_count];
			return next.slice(-20);
		});

		// Track queue size history for sparkline
		setQueueHistory((prev) => {
			const queueSize = metrics.work_activity.ready_count;
			const next = [...prev, queueSize];
			return next.slice(-20);
		});
	}, [metrics]);

	if (!metrics) {
		return (
			<div
				className={cn(
					"flex items-center justify-center rounded-lg border border-gt-text/20 bg-gt-bg p-8",
					className,
				)}
			>
				<div className="text-gt-text/60">Loading metrics...</div>
			</div>
		);
	}

	const agentCapacityPercent =
		metrics.agent_status.total > 0
			? (metrics.agent_status.with_work / metrics.agent_status.total) * 100
			: 0;

	const systemHealthPercent =
		metrics.system_health.status === "healthy"
			? 100
			: metrics.system_health.status === "degraded"
				? 70
				: 0;

	return (
		<div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
			{/* Active Work Gauge */}
			<MetricCard
				title="Active Work"
				icon={<Activity className="h-4 w-4" />}
			>
				<div className="flex flex-col items-center gap-2">
					<Gauge
						value={agentCapacityPercent}
						max={100}
						size={100}
						thickness={10}
						label="capacity"
					/>
					<div className="text-center text-xs text-gt-text/60">
						{metrics.agent_status.with_work} / {metrics.agent_status.total} agents
					</div>
				</div>
			</MetricCard>

			{/* Work Completed Counter + Sparkline */}
			<MetricCard
				title="In Progress"
				icon={<CheckCircle2 className="h-4 w-4" />}
			>
				<div className="flex flex-col items-center gap-2">
					<div className="text-4xl">
						<Counter
							value={metrics.work_activity.in_progress_count}
							duration={500}
							className="text-gt-accent"
						/>
					</div>
					{workHistory.length > 1 && (
						<Sparkline
							data={workHistory}
							width={150}
							height={40}
							color="stroke-gt-accent"
							fillColor="fill-gt-accent/20"
						/>
					)}
					<div className="text-xs text-gt-text/60">
						{metrics.work_activity.ready_count} ready
					</div>
				</div>
			</MetricCard>

			{/* System Capacity Gauge */}
			<MetricCard
				title="System Health"
				icon={<Cpu className="h-4 w-4" />}
			>
				<div className="flex flex-col items-center gap-2">
					<Gauge
						value={systemHealthPercent}
						max={100}
						size={100}
						thickness={10}
						color={
							metrics.system_health.status === "healthy"
								? "stroke-green-500"
								: metrics.system_health.status === "degraded"
									? "stroke-yellow-500"
									: "stroke-red-500"
						}
						label={metrics.system_health.status}
					/>
					<div className="text-center text-xs text-gt-text/60">
						{metrics.system_health.rig_count} rigs, {metrics.system_health.polecat_count}{" "}
						polecats
					</div>
				</div>
			</MetricCard>

			{/* Message Queue Sparkline */}
			<MetricCard
				title="Work Queue"
				icon={<Zap className="h-4 w-4" />}
			>
				<div className="flex flex-col items-center gap-2">
					<div className="text-4xl">
						<Counter
							value={metrics.work_activity.ready_count}
							duration={500}
							className="text-gt-text"
						/>
					</div>
					{queueHistory.length > 1 && (
						<Sparkline
							data={queueHistory}
							width={150}
							height={40}
							color="stroke-blue-500"
							fillColor="fill-blue-500/20"
						/>
					)}
					<div className="text-xs text-gt-text/60">
						{metrics.system_health.message_queue?.pending || 0} pending,{" "}
						{metrics.system_health.message_queue?.in_flight || 0} in flight
					</div>
				</div>
			</MetricCard>
		</div>
	);
}
