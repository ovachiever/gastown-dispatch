import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Check, AlertTriangle } from "lucide-react";
import { getStatus, runDoctor } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
	const queryClient = useQueryClient();
	const [townRoot, setTownRoot] = useState("");

	const { data: status } = useQuery({
		queryKey: ["status"],
		queryFn: getStatus,
	});

	const doctorMutation = useMutation({
		mutationFn: (fix: boolean) => runDoctor(fix),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["status"] });
		},
	});

	return (
		<div className="p-6 max-w-2xl">
			<h1 className="text-2xl font-semibold mb-6">Settings</h1>

			{/* Town Info */}
			<section className="mb-8">
				<h2 className="text-lg font-medium mb-3">Town Information</h2>
				<div className="bg-gt-surface border border-gt-border rounded-lg p-4 space-y-3">
					<div>
						<label className="text-sm text-gt-muted">Town Name</label>
						<p className="font-medium">{status?.name || "Not connected"}</p>
					</div>
					<div>
						<label className="text-sm text-gt-muted">Location</label>
						<p className="font-mono text-sm">{status?.location || "-"}</p>
					</div>
					<div>
						<label className="text-sm text-gt-muted">Overseer</label>
						<p>{status?.overseer?.name || "Not configured"}</p>
					</div>
				</div>
			</section>

			{/* Town Root Override */}
			<section className="mb-8">
				<h2 className="text-lg font-medium mb-3">Town Root Override</h2>
				<p className="text-sm text-gt-muted mb-3">
					By default, Gas Town Dispatch auto-detects your town root. You can
					override it here to connect to a different town.
				</p>
				<div className="flex gap-2">
					<input
						type="text"
						value={townRoot}
						onChange={(e) => setTownRoot(e.target.value)}
						placeholder="/path/to/your/town"
						className="flex-1 bg-gt-surface border border-gt-border rounded-lg px-4 py-2 focus:outline-none focus:border-gt-accent"
					/>
					<button
						className="px-4 py-2 bg-gt-accent text-black rounded-lg hover:bg-gt-accent/90 transition-colors"
						onClick={() => {
							// TODO: Implement town root switching
							alert(
								"Town root switching will be implemented in a future update.",
							);
						}}
					>
						Connect
					</button>
				</div>
			</section>

			{/* Health Check */}
			<section className="mb-8">
				<h2 className="text-lg font-medium mb-3">Health Check</h2>
				<p className="text-sm text-gt-muted mb-3">
					Run diagnostics on your Gas Town installation.
				</p>
				<div className="flex gap-2">
					<button
						onClick={() => doctorMutation.mutate(false)}
						disabled={doctorMutation.isPending}
						className="flex items-center gap-2 px-4 py-2 bg-gt-surface border border-gt-border rounded-lg hover:bg-gt-border transition-colors disabled:opacity-50"
					>
						{doctorMutation.isPending ? (
							<RefreshCw className="animate-spin" size={16} />
						) : (
							<Check size={16} />
						)}
						Check Health
					</button>
					<button
						onClick={() => {
							if (
								confirm("This will attempt to fix any issues found. Continue?")
							) {
								doctorMutation.mutate(true);
							}
						}}
						disabled={doctorMutation.isPending}
						className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-black rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50"
					>
						<AlertTriangle size={16} />
						Auto-Fix
					</button>
				</div>

				{doctorMutation.data && (
					<div
						className={cn(
							"mt-4 p-4 rounded-lg border font-mono text-sm whitespace-pre-wrap",
							doctorMutation.data.success
								? "bg-green-900/20 border-green-500"
								: "bg-red-900/20 border-red-500",
						)}
					>
						{(doctorMutation.data.data as { stdout?: string })?.stdout ||
							doctorMutation.data.message}
					</div>
				)}
			</section>

			{/* About */}
			<section>
				<h2 className="text-lg font-medium mb-3">About</h2>
				<div className="bg-gt-surface border border-gt-border rounded-lg p-4">
					<p className="mb-2">
						<strong>Gas Town Dispatch</strong> v0.1.0
					</p>
					<p className="text-sm text-gt-muted mb-2">
						A web UI replacement for Gas Town CLI interactions. Never touch tmux
						again.
					</p>
					<p className="text-sm text-gt-muted">
						Built for humans who want to manage AI agents without memorizing CLI
						commands.
					</p>
				</div>
			</section>
		</div>
	);
}
