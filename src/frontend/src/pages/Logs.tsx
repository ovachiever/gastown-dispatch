import { useState, useEffect, useRef } from "react";
import { Download, Search, ScrollText, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogEntry {
	timestamp: string;
	source: string;
	level: "info" | "warn" | "error" | "debug";
	message: string;
	data?: Record<string, unknown>;
}

type LogSource =
	| "all"
	| "deacon"
	| "mayor"
	| "witness"
	| "refinery"
	| "polecat"
	| "system";

export default function Logs() {
	const [source, setSource] = useState<LogSource>("all");
	const [search, setSearch] = useState("");
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [connected, setConnected] = useState(false);
	const [autoScroll, setAutoScroll] = useState(true);
	const logContainerRef = useRef<HTMLDivElement>(null);
	const eventSourceRef = useRef<EventSource | null>(null);

	useEffect(() => {
		const eventSource = new EventSource("/api/stream/logs");
		eventSourceRef.current = eventSource;

		eventSource.addEventListener("connected", (e) => {
			setConnected(true);
			console.log("Log stream connected:", JSON.parse(e.data));
		});

		eventSource.addEventListener("log", (e) => {
			const entry = JSON.parse(e.data) as LogEntry;
			setLogs((prev) => [...prev.slice(-499), entry]); // Keep last 500
		});

		eventSource.addEventListener("status", (e) => {
			const status = JSON.parse(e.data);
			setConnected(status.connected);
		});

		eventSource.onerror = () => {
			setConnected(false);
		};

		return () => {
			eventSource.close();
		};
	}, []);

	// Auto-scroll to bottom
	useEffect(() => {
		if (autoScroll && logContainerRef.current) {
			logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
		}
	}, [logs, autoScroll]);

	const filteredLogs = logs.filter((log) => {
		const matchesSource =
			source === "all" || log.source.toLowerCase().includes(source);
		const matchesSearch =
			!search ||
			log.message.toLowerCase().includes(search.toLowerCase()) ||
			log.source.toLowerCase().includes(search.toLowerCase());
		return matchesSource && matchesSearch;
	});

	const clearLogs = () => setLogs([]);

	const downloadLogs = () => {
		const content = filteredLogs
			.map((l) => `[${l.timestamp}] [${l.source}] [${l.level}] ${l.message}`)
			.join("\n");
		const blob = new Blob([content], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `gastown-logs-${new Date().toISOString().slice(0, 10)}.txt`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const getLevelColor = (level: string) => {
		switch (level) {
			case "error":
				return "text-red-400";
			case "warn":
				return "text-yellow-400";
			case "debug":
				return "text-gray-400";
			default:
				return "text-gt-text";
		}
	};

	return (
		<div className="flex flex-col h-screen">
			{/* Header */}
			<div className="p-4 border-b border-gt-border">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-3">
						<div>
							<h1 className="text-xl font-semibold">Logs</h1>
							<p className="text-sm text-gt-muted">
								Real-time logs from Gas Town agents
							</p>
						</div>
						<div className="flex items-center gap-2 px-2 py-1 rounded bg-gt-surface">
							{connected ? (
								<>
									<Wifi size={14} className="text-green-400" />
									<span className="text-xs text-green-400">Live</span>
								</>
							) : (
								<>
									<WifiOff size={14} className="text-red-400" />
									<span className="text-xs text-red-400">Disconnected</span>
								</>
							)}
						</div>
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={() => setAutoScroll(!autoScroll)}
							className={cn(
								"px-3 py-1.5 text-sm rounded-lg transition-colors",
								autoScroll
									? "bg-gt-accent text-black"
									: "bg-gt-surface hover:bg-gt-border",
							)}
						>
							Auto-scroll
						</button>
						<button
							onClick={clearLogs}
							className="px-3 py-1.5 text-sm rounded-lg bg-gt-surface hover:bg-gt-border transition-colors"
						>
							Clear
						</button>
						<button
							onClick={downloadLogs}
							className="p-2 rounded-lg bg-gt-surface hover:bg-gt-border transition-colors"
							title="Download"
						>
							<Download size={18} />
						</button>
					</div>
				</div>

				{/* Source selector */}
				<div className="flex items-center gap-4">
					<div className="flex bg-gt-surface border border-gt-border rounded-lg overflow-hidden">
						{(
							[
								"all",
								"deacon",
								"mayor",
								"witness",
								"refinery",
								"polecat",
								"system",
							] as LogSource[]
						).map((s) => (
							<button
								key={s}
								onClick={() => setSource(s)}
								className={cn(
									"px-3 py-1.5 text-sm capitalize transition-colors",
									source === s
										? "bg-gt-accent text-black"
										: "hover:bg-gt-border",
								)}
							>
								{s}
							</button>
						))}
					</div>

					<div className="flex-1 relative">
						<Search
							className="absolute left-3 top-1/2 -translate-y-1/2 text-gt-muted"
							size={16}
						/>
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Filter logs..."
							className="w-full bg-gt-surface border border-gt-border rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-gt-accent"
						/>
					</div>
				</div>
			</div>

			{/* Log content */}
			<div
				ref={logContainerRef}
				className="flex-1 overflow-auto p-4 font-mono text-sm bg-gt-bg"
			>
				{filteredLogs.length === 0 ? (
					<div className="h-full flex items-center justify-center">
						<div className="text-center">
							<ScrollText className="mx-auto text-gt-muted mb-4" size={48} />
							<p className="text-gt-muted mb-2">
								{connected ? "Waiting for logs..." : "No logs available"}
							</p>
							<p className="text-sm text-gt-muted">
								{connected
									? "Logs will appear here as they stream in."
									: "Connect to a Gas Town workspace to see logs."}
							</p>
						</div>
					</div>
				) : (
					<div className="space-y-0.5">
						{filteredLogs.map((log, i) => (
							<div
								key={`${log.timestamp}-${i}`}
								className={cn("py-0.5 flex gap-2", getLevelColor(log.level))}
							>
								<span className="text-gt-muted shrink-0">
									{new Date(log.timestamp).toLocaleTimeString()}
								</span>
								<span className="text-gt-accent shrink-0">[{log.source}]</span>
								<span className="break-all">{log.message}</span>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
