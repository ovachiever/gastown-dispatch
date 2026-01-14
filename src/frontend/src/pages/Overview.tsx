import { useQuery } from "@tanstack/react-query";
import {
	RefreshCw,
	Play,
	Square,
	AlertTriangle,
	AlertCircle,
	CheckCircle2,
	Zap,
	Activity,
	Server,
	Users,
	Package,
	Truck,
	Radio,
} from "lucide-react";
import { getStatus, getConvoys, getBeads, startTown, shutdownTown } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import type { TownStatus, RigStatus, AgentRuntime, Convoy, Bead } from "@/types/api";

// Status indicator component
function StatusIndicator({ status, size = "md", pulse = false }: {
	status: "active" | "idle" | "error" | "offline" | "processing";
	size?: "sm" | "md" | "lg";
	pulse?: boolean;
}) {
	const sizeClasses = { sm: "w-2 h-2", md: "w-3 h-3", lg: "w-4 h-4" };
	const colorClasses = {
		active: "bg-green-500",
		idle: "bg-yellow-500",
		error: "bg-red-500",
		offline: "bg-slate-500",
		processing: "bg-blue-500",
	};

	return (
		<span className={cn(
			"rounded-full inline-block",
			sizeClasses[size],
			colorClasses[status],
			pulse && "animate-pulse"
		)} />
	);
}

// Digital counter display (like industrial readouts)
function DigitalCounter({ value, label, color = "text-green-400", digits = 3 }: {
	value: number;
	label: string;
	color?: string;
	digits?: number;
}) {
	const displayValue = String(value).padStart(digits, "0");

	return (
		<div className="bg-black/50 border border-slate-700 rounded px-2 py-1">
			<div className={cn("font-mono text-xl font-bold tracking-wider", color)}>
				{displayValue}
			</div>
			<div className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</div>
		</div>
	);
}

// Queue level indicator (industrial silo style)
function QueueLevel({ pending, inFlight, blocked, max = 20, label, isRigActive = false }: {
	pending: number;
	inFlight: number;
	blocked: number;
	max?: number;
	label: string;
	isRigActive?: boolean;
}) {
	const total = pending + inFlight + blocked;
	const fillPercent = Math.min(100, (total / max) * 100);
	const isActive = inFlight > 0;
	const hasBlocked = blocked > 0;

	return (
		<div className={cn("flex flex-col items-center flex-shrink-0", !isRigActive && "opacity-50")}>
			<div className={cn(
				"text-[10px] uppercase mb-2 font-bold tracking-wide text-center max-w-[80px] truncate",
				!isRigActive ? "text-slate-600" :
				hasBlocked ? "text-red-400" :
				isActive ? "text-blue-400" :
				"text-slate-400"
			)} title={label}>
				{label}
			</div>

			{/* Silo container */}
			<div className="relative">
				{/* Top cone (hopper style) */}
				<div className="w-20 h-4 relative">
					<svg viewBox="0 0 80 16" className="w-full h-full">
						<path d="M0,16 L40,0 L80,16 Z" fill={isRigActive ? "#1e293b" : "#0f172a"} stroke={isRigActive ? "#475569" : "#334155"} strokeWidth="1" />
					</svg>
				</div>

				{/* Main silo body */}
				<div className={cn(
					"relative w-20 h-28 border-2 rounded-b-lg overflow-hidden",
					!isRigActive ? "border-slate-700 bg-slate-900/30" :
					hasBlocked ? "border-red-500 bg-red-950/30" :
					isActive ? "border-blue-500 bg-blue-950/30" :
					"border-slate-600 bg-slate-900/50"
				)}>
					{/* 3D effect - side shadow */}
					<div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-black/40 to-transparent" />
					<div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-l from-black/40 to-transparent" />

					{/* Fill level */}
					<div
						className="absolute bottom-0 left-0 right-0 transition-all duration-500"
						style={{ height: `${fillPercent}%` }}
					>
						{/* Blocked (red) */}
						{blocked > 0 && (
							<div
								className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-600 to-red-500"
								style={{ height: `${(blocked / total) * 100}%` }}
							/>
						)}
						{/* In-flight (blue - processing) */}
						{inFlight > 0 && (
							<div
								className="absolute bg-gradient-to-t from-blue-600 to-blue-400"
								style={{
									bottom: `${(blocked / total) * 100}%`,
									height: `${(inFlight / total) * 100}%`,
									left: 0,
									right: 0,
								}}
							>
								{/* Animated bubbles for processing */}
								<div className="absolute inset-0 overflow-hidden">
									{[...Array(3)].map((_, i) => (
										<div
											key={i}
											className="absolute w-1.5 h-1.5 bg-blue-300/50 rounded-full animate-bubble"
											style={{
												left: `${25 + i * 25}%`,
												animationDelay: `${i * 0.4}s`,
											}}
										/>
									))}
								</div>
							</div>
						)}
						{/* Pending (green - ready) */}
						{pending > 0 && (
							<div
								className="absolute bg-gradient-to-t from-green-600 to-green-500"
								style={{
									bottom: `${((blocked + inFlight) / total) * 100}%`,
									height: `${(pending / total) * 100}%`,
									left: 0,
									right: 0,
								}}
							/>
						)}
					</div>

					{/* Level markers */}
					{[25, 50, 75].map((level) => (
						<div
							key={level}
							className="absolute left-0 right-0 border-t border-slate-500/30"
							style={{ bottom: `${level}%` }}
						>
							<span className="absolute right-0.5 -top-1.5 text-[7px] text-slate-500 font-mono">{level}%</span>
						</div>
					))}

					{/* Glass highlight */}
					<div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
				</div>

				{/* Status light */}
				<div className={cn(
					"absolute -top-1 -right-1 w-2 h-2 rounded-full border border-slate-700",
					hasBlocked ? "bg-red-500 animate-pulse" :
					isActive ? "bg-blue-500 animate-pulse" :
					total > 0 ? "bg-green-500" : "bg-slate-600"
				)} />
			</div>

			{/* Stats readout */}
			<div className="mt-2 text-center">
				<div className="font-mono text-base font-bold text-slate-200">{total}</div>
				<div className="flex gap-1.5 text-[9px] justify-center font-mono">
					<span className="text-green-400">{pending}p</span>
					<span className="text-blue-400">{inFlight}f</span>
					<span className="text-red-400">{blocked}b</span>
				</div>
			</div>
		</div>
	);
}

