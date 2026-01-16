import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	X,
	RefreshCw,
	Truck,
	AlertTriangle,
	CheckCircle2,
	Circle,
	Play,
	Beaker,
	Timer,
	Loader2,
	Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
	getConvoyDetail,
	closeConvoy,
	getSynthesisStatus,
	startSynthesis,
} from "@/lib/api";
import { cn, formatDate, calculateConvoyETA } from "@/lib/utils";
import type { ConvoyDetail, TrackedIssueDetail } from "@/types/api";

interface ConvoyDetailModalProps {
	convoyId: string;
	onClose: () => void;
}

// Status badge component - shows convoy operational state
function ConvoyStatusBadge({
	status,
	isStranded,
}: {
	status: string;
	isStranded?: boolean;
}) {
	if (status === "closed") {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-300">
				<CheckCircle2 size={12} />
				Landed
			</span>
		);
	}

	if (isStranded) {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-900/30 text-amber-300">
				<AlertTriangle size={12} />
				Stranded
			</span>
		);
	}

	return (
		<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-300 animate-pulse">
			<span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
			Active
		</span>
	);
}

// Issue status icon
function IssueStatusIcon({ status }: { status: string }) {
	switch (status) {
		case "closed":
			return <CheckCircle2 size={14} className="text-green-400" />;
		case "in_progress":
		case "hooked":
			return <Play size={14} className="text-amber-400" />;
		default:
			return <Circle size={14} className="text-gray-400" />;
	}
}

