import { Sparkline } from "./Sparkline";
import { Truck, GitPullRequest, Mail, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TrendData {
	convoysOpen: number[];
	blockedMRs: number[];
	mailBacklog: number[];
	throughput: number[];
}

interface TrendSparklineProps {
	label: string;
	icon: React.ReactNode;
	data: number[];
	color: string;
	fillColor: string;
	currentValue: number;
	unit?: string;
}

function TrendSparkline({
	label,
	icon,
	data,
	color,
	fillColor,
	currentValue,
	unit = "",
}: TrendSparklineProps) {
	const hasData = data.length > 1;
	const trend = hasData
		? data[data.length - 1] - data[0]
		: 0;

	return (
		<div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded border border-slate-700/50">
			<div className={cn("flex-shrink-0", color.replace("stroke-", "text-"))}>
				{icon}
			</div>
			<div className="flex flex-col min-w-0">
				<span className="text-[9px] text-slate-500 uppercase tracking-wider truncate">
					{label}
				</span>
				<div className="flex items-baseline gap-1">
					<span className="font-mono text-sm font-bold text-slate-200">
						{currentValue}
					</span>
					{unit && (
						<span className="text-[9px] text-slate-500">{unit}</span>
					)}
					{hasData && trend !== 0 && (
						<span className={cn(
							"text-[9px] font-mono",
							trend > 0 ? "text-red-400" : "text-green-400"
						)}>
							{trend > 0 ? "+" : ""}{trend}
						</span>
					)}
				</div>
			</div>
			<div className="flex-shrink-0 ml-auto">
				{hasData ? (
					<Sparkline
						data={data}
						width={60}
						height={20}
						color={color}
						fillColor={fillColor}
					/>
				) : (
					<div className="w-[60px] h-[20px] flex items-center justify-center text-[8px] text-slate-600">
						Collecting...
					</div>
				)}
			</div>
		</div>
	);
}

interface TrendsSparklinesProps {
	trends: TrendData;
	currentValues: {
		convoysOpen: number;
		blockedMRs: number;
		mailBacklog: number;
		throughput: number;
	};
}

export function TrendsSparklines({ trends, currentValues }: TrendsSparklinesProps) {
	return (
		<div className="flex items-center gap-3 flex-wrap">
			<TrendSparkline
				label="Convoys Open"
				icon={<Truck size={12} />}
				data={trends.convoysOpen}
				color="stroke-purple-400"
				fillColor="fill-purple-400/10"
				currentValue={currentValues.convoysOpen}
			/>
			<TrendSparkline
				label="Blocked MRs"
				icon={<GitPullRequest size={12} />}
				data={trends.blockedMRs}
				color="stroke-red-400"
				fillColor="fill-red-400/10"
				currentValue={currentValues.blockedMRs}
			/>
			<TrendSparkline
				label="Mail Backlog"
				icon={<Mail size={12} />}
				data={trends.mailBacklog}
				color="stroke-amber-400"
				fillColor="fill-amber-400/10"
				currentValue={currentValues.mailBacklog}
			/>
			<TrendSparkline
				label="Throughput"
				icon={<Zap size={12} />}
				data={trends.throughput}
				color="stroke-green-400"
				fillColor="fill-green-400/10"
				currentValue={currentValues.throughput}
				unit="/interval"
			/>
		</div>
	);
}
