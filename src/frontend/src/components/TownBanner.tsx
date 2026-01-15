import { useQuery } from "@tanstack/react-query";
import { Activity, Server, Users, Zap, Eye, Factory } from "lucide-react";
import { getStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { TownStatus } from "@/types/api";

type TownMode = "NORMAL" | "DEGRADED" | "PATROL MUTED";

interface HeartbeatStatus {
	boot: boolean;
	deacon: boolean;
	witnesses: number;
	witnessesRunning: number;
	refineries: number;
	refineriesRunning: number;
}

function deriveMode(status: TownStatus | undefined): TownMode {
	if (!status) return "PATROL MUTED";

	const deacon = status.agents.find((a) => a.name === "deacon");
	const mayor = status.agents.find((a) => a.name === "mayor");

	// PATROL MUTED: Deacon not running (no health checks happening)
	if (!deacon?.running) return "PATROL MUTED";

	// DEGRADED: Mayor not running or some critical services down
	if (!mayor?.running) return "DEGRADED";

	// Check for any running witnesses or refineries across rigs
	const hasActiveRigs = status.rigs.some(
		(r) => r.polecat_count > 0 || r.crew_count > 0
	);

	// If there are active rigs but no witnesses running, that's degraded
	if (hasActiveRigs) {
		const witnessesRunning = status.rigs
			.flatMap((r) => r.agents || [])
			.filter((a) => a.role === "witness" && a.running).length;
		if (witnessesRunning === 0 && status.summary.witness_count > 0) {
			return "DEGRADED";
		}
	}

	return "NORMAL";
}

function deriveHeartbeats(status: TownStatus | undefined): HeartbeatStatus {
	if (!status) {
		return {
			boot: false,
			deacon: false,
			witnesses: 0,
			witnessesRunning: 0,
			refineries: 0,
			refineriesRunning: 0,
		};
	}

	const deacon = status.agents.find((a) => a.name === "deacon");
	const allRigAgents = status.rigs.flatMap((r) => r.agents || []);

	const witnesses = allRigAgents.filter((a) => a.role === "witness");
	const refineries = allRigAgents.filter((a) => a.role === "refinery");

	return {
		boot: status.agents.some((a) => a.running), // System is booted if any agent is running
		deacon: deacon?.running ?? false,
		witnesses: witnesses.length,
		witnessesRunning: witnesses.filter((w) => w.running).length,
		refineries: refineries.length,
		refineriesRunning: refineries.filter((r) => r.running).length,
	};
}

function HeartbeatPill({
	label,
	active,
	count,
	activeCount,
	icon: Icon,
}: {
	label: string;
	active: boolean;
	count?: number;
	activeCount?: number;
	icon: typeof Activity;
}) {
	const hasCount = count !== undefined && count > 0;
	const showActiveCount = hasCount && activeCount !== undefined;

	return (
		<div
			className={cn(
				"flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all",
				active
					? "bg-green-900/50 text-green-400 border border-green-700/50"
					: "bg-slate-800/50 text-slate-500 border border-slate-700/50"
			)}
			title={
				hasCount
					? `${label}: ${activeCount}/${count} running`
					: `${label}: ${active ? "Online" : "Offline"}`
			}
		>
			<span
				className={cn(
					"w-2 h-2 rounded-full",
					active ? "bg-green-400 animate-pulse" : "bg-slate-600"
				)}
			/>
			<Icon size={12} />
			<span className="uppercase tracking-wide">{label}</span>
			{showActiveCount && (
				<span className="font-mono text-[10px]">
					{activeCount}/{count}
				</span>
			)}
		</div>
	);
}

function ModeBadge({ mode }: { mode: TownMode }) {
	const modeConfig = {
		NORMAL: {
			bg: "bg-green-900/60",
			border: "border-green-600",
			text: "text-green-400",
			glow: "shadow-green-500/20",
		},
		DEGRADED: {
			bg: "bg-yellow-900/60",
			border: "border-yellow-600",
			text: "text-yellow-400",
			glow: "shadow-yellow-500/20",
		},
		"PATROL MUTED": {
			bg: "bg-red-900/60",
			border: "border-red-600",
			text: "text-red-400",
			glow: "shadow-red-500/20",
		},
	};

	const config = modeConfig[mode];

	return (
		<div
			className={cn(
				"px-3 py-1 rounded border font-mono text-sm font-bold tracking-wider shadow-lg",
				config.bg,
				config.border,
				config.text,
				config.glow
			)}
		>
			{mode}
		</div>
	);
}

function Counter({
	value,
	label,
	icon: Icon,
}: {
	value: number;
	label: string;
	icon: typeof Server;
}) {
	return (
		<div className="flex items-center gap-1.5 text-xs" title={label}>
			<Icon size={12} className="text-slate-400" />
			<span className="font-mono text-slate-200">{value}</span>
			<span className="text-slate-500 hidden sm:inline">{label}</span>
		</div>
	);
}

export default function TownBanner() {
	const { data: statusResponse } = useQuery({
		queryKey: ["status"],
		queryFn: getStatus,
		refetchInterval: 5_000,
		retry: 1,
	});

	const status = statusResponse?.status;
	const mode = deriveMode(status);
	const heartbeats = deriveHeartbeats(status);

	return (
		<div className="bg-slate-900/95 border-b border-slate-700 px-4 py-2 backdrop-blur-sm">
			<div className="flex items-center justify-between gap-4">
				{/* Left: Mode badge */}
				<div className="flex items-center gap-3">
					<ModeBadge mode={mode} />
				</div>

				{/* Center: Heartbeat pills */}
				<div className="flex items-center gap-2 flex-wrap justify-center">
					<HeartbeatPill
						label="Boot"
						active={heartbeats.boot}
						icon={Activity}
					/>
					<HeartbeatPill
						label="Deacon"
						active={heartbeats.deacon}
						icon={Server}
					/>
					<HeartbeatPill
						label="Witnesses"
						active={heartbeats.witnessesRunning > 0}
						count={heartbeats.witnesses}
						activeCount={heartbeats.witnessesRunning}
						icon={Eye}
					/>
					<HeartbeatPill
						label="Refineries"
						active={heartbeats.refineriesRunning > 0}
						count={heartbeats.refineries}
						activeCount={heartbeats.refineriesRunning}
						icon={Factory}
					/>
				</div>

				{/* Right: Global counters */}
				<div className="flex items-center gap-4">
					<Counter
						value={status?.summary.rig_count ?? 0}
						label="Rigs"
						icon={Server}
					/>
					<Counter
						value={
							(status?.summary.polecat_count ?? 0) +
							(status?.summary.crew_count ?? 0)
						}
						label="Workers"
						icon={Users}
					/>
					<Counter
						value={status?.summary.active_hooks ?? 0}
						label="Hooks"
						icon={Zap}
					/>
				</div>
			</div>
		</div>
	);
}
