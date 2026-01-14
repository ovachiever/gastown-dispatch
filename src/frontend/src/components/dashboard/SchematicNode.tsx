import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export type NodeStatus = "active" | "idle" | "error" | "offline";

export interface SchematicNodeProps {
	id: string;
	label: string;
	status: NodeStatus;
	type: "mayor" | "deacon" | "rig" | "polecat";
	x: number;
	y: number;
	workCount?: number;
	onClick?: () => void;
	detailPath?: string;
}

const statusColors: Record<NodeStatus, { bg: string; border: string; glow: string }> = {
	active: {
		bg: "bg-green-600/20",
		border: "border-green-500",
		glow: "shadow-[0_0_15px_rgba(34,197,94,0.5)]",
	},
	idle: {
		bg: "bg-yellow-600/20",
		border: "border-yellow-500",
		glow: "shadow-[0_0_15px_rgba(245,158,11,0.5)]",
	},
	error: {
		bg: "bg-red-600/20",
		border: "border-red-500",
		glow: "shadow-[0_0_15px_rgba(239,68,68,0.5)]",
	},
	offline: {
		bg: "bg-gray-600/20",
		border: "border-gray-500",
		glow: "",
	},
};

const typeIcons: Record<string, string> = {
	mayor: "M",
	deacon: "D",
	rig: "R",
	polecat: "P",
};

export function SchematicNode({
	label,
	status,
	type,
	x,
	y,
	workCount,
	onClick,
	detailPath,
}: SchematicNodeProps) {
	const navigate = useNavigate();
	const colors = statusColors[status];
	const isActive = status === "active";

	const handleClick = () => {
		if (onClick) {
			onClick();
		} else if (detailPath) {
			navigate(detailPath);
		}
	};

	return (
		<g
			transform={`translate(${x}, ${y})`}
			className="cursor-pointer transition-transform hover:scale-110"
			onClick={handleClick}
		>
			{/* Glow effect for active nodes */}
			{isActive && (
				<circle
					cx="0"
					cy="0"
					r="35"
					className="animate-pulse"
					fill={status === "active" ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}
				/>
			)}

			{/* Main node circle */}
			<circle
				cx="0"
				cy="0"
				r="25"
				className={cn(
					"stroke-2 transition-all",
					colors.bg,
					colors.border,
					isActive && "animate-pulse",
				)}
				fill={status === "offline" ? "#2a2a2a" : undefined}
				style={{
					fill: status !== "offline" ? "url(#nodeGradient)" : undefined,
				}}
			/>

			{/* Type icon */}
			<text
				x="0"
				y="6"
				textAnchor="middle"
				className="text-sm font-bold fill-gt-text pointer-events-none select-none"
			>
				{typeIcons[type] || type[0].toUpperCase()}
			</text>

			{/* Label */}
			<text
				x="0"
				y="45"
				textAnchor="middle"
				className="text-xs fill-gt-text pointer-events-none select-none"
			>
				{label}
			</text>

			{/* Work count badge */}
			{workCount !== undefined && workCount > 0 && (
				<>
					<circle
						cx="20"
						cy="-20"
						r="10"
						className="fill-gt-accent"
					/>
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
				className={cn(
					"transition-all",
					status === "active" && "fill-green-500 animate-pulse",
					status === "idle" && "fill-yellow-500",
					status === "error" && "fill-red-500 animate-pulse",
					status === "offline" && "fill-gray-500",
				)}
			/>
		</g>
	);
}
