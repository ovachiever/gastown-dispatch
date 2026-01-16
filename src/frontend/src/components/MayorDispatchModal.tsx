import { useState, useEffect, useRef } from "react";
import {
	X,
	Send,
	Wifi,
	WifiOff,
	Trash2,
	RotateCcw,
	Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

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

interface MayorDispatchModalProps {
	onClose: () => void;
}

export function MayorDispatchModal({ onClose }: MayorDispatchModalProps) {
	const [messages, setMessages] = useState<DispatchMessage[]>([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [connected, setConnected] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const eventSourceRef = useRef<EventSource | null>(null);
	const navigate = useNavigate();

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

	const handleExpandToFullPage = () => {
		onClose();
		navigate("/dispatch");
	};

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
			<div className="bg-gt-bg border border-gt-border rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-3 border-b border-gt-border flex-shrink-0">
					<div className="flex items-center gap-3">
						<h2 className="text-lg font-semibold">Mayor Dispatch</h2>
						<div className="flex items-center gap-2 px-2 py-1 rounded bg-gt-surface">
							{connected ? (
								<>
									<Wifi size={12} className="text-green-400" />
									<span className="text-xs text-green-400">Connected</span>
								</>
							) : (
								<>
									<WifiOff size={12} className="text-red-400" />
									<span className="text-xs text-red-400">Disconnected</span>
								</>
							)}
						</div>
					</div>
					<div className="flex items-center gap-1">
						<button
							onClick={handleClearContext}
							className="p-1.5 rounded hover:bg-yellow-900/50 transition-colors"
							title="Clear Context (/clear)"
						>
							<Trash2 size={16} className="text-yellow-500" />
						</button>
						<button
							onClick={handleRestartMayor}
							className="p-1.5 rounded hover:bg-red-900/50 transition-colors"
							title="Restart Mayor (kill + respawn)"
						>
							<RotateCcw size={16} className="text-red-500" />
						</button>
						<button
							onClick={handleExpandToFullPage}
							className="p-1.5 rounded hover:bg-gt-border transition-colors"
							title="Open full Dispatch page"
						>
							<Maximize2 size={16} />
						</button>
						<button
							onClick={onClose}
							className="p-1.5 hover:bg-gt-border rounded transition-colors"
							title="Close"
						>
							<X size={18} />
						</button>
					</div>
				</div>

				{/* Messages */}
				<div className="flex-1 overflow-auto p-3 space-y-3">
					{messages.length === 0 ? (
						<div className="h-full flex items-center justify-center">
							<div className="text-center max-w-sm">
								<p className="text-gt-muted mb-3">Quick access to the Mayor</p>
								<p className="text-sm text-gt-muted mb-4">
									Ask questions, create convoys, or coordinate work.
								</p>
								<div className="grid grid-cols-2 gap-2 text-sm">
									<button
										onClick={() => setInput("What's the status?")}
										className="p-2 bg-gt-surface border border-gt-border rounded-lg hover:bg-gt-border transition-colors text-left text-xs"
									>
										What's the status?
									</button>
									<button
										onClick={() => setInput("Show ready work")}
										className="p-2 bg-gt-surface border border-gt-border rounded-lg hover:bg-gt-border transition-colors text-left text-xs"
									>
										Show ready work
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
										"max-w-lg",
										message.role === "user" ? "ml-auto" : "mr-auto",
									)}
								>
									<div
										className={cn(
											"rounded-lg p-2.5 border",
											getRoleColor(message.role),
										)}
									>
										{message.role === "mayor" && (
											<p className="text-xs text-purple-400 mb-1 font-medium">
												Mayor
											</p>
										)}
										<pre className="whitespace-pre-wrap font-sans text-sm">
											{message.content}
										</pre>
									</div>
									<p className="text-[10px] text-gt-muted mt-0.5">
										{new Date(message.timestamp).toLocaleTimeString()}
									</p>
								</div>
							))}
							<div ref={messagesEndRef} />
						</>
					)}
					{isLoading && (
						<div className="max-w-lg mr-auto">
							<div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-2.5">
								<div className="flex items-center gap-2 text-purple-300">
									<div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
									<span className="text-sm">Mayor is thinking...</span>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Input */}
				<form
					onSubmit={handleSubmit}
					className="p-3 border-t border-gt-border flex gap-2 flex-shrink-0"
				>
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Tell the Mayor what you need..."
						className="flex-1 bg-gt-surface border border-gt-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gt-accent"
						disabled={isLoading}
						autoFocus
					/>
					<button
						type="submit"
						disabled={!input.trim() || isLoading}
						className="px-3 py-2 bg-gt-accent text-black rounded-lg hover:bg-gt-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Send size={16} />
					</button>
				</form>
			</div>
		</div>
	);
}
