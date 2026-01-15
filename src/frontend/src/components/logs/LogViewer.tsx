import { useRef, useEffect, useCallback, useState } from "react";
import { ScrollText } from "lucide-react";
import { LogEntry, type LogEntryData } from "./LogEntry";

interface LogViewerProps {
	logs: LogEntryData[];
	autoScroll: boolean;
	onAutoScrollChange: (enabled: boolean) => void;
	connected: boolean;
	emptyMessage?: string;
}

const ITEM_HEIGHT = 32; // Approximate height of each log entry
const OVERSCAN = 10; // Number of items to render outside viewport

export function LogViewer({
	logs,
	autoScroll,
	onAutoScrollChange,
	connected,
	emptyMessage,
}: LogViewerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [scrollTop, setScrollTop] = useState(0);
	const [containerHeight, setContainerHeight] = useState(0);

	// Calculate visible range for virtual scrolling
	const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
	const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT) + OVERSCAN * 2;
	const endIndex = Math.min(logs.length, startIndex + visibleCount);

	const visibleLogs = logs.slice(startIndex, endIndex);
	const totalHeight = logs.length * ITEM_HEIGHT;
	const offsetY = startIndex * ITEM_HEIGHT;

	// Track container size
	useEffect(() => {
		if (!containerRef.current) return;

		const resizeObserver = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry) {
				setContainerHeight(entry.contentRect.height);
			}
		});

		resizeObserver.observe(containerRef.current);
		return () => resizeObserver.disconnect();
	}, []);

	// Handle scroll
	const handleScroll = useCallback(
		(e: React.UIEvent<HTMLDivElement>) => {
			const target = e.currentTarget;
			setScrollTop(target.scrollTop);

			// Detect if user scrolled away from bottom
			const isAtBottom =
				target.scrollHeight - target.scrollTop - target.clientHeight < 50;
			if (!isAtBottom && autoScroll) {
				onAutoScrollChange(false);
			}
		},
		[autoScroll, onAutoScrollChange],
	);

	// Auto-scroll to bottom when new logs arrive
	useEffect(() => {
		if (autoScroll && containerRef.current) {
			containerRef.current.scrollTop = containerRef.current.scrollHeight;
		}
	}, [logs.length, autoScroll]);

	// Group logs by timestamp for sticky headers
	const getTimeGroup = (timestamp: string): string => {
		const date = new Date(timestamp);
		return date.toLocaleTimeString("en-US", {
			hour12: false,
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (logs.length === 0) {
		return (
			<div className="h-full flex items-center justify-center">
				<div className="text-center">
					<ScrollText className="mx-auto text-gt-muted mb-4" size={48} />
					<p className="text-gt-muted mb-2">
						{emptyMessage ||
							(connected ? "Waiting for logs..." : "No logs available")}
					</p>
					<p className="text-sm text-gt-muted">
						{connected
							? "Logs will appear here as they stream in."
							: "Connect to a Gas Town workspace to see logs."}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			onScroll={handleScroll}
			className="h-full overflow-auto bg-gt-bg"
		>
			<div
				style={{ height: totalHeight, position: "relative" }}
				className="min-w-max"
			>
				<div
					style={{
						position: "absolute",
						top: offsetY,
						left: 0,
						right: 0,
					}}
				>
					{visibleLogs.map((log, i) => {
						const actualIndex = startIndex + i;
						const prevLog = actualIndex > 0 ? logs[actualIndex - 1] : null;
						const showTimeHeader =
							!prevLog ||
							getTimeGroup(log.timestamp) !== getTimeGroup(prevLog.timestamp);

						return (
							<div key={log.id}>
								{showTimeHeader && (
									<div className="sticky top-0 z-10 px-2 py-1 bg-gt-surface/90 backdrop-blur-sm border-b border-gt-border text-xs text-gt-muted font-medium">
										{getTimeGroup(log.timestamp)}
									</div>
								)}
								<LogEntry entry={log} />
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
