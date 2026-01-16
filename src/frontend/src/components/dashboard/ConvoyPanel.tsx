import { useState } from "react";
import { Truck, ExternalLink, AlertTriangle, Users, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn, calculateConvoyETA, type ConvoyETA } from "@/lib/utils";
import { closeConvoy } from "@/lib/api";
import type { Convoy, TrackedIssue } from "@/types/api";

interface ConvoyPanelProps {
	convoys: Convoy[];
	sseConnected?: boolean;
}

interface ConvoyDashboardCardProps {
	convoy: Convoy;
	eta: ConvoyETA;
	onClick: () => void;
	onClose: () => void;
	isClosing: boolean;
}

// ETA badge with confidence-based coloring
function ETABadge({ eta }: { eta: ConvoyETA }) {
	const colorClass = eta.isBlocked
		? "bg-amber-900/60 text-amber-300 border-amber-700"
		: eta.confidence === "none"
			? "bg-slate-800 text-slate-400 border-slate-600"
			: eta.confidence === "low"
				? "bg-slate-800 text-slate-300 border-slate-600"
				: "bg-blue-900/60 text-blue-300 border-blue-700";

	return (
		<span
			className={cn(
				"text-[10px] px-1.5 py-0.5 rounded border font-mono",
				colorClass
			)}
			title={eta.display}
		>
			{eta.isBlocked ? (
				<span className="flex items-center gap-1">
					<AlertTriangle size={10} />
					{eta.short}
				</span>
			) : (
				eta.short
			)}
		</span>
	);
}

// Status badge
function StatusBadge({ convoy, eta }: { convoy: Convoy; eta: ConvoyETA }) {
	// Determine status: Stranded > Synthesis Ready > Active
	const isStranded = eta.isBlocked && eta.blockedCount > 0;
	const isSynthesisReady = convoy.completed === convoy.total && (convoy.total || 0) > 0;

	if (isStranded) {
		return (
			<span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300 uppercase font-bold">
				Stranded
			</span>
		);
	}

	if (isSynthesisReady) {
		return (
			<span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/60 text-green-300 uppercase font-bold">
				Ready
			</span>
		);
	}

	return (
		<span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 uppercase font-bold">
			Active
		</span>
	);
}

// Segmented progress bar showing status breakdown
function SegmentedProgress({ issues, total }: { issues?: TrackedIssue[]; total: number }) {
	if (!issues || issues.length === 0 || total === 0) {
		return (
			<div className="h-2 bg-black/50 rounded-sm overflow-hidden border border-slate-700" />
		);
	}

	const counts = {
		closed: 0,
		in_progress: 0,
		hooked: 0,
		open: 0,
	};

	issues.forEach((issue) => {
		if (issue.status === "closed") counts.closed++;
		else if (issue.status === "in_progress") counts.in_progress++;
		else if (issue.status === "hooked") counts.hooked++;
		else counts.open++;
	});

	const segments = [
		{ count: counts.closed, color: "bg-green-500" },
		{ count: counts.in_progress, color: "bg-amber-500" },
		{ count: counts.hooked, color: "bg-purple-500" },
		{ count: counts.open, color: "bg-slate-600" },
	];

	return (
		<div className="h-2 bg-black/50 rounded-sm overflow-hidden border border-slate-700 flex">
			{segments.map((seg, i) =>
				seg.count > 0 ? (
					<div
						key={i}
						className={cn("h-full transition-all duration-300", seg.color)}
						style={{ width: `${(seg.count / total) * 100}%` }}
					/>
				) : null
			)}
		</div>
	);
}

// Worker summary
function WorkerSummary({ issues }: { issues?: TrackedIssue[] }) {
	if (!issues) return null;

	const workers = issues
		.filter((i) => i.status === "in_progress" || i.status === "hooked")
		.filter((i) => i.assignee)
		.map((i) => i.assignee!)
		.filter((v, i, a) => a.indexOf(v) === i); // unique

	if (workers.length === 0) return null;

	const displayWorkers = workers.slice(0, 2);
	const remaining = workers.length - 2;

	return (
		<div className="flex items-center gap-1 text-[10px] text-slate-400">
			<Users size={10} className="text-slate-500" />
			<span className="truncate">
				{displayWorkers.join(", ")}
				{remaining > 0 && <span className="text-slate-500"> +{remaining}</span>}
			</span>
		</div>
	);
}

