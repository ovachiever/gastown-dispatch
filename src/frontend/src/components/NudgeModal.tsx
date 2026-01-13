import { useState } from "react";
import { X, Send } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { nudge } from "@/lib/api";
import { cn } from "@/lib/utils";

interface NudgeModalProps {
	agentAddress: string;
	agentName: string;
	onClose: () => void;
}

export function NudgeModal({ agentAddress, agentName, onClose }: NudgeModalProps) {
	const [message, setMessage] = useState("");

	const nudgeMutation = useMutation({
		mutationFn: () => nudge(agentAddress, message),
		onSuccess: (result) => {
			if (result.success) {
				onClose();
			}
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (message.trim()) {
			nudgeMutation.mutate();
		}
	};

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
			<div className="bg-gt-surface border border-gt-border rounded-lg shadow-xl max-w-md w-full">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gt-border">
					<h2 className="text-lg font-semibold">
						Nudge {agentName}
					</h2>
					<button
						onClick={onClose}
						className="p-1 hover:bg-gt-border rounded transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				{/* Content */}
				<form onSubmit={handleSubmit} className="p-4 space-y-4">
					<div>
						<label htmlFor="message" className="block text-sm font-medium mb-2">
							Message
						</label>
						<textarea
							id="message"
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							placeholder="Type your message to the agent..."
							className="w-full px-3 py-2 bg-gt-bg border border-gt-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
							rows={4}
							autoFocus
						/>
					</div>

					{nudgeMutation.isError && (
						<div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
							<p className="text-sm text-red-400">
								Failed to send message. Please try again.
							</p>
						</div>
					)}

					{nudgeMutation.isSuccess && (
						<div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
							<p className="text-sm text-green-400">
								Message sent successfully!
							</p>
						</div>
					)}

					{/* Actions */}
					<div className="flex gap-2 justify-end">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 bg-gt-bg hover:bg-gt-border rounded-lg transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={!message.trim() || nudgeMutation.isPending}
							className={cn(
								"px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2",
								(!message.trim() || nudgeMutation.isPending) &&
									"opacity-50 cursor-not-allowed",
							)}
						>
							<Send size={16} />
							{nudgeMutation.isPending ? "Sending..." : "Send"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