// Tracked issues table
function TrackedIssuesTable({ issues }: { issues: TrackedIssueDetail[] }) {
	if (!issues || issues.length === 0) {
		return (
			<div className="text-center py-6 text-slate-500">
				<Circle size={20} className="mx-auto mb-2 opacity-50" />
				<p className="text-sm">No tracked issues</p>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-slate-700 text-left text-slate-400">
						<th className="pb-2 pr-3 font-medium">Status</th>
						<th className="pb-2 pr-3 font-medium">Issue</th>
						<th className="pb-2 pr-3 font-medium">Title</th>
						<th className="pb-2 font-medium">Worker</th>
					</tr>
				</thead>
				<tbody>
					{issues.map((issue) => (
						<tr
							key={issue.id}
							className="border-b border-slate-800/50 hover:bg-slate-800/30"
						>
							<td className="py-2 pr-3">
								<IssueStatusIcon status={issue.status} />
							</td>
							<td className="py-2 pr-3">
								<code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
									{issue.id}
								</code>
							</td>
							<td className="py-2 pr-3 max-w-[180px] truncate text-slate-300">
								{issue.title}
							</td>
							<td className="py-2">
								{issue.worker ? (
									<span className="flex items-center gap-1.5">
										<span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
										<span className="text-xs text-slate-300">{issue.worker}</span>
										{issue.worker_age && (
											<span className="text-xs text-slate-500">
												({issue.worker_age})
											</span>
										)}
									</span>
								) : issue.assignee ? (
									<span className="text-xs text-slate-500">{issue.assignee}</span>
								) : (
									<span className="text-xs text-slate-600">-</span>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

// ETA panel for convoy detail view
function ConvoyETAPanel({ detail }: { detail: ConvoyDetail }) {
	const eta = calculateConvoyETA({
		total: detail.total || 0,
		completed: detail.completed || 0,
		issues:
			detail.tracked_issues?.map((i) => ({
				status: i.status,
				worker: i.worker,
				worker_age: i.worker_age,
			})) || [],
	});

	if (eta.estimatedMinutes === 0) return null;

	return (
		<div
			className={cn(
				"rounded-lg p-3 border",
				eta.isBlocked
					? "bg-amber-900/20 border-amber-500/50"
					: "bg-blue-900/20 border-blue-500/50"
			)}
		>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<Timer
						size={16}
						className={eta.isBlocked ? "text-amber-400" : "text-blue-400"}
					/>
					<h3
						className={cn(
							"font-medium text-sm",
							eta.isBlocked ? "text-amber-300" : "text-blue-300"
						)}
					>
						Estimated Completion
					</h3>
				</div>
				<span
					className={cn(
						"text-base font-semibold",
						eta.isBlocked ? "text-amber-300" : "text-blue-300"
					)}
				>
					{eta.display}
				</span>
			</div>

			<div className="grid grid-cols-3 gap-3 text-xs">
				<div>
					<span className="text-slate-500 block">Active</span>
					<span
						className={cn(
							"font-medium",
							eta.activeCount > 0 ? "text-green-400" : "text-slate-500"
						)}
					>
						{eta.activeCount}
					</span>
				</div>
				<div>
					<span className="text-slate-500 block">In Progress</span>
					<span
						className={cn(
							"font-medium",
							eta.wipCount > 0 ? "text-amber-400" : "text-slate-500"
						)}
					>
						{eta.wipCount}
					</span>
				</div>
				<div>
					<span className="text-slate-500 block">Waiting</span>
					<span
						className={cn(
							"font-medium",
							eta.blockedCount > 0 ? "text-red-400" : "text-slate-500"
						)}
					>
						{eta.blockedCount}
					</span>
				</div>
			</div>

			{eta.isBlocked && (
				<p className="mt-2 text-xs text-amber-200/70">
					No active workers. Assign workers to continue progress.
				</p>
			)}
		</div>
	);
}

// Synthesis panel - only shown for formula-driven convoys that need synthesis
function SynthesisPanel({
	detail,
	onStartSynthesis,
	isStarting,
}: {
	detail: ConvoyDetail;
	onStartSynthesis: () => void;
	isStarting: boolean;
}) {
	const needsSynthesis = !!(detail.formula || detail.molecule);
	const { data: synthesisStatus } = useQuery({
		queryKey: ["synthesis-status", detail.id],
		queryFn: () => getSynthesisStatus(detail.id),
		enabled: detail.status === "open" && needsSynthesis,
		refetchInterval: 10_000,
	});

	// Only show for formula-driven convoys that aren't closed
	if (!needsSynthesis || detail.status === "closed") return null;

	const isReady = detail.synthesis_ready || synthesisStatus?.ready;

	return (
		<div
			className={cn(
				"rounded-lg p-3 border",
				isReady
					? "bg-blue-900/20 border-blue-500/50"
					: "bg-slate-800 border-slate-700"
			)}
		>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<Beaker
						size={16}
						className={isReady ? "text-blue-400" : "text-slate-400"}
					/>
					<h3
						className={cn(
							"font-medium text-sm",
							isReady ? "text-blue-300" : "text-slate-200"
						)}
					>
						Synthesis
					</h3>
				</div>
				{isReady && (
					<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-300">
						<CheckCircle2 size={12} />
						Ready
					</span>
				)}
			</div>

			{isReady ? (
				<>
					<p className="text-xs text-blue-200/70 mb-2">
						All legs complete. Ready to start synthesis.
					</p>
					<button
						onClick={onStartSynthesis}
						disabled={isStarting}
						className="flex items-center gap-2 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
					>
						{isStarting ? (
							<>
								<Loader2 className="animate-spin" size={14} />
								Starting...
							</>
						) : (
							<>
								<Play size={14} />
								Start Synthesis
							</>
						)}
					</button>
				</>
			) : (
				<>
					<p className="text-xs text-slate-400 mb-2">
						Complete all legs before starting synthesis.
					</p>
					<div className="flex items-center gap-2 mb-2">
						<div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
							<div
								className="h-full bg-blue-500 rounded-full transition-all"
								style={{
									width: `${
										synthesisStatus
											? (synthesisStatus.completed / synthesisStatus.total) *
												100
											: 0
									}%`,
								}}
							/>
						</div>
						<span className="text-xs text-slate-500">
							{synthesisStatus?.completed ?? 0}/{synthesisStatus?.total ?? 0}
						</span>
					</div>
					<button
						disabled
						className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-700 text-slate-500 text-sm font-medium cursor-not-allowed"
					>
						<Play size={14} />
						Start Synthesis
					</button>
				</>
			)}
		</div>
	);
}

export function ConvoyDetailModal({ convoyId, onClose }: ConvoyDetailModalProps) {
	const [showCloseConfirm, setShowCloseConfirm] = useState(false);
	const [closeReason, setCloseReason] = useState("");
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const {
		data: detail,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["convoy-detail", convoyId],
		queryFn: () => getConvoyDetail(convoyId),
		refetchInterval: 5_000,
	});

	const closeMutation = useMutation({
		mutationFn: () => closeConvoy(convoyId, closeReason || "Manually closed"),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["convoys"] });
			queryClient.invalidateQueries({ queryKey: ["convoy-detail", convoyId] });
			setShowCloseConfirm(false);
			setCloseReason("");
		},
	});

	const synthesisMutation = useMutation({
		mutationFn: () => startSynthesis(convoyId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["convoys"] });
			queryClient.invalidateQueries({ queryKey: ["convoy-detail", convoyId] });
			queryClient.invalidateQueries({
				queryKey: ["synthesis-status", convoyId],
			});
		},
	});

	const handleExpandToFullPage = () => {
		onClose();
		navigate(`/convoys?selected=${convoyId}`);
	};

	const total = detail?.total ?? 0;
	const completed = detail?.completed ?? 0;
	const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0;

	// Determine if convoy can be closed (all issues complete for tracking convoy)
	const needsSynthesis = !!(detail?.formula || detail?.molecule);
	const canClose = detail?.status === "open" && total > 0 && completed === total && !needsSynthesis;

	return (
		<div
			className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
					<div className="flex items-center gap-3">
						<Truck size={18} className="text-purple-400" />
						<div>
							<h2 className="font-semibold text-slate-100">
								{detail?.title || convoyId}
							</h2>
							<p className="text-xs text-slate-500 font-mono">{convoyId}</p>
						</div>
						{detail && (
							<ConvoyStatusBadge
								status={detail.status}
								isStranded={detail.is_stranded}
							/>
						)}
					</div>
					<div className="flex items-center gap-2">
						{detail?.status === "open" && (
							<button
								onClick={handleExpandToFullPage}
								className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition-colors"
							>
								<Plus size={12} />
								Add Issues
							</button>
						)}
						<button
							onClick={onClose}
							className="p-1.5 rounded hover:bg-slate-800 transition-colors"
						>
							<X size={16} className="text-slate-400 hover:text-slate-200" />
						</button>
					</div>
				</div>

				{/* Close Confirmation */}
				{showCloseConfirm && (
					<div className="px-4 py-3 bg-green-900/20 border-b border-green-500/50">
						<h3 className="font-medium text-green-300 text-sm mb-2">
							Close Convoy?
						</h3>
						<input
							type="text"
							value={closeReason}
							onChange={(e) => setCloseReason(e.target.value)}
							placeholder="Reason for closing (optional)"
							className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 focus:border-green-500 focus:outline-none text-sm text-slate-200 mb-2"
						/>
						<div className="flex items-center gap-2">
							<button
								onClick={() => closeMutation.mutate()}
								disabled={closeMutation.isPending}
								className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-500 transition-colors disabled:opacity-50"
							>
								{closeMutation.isPending ? (
									<Loader2 className="animate-spin" size={14} />
								) : (
									<CheckCircle2 size={14} />
								)}
								Confirm
							</button>
							<button
								onClick={() => {
									setShowCloseConfirm(false);
									setCloseReason("");
								}}
								className="px-3 py-1.5 text-sm rounded hover:bg-slate-800 transition-colors text-slate-300"
							>
								Cancel
							</button>
						</div>
					</div>
				)}

				{/* Content */}
				<div className="flex-1 overflow-auto p-4 space-y-4">
					{isLoading ? (
						<div className="flex items-center justify-center h-32">
							<RefreshCw className="animate-spin text-slate-500" size={24} />
						</div>
					) : error || !detail ? (
						<div className="p-4 bg-red-900/20 border border-red-500 rounded-lg">
							<p className="text-red-400 text-sm">
								Failed to load convoy details
							</p>
						</div>
					) : (
						<>
							{/* Progress */}
							<div className="bg-slate-800 rounded-lg p-3">
								<div className="flex items-center justify-between mb-2">
									<span className="text-2xl font-bold text-slate-100">
										{completedPct}%
									</span>
									<span className="text-sm text-slate-400">
										{completed} of {total} issues
									</span>
								</div>
								<div className="h-2 bg-slate-900 rounded-full overflow-hidden">
									<div
										className="h-full bg-purple-500 rounded-full transition-all"
										style={{ width: `${completedPct}%` }}
									/>
								</div>

								{/* Status breakdown */}
								<div className="mt-2 flex gap-3 text-xs">
									{["closed", "in_progress", "hooked", "open"].map((status) => {
										const count =
											detail.tracked_issues?.filter((i) => i.status === status)
												.length || 0;
										if (count === 0) return null;
										return (
											<div key={status} className="flex items-center gap-1.5">
												<IssueStatusIcon status={status} />
												<span className="text-slate-400 capitalize">
													{status.replace("_", " ")}: {count}
												</span>
											</div>
										);
									})}
								</div>
							</div>

							{/* ETA */}
							{detail.status === "open" && total > 0 && (
								<ConvoyETAPanel detail={detail} />
							)}

							{/* Metadata */}
							<div className="grid grid-cols-2 gap-3 text-sm">
								<div>
									<span className="text-slate-500">Created</span>
									<p className="text-slate-300">{formatDate(detail.created_at)}</p>
								</div>
								{detail.formula && (
									<div>
										<span className="text-slate-500">Formula</span>
										<p className="text-slate-300">{detail.formula}</p>
									</div>
								)}
							</div>

							{/* Synthesis Panel (only for formula-driven convoys) */}
							<SynthesisPanel
								detail={detail}
								onStartSynthesis={() => synthesisMutation.mutate()}
								isStarting={synthesisMutation.isPending}
							/>

							{/* Tracking Panel (for simple tracking convoys - shows Close when ready) */}
							{!needsSynthesis && detail.status === "open" && (
								<div
									className={cn(
										"rounded-lg p-3 border",
										canClose
											? "bg-green-900/20 border-green-500/50"
											: "bg-slate-800 border-slate-700"
									)}
								>
									<div className="flex items-center justify-between mb-2">
										<div className="flex items-center gap-2">
											<Truck
												size={16}
												className={canClose ? "text-green-400" : "text-slate-400"}
											/>
											<h3
												className={cn(
													"font-medium text-sm",
													canClose ? "text-green-300" : "text-slate-200"
												)}
											>
												Tracking Convoy
											</h3>
										</div>
										{canClose && (
											<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-300">
												<CheckCircle2 size={12} />
												Complete
											</span>
										)}
									</div>

									{canClose ? (
										<>
											<p className="text-xs text-green-200/70 mb-2">
												All tracked issues are complete. You can now close this convoy.
											</p>
											<button
												onClick={() => setShowCloseConfirm(true)}
												disabled={closeMutation.isPending}
												className="flex items-center gap-2 px-3 py-1.5 rounded bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
											>
												{closeMutation.isPending ? (
													<Loader2 className="animate-spin" size={14} />
												) : (
													<CheckCircle2 size={14} />
												)}
												Close Convoy
											</button>
										</>
									) : (
										<>
											<p className="text-xs text-slate-400">
												{completed} of {total} issues complete
											</p>
										</>
									)}
								</div>
							)}

							{/* Tracked Issues */}
							<div>
								<h3 className="text-sm font-medium mb-2 text-slate-200">
									Tracked Issues
								</h3>
								<TrackedIssuesTable issues={detail.tracked_issues || []} />
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
