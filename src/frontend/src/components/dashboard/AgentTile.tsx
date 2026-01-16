import { cn } from "@/lib/utils";
import type { AgentRuntime } from "@/types/api";

export type AgentStatus = "working" | "idle" | "fault" | "offline";

export interface AgentTileProps {
	agent: AgentRuntime;
	rigName: string;
	onClick?: () => void;
}

/**
 * Derives the agent status from runtime state.
 * - working: running with active work
 * - idle: running but no work
 * - fault: error state, or has work but not running (stuck)
 * - offline: not running
 */
export function getAgentStatus(agent: AgentRuntime): AgentStatus {
	if (agent.state === "error") return "fault";
	if (agent.has_work && !agent.running) return "fault"; // stuck
	if (!agent.running) return "offline";
	if (agent.has_work) return "working";
	return "idle";
}

/**
 * AgentTile - Backlit annunciator-style tile showing agent status.
 *
 * Visual states (SCADA-style):
 * - Green glow + pulse: Actively working
 * - Amber dim: Idle (running but no work)
 * - Red glow + flash: Fault (error or stuck)
 * - Dark/off: Offline
 */
export function AgentTile({ agent, rigName, onClick }: AgentTileProps) {
	const status = getAgentStatus(agent);

	// Status-based styling
	const statusConfig = {
		working: {
			border: "border-green-500",
			glow: "shadow-[0_0_15px_rgba(34,197,94,0.5)]",
			bg: "bg-gradient-to-b from-green-900/60 to-green-950/80",
			textColor: "text-green-400",
			statusLabel: "WORKING",
			pulse: true,
		},
		idle: {
			border: "border-amber-500/60",
			glow: "shadow-[0_0_8px_rgba(245,158,11,0.2)]",
			bg: "bg-gradient-to-b from-amber-900/30 to-slate-900/80",
			textColor: "text-amber-400",
			statusLabel: "IDLE",
			pulse: false,
		},
		fault: {
			border: "border-red-500",
			glow: "shadow-[0_0_20px_rgba(239,68,68,0.6)]",
			bg: "bg-gradient-to-b from-red-900/60 to-red-950/80",
			textColor: "text-red-400",
			statusLabel: agent.state === "error" ? "ERROR" : "STUCK",
			pulse: true,
		},
		offline: {
			border: "border-slate-700",
			glow: "",
			bg: "bg-slate-900/50",
			textColor: "text-slate-600",
			statusLabel: "OFFLINE",
			pulse: false,
		},
	};

	const config = statusConfig[status];

	return (
		<button
			onClick={onClick}
			className={cn(
				"relative w-full min-w-[80px] max-w-[100px] aspect-[4/5] rounded-sm border-2 overflow-hidden transition-all",
				"hover:scale-105 hover:z-10 cursor-pointer",
				"flex flex-col",
				config.border,
				config.glow,
				config.bg,
				config.pulse && status === "working" && "animate-pulse-subtle",
				config.pulse && status === "fault" && "animate-flash"
			)}
			title={`${agent.name} on ${rigName}${agent.work_title ? `: ${agent.work_title}` : ""}`}
		>
			{/* Backlit effect overlay */}
			<div className={cn(
				"absolute inset-0 opacity-20",
				status === "working" && "bg-gradient-radial from-green-400/40 to-transparent",
				status === "fault" && "bg-gradient-radial from-red-400/40 to-transparent",
				status === "idle" && "bg-gradient-radial from-amber-400/20 to-transparent"
			)} />

			{/* Content */}
			<div className="relative flex flex-col h-full p-1.5">
				{/* Agent name */}
				<div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-200 truncate">
					{agent.name.replace(/^polecat-/, "pcat-").slice(0, 8)}
				</div>

				{/* Status indicator */}
				<div className={cn(
					"text-[8px] font-bold uppercase tracking-widest mt-0.5",
					config.textColor
				)}>
					{config.statusLabel}
				</div>

				{/* Rig name */}
				<div className="text-[8px] text-slate-500 truncate mt-auto">
					{rigName.slice(0, 10)}
				</div>

				{/* Work title (if working) */}
				{agent.work_title && (
					<div className="text-[7px] text-slate-400 truncate leading-tight">
						{agent.work_title.slice(0, 20)}
					</div>
				)}

				{/* Mail badge */}
				{agent.unread_mail > 0 && (
					<div className="absolute top-1 right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-purple-600 text-[8px] font-bold text-white px-1">
						{agent.unread_mail > 9 ? "9+" : agent.unread_mail}
					</div>
				)}

				{/* Status LED */}
				<div className={cn(
					"absolute bottom-1 right-1 w-2 h-2 rounded-full",
					status === "working" && "bg-green-400 shadow-[0_0_4px_rgba(34,197,94,0.8)]",
					status === "idle" && "bg-amber-400/60",
					status === "fault" && "bg-red-500 animate-pulse shadow-[0_0_4px_rgba(239,68,68,0.8)]",
					status === "offline" && "bg-slate-600"
				)} />
			</div>
		</button>
	);
}
