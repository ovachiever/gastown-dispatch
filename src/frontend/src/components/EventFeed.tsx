import { useMemo } from "react";
import {
	Activity,
	Truck,
	Zap,
	AlertTriangle,
	Users,
	Server,
	Clock,
	Filter,
	Trash2,
	Circle,
} from "lucide-react";
import {
	useUnifiedEventFeed,
	type UnifiedEvent,
	type UnifiedEventType,
} from "@/hooks/useUnifiedEventFeed";
import { formatRelativeTime, cn } from "@/lib/utils";

interface EventFeedProps {
	maxEvents?: number;
	className?: string;
	showFilters?: boolean;
	compact?: boolean;
}

// Event type configuration
const eventTypeConfig: Record<
	UnifiedEventType,
	{
		icon: typeof Activity;
		label: string;
		color: string;
		bgColor: string;
	}
> = {
	convoy: {
		icon: Truck,
		label: "Convoy",
		color: "text-purple-400",
		bgColor: "bg-purple-900/20",
	},
	sling: {
		icon: Zap,
		label: "Sling",
		color: "text-yellow-400",
		bgColor: "bg-yellow-900/20",
	},
	step: {
		icon: Activity,
		label: "Step",
		color: "text-blue-400",
		bgColor: "bg-blue-900/20",
	},
	merge: {
		icon: Activity,
		label: "Merge",
		color: "text-cyan-400",
		bgColor: "bg-cyan-900/20",
	},
	escalation: {
		icon: AlertTriangle,
		label: "Alert",
		color: "text-red-400",
		bgColor: "bg-red-900/20",
	},
	agent: {
		icon: Users,
		label: "Agent",
		color: "text-green-400",
		bgColor: "bg-green-900/20",
	},
	system: {
		icon: Server,
		label: "System",
		color: "text-orange-400",
		bgColor: "bg-orange-900/20",
	},
};

// Severity styling
const severityStyles = {
	info: "border-l-blue-500",
	warning: "border-l-yellow-500",
	error: "border-l-red-500",
};

function EventItem({
	event,
	compact = false,
}: {
	event: UnifiedEvent;
	compact?: boolean;
}) {
	const config = eventTypeConfig[event.type];
	const Icon = config.icon;

	if (compact) {
		return (
			<div
				className={cn(
					"flex items-center gap-2 px-2 py-1.5 rounded text-xs",
					config.bgColor,
					"border-l-2",
					severityStyles[event.severity]
				)}
			>
				<Icon size={12} className={config.color} />
				<span className="text-slate-300 truncate flex-1">{event.title}</span>
				<span className="text-slate-500 text-[10px] flex-shrink-0">
					{formatRelativeTime(event.timestamp)}
				</span>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex items-start gap-3 p-3 rounded-lg border-l-2 transition-all hover:bg-slate-800/50",
				config.bgColor,
				severityStyles[event.severity]
			)}
		>
			<div className={cn("mt-0.5 flex-shrink-0", config.color)}>
				<Icon size={16} />
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 mb-0.5">
					<span
						className={cn("text-[10px] font-bold uppercase", config.color)}
					>
						{config.label}
					</span>
					<span className="text-[10px] text-slate-500 flex items-center gap-1">
						<Clock size={10} />
						{formatRelativeTime(event.timestamp)}
					</span>
				</div>
				<p className="text-sm text-slate-200 font-medium">{event.title}</p>
				{event.description && (
					<p className="text-xs text-slate-400 mt-0.5 truncate">
						{event.description}
					</p>
				)}
			</div>
		</div>
	);
}

