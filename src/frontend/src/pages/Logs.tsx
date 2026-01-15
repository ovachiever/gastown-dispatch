import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatus } from "@/lib/api";
import { LogSourceTree } from "@/components/logs/LogSourceTree";
import { LogViewer, type LogEntryData } from "@/components/logs";

export default function Logs() {
	const [selectedSources, setSelectedSources] = useState<Set<string>>(
		new Set(["all"]),
	);
	const [search, setSearch] = useState("");
	const [logs, setLogs] = useState<LogEntryData[]>([]);
	const [connected, setConnected] = useState(false);
	const [autoScroll, setAutoScroll] = useState(true);
	const eventSourceRef = useRef<EventSource | null>(null);
	const logIdCounter = useRef(0);

	// Fetch status to get rig list
	const { data: statusResponse } = useQuery({
		queryKey: ["status"],
		queryFn: getStatus,
		refetchInterval: 30_000,
	});

	const rigs = statusResponse?.status?.rigs?.map((r) => r.name) || [];

	// Connect to log stream
	useEffect(() => {
		const eventSource = new EventSource("/api/stream/logs");
		eventSourceRef.current = eventSource;

		eventSource.addEventListener("connected", (e) => {
			setConnected(true);
			console.log("Log stream connected:", JSON.parse(e.data));
		});

		eventSource.addEventListener("log", (e) => {
			const rawEntry = JSON.parse(e.data);
			const entry: LogEntryData = {
				id: `log-${++logIdCounter.current}`,
				timestamp: rawEntry.timestamp,
				source: rawEntry.source,
				level: rawEntry.level || "info",
				message: rawEntry.message,
				data: rawEntry.data,
			};
			setLogs((prev) => [...prev.slice(-999), entry]); // Keep last 1000
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

	// Handle source selection with multi-select support
	const handleSourceSelect = useCallback(
		(sourceId: string, multiSelect: boolean) => {
			setSelectedSources((prev) => {
				const next = new Set(prev);

				if (sourceId === "all") {
					// Selecting "all" clears other selections
					return new Set(["all"]);
				}

				if (multiSelect) {
					// Multi-select: toggle the source
					next.delete("all");
					if (next.has(sourceId)) {
						next.delete(sourceId);
						if (next.size === 0) {
							return new Set(["all"]);
						}
					} else {
						next.add(sourceId);
					}
				} else {
					// Single select: replace selection
					return new Set([sourceId]);
				}

				return next;
			});
		},
		[],
	);

	// Filter logs based on selected sources and search
	const filteredLogs = logs.filter((log) => {
		// Source filter
		if (!selectedSources.has("all")) {
			const matchesSource = Array.from(selectedSources).some((source) => {
				const lowerSource = log.source.toLowerCase();

				// Match exact source patterns
				if (source === "system/daemon" && lowerSource === "daemon")
					return true;
				if (source === "system/gt-log" && lowerSource.includes("gt-log"))
					return true;
				if (source === "global/mayor" && lowerSource.includes("mayor"))
					return true;
				if (source === "global/deacon" && lowerSource.includes("deacon"))
					return true;
				if (source.startsWith("rig/")) {
					const parts = source.split("/");
					const rigName = parts[1];
					const agentType = parts[2]; // witness, refinery, or polecat
					if (agentType === "witness" && lowerSource.includes("witness"))
						return true;
					if (agentType === "refinery" && lowerSource.includes("refinery"))
						return true;
					if (agentType?.startsWith("polecat") && lowerSource.includes("polecat"))
						return true;
					// Match rig name in source
					if (lowerSource.includes(rigName?.toLowerCase() || "")) return true;
				}

				return false;
			});

			if (!matchesSource) return false;
		}

		// Search filter
		if (search) {
			const searchLower = search.toLowerCase();
			return (
				log.message.toLowerCase().includes(searchLower) ||
				log.source.toLowerCase().includes(searchLower)
			);
		}

		return true;
	});

	const clearLogs = () => setLogs([]);

	const downloadLogs = () => {
		const content = filteredLogs
			.map(
				(l) =>
					`[${l.timestamp}] [${l.source}] [${l.level}] ${l.message}${l.data ? ` ${JSON.stringify(l.data)}` : ""}`,
			)
			.join("\n");
		const blob = new Blob([content], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `gastown-logs-${new Date().toISOString().slice(0, 10)}.txt`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="h-screen flex flex-col">
			{/* Header */}
			<div className="p-4 border-b border-gt-border bg-gt-bg">
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

				{/* Search bar */}
				<div className="relative">
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

			{/* Master-Detail Layout */}
			<div className="flex-1 flex overflow-hidden">
				{/* Source Tree (Left Panel - 240px) */}
				<div className="w-60 shrink-0">
					<LogSourceTree
						rigs={rigs}
						selectedSources={selectedSources}
						onSourceSelect={handleSourceSelect}
					/>
				</div>

				{/* Log Viewer (Right Panel - Flex) */}
				<div className="flex-1 overflow-hidden">
					<LogViewer
						logs={filteredLogs}
						autoScroll={autoScroll}
						onAutoScrollChange={setAutoScroll}
						connected={connected}
					/>
				</div>
			</div>
		</div>
	);
}
