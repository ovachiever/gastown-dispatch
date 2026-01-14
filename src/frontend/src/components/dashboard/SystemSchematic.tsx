import { useQuery } from "@tanstack/react-query";
import { getStatus } from "@/lib/api";
import { SchematicNode, NodeStatus } from "./SchematicNode";
import { RefreshCw } from "lucide-react";

interface Connection {
	from: { x: number; y: number };
	to: { x: number; y: number };
	active?: boolean;
}

export function SystemSchematic() {
	const { data: response, isLoading, error } = useQuery({
		queryKey: ["status"],
		queryFn: getStatus,
		refetchInterval: 10_000,
	});

	if (isLoading) {
		return (
			<div className="w-full h-full flex items-center justify-center bg-gt-bg">
				<RefreshCw className="animate-spin text-gt-muted" size={32} />
			</div>
		);
	}

	if (error || !response?.initialized) {
		return (
			<div className="w-full h-full flex items-center justify-center bg-gt-bg">
				<p className="text-gt-muted">Unable to load system schematic</p>
			</div>
		);
	}

	const status = response.status;

	// Find agents
	const mayor = status?.agents.find((a) => a.role === "mayor");
	const deacon = status?.agents.find((a) => a.role === "deacon");
	const rigs = status?.rigs || [];

	// Calculate positions
	const viewWidth = 1200;
	const viewHeight = 600;
	const centerX = viewWidth / 2;

	// Mayor position (top center)
	const mayorPos = { x: centerX, y: 80 };

	// Deacon position (below mayor)
	const deaconPos = { x: centerX, y: 200 };

	// Rigs positions (spread horizontally below deacon)
	const rigSpacing = Math.min(250, viewWidth / (rigs.length + 1));
	const rigsY = 350;
	const rigsStartX = centerX - ((rigs.length - 1) * rigSpacing) / 2;

	const rigPositions = rigs.map((_, index) => ({
		x: rigsStartX + index * rigSpacing,
		y: rigsY,
	}));

	// Polecat positions (below each rig)
	const polecatsY = 500;

	// Build connections
	const connections: Connection[] = [];

	// Mayor to Deacon
	if (mayor && deacon) {
		connections.push({
			from: mayorPos,
			to: deaconPos,
			active: deacon.running,
		});
	}

	// Deacon to each Rig
	rigs.forEach((_, index) => {
		connections.push({
			from: deaconPos,
			to: rigPositions[index],
			active: deacon?.running || false,
		});
	});

	// Rigs to their Polecats
	rigs.forEach((rig, rigIndex) => {
		const rigPos = rigPositions[rigIndex];
		const polecatCount = rig.polecat_count || 0;
		if (polecatCount === 0) return;

		// Spread polecats under their rig
		const polecatSpacing = 60;
		const polecatsStartX = rigPos.x - ((polecatCount - 1) * polecatSpacing) / 2;

		for (let i = 0; i < polecatCount; i++) {
			connections.push({
				from: rigPos,
				to: { x: polecatsStartX + i * polecatSpacing, y: polecatsY },
				active: true,
			});
		}
	});

	// Determine node statuses
	const getMayorStatus = (): NodeStatus => {
		if (!mayor) return "offline";
		if (mayor.running) return "active";
		return "idle";
	};

	const getDeaconStatus = (): NodeStatus => {
		if (!deacon) return "offline";
		if (deacon.running) return "active";
		return "idle";
	};

	const getRigStatus = (_rig: any): NodeStatus => {
		// For now, rigs are considered active if deacon is running
		return deacon?.running ? "active" : "idle";
	};

	const getPolecatStatus = (): NodeStatus => {
		// Polecats are active if their rig is active
		return deacon?.running ? "active" : "idle";
	};

	return (
		<div className="w-full h-full bg-gt-bg relative overflow-hidden">
			<svg
				viewBox={`0 0 ${viewWidth} ${viewHeight}`}
				className="w-full h-full"
				preserveAspectRatio="xMidYMid meet"
			>
				{/* Define gradients */}
				<defs>
					<radialGradient id="nodeGradient" cx="30%" cy="30%">
						<stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
						<stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
					</radialGradient>
					<linearGradient id="connectionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
						<stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
					</linearGradient>
				</defs>

				{/* Draw connections */}
				<g className="connections">
					{connections.map((conn, index) => (
						<line
							key={index}
							x1={conn.from.x}
							y1={conn.from.y + 25} // Offset from node radius
							x2={conn.to.x}
							y2={conn.to.y - 25} // Offset from node radius
							stroke={conn.active ? "#f59e0b" : "#2a2a2a"}
							strokeWidth="2"
							strokeOpacity={conn.active ? 0.8 : 0.3}
							className={conn.active ? "animate-pulse" : ""}
						/>
					))}
				</g>

				{/* Mayor node */}
				{mayor && (
					<SchematicNode
						id={mayor.address}
						label={mayor.name}
						type="mayor"
						status={getMayorStatus()}
						x={mayorPos.x}
						y={mayorPos.y}
						workCount={mayor.has_work ? 1 : 0}
						detailPath={`/agents/${mayor.address}`}
					/>
				)}

				{/* Deacon node */}
				{deacon && (
					<SchematicNode
						id={deacon.address}
						label={deacon.name}
						type="deacon"
						status={getDeaconStatus()}
						x={deaconPos.x}
						y={deaconPos.y}
						workCount={deacon.has_work ? 1 : 0}
						detailPath={`/agents/${deacon.address}`}
					/>
				)}

				{/* Rig nodes */}
				{rigs.map((rig, index) => (
					<SchematicNode
						key={rig.name}
						id={rig.name}
						label={rig.name}
						type="rig"
						status={getRigStatus(rig)}
						x={rigPositions[index].x}
						y={rigPositions[index].y}
						detailPath={`/rigs/${rig.name}`}
					/>
				))}

				{/* Polecat nodes */}
				{rigs.map((rig, rigIndex) => {
					const polecatCount = rig.polecat_count || 0;
					if (polecatCount === 0) return null;

					const rigPos = rigPositions[rigIndex];
					const polecatSpacing = 60;
					const polecatsStartX = rigPos.x - ((polecatCount - 1) * polecatSpacing) / 2;

					return Array.from({ length: polecatCount }).map((_, polecatIndex) => (
						<SchematicNode
							key={`${rig.name}-polecat-${polecatIndex}`}
							id={`${rig.name}-polecat-${polecatIndex}`}
							label={`P${polecatIndex + 1}`}
							type="polecat"
							status={getPolecatStatus()}
							x={polecatsStartX + polecatIndex * polecatSpacing}
							y={polecatsY}
						/>
					));
				})}
			</svg>

			{/* Legend */}
			<div className="absolute bottom-4 right-4 bg-gt-surface/90 border border-gt-border rounded-lg p-3 backdrop-blur-sm">
				<h4 className="text-xs font-semibold text-gt-text mb-2">Status</h4>
				<div className="space-y-1 text-xs">
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 rounded-full bg-green-500" />
						<span className="text-gt-muted">Active</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 rounded-full bg-yellow-500" />
						<span className="text-gt-muted">Idle</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 rounded-full bg-red-500" />
						<span className="text-gt-muted">Error</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 rounded-full bg-gray-500" />
						<span className="text-gt-muted">Offline</span>
					</div>
				</div>
			</div>
		</div>
	);
}