// Individual convoy card
function ConvoyDashboardCard({ convoy, eta, onClick, onClose, isClosing }: ConvoyDashboardCardProps) {
	const completed = convoy.completed || 0;
	const total = convoy.total || 1;
	const progress = Math.round((completed / total) * 100);
	const isSynthesisReady = convoy.completed === convoy.total && (convoy.total || 0) > 0;

	const handleClose = (e: React.MouseEvent) => {
		e.stopPropagation();
		onClose();
	};

	return (
		<div
			onClick={onClick}
			className={cn(
				"bg-slate-900/60 border rounded p-2 cursor-pointer transition-all",
				"hover:bg-slate-800/60 hover:border-slate-600",
				isSynthesisReady ? "border-green-700/50" : eta.isBlocked ? "border-amber-700/50" : "border-slate-700"
			)}
		>
			{/* Header: Title + ETA */}
			<div className="flex items-start justify-between gap-2 mb-1">
				<div className="flex-1 min-w-0">
					<div
						className="text-xs text-slate-200 truncate font-medium"
						title={convoy.title}
					>
						{convoy.title || convoy.id}
					</div>
					<div className="text-[10px] font-mono text-slate-500">
						{convoy.id.slice(0, 12)}
					</div>
				</div>
				<div className="flex flex-col items-end gap-1">
					<ETABadge eta={eta} />
					<StatusBadge convoy={convoy} eta={eta} />
				</div>
			</div>

			{/* Progress bar */}
			<div className="mb-1.5">
				<SegmentedProgress issues={convoy.tracked_issues} total={total} />
			</div>

			{/* Footer: Progress text + Workers + Close button */}
			<div className="flex items-center justify-between">
				<WorkerSummary issues={convoy.tracked_issues} />
				<div className="flex items-center gap-2">
					{eta.blockedCount > 0 && (
						<span className="text-[10px] text-amber-400">
							{eta.blockedCount} blocked
						</span>
					)}
					<span className="text-[10px] font-mono text-slate-400">
						{completed}/{total}
						<span className="text-slate-600 ml-1">({progress}%)</span>
					</span>
					{isSynthesisReady && (
						<button
							onClick={handleClose}
							disabled={isClosing}
							className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50"
						>
							{isClosing ? (
								<Loader2 size={10} className="animate-spin" />
							) : (
								<CheckCircle2 size={10} />
							)}
							Close
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

// Summary stats bar
function ConvoySummary({ convoys, etas }: { convoys: Convoy[]; etas: ConvoyETA[] }) {
	const totalWorkers = etas.reduce((sum, eta) => sum + eta.activeCount, 0);
	const blockedConvoys = etas.filter((eta) => eta.isBlocked).length;
	const readyConvoys = convoys.filter(
		(c) => c.completed === c.total && (c.total || 0) > 0
	).length;

	return (
		<div className="flex items-center gap-3 text-[10px] text-slate-400 border-t border-slate-700/50 pt-2 mt-2">
			<div className="flex items-center gap-1">
				<Users size={10} />
				<span>{totalWorkers} active</span>
			</div>
			{blockedConvoys > 0 && (
				<div className="flex items-center gap-1 text-amber-400">
					<AlertTriangle size={10} />
					<span>{blockedConvoys} blocked</span>
				</div>
			)}
			{readyConvoys > 0 && (
				<div className="flex items-center gap-1 text-green-400">
					<Clock size={10} />
					<span>{readyConvoys} ready</span>
				</div>
			)}
		</div>
	);
}

export function ConvoyPanel({ convoys, sseConnected }: ConvoyPanelProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [closingConvoyId, setClosingConvoyId] = useState<string | null>(null);

	// Calculate ETA for each convoy
	const etas = convoys.map((convoy) =>
		calculateConvoyETA({
			total: convoy.total || 0,
			completed: convoy.completed || 0,
			issues:
				convoy.tracked_issues?.map((i) => ({
					status: i.status,
					worker: i.assignee,
				})) || [],
		})
	);

	const closeMutation = useMutation({
		mutationFn: (convoyId: string) => closeConvoy(convoyId, "Closed from dashboard"),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["convoys"] });
			setClosingConvoyId(null);
		},
		onError: () => {
			setClosingConvoyId(null);
		},
	});

	const handleConvoyClick = (convoyId: string) => {
		navigate(`/convoys?selected=${convoyId}`);
	};

	const handleCloseConvoy = (convoyId: string) => {
		setClosingConvoyId(convoyId);
		closeMutation.mutate(convoyId);
	};

	return (
		<div className="bg-slate-900/80 border border-slate-700 rounded-lg p-3 flex-1 overflow-hidden flex flex-col">
			{/* Header */}
			<div className="flex items-center gap-2 mb-3">
				<Truck size={16} className="text-purple-400" />
				<span className="text-sm font-semibold text-slate-200">Active Convoys</span>
				<span className="text-xs px-1.5 py-0.5 bg-purple-900 text-purple-300 rounded-full">
					{convoys.length}
				</span>
				{sseConnected !== undefined && (
					<span
						className={cn(
							"w-1.5 h-1.5 rounded-full",
							sseConnected ? "bg-green-500 animate-pulse" : "bg-slate-600"
						)}
						title={sseConnected ? "Real-time connected" : "Connecting..."}
					/>
				)}
				<button
					onClick={() => navigate("/convoys")}
					className="ml-auto text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
				>
					View all <ExternalLink size={10} />
				</button>
			</div>

			{/* Convoy list */}
			<div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
				{convoys.length === 0 ? (
					<div className="text-xs text-slate-500 text-center py-4">
						No active convoys
						<div className="mt-1 text-slate-600">
							Create one with <code className="text-purple-400">gt convoy create</code>
						</div>
					</div>
				) : (
					convoys.map((convoy, i) => (
						<ConvoyDashboardCard
							key={convoy.id}
							convoy={convoy}
							eta={etas[i]}
							onClick={() => handleConvoyClick(convoy.id)}
							onClose={() => handleCloseConvoy(convoy.id)}
							isClosing={closingConvoyId === convoy.id}
						/>
					))
				)}
			</div>

			{/* Summary stats */}
			{convoys.length > 0 && <ConvoySummary convoys={convoys} etas={etas} />}
		</div>
	);
}