export function EventFeed({
	maxEvents = 100,
	className,
	showFilters = true,
	compact = false,
}: EventFeedProps) {
	const { events, connected, connectionStatus, clearEvents } =
		useUnifiedEventFeed({
			maxEvents,
			enabled: true,
		});

	// Filter state - could be extended with useState for interactive filtering
	const activeFilters: UnifiedEventType[] = [
		"convoy",
		"sling",
		"step",
		"merge",
		"escalation",
		"agent",
		"system",
	];

	const filteredEvents = useMemo(() => {
		return events.filter((e) => activeFilters.includes(e.type));
	}, [events, activeFilters]);

	// Group events by time period for better visual organization
	const groupedEvents = useMemo(() => {
		const now = Date.now();
		const groups: {
			recent: UnifiedEvent[]; // < 5 minutes
			earlier: UnifiedEvent[]; // 5-60 minutes
			older: UnifiedEvent[]; // > 60 minutes
		} = {
			recent: [],
			earlier: [],
			older: [],
		};

		filteredEvents.forEach((event) => {
			const age = now - new Date(event.timestamp).getTime();
			if (age < 5 * 60 * 1000) {
				groups.recent.push(event);
			} else if (age < 60 * 60 * 1000) {
				groups.earlier.push(event);
			} else {
				groups.older.push(event);
			}
		});

		return groups;
	}, [filteredEvents]);

	return (
		<div
			className={cn(
				"bg-slate-900/80 border border-slate-700 rounded-lg flex flex-col h-full",
				className
			)}
		>
			{/* Header */}
			<div className="p-3 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
				<div className="flex items-center gap-2">
					<Activity className="text-gt-accent" size={18} />
					<h2 className="text-sm font-semibold text-slate-200">Event Feed</h2>
					<span className="text-xs text-slate-500">
						({filteredEvents.length})
					</span>
				</div>
				<div className="flex items-center gap-2">
					{/* Connection status */}
					<div className="flex items-center gap-1">
						<Circle
							size={8}
							className={cn(
								"fill-current",
								connected ? "text-green-500" : "text-red-500"
							)}
						/>
						<span className="text-[10px] text-slate-500">
							{connected ? "Live" : "Disconnected"}
						</span>
					</div>

					{/* Actions */}
					{showFilters && (
						<>
							<button
								className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 transition-colors"
								title="Filter events"
							>
								<Filter size={14} />
							</button>
							<button
								onClick={clearEvents}
								className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 transition-colors"
								title="Clear events"
							>
								<Trash2 size={14} />
							</button>
						</>
					)}
				</div>
			</div>

			{/* Event list */}
			<div className="flex-1 overflow-y-auto p-2 space-y-1">
				{filteredEvents.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-slate-500 py-8">
						<Activity size={32} className="mb-2 opacity-50" />
						<p className="text-sm">No events yet</p>
						<p className="text-xs mt-1">Events will appear here in real-time</p>
						{!connected && (
							<p className="text-xs mt-2 text-yellow-500">
								Waiting for connection...
							</p>
						)}
					</div>
				) : compact ? (
					// Compact view - simple list
					<div className="space-y-1">
						{filteredEvents.map((event) => (
							<EventItem key={event.id} event={event} compact />
						))}
					</div>
				) : (
					// Full view - grouped by time
					<>
						{groupedEvents.recent.length > 0 && (
							<div className="space-y-1.5">
								<div className="text-[10px] text-slate-500 uppercase tracking-wider px-1 py-1 sticky top-0 bg-slate-900/90 backdrop-blur-sm">
									Recent
								</div>
								{groupedEvents.recent.map((event) => (
									<EventItem key={event.id} event={event} />
								))}
							</div>
						)}

						{groupedEvents.earlier.length > 0 && (
							<div className="space-y-1.5 mt-3">
								<div className="text-[10px] text-slate-500 uppercase tracking-wider px-1 py-1 sticky top-0 bg-slate-900/90 backdrop-blur-sm">
									Earlier
								</div>
								{groupedEvents.earlier.map((event) => (
									<EventItem key={event.id} event={event} />
								))}
							</div>
						)}

						{groupedEvents.older.length > 0 && (
							<div className="space-y-1.5 mt-3">
								<div className="text-[10px] text-slate-500 uppercase tracking-wider px-1 py-1 sticky top-0 bg-slate-900/90 backdrop-blur-sm">
									Older
								</div>
								{groupedEvents.older.map((event) => (
									<EventItem key={event.id} event={event} />
								))}
							</div>
						)}
					</>
				)}
			</div>

			{/* Footer - connection details */}
			<div className="p-2 border-t border-slate-700 flex-shrink-0">
				<div className="flex items-center justify-between text-[10px] text-slate-500">
					<div className="flex items-center gap-3">
						<span className="flex items-center gap-1">
							<Circle
								size={6}
								className={cn(
									"fill-current",
									connectionStatus.dashboard ? "text-green-500" : "text-slate-600"
								)}
							/>
							Dashboard
						</span>
						<span className="flex items-center gap-1">
							<Circle
								size={6}
								className={cn(
									"fill-current",
									connectionStatus.convoys ? "text-green-500" : "text-slate-600"
								)}
							/>
							Convoys
						</span>
					</div>
					<span>Max: {maxEvents} events</span>
				</div>
			</div>
		</div>
	);
}

export default EventFeed;