// Rig station panel (like a processing unit control panel)
function RigStation({ rig, agents, isActive }: {
	rig: RigStatus;
	agents: AgentRuntime[];
	isActive: boolean;
}) {
	const rigAgents = agents.filter(a =>
		a.address.includes(rig.name) ||
		rig.polecats?.some(p => a.name.includes(p)) ||
		rig.crews?.some(c => a.name.includes(c))
	);
	const workingAgents = rigAgents.filter(a => a.has_work);
	const mq = rig.mq || { pending: 0, in_flight: 0, blocked: 0, state: "idle", health: "empty" };

	const getHealthColor = (health: string) => {
		switch (health) {
			case "healthy": return "text-green-400";
			case "stale": return "text-yellow-400";
			default: return "text-slate-400";
		}
	};

	return (
		<div className={cn(
			"bg-slate-900/80 border rounded-lg p-3 backdrop-blur-sm transition-all",
			isActive ? "border-blue-500 shadow-lg shadow-blue-500/20" : "border-slate-700 opacity-60"
		)}>
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<Server size={14} className={isActive ? "text-blue-400" : "text-slate-600"} />
					<span className={cn(
						"font-mono text-sm font-bold uppercase",
						isActive ? "text-slate-200" : "text-slate-500"
					)}>
						{rig.name}
					</span>
				</div>
				{isActive && (
					<StatusIndicator
						status={mq.state === "blocked" ? "error" : mq.state === "processing" ? "processing" : "active"}
						pulse={mq.state === "processing"}
					/>
				)}
			</div>

			{/* Worker counts */}
			<div className="grid grid-cols-3 gap-2 mb-3">
				<DigitalCounter
					value={rig.polecat_count}
					label="Polecats"
					color={isActive && rig.polecat_count > 0 ? "text-blue-400" : "text-slate-600"}
					digits={2}
				/>
				<DigitalCounter
					value={rig.crew_count}
					label="Crew"
					color={isActive && rig.crew_count > 0 ? "text-green-400" : "text-slate-600"}
					digits={2}
				/>
				<DigitalCounter
					value={workingAgents.length}
					label="Active"
					color={isActive && workingAgents.length > 0 ? "text-yellow-400" : "text-slate-600"}
					digits={2}
				/>
			</div>

			{/* MQ Status */}
			<div className="flex items-center justify-between text-xs">
				<div className="flex items-center gap-1">
					<span className="text-slate-500">MQ:</span>
					<span className={cn("font-mono uppercase", getHealthColor(mq.health))}>
						{mq.health}
					</span>
				</div>
				<div className="flex items-center gap-2 text-slate-400 font-mono">
					<span title="Pending" className="text-green-400">{mq.pending}p</span>
					<span title="In-flight" className="text-blue-400">{mq.in_flight}f</span>
					<span title="Blocked" className="text-red-400">{mq.blocked}b</span>
				</div>
			</div>

			{/* Feature indicators */}
			<div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700">
				<div className={cn("text-[10px] px-1.5 py-0.5 rounded",
					rig.has_witness ? "bg-green-900/50 text-green-400" : "bg-slate-800 text-slate-600"
				)}>
					WITNESS
				</div>
				<div className={cn("text-[10px] px-1.5 py-0.5 rounded",
					rig.has_refinery ? "bg-purple-900/50 text-purple-400" : "bg-slate-800 text-slate-600"
				)}>
					REFINERY
				</div>
			</div>
		</div>
	);
}

