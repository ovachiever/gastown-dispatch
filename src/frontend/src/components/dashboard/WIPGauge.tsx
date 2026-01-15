import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { Activity, Zap, GitBranch, Users } from "lucide-react";

export interface WIPGaugeProps {
	activePolecats: number;
	activeHooks: number;
	inProgressSteps: number;
	maxWIP?: number;
	className?: string;
}

/**
 * WIP Gauge - Shows work in progress across the system
 * Combines: active polecats + active hooks + in_progress steps
 */
export function WIPGauge({
	activePolecats,
	activeHooks,
	inProgressSteps,
	maxWIP = 20,
	className,
}: WIPGaugeProps) {
	const { totalWIP, fillPercent, segments } = useMemo(() => {
		const total = activePolecats + activeHooks + inProgressSteps;
		const percent = Math.min((total / maxWIP) * 100, 100);

		// Calculate segment percentages for the stacked bar
		const segments = total > 0 ? {
			polecats: (activePolecats / total) * 100,
			hooks: (activeHooks / total) * 100,
			steps: (inProgressSteps / total) * 100,
		} : { polecats: 0, hooks: 0, steps: 0 };

		return { totalWIP: total, fillPercent: percent, segments };
	}, [activePolecats, activeHooks, inProgressSteps, maxWIP]);

	const getStatusColor = () => {
		if (fillPercent >= 90) return "text-red-400";
		if (fillPercent >= 70) return "text-yellow-400";
		return "text-green-400";
	};

	const getStatusLabel = () => {
		if (totalWIP === 0) return "IDLE";
		if (fillPercent >= 90) return "MAX LOAD";
		if (fillPercent >= 70) return "HIGH LOAD";
		if (fillPercent >= 40) return "ACTIVE";
		return "LIGHT";
	};

	return (
		<div className={cn("bg-slate-900/80 border border-slate-700 rounded-lg p-3", className)}>
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<Activity size={16} className="text-cyan-400" />
					<span className="text-sm font-semibold text-slate-200">WIP Gauge</span>
				</div>
				<span className={cn(
					"text-xs px-2 py-0.5 rounded-full font-bold uppercase",
					fillPercent >= 90 ? "bg-red-900/50 text-red-400" :
					fillPercent >= 70 ? "bg-yellow-900/50 text-yellow-400" :
					totalWIP > 0 ? "bg-green-900/50 text-green-400" :
					"bg-slate-800 text-slate-500"
				)}>
					{getStatusLabel()}
				</span>
			</div>

			{/* Main gauge display */}
			<div className="flex items-center gap-4 mb-3">
				{/* Large number display */}
				<div className="flex-shrink-0">
					<div className={cn("font-mono text-4xl font-bold", getStatusColor())}>
						{totalWIP}
					</div>
					<div className="text-[10px] text-slate-500 uppercase">Total WIP</div>
				</div>

				{/* Vertical progress tank */}
				<div className="flex-1 flex items-end gap-2">
					<div className="relative w-12 h-20 border-2 border-slate-600 rounded-b-lg bg-black/50 overflow-hidden">
						{/* Fill level with segments */}
						<div
							className="absolute bottom-0 left-0 right-0 transition-all duration-500"
							style={{ height: `${fillPercent}%` }}
						>
							{/* Steps (blue) - bottom */}
							{segments.steps > 0 && (
								<div
									className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600 to-blue-500"
									style={{ height: `${segments.steps}%` }}
								/>
							)}
							{/* Hooks (yellow) - middle */}
							{segments.hooks > 0 && (
								<div
									className="absolute left-0 right-0 bg-gradient-to-t from-yellow-600 to-yellow-500"
									style={{
										bottom: `${segments.steps}%`,
										height: `${segments.hooks}%`,
									}}
								/>
							)}
							{/* Polecats (green) - top */}
							{segments.polecats > 0 && (
								<div
									className="absolute left-0 right-0 bg-gradient-to-t from-green-600 to-green-500"
									style={{
										bottom: `${segments.steps + segments.hooks}%`,
										height: `${segments.polecats}%`,
									}}
								/>
							)}
						</div>

						{/* Level markers */}
						{[25, 50, 75].map((level) => (
							<div
								key={level}
								className="absolute left-0 right-0 border-t border-slate-600/50"
								style={{ bottom: `${level}%` }}
							/>
						))}

						{/* Glass effect */}
						<div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
					</div>

					{/* Breakdown stats */}
					<div className="flex-1 space-y-1.5">
						<div className="flex items-center gap-2">
							<Users size={12} className="text-green-400 flex-shrink-0" />
							<div className="flex-1 h-2 bg-black/50 rounded overflow-hidden">
								<div
									className="h-full bg-green-500 transition-all duration-300"
									style={{ width: `${(activePolecats / Math.max(totalWIP, 1)) * 100}%` }}
								/>
							</div>
							<span className="font-mono text-xs text-green-400 w-6 text-right">
								{activePolecats}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<Zap size={12} className="text-yellow-400 flex-shrink-0" />
							<div className="flex-1 h-2 bg-black/50 rounded overflow-hidden">
								<div
									className="h-full bg-yellow-500 transition-all duration-300"
									style={{ width: `${(activeHooks / Math.max(totalWIP, 1)) * 100}%` }}
								/>
							</div>
							<span className="font-mono text-xs text-yellow-400 w-6 text-right">
								{activeHooks}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<GitBranch size={12} className="text-blue-400 flex-shrink-0" />
							<div className="flex-1 h-2 bg-black/50 rounded overflow-hidden">
								<div
									className="h-full bg-blue-500 transition-all duration-300"
									style={{ width: `${(inProgressSteps / Math.max(totalWIP, 1)) * 100}%` }}
								/>
							</div>
							<span className="font-mono text-xs text-blue-400 w-6 text-right">
								{inProgressSteps}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Legend */}
			<div className="flex items-center justify-center gap-4 text-[9px] text-slate-400 border-t border-slate-700 pt-2">
				<div className="flex items-center gap-1">
					<div className="w-2 h-2 rounded-full bg-green-500" />
					<span>Polecats</span>
				</div>
				<div className="flex items-center gap-1">
					<div className="w-2 h-2 rounded-full bg-yellow-500" />
					<span>Hooks</span>
				</div>
				<div className="flex items-center gap-1">
					<div className="w-2 h-2 rounded-full bg-blue-500" />
					<span>Steps</span>
				</div>
			</div>
		</div>
	);
}
