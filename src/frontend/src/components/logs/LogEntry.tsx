import { useState } from "react";
import {
	AlertCircle,
	AlertTriangle,
	Info,
	Bug,
	ChevronDown,
	ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface LogEntryData {
	id: string;
	timestamp: string;
	source: string;
	level: "info" | "warn" | "error" | "debug";
	message: string;
	data?: Record<string, unknown>;
}

interface LogEntryProps {
	entry: LogEntryData;
}

const levelConfig = {
	error: {
		icon: AlertCircle,
		color: "text-red-400",
		bgColor: "bg-red-400/10",
	},
	warn: {
		icon: AlertTriangle,
		color: "text-yellow-400",
		bgColor: "bg-yellow-400/10",
	},
	info: {
		icon: Info,
		color: "text-blue-400",
		bgColor: "bg-transparent",
	},
	debug: {
		icon: Bug,
		color: "text-gray-400",
		bgColor: "bg-transparent",
	},
};

const sourceColors: Record<string, string> = {
	mayor: "text-purple-400",
	deacon: "text-blue-400",
	witness: "text-cyan-400",
	refinery: "text-amber-400",
	polecat: "text-green-400",
	daemon: "text-gray-400",
	system: "text-gray-400",
};

function getSourceColor(source: string): string {
	const lowerSource = source.toLowerCase();
	for (const [key, color] of Object.entries(sourceColors)) {
		if (lowerSource.includes(key)) {
			return color;
		}
	}
	return "text-gt-accent";
}

export function LogEntry({ entry }: LogEntryProps) {
	const [expanded, setExpanded] = useState(false);
	const hasData = entry.data && Object.keys(entry.data).length > 0;
	const config = levelConfig[entry.level];
	const LevelIcon = config.icon;

	const date = new Date(entry.timestamp);
	const formattedTime = date.toLocaleTimeString("en-US", {
		hour12: false,
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}) + `.${date.getMilliseconds().toString().padStart(3, "0")}`;

	return (
		<div
			className={cn(
				"py-1 px-2 rounded font-mono text-sm hover:bg-gt-surface/50 transition-colors",
				config.bgColor,
			)}
		>
			<div className="flex items-start gap-2">
				{/* Expand toggle for entries with data */}
				{hasData ? (
					<button
						onClick={() => setExpanded(!expanded)}
						className="mt-0.5 text-gt-muted hover:text-gt-text"
					>
						{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
					</button>
				) : (
					<span className="w-[14px]" />
				)}

				{/* Level icon */}
				<LevelIcon size={14} className={cn("mt-0.5 shrink-0", config.color)} />

				{/* Timestamp */}
				<span className="text-gt-muted shrink-0 tabular-nums">
					{formattedTime}
				</span>

				{/* Source badge */}
				<span
					className={cn(
						"shrink-0 px-1.5 py-0.5 rounded text-xs",
						getSourceColor(entry.source),
						"bg-gt-surface",
					)}
				>
					{entry.source}
				</span>

				{/* Message */}
				<span className={cn("break-words min-w-0", config.color)}>
					{entry.message}
				</span>
			</div>

			{/* Expanded data */}
			{expanded && hasData && (
				<div className="ml-8 mt-2 p-2 bg-gt-bg rounded border border-gt-border text-xs">
					<pre className="whitespace-pre-wrap text-gt-muted">
						{JSON.stringify(entry.data, null, 2)}
					</pre>
				</div>
			)}
		</div>
	);
}