// Animated flow arrow component
function FlowArrow({ active = false }: { active?: boolean }) {
	return (
		<div className="relative w-12 h-8 flex items-center justify-center">
			<svg viewBox="0 0 48 24" className="w-full h-full">
				{/* Pipe */}
				<rect x="0" y="9" width="48" height="6" fill="#1e293b" stroke="#334155" strokeWidth="1" />
				{/* Flow indicator */}
				{active && (
					<>
						<circle r="3" fill="#3b82f6" className="animate-flow-right">
							<animate attributeName="cx" from="-4" to="52" dur="1s" repeatCount="indefinite" />
							<animate attributeName="opacity" values="1;1;0" dur="1s" repeatCount="indefinite" />
						</circle>
						<circle r="3" fill="#3b82f6" className="animate-flow-right">
							<animate attributeName="cx" from="-4" to="52" dur="1s" begin="0.33s" repeatCount="indefinite" />
							<animate attributeName="opacity" values="1;1;0" dur="1s" begin="0.33s" repeatCount="indefinite" />
						</circle>
						<circle r="3" fill="#3b82f6" className="animate-flow-right">
							<animate attributeName="cx" from="-4" to="52" dur="1s" begin="0.66s" repeatCount="indefinite" />
							<animate attributeName="opacity" values="1;1;0" dur="1s" begin="0.66s" repeatCount="indefinite" />
						</circle>
					</>
				)}
				{/* Arrow head */}
				<polygon points="42,12 36,6 36,18" fill={active ? "#3b82f6" : "#475569"} />
			</svg>
		</div>
	);
}

