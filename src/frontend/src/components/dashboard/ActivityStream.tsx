import { useEffect, useState, useRef } from "react";
import { Clock, Activity, AlertTriangle, XCircle, Info } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ActivityEvent {
	timestamp: string;
	type: string;
	message: string;
	severity: "info" | "warning" | "error";
}

export function ActivityStream() {
	const [events, setEvents] = useState<ActivityEvent[]>([]);
	const [connected, setConnected] = useState(false);
	const eventSourceRef = useRef<EventSource | null>(null);
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const connect = () => {
			const eventSource = new EventSource("/api/dashboard/stream");
			eventSourceRef.current = eventSource;

			eventSource.addEventListener("open", () => {
				console.log("[ActivityStream] Connected");
				setConnected(true);
			});

			// Listen for full metrics updates which include recent_events
			eventSource.addEventListener("metrics", (e) => {
				try {
					const data = JSON.parse(e.data);
					if (data.recent_events && Array.isArray(data.recent_events)) {
						setEvents((prev) => {
							// Merge new events with existing, dedupe by timestamp+message
							const eventMap = new Map<string, ActivityEvent>();

							// Add existing events
							prev.forEach((event) => {
								const key = `${event.timestamp}-${event.message}`;
								eventMap.set(key, event);
							});

							// Add new events
							data.recent_events.forEach((event: ActivityEvent) => {
								const key = `${event.timestamp}-${event.message}`;
								eventMap.set(key, event);
							});

							// Convert back to array and sort by timestamp (newest first)
							return Array.from(eventMap.values())
								.sort((a, b) =>
									new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
								)
								.slice(0, 50); // Keep last 50 events
						});
					}
				} catch (err) {
					console.error("[ActivityStream] Failed to parse metrics:", err);
				}
			});

			// Listen for individual event updates
			eventSource.addEventListener("event", (e) => {
				try {
					const newEvent: ActivityEvent = JSON.parse(e.data);
					setEvents((prev) => {
						// Add new event at the beginning
						const updated = [newEvent, ...prev];
						// Remove duplicates and keep last 50
						const eventMap = new Map<string, ActivityEvent>();
						updated.forEach((event) => {
							const key = `${event.timestamp}-${event.message}`;
							if (!eventMap.has(key)) {
								eventMap.set(key, event);
							}
						});
						return Array.from(eventMap.values()).slice(0, 50);
					});
				} catch (err) {
					console.error("[ActivityStream] Failed to parse event:", err);
				}
			});

			eventSource.onerror = () => {
				console.warn("[ActivityStream] Connection error, reconnecting...");
				setConnected(false);
				eventSource.close();
				eventSourceRef.current = null;

				// Reconnect after 3 seconds
				reconnectTimeoutRef.current = setTimeout(() => {
					connect();
				}, 3000);
			};
		};

		connect();

		return () => {
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
			}
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
				eventSourceRef.current = null;
			}
		};
	}, []);

	const getSeverityIcon = (severity: ActivityEvent["severity"]) => {
		switch (severity) {
			case "error":
				return XCircle;
			case "warning":
				return AlertTriangle;
			case "info":
			default:
				return Info;
		}
	};

	const getSeverityColor = (severity: ActivityEvent["severity"]) => {
		switch (severity) {
			case "error":
				return "text-red-400 bg-red-900/20";
			case "warning":
				return "text-amber-400 bg-amber-900/20";
			case "info":
			default:
				return "text-blue-400 bg-blue-900/20";
		}
	};

	const getTypeColor = (type: string) => {
		switch (type) {
			case "work":
				return "text-green-400";
			case "agent":
				return "text-purple-400";
			case "system":
				return "text-orange-400";
			default:
				return "text-gray-400";
		}
	};

	return (
		<div className="bg-gt-surface border border-gt-border rounded-lg h-full flex flex-col">
			{/* Header */}
			<div className="p-4 border-b border-gt-border flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Activity className="text-gt-accent" size={20} />
					<h2 className="text-lg font-medium">Activity Stream</h2>
				</div>
				<div className="flex items-center gap-2">
					<div
						className={cn(
							"w-2 h-2 rounded-full",
							connected ? "bg-green-400 animate-pulse" : "bg-gray-500"
						)}
					/>
					<span className="text-xs text-gt-muted">
						{connected ? "Live" : "Disconnected"}
					</span>
				</div>
			</div>

			{/* Events list */}
			<div className="flex-1 overflow-y-auto p-4 space-y-2">
				{events.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-gt-muted">
						<Activity size={32} className="mb-2 opacity-50" />
						<p className="text-sm">No activity yet</p>
						<p className="text-xs mt-1">Events will appear here as they happen</p>
					</div>
				) : (
					events.map((event, index) => {
						const SeverityIcon = getSeverityIcon(event.severity);
						return (
							<div
								key={`${event.timestamp}-${index}`}
								className={cn(
									"flex items-start gap-3 p-3 rounded-lg border transition-all hover:bg-gt-bg/50",
									getSeverityColor(event.severity)
								)}
							>
								<SeverityIcon size={16} className="mt-0.5 flex-shrink-0" />
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1">
										<span className={cn("text-xs font-medium", getTypeColor(event.type))}>
											{event.type.toUpperCase()}
										</span>
										<span className="text-xs text-gt-muted flex items-center gap-1">
											<Clock size={10} />
											{formatRelativeTime(event.timestamp)}
										</span>
									</div>
									<p className="text-sm text-gt-text break-words">{event.message}</p>
								</div>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
