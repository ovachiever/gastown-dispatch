import { useState, useEffect, useRef } from "react";
import {
	X,
	Send,
	Wifi,
	WifiOff,
	Trash2,
	RotateCcw,
	Radio,
	Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface DispatchMessage {
	id: string;
	role: "user" | "mayor" | "system";
	content: string;
	timestamp: string;
	metadata?: {
		agent?: string;
		action?: string;
		beadId?: string;
	};
}

interface MayorDispatchOverlayProps {
	onClose: () => void;
}

export function MayorDispatchOverlay({ onClose }: MayorDispatchOverlayProps) {
	const [messages, setMessages] = useState<DispatchMessage[]>([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [connected, setConnected] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const eventSourceRef = useRef<EventSource | null>(null);

	useEffect(() => {
		const eventSource = new EventSource("/api/stream/dispatch");
		eventSourceRef.current = eventSource;

		eventSource.addEventListener("connected", (e) => {
			setConnected(true);
			console.log("Dispatch stream connected:", JSON.parse(e.data));
		});

		eventSource.addEventListener("message", (e) => {
			const msg = JSON.parse(e.data) as DispatchMessage;
			setMessages((prev) => {
				// Avoid duplicates
				if (prev.some((m) => m.id === msg.id)) return prev;
				return [...prev, msg];
			});
			setIsLoading(false);
		});

		eventSource.addEventListener("error", (e) => {
			const err = JSON.parse((e as MessageEvent).data);
			console.error("Dispatch error:", err);
			setIsLoading(false);
		});

		eventSource.onerror = () => {
			setConnected(false);
		};

		// Start session
		fetch("/api/stream/dispatch/session", { method: "POST" });

		return () => {
			eventSource.close();
		};
	}, []);

	// Auto-scroll to bottom
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim() || isLoading) return;

		const content = input.trim();
		setInput("");
		setIsLoading(true);

		// Optimistically add user message
		const userMsg: DispatchMessage = {
			id: `local-${Date.now()}`,
			role: "user",
			content,
			timestamp: new Date().toISOString(),
		};
		setMessages((prev) => [...prev, userMsg]);

		try {
			const res = await fetch("/api/stream/dispatch/send", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content }),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.message || "Failed to send message");
			}
		} catch (err) {
			setMessages((prev) => [
				...prev,
				{
					id: `error-${Date.now()}`,
					role: "system",
					content: `Error: ${err instanceof Error ? err.message : String(err)}`,
					timestamp: new Date().toISOString(),
				},
			]);
			setIsLoading(false);
		}
	};

	const getRoleColor = (role: string) => {
		switch (role) {
			case "user":
				return "bg-gt-accent/20 text-gt-text";
			case "mayor":
				return "bg-purple-900/30 border-purple-500/50";
			case "system":
				return "bg-gt-surface border-gt-border text-gt-muted";
			default:
				return "bg-gt-surface border-gt-border";
		}
	};

	const handleClearContext = async () => {
		if (!confirm("Clear Mayor's context? This sends /clear to Mayor.")) return;
		try {
			await fetch("/api/stream/dispatch/send", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "/clear" }),
			});
			setMessages([
				{
					id: `system-${Date.now()}`,
					role: "system",
					content: "Context cleared. Mayor's memory has been reset.",
					timestamp: new Date().toISOString(),
				},
			]);
		} catch (err) {
			console.error("Failed to clear context:", err);
		}
	};

	const handleRestartMayor = async () => {
		if (
			!confirm("Restart Mayor? This will kill and respawn the Mayor session.")
		)
			return;
		setMessages((prev) => [
			...prev,
			{
				id: `system-${Date.now()}`,
				role: "system",
				content: "Restarting Mayor...",
				timestamp: new Date().toISOString(),
			},
		]);
		try {
			const res = await fetch("/api/mayor/restart", { method: "POST" });
			if (res.ok) {
				setMessages([
					{
						id: `system-${Date.now()}`,
						role: "system",
						content: "Mayor restarted successfully. Fresh session ready.",
						timestamp: new Date().toISOString(),
					},
				]);
			} else {
				throw new Error("Restart failed");
			}
		} catch (err) {
			setMessages((prev) => [
				...prev,
				{
					id: `error-${Date.now()}`,
					role: "system",
					content: `Failed to restart Mayor: ${err instanceof Error ? err.message : String(err)}`,
					timestamp: new Date().toISOString(),
				},
			]);
		}
	};

	// Handle escape key to close
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
			<div className="bg-slate-900 border-2 border-purple-500/50 rounded-lg shadow-2xl shadow-purple-500/20 w-full max-w-2xl h-[600px] flex flex-col">
				{/* Header */}
				<div className="p-3 border-b border-slate-700 flex items-center justify-between bg-gradient-to-r from-purple-900/30 to-slate-900">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-lg bg-purple-900/50 border border-purple-500/50 flex items-center justify-center">
							<Radio size={20} className="text-purple-400" />
						</div>
						<div>
							<h2 className="text-lg font-semibold text-slate-100">Mayor Dispatch</h2>
							<p className="text-xs text-slate-400">Quick access to your AI coordinator</p>
						</div>
						<div className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800/80">
							{connected ? (
								<>
									<Wifi size={12} className="text-green-400" />
									<span className="text-[10px] text-green-400">Connected</span>
								</>
							) : (
								<>
									<WifiOff size={12} className="text-red-400" />
									<span className="text-[10px] text-red-400">Disconnected</span>
								</>
							)}
						</div>
					</div>
					<div className="flex items-center gap-1">
						<button
							onClick={handleClearContext}
							className="p-1.5 rounded hover:bg-yellow-900/50 transition-colors"
							title="Clear Context"
						>
							<Trash2 size={16} className="text-yellow-500" />
						</button>
						<button
							onClick={handleRestartMayor}
							className="p-1.5 rounded hover:bg-red-900/50 transition-colors"
							title="Restart Mayor"
						>
							<RotateCcw size={16} className="text-red-500" />
						</button>
						<Link
							to="/dispatch"
							onClick={onClose}
							className="p-1.5 rounded hover:bg-slate-700 transition-colors"
							title="Open full Dispatch page"
						>
							<Maximize2 size={16} className="text-slate-400" />
						</Link>
						<button
							onClick={onClose}
							className="p-1.5 rounded hover:bg-slate-700 transition-colors ml-1"
							title="Close (Esc)"
						>
							<X size={18} className="text-slate-400" />
						</button>
					</div>
				</div>

				{/* Messages */}
				<div className="flex-1 overflow-auto p-3 space-y-3 bg-slate-950/50">
					{messages.length === 0 ? (
						<div className="h-full flex items-center justify-center">
							<div className="text-center max-w-sm">
								<p className="text-slate-400 mb-3">Talk to the Mayor</p>
								<div className="grid grid-cols-2 gap-2 text-xs">
									<button
										onClick={() => setInput("What's the status?")}
										className="p-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-colors text-left text-slate-300"
									>
										What's the status?
									</button>
									<button
										onClick={() => setInput("Show me ready work")}
										className="p-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-colors text-left text-slate-300"
									>
										Show ready work
									</button>
									<button
										onClick={() => setInput("What should I work on next?")}
										className="p-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-colors text-left text-slate-300"
									>
										What's next?
									</button>
									<button
										onClick={() => setInput("Create a convoy")}
										className="p-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-colors text-left text-slate-300"
									>
										Create a convoy
									</button>
								</div>
							</div>
						</div>
					) : (
						<>
							{messages.map((message) => (
								<div
									key={message.id}
									className={cn(
										"max-w-[85%]",
										message.role === "user" ? "ml-auto" : "mr-auto",
									)}
								>
									<div
										className={cn(
											"rounded-lg p-2.5 border text-sm",
											getRoleColor(message.role),
										)}
									>
										{message.role === "mayor" && (
											<p className="text-[10px] text-purple-400 mb-1 font-medium">
												Mayor
											</p>
										)}
										<pre className="whitespace-pre-wrap font-sans">
											{message.content}
										</pre>
									</div>
									<p className="text-[10px] text-slate-500 mt-0.5">
										{new Date(message.timestamp).toLocaleTimeString()}
									</p>
								</div>
							))}
							<div ref={messagesEndRef} />
						</>
					)}
					{isLoading && (
						<div className="max-w-[85%] mr-auto">
							<div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-2.5">
								<div className="flex items-center gap-2 text-purple-300">
									<div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
									<span className="text-xs">Mayor is thinking...</span>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Input */}
				<form
					onSubmit={handleSubmit}
					className="p-3 border-t border-slate-700 flex gap-2 bg-slate-900"
				>
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Tell the Mayor what you need..."
						className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 text-slate-200 placeholder-slate-500"
						disabled={isLoading}
						autoFocus
					/>
					<button
						type="submit"
						disabled={!input.trim() || isLoading}
						className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Send size={16} />
					</button>
				</form>
			</div>
		</div>
	);
}
