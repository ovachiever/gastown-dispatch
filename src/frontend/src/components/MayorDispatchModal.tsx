import { useState } from "react";
import { X, Wifi, WifiOff, Trash2, RotateCcw, Maximize2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Terminal } from "./Terminal";

interface MayorDispatchModalProps {
	onClose: () => void;
}

export function MayorDispatchModal({ onClose }: MayorDispatchModalProps) {
	const [connected, setConnected] = useState(false);
	const navigate = useNavigate();

	const handleClearContext = async () => {
		if (!confirm("Clear Mayor's context? This sends /clear to Mayor.")) return;
		try {
			await fetch("/api/stream/dispatch/send", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "/clear" }),
			});
		} catch (err) {
			console.error("Failed to clear context:", err);
		}
	};

	const handleRestartMayor = async () => {
		if (
			!confirm("Restart Mayor? This will kill and respawn the Mayor session.")
		)
			return;
		try {
			const res = await fetch("/api/mayor/restart", { method: "POST" });
			if (!res.ok) throw new Error("Restart failed");
		} catch (err) {
			console.error("Failed to restart Mayor:", err);
		}
	};

	const handleExpandToFullPage = () => {
		onClose();
		navigate("/dispatch");
	};

	return (
		<div
			className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="bg-[#0a0a0f] border border-zinc-800 rounded-lg shadow-2xl w-full max-w-3xl h-[70vh] flex flex-col overflow-hidden">
				{/* Header - minimal like DispatchTerminal */}
				<div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800/50 bg-[#0a0a0f] flex-shrink-0">
					{/* Left: Connection status */}
					<div className="flex items-center gap-2">
						{connected ? (
							<Wifi size={12} className="text-green-500/80" />
						) : (
							<WifiOff size={12} className="text-red-500/50" />
						)}
						<span className="text-[11px] text-zinc-500 font-mono">mayor</span>
					</div>

					{/* Center: Actions */}
					<div className="flex items-center gap-1">
						<button
							onClick={handleClearContext}
							className="p-1 rounded hover:bg-yellow-900/30 transition-colors"
							title="Clear Context (/clear)"
						>
							<Trash2
								size={12}
								className="text-yellow-500/60 hover:text-yellow-500"
							/>
						</button>
						<button
							onClick={handleRestartMayor}
							className="p-1 rounded hover:bg-red-900/30 transition-colors"
							title="Restart Mayor (kill + respawn)"
						>
							<RotateCcw
								size={12}
								className="text-red-500/60 hover:text-red-500"
							/>
						</button>
					</div>

					{/* Right: Expand + Close */}
					<div className="flex items-center gap-1">
						<button
							onClick={handleExpandToFullPage}
							className="p-1 rounded hover:bg-zinc-800 transition-colors"
							title="Open full Mayor page"
						>
							<Maximize2 size={12} className="text-zinc-500 hover:text-zinc-300" />
						</button>
						<button
							onClick={onClose}
							className="p-1 rounded hover:bg-zinc-800 transition-colors"
							title="Close"
						>
							<X size={14} className="text-zinc-500 hover:text-zinc-300" />
						</button>
					</div>
				</div>

				{/* Terminal - the actual mayor tmux session */}
				<div className="flex-1 min-h-0">
					<Terminal
						pane="hq-mayor"
						onConnectionChange={setConnected}
						className="w-full h-full"
					/>
				</div>
			</div>
		</div>
	);
}
