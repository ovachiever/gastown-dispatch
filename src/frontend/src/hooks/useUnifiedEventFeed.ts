import { useEffect, useState, useRef, useCallback } from "react";

/**
 * Unified Event types that the feed displays
 */
export type UnifiedEventType =
	| "convoy"      // Convoy lifecycle events
	| "sling"       // Work being slung to workers
	| "step"        // Work step/status changes
	| "merge"       // Merge queue activity
	| "escalation"  // Alerts and escalations
	| "agent"       // Agent lifecycle events
	| "system";     // System status changes

export type EventSeverity = "info" | "warning" | "error";

export interface UnifiedEvent {
	id: string;
	timestamp: string;
	type: UnifiedEventType;
	severity: EventSeverity;
	title: string;
	description?: string;
	metadata?: Record<string, unknown>;
}

interface UseUnifiedEventFeedOptions {
	maxEvents?: number;  // Max events to keep (default 100)
	enabled?: boolean;
}

interface UseUnifiedEventFeedResult {
	events: UnifiedEvent[];
	connected: boolean;
	connectionStatus: {
		dashboard: boolean;
		convoys: boolean;
	};
	clearEvents: () => void;
}

/**
 * Hook that composes multiple SSE streams into a unified event feed
 *
 * Connects to:
 * - /api/dashboard/stream - for activity events and system metrics
 * - /api/stream/convoys - for convoy lifecycle events
 */