// Work pipeline visualization
function WorkPipeline({ beads }: { beads: Bead[] }) {
	const stages = useMemo(() => {
		const open = beads.filter(b => b.status === "open").length;
		const inProgress = beads.filter(b => b.status === "in_progress" || b.status === "hooked").length;
		const closed = beads.filter(b => b.status === "closed").length;
		return { open, inProgress, closed };
	}, [beads]);

	const maxStage = Math.max(stages.open, stages.inProgress, stages.closed, 1);
	const hasFlow = stages.open > 0 || stages.inProgress > 0;

	return (
		<div className="bg-slate-900/60 border-2 border-slate-600 rounded-lg p-4">
			<div className="flex items-center gap-2 mb-4">
				<Package size={16} className="text-blue-400" />
				<span className="text-sm font-semibold text-slate-200">Work Pipeline</span>
				{hasFlow && (
					<span className="text-[10px] px-2 py-0.5 bg-blue-900/50 text-blue-400 rounded-full animate-pulse">
						FLOWING
					</span>
				)}
			</div>

			<div className="flex items-center">
				{/* Stage: Open (Hopper) */}
				<div className="flex-1">
					<div className="text-[10px] text-yellow-400 uppercase mb-1 text-center font-bold">Intake</div>
					<div className="h-20 bg-black/50 border-2 border-yellow-600 rounded-t-lg rounded-b-sm relative overflow-hidden">
						{/* Hopper shape */}
						<div className="absolute inset-x-2 bottom-0 top-2 bg-gradient-to-b from-yellow-900/50 to-yellow-700/30"
							style={{ clipPath: "polygon(0 0, 100% 0, 85% 100%, 15% 100%)" }} />
						<div
							className="absolute bottom-0 left-[15%] right-[15%] bg-gradient-to-t from-yellow-500 to-yellow-400 transition-all"
							style={{ height: `${(stages.open / maxStage) * 80}%` }}
						/>
						<div className="absolute inset-0 flex items-center justify-center">
							<span className="font-mono text-2xl font-bold text-white drop-shadow-lg">
								{stages.open}
							</span>
						</div>
					</div>
				</div>

				<FlowArrow active={stages.open > 0} />

				{/* Stage: In Progress (Processing tank) */}
				<div className="flex-1">
					<div className="text-[10px] text-blue-400 uppercase mb-1 text-center font-bold">Processing</div>
					<div className="h-20 bg-black/50 border-2 border-blue-500 rounded-lg relative overflow-hidden">
						{/* Tank with animated bubbles effect */}
						<div
							className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600 to-blue-400 transition-all"
							style={{ height: `${(stages.inProgress / maxStage) * 100}%` }}
						>
							{stages.inProgress > 0 && (
								<div className="absolute inset-0 overflow-hidden">
									{[...Array(5)].map((_, i) => (
										<div
											key={i}
											className="absolute w-2 h-2 bg-blue-300/50 rounded-full animate-bubble"
											style={{
												left: `${20 + i * 15}%`,
												animationDelay: `${i * 0.3}s`,
												animationDuration: `${1.5 + Math.random()}s`,
											}}
										/>
									))}
								</div>
							)}
						</div>
						<div className="absolute inset-0 flex items-center justify-center">
							<span className="font-mono text-2xl font-bold text-white drop-shadow-lg">
								{stages.inProgress}
							</span>
						</div>
						{/* Processing indicator */}
						{stages.inProgress > 0 && (
							<div className="absolute bottom-1 left-1 right-1 h-1 bg-blue-900 rounded overflow-hidden">
								<div className="h-full bg-blue-400 animate-processing-bar" />
							</div>
						)}
					</div>
				</div>

				<FlowArrow active={stages.inProgress > 0} />

				{/* Stage: Closed (Output bin) */}
				<div className="flex-1">
					<div className="text-[10px] text-green-400 uppercase mb-1 text-center font-bold">Complete</div>
					<div className="h-20 bg-black/50 border-2 border-green-500 rounded-b-lg rounded-t-sm relative overflow-hidden">
						{/* Bin shape */}
						<div
							className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-600 to-green-500 transition-all"
							style={{ height: `${(stages.closed / maxStage) * 100}%` }}
						/>
						<div className="absolute inset-0 flex items-center justify-center">
							<span className="font-mono text-2xl font-bold text-white drop-shadow-lg">
								{stages.closed}
							</span>
						</div>
						{/* Checkmark badge */}
						{stages.closed > 0 && (
							<div className="absolute top-1 right-1">
								<CheckCircle2 size={16} className="text-green-300" />
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

// Convoy batch display
function ConvoyBatch({ convoy }: { convoy: Convoy }) {
	const completed = convoy.completed || 0;
	const total = convoy.total || 1;
	const progress = (completed / total) * 100;

	return (
		<div className="bg-slate-900/60 border border-slate-700 rounded p-2">
			<div className="flex items-center justify-between mb-1">
				<span className="text-xs font-mono text-slate-300 truncate max-w-[120px]" title={convoy.title}>
					{convoy.id.slice(0, 8)}
				</span>
				<span className={cn("text-[10px] px-1.5 rounded uppercase font-bold",
					convoy.status === "open" ? "bg-blue-900 text-blue-300" : "bg-green-900 text-green-300"
				)}>
					{convoy.status}
				</span>
			</div>
			<div className="h-3 bg-black/50 rounded-sm overflow-hidden border border-slate-700">
				<div
					className={cn(
						"h-full transition-all duration-500",
						progress === 100 ? "bg-green-500" : "bg-blue-500"
					)}
					style={{ width: `${progress}%` }}
				/>
			</div>
			<div className="text-[10px] text-slate-400 mt-1 text-right font-mono">
				{completed}/{total}
			</div>
		</div>
	);
}

// Alarm panel
function AlarmPanel({ agents, rigs }: { agents: AgentRuntime[]; rigs: RigStatus[] }) {
	const alerts: { level: "error" | "warning" | "info"; message: string }[] = [];

	// Check for agent errors
	agents.forEach(a => {
		if (a.state === "error") {
			alerts.push({ level: "error", message: `${a.name}: Agent in error state` });
		}
		if (a.unread_mail > 5) {
			alerts.push({ level: "warning", message: `${a.name}: ${a.unread_mail} unread messages` });
		}
	});

	// Check for MQ issues
	rigs.forEach(r => {
		if (r.mq?.state === "blocked") {
			alerts.push({ level: "error", message: `${r.name}: Message queue blocked (${r.mq.blocked} items)` });
		}
		if (r.mq?.health === "stale") {
			alerts.push({ level: "warning", message: `${r.name}: Message queue stale` });
		}
	});

	const errorCount = alerts.filter(a => a.level === "error").length;
	const warningCount = alerts.filter(a => a.level === "warning").length;

	return (
		<div className="bg-slate-900/80 border border-slate-700 rounded-lg p-3">
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<AlertTriangle size={16} className={errorCount > 0 ? "text-red-400" : "text-slate-400"} />
					<span className="text-sm font-semibold text-slate-200">Alarms</span>
				</div>
				<div className="flex items-center gap-2">
					{errorCount > 0 && (
						<span className="text-xs px-2 py-0.5 bg-red-900 text-red-300 rounded-full font-mono">
							{errorCount} ERR
						</span>
					)}
					{warningCount > 0 && (
						<span className="text-xs px-2 py-0.5 bg-yellow-900 text-yellow-300 rounded-full font-mono">
							{warningCount} WARN
						</span>
					)}
					{alerts.length === 0 && (
						<span className="text-xs px-2 py-0.5 bg-green-900 text-green-300 rounded-full">
							ALL OK
						</span>
					)}
				</div>
			</div>

			<div className="max-h-32 overflow-y-auto space-y-1">
				{alerts.length === 0 ? (
					<div className="text-xs text-slate-500 text-center py-2">
						No active alarms
					</div>
				) : (
					alerts.slice(0, 5).map((alert, i) => (
						<div
							key={i}
							className={cn(
								"text-xs px-2 py-1 rounded flex items-center gap-2",
								alert.level === "error" ? "bg-red-900/30 text-red-300" :
								alert.level === "warning" ? "bg-yellow-900/30 text-yellow-300" :
								"bg-blue-900/30 text-blue-300"
							)}
						>
							{alert.level === "error" ? <AlertCircle size={12} /> :
							 alert.level === "warning" ? <AlertTriangle size={12} /> :
							 <CheckCircle2 size={12} />}
							<span className="truncate">{alert.message}</span>
						</div>
					))
				)}
			</div>
		</div>
	);
}

// Main control panel header
function ControlHeader({ status, deaconRunning, onRefresh, onStart, onShutdown, isFetching }: {
	status?: TownStatus;
	deaconRunning: boolean;
	onRefresh: () => void;
	onStart: () => void;
	onShutdown: () => void;
	isFetching: boolean;
}) {
	const [time, setTime] = useState(new Date());

	useEffect(() => {
		const timer = setInterval(() => setTime(new Date()), 1000);
		return () => clearInterval(timer);
	}, []);

	return (
		<div className="bg-slate-900 border-b border-slate-700 px-4 py-2">
			<div className="flex items-center justify-between">
				{/* Left: Town info */}
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<Radio size={20} className={deaconRunning ? "text-green-400 animate-pulse" : "text-slate-500"} />
						<div>
							<div className="text-lg font-bold text-slate-100 font-mono">
								{status?.name || "GAS TOWN"}
							</div>
							<div className="text-[10px] text-slate-500 uppercase tracking-wider">
								Dispatch Control System
							</div>
						</div>
					</div>

					{/* Mode indicator */}
					<div className={cn(
						"px-3 py-1 rounded text-xs font-bold uppercase tracking-wider",
						deaconRunning
							? "bg-green-900/50 text-green-400 border border-green-700"
							: "bg-red-900/50 text-red-400 border border-red-700"
					)}>
						{deaconRunning ? "ONLINE" : "OFFLINE"}
					</div>
				</div>

				{/* Center: Summary counters */}
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-1 text-sm">
						<Server size={14} className="text-blue-400" />
						<span className="font-mono text-slate-300">{status?.summary.rig_count || 0}</span>
						<span className="text-slate-500 text-xs">RIGS</span>
					</div>
					<div className="flex items-center gap-1 text-sm">
						<Users size={14} className="text-green-400" />
						<span className="font-mono text-slate-300">
							{(status?.summary.polecat_count || 0) + (status?.summary.crew_count || 0)}
						</span>
						<span className="text-slate-500 text-xs">WORKERS</span>
					</div>
					<div className="flex items-center gap-1 text-sm">
						<Zap size={14} className="text-yellow-400" />
						<span className="font-mono text-slate-300">{status?.summary.active_hooks || 0}</span>
						<span className="text-slate-500 text-xs">HOOKS</span>
					</div>
				</div>

				{/* Right: Time and controls */}
				<div className="flex items-center gap-4">
					<div className="text-right">
						<div className="font-mono text-lg text-slate-200">
							{time.toLocaleTimeString()}
						</div>
						<div className="text-[10px] text-slate-500">
							{time.toLocaleDateString()}
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							onClick={onRefresh}
							disabled={isFetching}
							className="p-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors disabled:opacity-50"
							title="Refresh"
						>
							<RefreshCw size={16} className={cn("text-slate-300", isFetching && "animate-spin")} />
						</button>

						{deaconRunning ? (
							<button
								onClick={onShutdown}
								className="flex items-center gap-2 px-3 py-2 rounded bg-red-900 hover:bg-red-800 border border-red-700 transition-colors"
							>
								<Square size={14} />
								<span className="text-sm font-bold">STOP</span>
							</button>
						) : (
							<button
								onClick={onStart}
								className="flex items-center gap-2 px-3 py-2 rounded bg-green-900 hover:bg-green-800 border border-green-700 transition-colors"
							>
								<Play size={14} />
								<span className="text-sm font-bold">START</span>
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

// Industrial control room visualization
function AgentFlow({ agents, rigs }: { agents: AgentRuntime[]; rigs: RigStatus[] }) {
	const mayor = agents.find(a => a.name === "mayor");
	const deacon = agents.find(a => a.name === "deacon");
	const totalWorkers = agents.filter(a => a.role === "polecat" || a.role === "crew").length;
	const activeWorkers = agents.filter(a => (a.role === "polecat" || a.role === "crew") && a.has_work).length;

	const getMayorStatus = () => {
		if (!mayor) return "offline";
		if (mayor.has_work) return "processing";
		if (mayor.running) return "active";
		return "idle";
	};

	const getDeaconStatus = () => {
		if (!deacon) return "offline";
		if (deacon.running) return "active";
		return "idle";
	};

	return (
		<div className="bg-slate-900/60 border-2 border-slate-600 rounded-lg p-3">
			<div className="flex items-center gap-2 mb-3">
				<Activity size={14} className="text-green-400" />
				<span className="text-xs font-semibold text-slate-200">Control Room</span>
				{getMayorStatus() === "processing" && (
					<span className="text-[9px] px-1.5 py-0.5 bg-green-900/50 text-green-400 rounded-full animate-pulse">
						COORDINATING
					</span>
				)}
			</div>

			<div className="flex items-center justify-between gap-2">
				{/* Mayor - Command Center */}
				<div className="flex flex-col items-center flex-shrink-0">
					<div className={cn(
						"relative w-16 h-16 rounded-lg border-2 flex items-center justify-center overflow-hidden",
						getMayorStatus() === "active" ? "border-green-500 bg-gradient-to-b from-green-900/50 to-green-950/80" :
						getMayorStatus() === "processing" ? "border-blue-500 bg-gradient-to-b from-blue-900/50 to-blue-950/80" :
						getMayorStatus() === "idle" ? "border-yellow-500 bg-gradient-to-b from-yellow-900/50 to-yellow-950/80" :
						"border-slate-600 bg-slate-800"
					)}>
						<div className="text-center">
							<Radio size={18} className={cn(
								getMayorStatus() === "processing" ? "text-blue-400 animate-pulse" :
								getMayorStatus() === "active" ? "text-green-400" :
								getMayorStatus() === "idle" ? "text-yellow-400" : "text-slate-500"
							)} />
							<div className="text-[8px] uppercase font-bold mt-0.5">MAYOR</div>
						</div>
						{getMayorStatus() === "processing" && (
							<div className="absolute inset-0 overflow-hidden">
								<div className="absolute w-full h-full bg-gradient-to-r from-transparent via-blue-400/10 to-transparent animate-scanner" />
							</div>
						)}
					</div>
					{mayor?.work_title && (
						<div className="text-[8px] text-slate-400 mt-0.5 max-w-16 truncate text-center">
							{mayor.work_title}
						</div>
					)}
				</div>

				{/* Connection - Communication Link */}
				<div className="flex-1 relative h-6 min-w-8">
					<svg viewBox="0 0 60 16" className="w-full h-full">
						<rect x="0" y="6" width="60" height="4" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
						{(getMayorStatus() === "processing" || getDeaconStatus() === "active") && (
							<>
								<circle r="2" cy="8" fill="#22c55e">
									<animate attributeName="cx" from="-4" to="64" dur="1s" repeatCount="indefinite" />
								</circle>
								<circle r="2" cy="8" fill="#22c55e">
									<animate attributeName="cx" from="-4" to="64" dur="1s" begin="0.5s" repeatCount="indefinite" />
								</circle>
							</>
						)}
					</svg>
				</div>

				{/* Deacon - Supervisor Station */}
				<div className="flex flex-col items-center flex-shrink-0">
					<div className={cn(
						"relative w-14 h-14 rounded border-2 flex items-center justify-center",
						getDeaconStatus() === "active" ? "border-green-500 bg-gradient-to-b from-green-900/40 to-slate-900" :
						getDeaconStatus() === "idle" ? "border-yellow-500 bg-gradient-to-b from-yellow-900/40 to-slate-900" :
						"border-slate-600 bg-slate-800"
					)}>
						<div className="text-center">
							<Server size={16} className={cn(
								getDeaconStatus() === "active" ? "text-green-400" :
								getDeaconStatus() === "idle" ? "text-yellow-400" : "text-slate-500"
							)} />
							<div className="text-[8px] uppercase font-bold mt-0.5">DEACON</div>
						</div>
						<div className={cn(
							"absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full",
							getDeaconStatus() === "active" ? "bg-green-400 animate-pulse" :
							getDeaconStatus() === "idle" ? "bg-yellow-400" : "bg-slate-600"
						)} />
					</div>
				</div>

				{/* Connection to Rigs */}
				<div className="flex-1 relative h-6 min-w-8">
					<svg viewBox="0 0 60 16" className="w-full h-full">
						<rect x="0" y="6" width="60" height="4" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
						{getDeaconStatus() === "active" && (
							<>
								<circle r="2" cy="8" fill="#3b82f6">
									<animate attributeName="cx" from="-4" to="64" dur="0.8s" repeatCount="indefinite" />
								</circle>
								<circle r="2" cy="8" fill="#3b82f6">
									<animate attributeName="cx" from="-4" to="64" dur="0.8s" begin="0.4s" repeatCount="indefinite" />
								</circle>
							</>
						)}
					</svg>
				</div>

				{/* Worker Pool Stats */}
				<div className="flex flex-col items-center flex-shrink-0">
					<div className="w-20 h-14 rounded border-2 border-slate-600 bg-slate-800 flex flex-col items-center justify-center p-1">
						<div className="flex items-center gap-1">
							<Users size={12} className="text-blue-400" />
							<span className="text-sm font-bold font-mono text-blue-400">{rigs.length}</span>
							<span className="text-[8px] text-slate-500">RIGS</span>
						</div>
						<div className="w-full flex justify-between text-[8px] mt-1">
							<div className="text-center">
								<div className="font-mono text-green-400 text-sm">{activeWorkers}</div>
								<div className="text-slate-500">ACT</div>
							</div>
							<div className="text-center">
								<div className="font-mono text-slate-400 text-sm">{totalWorkers - activeWorkers}</div>
								<div className="text-slate-500">IDLE</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function Overview() {

	const {
		data: statusResponse,
		isLoading: statusLoading,
		error: statusError,
		refetch: refetchStatus,
		isFetching,
	} = useQuery({
		queryKey: ["status"],
		queryFn: getStatus,
		refetchInterval: 5_000,
		retry: 1,
	});

	const { data: convoys = [] } = useQuery({
		queryKey: ["convoys", "open"],
		queryFn: () => getConvoys("open"),
		refetchInterval: 10_000,
		retry: 1,
	});

	const { data: beads = [] } = useQuery({
		queryKey: ["beads"],
		queryFn: () => getBeads({ limit: 100 }),
		refetchInterval: 10_000,
		retry: 1,
	});

	const handleStart = async () => {
		await startTown();
		refetchStatus();
	};

	const handleShutdown = async () => {
		if (confirm("Are you sure you want to shutdown Gas Town?")) {
			await shutdownTown();
			refetchStatus();
		}
	};

	// Allow 3 seconds for initial load before showing timeout state
	const [loadTimeout, setLoadTimeout] = useState(false);
	useEffect(() => {
		if (statusLoading) {
			const timer = setTimeout(() => setLoadTimeout(true), 3000);
			return () => clearTimeout(timer);
		}
		setLoadTimeout(false);
	}, [statusLoading]);

	// Determine if we have a valid connection - must be before conditional returns
	const isConnected = statusResponse?.initialized && statusResponse.status;
	const status = statusResponse?.status;
	const deaconRunning = status?.agents?.some((a: AgentRuntime) => a.name === "deacon" && a.running) ?? false;

	// Sort rigs to show active ones (with workers) first - must be before conditional returns
	const sortedRigs = useMemo(() => {
		if (!status?.rigs) return [];
		return [...status.rigs].sort((a, b) => {
			// Active rigs (has polecats or crew) come first
			const aActive = (a.polecat_count > 0 || a.crew_count > 0);
			const bActive = (b.polecat_count > 0 || b.crew_count > 0);
			if (aActive && !bActive) return -1;
			if (!aActive && bActive) return 1;
			// Then sort by name
			return a.name.localeCompare(b.name);
		});
	}, [status?.rigs]);

	// Show loading while initial fetch is in progress (but only for 3 seconds)
	if (statusLoading && !loadTimeout) {
		return (
			<div className="h-full flex items-center justify-center bg-slate-900">
				<div className="flex flex-col items-center gap-4">
					<RefreshCw className="animate-spin text-blue-400" size={48} />
					<span className="text-slate-400 font-mono">INITIALIZING CONTROL SYSTEM...</span>
				</div>
			</div>
		);
	}

	// Show disconnected state if not connected
	if (!isConnected || !status) {
		return (
			<div className="h-full flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
				<ControlHeader
					status={undefined}
					deaconRunning={false}
					onRefresh={() => refetchStatus()}
					onStart={handleStart}
					onShutdown={handleShutdown}
					isFetching={isFetching}
				/>
				<div className="flex-1 flex items-center justify-center">
					<div className="flex flex-col items-center gap-4 text-center">
						<div className="w-20 h-20 rounded-full border-4 border-red-500/50 flex items-center justify-center">
							<Radio size={40} className="text-red-400" />
						</div>
						<h2 className="text-xl font-bold text-slate-200">Gas Town Not Connected</h2>
						<p className="text-slate-400 max-w-md">
							{statusError
								? "Unable to connect to Gas Town backend. Make sure the server is running."
								: "Gas Town is not initialized. Click START to initialize the town."}
						</p>
						<button
							onClick={handleStart}
							className="flex items-center gap-2 px-6 py-3 rounded-lg bg-green-900 hover:bg-green-800 border border-green-700 transition-colors mt-4"
						>
							<Play size={20} />
							<span className="font-bold">START GAS TOWN</span>
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
			{/* Top control header */}
			<ControlHeader
				status={status}
				deaconRunning={deaconRunning}
				onRefresh={() => refetchStatus()}
				onStart={handleStart}
				onShutdown={handleShutdown}
				isFetching={isFetching}
			/>

			{/* Main dashboard area */}
			<div className="flex-1 p-4 overflow-hidden">
				<div className="h-full grid grid-cols-12 gap-4">
					{/* Left panel - Alarms and Convoys */}
					<div className="col-span-3 flex flex-col gap-4">
						<AlarmPanel agents={status.agents} rigs={status.rigs} />

						{/* Convoy batch monitor */}
						<div className="bg-slate-900/80 border border-slate-700 rounded-lg p-3 flex-1 overflow-hidden">
							<div className="flex items-center gap-2 mb-3">
								<Truck size={16} className="text-purple-400" />
								<span className="text-sm font-semibold text-slate-200">Active Convoys</span>
								<span className="text-xs px-1.5 py-0.5 bg-purple-900 text-purple-300 rounded-full">
									{convoys.length}
								</span>
							</div>
							<div className="space-y-2 max-h-[calc(100%-2rem)] overflow-y-auto">
								{convoys.length === 0 ? (
									<div className="text-xs text-slate-500 text-center py-4">
										No active convoys
									</div>
								) : (
									convoys.map((convoy: Convoy) => (
										<ConvoyBatch key={convoy.id} convoy={convoy} />
									))
								)}
							</div>
						</div>
					</div>

					{/* Center panel - Main schematic */}
					<div className="col-span-6 flex flex-col gap-4">
						{/* Agent hierarchy */}
						<AgentFlow agents={status.agents} rigs={status.rigs} />

						{/* Work pipeline */}
						<WorkPipeline beads={beads} />

						{/* Queue levels */}
						<div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex-1 overflow-hidden flex flex-col">
							<div className="flex items-center gap-2 mb-4">
								<Activity size={16} className="text-cyan-400" />
								<span className="text-sm font-semibold text-slate-200">Message Queues</span>
								<span className="text-xs text-slate-400">({status.rigs.length} rigs)</span>
							</div>
							<div className="overflow-y-auto flex-1">
								{sortedRigs.length === 0 ? (
									<div className="text-sm text-slate-500">No rigs configured</div>
								) : (
									<div className="grid grid-cols-9 gap-4 justify-items-center">
										{sortedRigs.map((rig: RigStatus) => (
											<QueueLevel
												key={rig.name}
												label={rig.name.slice(0, 12)}
												pending={rig.mq?.pending || 0}
												inFlight={rig.mq?.in_flight || 0}
												blocked={rig.mq?.blocked || 0}
												isRigActive={rig.polecat_count > 0 || rig.crew_count > 0}
											/>
										))}
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Right panel - Rig stations */}
					<div className="col-span-3 flex flex-col gap-4 overflow-y-auto">
						<div className="flex items-center gap-2 mb-1">
							<Server size={16} className="text-blue-400" />
							<span className="text-sm font-semibold text-slate-200">Rig Stations</span>
						</div>
						{sortedRigs.length === 0 ? (
							<div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4">
								<div className="text-sm text-slate-500 text-center">No rigs configured</div>
							</div>
						) : (
							sortedRigs.map((rig: RigStatus) => (
								<RigStation
									key={rig.name}
									rig={rig}
									agents={status.agents}
									isActive={rig.polecat_count > 0 || rig.crew_count > 0}
								/>
							))
						)}
					</div>
				</div>
			</div>

			{/* Bottom status bar */}
			<div className="bg-slate-900 border-t border-slate-700 px-4 py-2">
				<div className="flex items-center justify-between text-xs">
					<div className="flex items-center gap-4">
						<span className="text-slate-500">Location:</span>
						<span className="text-slate-400 font-mono">{status.location}</span>
					</div>
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<StatusIndicator status="active" size="sm" />
							<span className="text-slate-400">Active</span>
						</div>
						<div className="flex items-center gap-2">
							<StatusIndicator status="processing" size="sm" />
							<span className="text-slate-400">Processing</span>
						</div>
						<div className="flex items-center gap-2">
							<StatusIndicator status="idle" size="sm" />
							<span className="text-slate-400">Idle</span>
						</div>
						<div className="flex items-center gap-2">
							<StatusIndicator status="error" size="sm" />
							<span className="text-slate-400">Error</span>
						</div>
					</div>
					<div className="text-slate-500">
						Gas Town Dispatch Control v1.0
					</div>
				</div>
			</div>
		</div>
	);
}
