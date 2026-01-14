import { useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { AgentRuntime } from "@/types/api";

export type AgentNodeStatus = "active" | "idle" | "working" | "error" | "offline";

export interface AgentNodeProps {
	agent: AgentRuntime;
	x: number;
	y: number;
	onClick?: () => void;
}

const statusColors: Record<AgentNodeStatus, { bg: string; border: string; fill: string }> = {
	active: {
		bg: "rgba(34,197,94,0.2)",
		border: "#10b981",
		fill: "#10b981",
	},
	working: {
		bg: "rgba(59,130,246,0.2)",
		border: "#3b82f6",
		fill: "#3b82f6",
	},
	idle: {
		bg: "rgba(245,158,11,0.2)",
		border: "#f59e0b",
		fill: "#f59e0b",
	},
	error: {
		bg: "rgba(239,68,68,0.2)",
		border: "#ef4444",
		fill: "#ef4444",
	},
	offline: {
		bg: "rgba(107,114,128,0.2)",
		border: "#6b7280",
		fill: "#6b7280",
	},
};

function getAgentStatus(agent: AgentRuntime): AgentNodeStatus {
	if (!agent.running) return "offline";
	if (agent.has_work) return "working";
	if (agent.state === "error") return "error";
	if (agent.running) return "active";
	return "idle";
}

function getRoleIcon(role: string): string {
	if (role === "mayor") return "M";
	if (role === "deacon") return "D";
	return role[0].toUpperCase();
}

export function AgentNode({ agent, x, y, onClick }: AgentNodeProps) {
	const navigate = useNavigate();
	const [showTooltip, setShowTooltip] = useState(false);
	const status = getAgentStatus(agent);
	const colors = statusColors[status];
	const isActive = status === "active" || status === "working";
	const workCount = agent.has_work ? 1 : 0;

	const handleClick = () => {
		if (onClick) {
			onClick();
		} else {
			navigate(`/agents/${agent.address}`);
		}
	};

	const tooltipContent = [
		`${agent.name} (${agent.role})`,
		`Status: ${status}`,
		agent.work_title ? `Work: ${agent.work_title}` : null,
		agent.unread_mail > 0 ? `Unread: ${agent.unread_mail}` : null,
	]
		.filter(Boolean)
		.join(" • ");

	return (
		<>
			<g
				transform={`translate(${x}, ${y})`}
				className="cursor-pointer transition-transform hover:scale-110"
				onClick={handleClick}
				onMouseEnter={() => setShowTooltip(true)}
				onMouseLeave={() => setShowTooltip(false)}
			>
				{/* Glow effect for active nodes */}
				{isActive && (
					<circle
						cx="0"
						cy="0"
						r="35"
						className="animate-pulse"
						fill={colors.bg}
					/>
				)}

				{/* Main node circle */}
				<circle
					cx="0"
					cy="0"
					r="25"
					stroke={colors.border}
					strokeWidth="2"
					fill={status === "offline" ? "#2a2a2a" : "url(#nodeGradient)"}
					className={cn("transition-all", isActive && "animate-pulse")}
				/>

				{/* Role icon */}
				<text
					x="0"
					y="6"
					textAnchor="middle"
					className="text-sm font-bold fill-gt-text pointer-events-none select-none"
				>
					{getRoleIcon(agent.role)}
				</text>

				{/* Label */}
				<text
					x="0"
					y="45"
					textAnchor="middle"
					className="text-xs fill-gt-text pointer-events-none select-none"
				>
					{agent.name}
				</text>

				{/* Work count badge */}
				{workCount > 0 && (
					<>
						<circle cx="20" cy="-20" r="10" fill="#f59e0b" />
						<text
							x="20"
							y="-16"
							textAnchor="middle"
							className="text-xs font-bold fill-gt-bg pointer-events-none select-none"
						>
							{workCount}
						</text>
					</>
				)}

				{/* Status indicator dot */}
				<circle
					cx="-20"
					cy="-20"
					r="5"
					fill={colors.fill}
					className={cn(
						"transition-all",
						(status === "active" || status === "working") && "animate-pulse",
					)}
				/>

				{/* Animated activity ring for working state */}
				{status === "working" && (
					<circle
						cx="0"
						cy="0"
						r="28"
						stroke={colors.border}
						strokeWidth="1.5"
						fill="none"
						strokeDasharray="4 4"
						className="animate-spin"
						style={{ animationDuration: "3s" }}
					/>
				)}

				{/* Native SVG tooltip (fallback) */}
				<title>{tooltipContent}</title>
			</g>

			{/* Custom tooltip */}
			{showTooltip && (
				<foreignObject
					x={x + 30}
					y={y - 40}
					width="250"
					height="100"
					className="pointer-events-none"
				>
					<div className="bg-gt-surface/95 border border-gt-border rounded-lg p-2 shadow-lg backdrop-blur-sm">
						<div className="text-xs space-y-1">
							<div className="font-semibold text-gt-text">
								{agent.name} <span className="text-gt-muted">({agent.role})</span>
							</div>
							<div className="flex items-center gap-2 text-gt-muted">
								<div
									className={cn(
										"w-2 h-2 rounded-full",
										status === "active" && "bg-green-500",
										status === "working" && "bg-blue-500 animate-pulse",
										status === "idle" && "bg-yellow-500",
										status === "error" && "bg-red-500",
										status === "offline" && "bg-gray-500",
									)}
								/>
								<span className="capitalize">{status}</span>
							</div>
							{agent.work_title && (
								<div className="text-gt-muted">
									Work: <span className="text-gt-text">{agent.work_title}</span>
								</div>
							)}
							{agent.unread_mail > 0 && (
								<div className="text-gt-muted">
									Unread: <span className="text-gt-accent">{agent.unread_mail}</span>
								</div>
							)}
						</div>
					</div>
				</foreignObject>
			)}
		</>
	);
}