export function useUnifiedEventFeed(
	options: UseUnifiedEventFeedOptions = {}
): UseUnifiedEventFeedResult {
	const { maxEvents = 100, enabled = true } = options;

	const [events, setEvents] = useState<UnifiedEvent[]>([]);
	const [dashboardConnected, setDashboardConnected] = useState(false);
	const [convoysConnected, setConvoysConnected] = useState(false);

	const dashboardSourceRef = useRef<EventSource | null>(null);
	const convoysSourceRef = useRef<EventSource | null>(null);
	const reconnectTimeoutsRef = useRef<{
		dashboard: ReturnType<typeof setTimeout> | null;
		convoys: ReturnType<typeof setTimeout> | null;
	}>({ dashboard: null, convoys: null });

	// Generate unique event ID
	const generateEventId = useCallback((type: string, timestamp: string) => {
		return `${type}-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
	}, []);

	// Add event to the feed (with deduplication and trimming)
	const addEvent = useCallback((event: UnifiedEvent) => {
		setEvents((prev) => {
			// Check for duplicate (same type, title, and within 1 second)
			const isDuplicate = prev.some(
				(e) =>
					e.type === event.type &&
					e.title === event.title &&
					Math.abs(
						new Date(e.timestamp).getTime() - new Date(event.timestamp).getTime()
					) < 1000
			);

			if (isDuplicate) return prev;

			// Add new event at the beginning, trim to maxEvents
			return [event, ...prev].slice(0, maxEvents);
		});
	}, [maxEvents]);

	// Normalize dashboard events to unified format
	const normalizeDashboardEvent = useCallback(
		(raw: {
			timestamp: string;
			type: string;
			message: string;
			severity: "info" | "warning" | "error";
		}): UnifiedEvent => {
			const timestamp = raw.timestamp;
			let type: UnifiedEventType = "system";
			let title = raw.message;
			let description: string | undefined;

			// Categorize based on the event type and message content
			if (raw.type === "agent") {
				type = "agent";
			} else if (raw.type === "work") {
				// Work events could be sling or step events
				if (raw.message.includes("started:") || raw.message.includes("slung")) {
					type = "sling";
				} else {
					type = "step";
				}
			} else if (raw.type === "error" || raw.severity === "error") {
				type = "escalation";
			} else if (raw.type === "system") {
				type = "system";
			}

			// Extract agent/work names for cleaner display
			const colonIdx = raw.message.indexOf(":");
			if (colonIdx > 0 && colonIdx < 30) {
				title = raw.message.slice(0, colonIdx);
				description = raw.message.slice(colonIdx + 1).trim();
			}

			return {
				id: generateEventId(type, timestamp),
				timestamp,
				type,
				severity: raw.severity,
				title,
				description,
				metadata: { source: "dashboard", originalType: raw.type },
			};
		},
		[generateEventId]
	);

	// Normalize convoy events to unified format
	const normalizeConvoyEvent = useCallback(
		(
			eventType: string,
			data: Record<string, unknown>
		): UnifiedEvent => {
			const timestamp = new Date().toISOString();
			let title = "";
			let description: string | undefined;
			let severity: EventSeverity = "info";

			switch (eventType) {
				case "convoy:created":
					title = `Convoy created`;
					description = data.convoy_id as string;
					break;
				case "convoy:updated":
					title = `Convoy progress`;
					description = `${data.completed}/${data.total} complete (${data.progress}%)`;
					break;
				case "convoy:closed":
					title = `Convoy completed`;
					description = data.convoy_id as string;
					break;
				case "issue:status":
					title = `Issue status changed`;
					description = `${data.issue_id}: ${data.old_status} → ${data.new_status}`;
					break;
				case "worker:assigned":
					title = `Worker assigned`;
					description = `${data.worker} → ${data.issue_id}`;
					break;
				default:
					title = eventType;
					description = JSON.stringify(data);
			}

			return {
				id: generateEventId("convoy", timestamp),
				timestamp,
				type: "convoy",
				severity,
				title,
				description,
				metadata: { source: "convoys", eventType, ...data },
			};
		},
		[generateEventId]
	);

	// Connect to dashboard stream
	const connectDashboard = useCallback(() => {
		if (!enabled) return;

		const eventSource = new EventSource("/api/dashboard/stream");
		dashboardSourceRef.current = eventSource;

		eventSource.addEventListener("open", () => {
			setDashboardConnected(true);
		});

		// Handle metrics events (which contain recent_events)
		eventSource.addEventListener("metrics", (e) => {
			try {
				const data = JSON.parse(e.data);
				if (data.recent_events && Array.isArray(data.recent_events)) {
					// Only add new events we haven't seen
					data.recent_events.forEach(
						(rawEvent: {
							timestamp: string;
							type: string;
							message: string;
							severity: "info" | "warning" | "error";
						}) => {
							const event = normalizeDashboardEvent(rawEvent);
							addEvent(event);
						}
					);
				}
			} catch (err) {
				console.error("[UnifiedEventFeed] Failed to parse metrics:", err);
			}
		});

		// Handle individual event updates
		eventSource.addEventListener("event", (e) => {
			try {
				const rawEvent = JSON.parse(e.data);
				const event = normalizeDashboardEvent(rawEvent);
				addEvent(event);
			} catch (err) {
				console.error("[UnifiedEventFeed] Failed to parse event:", err);
			}
		});

		eventSource.onerror = () => {
			setDashboardConnected(false);
			eventSource.close();
			dashboardSourceRef.current = null;

			// Reconnect after 3 seconds
			reconnectTimeoutsRef.current.dashboard = setTimeout(() => {
				connectDashboard();
			}, 3000);
		};
	}, [enabled, addEvent, normalizeDashboardEvent]);

	// Connect to convoys stream
	const connectConvoys = useCallback(() => {
		if (!enabled) return;

		const eventSource = new EventSource("/api/stream/convoys");
		convoysSourceRef.current = eventSource;

		eventSource.addEventListener("connected", () => {
			setConvoysConnected(true);
		});

		// Convoy lifecycle events
		const convoyEvents = [
			"convoy:created",
			"convoy:updated",
			"convoy:closed",
			"issue:status",
			"worker:assigned",
		];

		convoyEvents.forEach((eventType) => {
			eventSource.addEventListener(eventType, (e) => {
				try {
					const data = JSON.parse(e.data);
					const event = normalizeConvoyEvent(eventType, data);
					addEvent(event);
				} catch (err) {
					console.error(
						`[UnifiedEventFeed] Failed to parse ${eventType}:`,
						err
					);
				}
			});
		});

		eventSource.onerror = () => {
			setConvoysConnected(false);
			eventSource.close();
			convoysSourceRef.current = null;

			// Reconnect after 3 seconds
			reconnectTimeoutsRef.current.convoys = setTimeout(() => {
				connectConvoys();
			}, 3000);
		};
	}, [enabled, addEvent, normalizeConvoyEvent]);

	// Clear all events
	const clearEvents = useCallback(() => {
		setEvents([]);
	}, []);

	// Setup connections on mount
	useEffect(() => {
		if (!enabled) return;

		connectDashboard();
		connectConvoys();

		return () => {
			// Cleanup timeouts
			if (reconnectTimeoutsRef.current.dashboard) {
				clearTimeout(reconnectTimeoutsRef.current.dashboard);
			}
			if (reconnectTimeoutsRef.current.convoys) {
				clearTimeout(reconnectTimeoutsRef.current.convoys);
			}

			// Close connections
			if (dashboardSourceRef.current) {
				dashboardSourceRef.current.close();
				dashboardSourceRef.current = null;
			}
			if (convoysSourceRef.current) {
				convoysSourceRef.current.close();
				convoysSourceRef.current = null;
			}
		};
	}, [enabled, connectDashboard, connectConvoys]);

	return {
		events,
		connected: dashboardConnected || convoysConnected,
		connectionStatus: {
			dashboard: dashboardConnected,
			convoys: convoysConnected,
		},
		clearEvents,
	};
}
