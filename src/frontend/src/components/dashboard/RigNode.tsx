import { useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { RigStatus } from "@/types/api";

export type RigNodeStatus = "active" | "idle" | "working" | "offline";

export interface RigNodeProps {
	rig: RigStatus;
	x: number;
	y: number;
	isActive?: boolean;
	onClick?: () => void;
}

const statusColors: Record<RigNodeStatus, { bg: string; border: string; fill: string }> = {
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
	offline: {
		bg: "rgba(107,114,128,0.2)",
		border: "#6b7280",
		fill: "#6b7280",
	},
};

function getRigStatus(rig: RigStatus, isActive: boolean): RigNodeStatus {
	const hasActiveWork = rig.hooks?.some((h) => h.has_work) ?? false;
	if (hasActiveWork) return "working";
	if (isActive) return "active";
	if (rig.polecat_count > 0) return "idle";
	return "offline";
}

export function RigNode({ rig, x, y, isActive = false, onClick }: RigNodeProps) {
	const navigate = useNavigate();
	const [showTooltip, setShowTooltip] = useState(false);
	const status = getRigStatus(rig, isActive);
	const colors = statusColors[status];
	const activeHooks = rig.hooks?.filter((h) => h.has_work).length ?? 0;

	const handleClick = () => {
		if (onClick) {
			onClick();
		} else {
			navigate(`/rigs/${rig.name}`);
		}
	};

	return (
		<>
			<g
				transform={`translate(${x}, ${y})`}
				className="cursor-pointer transition-transform hover:scale-110"
				onClick={handleClick}
				onMouseEnter={() => setShowTooltip(true)}
				onMouseLeave={() => setShowTooltip(false)}
			>
				{/* Glow effect for active/working rigs */}
				{(status === "active" || status === "working") && (
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
					className={cn(
						"transition-all",
						(status === "active" || status === "working") && "animate-pulse",
					)}
				/>

				{/* Rig icon */}
				<text
					x="0"
					y="6"
					textAnchor="middle"
					className="text-sm font-bold fill-gt-text pointer-events-none select-none"
				>
					R
				</text>

				{/* Label */}
				<text
					x="0"
					y="45"
					textAnchor="middle"
					className="text-xs fill-gt-text pointer-events-none select-none"
				>
					{rig.name}
				</text>

				{/* Active hooks badge */}
				{activeHooks > 0 && (
					<>
						<circle cx="20" cy="-20" r="10" fill="#f59e0b" />
						<text
							x="20"
							y="-16"
							textAnchor="middle"
							className="text-xs font-bold fill-gt-bg pointer-events-none select-none"
						>
							{activeHooks}
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
						status === "working" && "animate-pulse",
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

				{/* Capability indicators */}
				{rig.has_witness && (
					<>
						<circle cx="18" cy="18" r="3" fill="#8b5cf6" />
						<title>Has Witness</title>
					</>
				)}
				{rig.has_refinery && (
					<>
						<circle cx="-18" cy="18" r="3" fill="#ec4899" />
						<title>Has Refinery</title>
					</>
				)}

				{/* Native SVG tooltip (fallback) */}
				<title>
					{rig.name} • Polecats: {rig.polecat_count} • Crews: {rig.crew_count}
					{activeHooks > 0 ? ` • Active: ${activeHooks}` : ""}
				</title>
			</g>

			{/* Custom tooltip */}
			{showTooltip && (
				<foreignObject
					x={x + 30}
					y={y - 40}
					width="250"
					height="120"
					className="pointer-events-none"
				>
					<div className="bg-gt-surface/95 border border-gt-border rounded-lg p-2 shadow-lg backdrop-blur-sm">
						<div className="text-xs space-y-1">
							<div className="font-semibold text-gt-text">{rig.name}</div>
							<div className="flex items-center gap-2 text-gt-muted">
								<div
									className={cn(
										"w-2 h-2 rounded-full",
										status === "active" && "bg-green-500",
										status === "working" && "bg-blue-500 animate-pulse",
										status === "idle" && "bg-yellow-500",
										status === "offline" && "bg-gray-500",
									)}
								/>
								<span className="capitalize">{status}</span>
							</div>
							<div className="grid grid-cols-2 gap-1 text-gt-muted">
								<div>Polecats: <span className="text-gt-text">{rig.polecat_count}</span></div>
								<div>Crews: <span className="text-gt-text">{rig.crew_count}</span></div>
							</div>
							{activeHooks > 0 && (
								<div className="text-gt-muted">
									Active: <span className="text-gt-accent">{activeHooks}</span>
								</div>
							)}
							{(rig.has_witness || rig.has_refinery) && (
								<div className="flex gap-2 mt-1">
									{rig.has_witness && (
										<span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
											Witness
										</span>
									)}
									{rig.has_refinery && (
										<span className="text-xs px-1.5 py-0.5 bg-pink-500/20 text-pink-400 rounded">
											Refinery
										</span>
									)}
								</div>
							)}
						</div>
					</div>
				</foreignObject>
			)}
		</>
	);
}
