import { cn } from "@/lib/utils";
import type { AgentRuntime } from "@/types/api";

export type AgentStatus = "working" | "idle" | "error" | "offline";

export function getAgentStatus(agent: AgentRuntime): AgentStatus {
	if (!agent.running) return "offline";
	if (agent.state === "error" || (agent.has_work && !agent.running)) return "error";
	if (agent.has_work) return "working";
	return "idle";
}

export interface AgentTileProps {
	agent: AgentRuntime;
	rigName: string;
	onClick?: () => void;
}

export function AgentTile({ agent, rigName, onClick }: AgentTileProps) {
	const status = getAgentStatus(agent);

	const statusConfig = {
		working: {
			bgClass: "bg-green-950/80",
			borderClass: "border-green-500",
			glowClass: "shadow-[0_0_15px_rgba(34,197,94,0.4),0_0_30px_rgba(34,197,94,0.2)]",
			statusText: "WORKING",
			statusColor: "text-green-400",
			indicatorClass: "bg-green-400 animate-pulse",
			animationClass: "",
		},
		idle: {
			bgClass: "bg-amber-950/40",
			borderClass: "border-amber-600/50",
			glowClass: "shadow-[0_0_8px_rgba(217,119,6,0.15)]",
			statusText: "IDLE",
			statusColor: "text-amber-400",
			indicatorClass: "bg-amber-400",
			animationClass: "",
		},
		error: {
			bgClass: "bg-red-950/80",
			borderClass: "border-red-500",
			glowClass: "shadow-[0_0_20px_rgba(239,68,68,0.5),0_0_40px_rgba(239,68,68,0.3)]",
			statusText: "FAULT",
			statusColor: "text-red-400",
			indicatorClass: "bg-red-400",
			animationClass: "animate-pulse",
		},
		offline: {
			bgClass: "bg-slate-900/60",
			borderClass: "border-slate-700",
			glowClass: "",
			statusText: "OFFLINE",
			statusColor: "text-slate-500",
			indicatorClass: "bg-slate-600",
			animationClass: "",
		},
	};

	const config = statusConfig[status];

	return (
		<button
			onClick={onClick}
			aria-label={`Agent ${agent.name} on ${rigName}: ${config.statusText}${agent.work_title ? `, working on ${agent.work_title}` : ""}`}
			className={cn(
				"relative w-full min-w-[100px] p-3 rounded-lg border-2 transition-all duration-200",
				"hover:scale-[1.02] hover:brightness-110 cursor-pointer",
				"focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900",
				config.bgClass,
				config.borderClass,
				config.glowClass,
				config.animationClass
			)}
		>
			{/* Status indicator light */}
			<div
				className={cn(
					"absolute top-2 right-2 w-2 h-2 rounded-full",
					config.indicatorClass,
					status === "error" && "animate-ping"
				)}
				aria-hidden="true"
			/>

			{/* Agent name */}
			<div className="font-mono text-sm font-bold text-slate-200 truncate pr-4">
				{agent.name}
			</div>

			{/* Status text */}
			<div className={cn("text-[10px] font-bold uppercase tracking-wider mt-1", config.statusColor)}>
				{config.statusText}
			</div>

			{/* Rig name */}
			<div className="text-[10px] text-slate-400 font-mono mt-1 truncate">
				{rigName}
			</div>

			{/* Work title (if working) */}
			{agent.work_title && (
				<div
					className="text-[10px] text-slate-300 mt-2 truncate border-t border-slate-700 pt-1"
					title={agent.work_title}
				>
					{agent.work_title}
				</div>
			)}

			{/* Mail badge */}
			{agent.unread_mail > 0 && (
				<div
					className="absolute bottom-2 right-2 text-[9px] px-1.5 py-0.5 bg-purple-900/80 text-purple-300 rounded-full font-mono"
					title={`${agent.unread_mail} unread messages`}
				>
					{agent.unread_mail}
				</div>
			)}
		</button>
	);
}
