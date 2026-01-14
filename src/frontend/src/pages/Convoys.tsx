import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	RefreshCw,
	Plus,
	Truck,
	AlertTriangle,
	CheckCircle2,
	Circle,
	Play,
	Users,
	Clock,
	ChevronRight,
	X,
	Beaker,
	Search,
	Check,
	Trash2,
	Server,
	Loader2,
} from "lucide-react";
import {
	getConvoys,
	getConvoyDetail,
	getBeads,
	createConvoy,
	addIssuesToConvoy,
	removeIssueFromConvoy,
	getSynthesisStatus,
	startSynthesis,
} from "@/lib/api";
import { cn, formatRelativeTime, formatDate } from "@/lib/utils";
import { useConvoySubscription } from "@/hooks/useConvoySubscription";
import type { Convoy, TrackedIssueDetail, ConvoyDetail } from "@/types/api";

// Status badge component
function ConvoyStatusBadge({
	status,
	isStranded,
	synthesisReady,
}: {
	status: string;
	isStranded?: boolean;
	synthesisReady?: boolean;
}) {
	if (status === "closed") {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-300">
				<CheckCircle2 size={12} />
				Landed
			</span>
		);
	}

	if (synthesisReady) {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-300">
				<Beaker size={12} />
				Ready for Synthesis
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

// Mini progress indicator
function MiniProgress({
	completed,
	total,
}: {
	completed: number;
	total: number;
}) {
	if (total === 0) return null;
	const pct = (completed / total) * 100;

	return (
		<div className="flex items-center gap-2">
			<div className="w-16 h-1.5 bg-gt-bg rounded-full overflow-hidden">
				<div
					className="h-full bg-gt-accent rounded-full transition-all"
					style={{ width: `${pct}%` }}
				/>
			</div>
			<span className="text-xs text-gt-muted">
				{completed}/{total}
			</span>
		</div>
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

// Convoy card for the list
function ConvoyCard({
	convoy,
	isSelected,
	onClick,
}: {
	convoy: Convoy;
	isSelected: boolean;
	onClick: () => void;
}) {
	const workerCount = convoy.tracked_issues?.filter(
		(i) => i.status === "in_progress" || i.status === "hooked",
	).length;

	return (
		<button
			onClick={onClick}
			className={cn(
				"w-full text-left p-3 rounded-lg border transition-all",
				isSelected
					? "bg-gt-accent/10 border-gt-accent"
					: "bg-gt-surface border-gt-border hover:border-gt-accent/50",
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-2 min-w-0">
					<Truck
						size={16}
						className={cn(isSelected ? "text-gt-accent" : "text-gt-muted")}
					/>
					<div className="min-w-0">
						<h3 className="font-medium text-sm truncate">{convoy.title}</h3>
						<p className="text-xs text-gt-muted truncate">{convoy.id}</p>
					</div>
				</div>
				<ChevronRight
					size={16}
					className={cn(
						"flex-shrink-0 transition-transform",
						isSelected ? "text-gt-accent rotate-90" : "text-gt-muted",
					)}
				/>
			</div>

			<div className="mt-2 flex items-center justify-between gap-2">
				<ConvoyStatusBadge status={convoy.status} />
				<MiniProgress
					completed={convoy.completed || 0}
					total={convoy.total || 0}
				/>
			</div>

			<div className="mt-2 flex items-center gap-3 text-xs text-gt-muted">
				{workerCount && workerCount > 0 && (
					<span className="flex items-center gap-1">
						<Users size={12} />
						{workerCount}
					</span>
				)}
				<span className="flex items-center gap-1">
					<Clock size={12} />
					{formatRelativeTime(convoy.created_at)}
				</span>
			</div>
		</button>
	);
}

// Tracked issues table
function TrackedIssuesTable({
	issues,
	onRemove,
	isRemoving,
}: {
	issues: TrackedIssueDetail[];
	onRemove?: (issueId: string) => void;
	isRemoving?: boolean;
}) {
	if (!issues || issues.length === 0) {
		return (
			<div className="text-center py-8 text-gt-muted">
				<Circle size={24} className="mx-auto mb-2 opacity-50" />
				<p className="text-sm">No tracked issues</p>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-gt-border text-left text-gt-muted">
						<th className="pb-2 pr-4 font-medium">Status</th>
						<th className="pb-2 pr-4 font-medium">Issue</th>
						<th className="pb-2 pr-4 font-medium">Title</th>
						<th className="pb-2 pr-4 font-medium">Worker</th>
						{onRemove && <th className="pb-2 w-10 font-medium"></th>}
					</tr>
				</thead>
				<tbody>
					{issues.map((issue) => (
						<tr
							key={issue.id}
							className="border-b border-gt-border/50 hover:bg-gt-bg/50 group"
						>
							<td className="py-2 pr-4">
								<IssueStatusIcon status={issue.status} />
							</td>
							<td className="py-2 pr-4">
								<code className="text-xs bg-gt-bg px-1.5 py-0.5 rounded">
									{issue.id}
								</code>
							</td>
							<td className="py-2 pr-4 max-w-[200px] truncate">
								{issue.title}
							</td>
							<td className="py-2 pr-4">
								{issue.worker ? (
									<span className="flex items-center gap-1.5">
										<span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
										<span className="text-xs">{issue.worker}</span>
										{issue.worker_age && (
											<span className="text-xs text-gt-muted">
												({issue.worker_age})
											</span>
										)}
									</span>
								) : issue.assignee ? (
									<span className="text-xs text-gt-muted">
										{issue.assignee}
									</span>
								) : (
									<span className="text-xs text-gt-muted">-</span>
								)}
							</td>
							{onRemove && (
								<td className="py-2">
									<button
										onClick={() => onRemove(issue.id)}
										disabled={isRemoving}
										className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-900/30 text-gt-muted hover:text-red-400 transition-all"
										title="Remove from convoy"
									>
										<Trash2 size={14} />
									</button>
								</td>
							)}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

// Synthesis Panel - shows synthesis workflow status and controls
function SynthesisPanel({
	detail,
	onStartSynthesis,
	isStarting,
	onClose,
	isClosing,
}: {
	detail: ConvoyDetail;
	onStartSynthesis: (rig?: string) => void;
	isStarting: boolean;
	onClose?: () => void;
	isClosing?: boolean;
}) {
	const [showStartModal, setShowStartModal] = useState(false);
	const [selectedRig, setSelectedRig] = useState("");

	// Check if this convoy needs synthesis (has formula or molecule)
	const needsSynthesis = !!(detail.formula || detail.molecule);

	// Query synthesis status for more details
	const { data: synthesisStatus } = useQuery({
		queryKey: ["synthesis-status", detail.id],
		queryFn: () => getSynthesisStatus(detail.id),
		enabled: detail.status === "open" && needsSynthesis,
		refetchInterval: 10_000,
	});

	const incompleteLegCount = synthesisStatus?.incomplete_legs?.length ?? 0;
	const isReady = detail.synthesis_ready || synthesisStatus?.ready;

	// Don't show panel for closed convoys
	if (detail.status === "closed") return null;

	const handleStartClick = () => {
		if (selectedRig) {
			onStartSynthesis(selectedRig);
		} else {
			onStartSynthesis();
		}
		setShowStartModal(false);
		setSelectedRig("");
	};

	// Simple tracking convoy (no synthesis needed)
	if (!needsSynthesis) {
		const allComplete = detail.total > 0 && detail.completed === detail.total;

		return (
			<div
				className={cn(
					"rounded-lg p-4 border",
					allComplete
						? "bg-green-900/20 border-green-500/50"
						: "bg-gt-surface border-gt-border",
				)}
			>
				<div className="flex items-center justify-between mb-3">
					<div className="flex items-center gap-2">
						<Truck
							size={18}
							className={allComplete ? "text-green-400" : "text-gt-muted"}
						/>
						<h3
							className={cn(
								"font-medium",
								allComplete ? "text-green-300" : "text-gt-text",
							)}
						>
							Tracking Convoy
						</h3>
					</div>
					{allComplete && (
						<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-300">
							<CheckCircle2 size={12} />
							Complete
						</span>
					)}
				</div>

				{allComplete ? (
					<>
						<p className="text-sm text-green-200/70 mb-3">
							All tracked issues are complete. You can now close this convoy.
						</p>
						<button
							onClick={onClose}
							disabled={!onClose || isClosing}
							className="flex items-center gap-2 px-3 py-1.5 rounded bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
						>
							{isClosing ? (
								<>
									<Loader2 className="animate-spin" size={14} />
									Closing...
								</>
							) : (
								<>
									<CheckCircle2 size={14} />
									Close Convoy
								</>
							)}
						</button>
					</>
				) : (
					<>
						<p className="text-sm text-gt-muted mb-3">
							This is a simple tracking convoy. It will be ready to close once
							all tracked issues are complete.
						</p>
						<div className="flex items-center gap-2">
							<span className="text-xs text-gt-muted">
								{detail.completed ?? 0} of {detail.total ?? 0} complete
							</span>
						</div>
					</>
				)}
			</div>
		);
	}

	// Formula-driven convoy (needs synthesis)
	return (
		<div
			className={cn(
				"rounded-lg p-4 border",
				isReady
					? "bg-blue-900/20 border-blue-500/50"
					: "bg-gt-surface border-gt-border",
			)}
		>
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<Beaker
						size={18}
						className={isReady ? "text-blue-400" : "text-gt-muted"}
					/>
					<h3
						className={cn(
							"font-medium",
							isReady ? "text-blue-300" : "text-gt-text",
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
					<p className="text-sm text-blue-200/70 mb-3">
						All legs are complete. You can now start the synthesis step to
						combine the work.
					</p>

					{/* Start Synthesis Button or Modal Trigger */}
					{!showStartModal ? (
						<button
							onClick={() => setShowStartModal(true)}
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
					) : (
						<div className="bg-gt-bg rounded-lg p-3 space-y-3">
							<div>
								<label className="block text-xs font-medium text-gt-muted mb-1">
									Target Rig (optional)
								</label>
								<div className="flex items-center gap-2">
									<Server size={14} className="text-gt-muted" />
									<input
										type="text"
										value={selectedRig}
										onChange={(e) => setSelectedRig(e.target.value)}
										placeholder="auto-select"
										className="flex-1 px-2 py-1 rounded bg-gt-surface border border-gt-border focus:border-gt-accent focus:outline-none text-sm"
									/>
								</div>
								<p className="text-xs text-gt-muted mt-1">
									Leave empty to auto-select an available rig
								</p>
							</div>

							<div className="flex items-center gap-2">
								<button
									onClick={handleStartClick}
									disabled={isStarting}
									className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
								>
									{isStarting ? (
										<Loader2 className="animate-spin" size={14} />
									) : (
										<Play size={14} />
									)}
									Confirm
								</button>
								<button
									onClick={() => {
										setShowStartModal(false);
										setSelectedRig("");
									}}
									className="px-3 py-1.5 text-sm rounded hover:bg-gt-border transition-colors"
								>
									Cancel
								</button>
							</div>
						</div>
					)}
				</>
			) : (
				<>
					{/* Not Ready State */}
					<p className="text-sm text-gt-muted mb-3">
						Complete all legs before starting synthesis.
					</p>

					{/* Progress */}
					<div className="flex items-center gap-2 mb-3">
						<div className="flex-1 h-1.5 bg-gt-bg rounded-full overflow-hidden">
							<div
								className="h-full bg-gt-accent rounded-full transition-all"
								style={{
									width: `${synthesisStatus ? (synthesisStatus.completed / synthesisStatus.total) * 100 : 0}%`,
								}}
							/>
						</div>
						<span className="text-xs text-gt-muted">
							{synthesisStatus?.completed ?? 0}/{synthesisStatus?.total ?? 0}
						</span>
					</div>

					{/* Incomplete Legs */}
					{synthesisStatus?.incomplete_legs &&
						synthesisStatus.incomplete_legs.length > 0 && (
							<div className="space-y-1">
								<p className="text-xs font-medium text-gt-muted">
									Incomplete ({incompleteLegCount}):
								</p>
								<div className="max-h-24 overflow-auto space-y-1">
									{synthesisStatus.incomplete_legs.slice(0, 5).map((leg) => (
										<div
											key={leg.id}
											className="flex items-center gap-2 text-xs"
										>
											<IssueStatusIcon status={leg.status} />
											<code className="text-gt-muted">{leg.id}</code>
											<span className="truncate">{leg.title}</span>
										</div>
									))}
									{synthesisStatus.incomplete_legs.length > 5 && (
										<p className="text-xs text-gt-muted">
											+{synthesisStatus.incomplete_legs.length - 5} more
										</p>
									)}
								</div>
							</div>
						)}

					{/* Disabled button */}
					<button
						disabled
						className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded bg-gt-border text-gt-muted text-sm font-medium cursor-not-allowed"
						title="Complete all legs first"
					>
						<Play size={14} />
						Start Synthesis
					</button>
				</>
			)}
		</div>
	);
}

// Detail panel
function ConvoyDetailPanel({
	convoyId,
	onClose,
}: {
	convoyId: string;
	onClose: () => void;
}) {
	const [showAddIssues, setShowAddIssues] = useState(false);
	const [showCloseConfirm, setShowCloseConfirm] = useState(false);
	const [closeReason, setCloseReason] = useState("");
	const [addSearchQuery, setAddSearchQuery] = useState("");
	const [issuesToAdd, setIssuesToAdd] = useState<string[]>([]);

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

	// Fetch available issues for adding
	const { data: availableIssues } = useQuery({
		queryKey: ["beads", "open"],
		queryFn: () => getBeads({ status: "open" }),
		enabled: showAddIssues,
	});

	const closeMutation = useMutation({
		mutationFn: () =>
			import("@/lib/api").then((api) =>
				api.closeConvoy(convoyId, closeReason || "Manually closed"),
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["convoys"] });
			queryClient.invalidateQueries({ queryKey: ["convoy-detail", convoyId] });
			setShowCloseConfirm(false);
			setCloseReason("");
		},
	});

	const addIssuesMutation = useMutation({
		mutationFn: (issues: string[]) => addIssuesToConvoy(convoyId, issues),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["convoys"] });
			queryClient.invalidateQueries({ queryKey: ["convoy-detail", convoyId] });
			setShowAddIssues(false);
			setIssuesToAdd([]);
			setAddSearchQuery("");
		},
	});

	const removeIssueMutation = useMutation({
		mutationFn: (issueId: string) => removeIssueFromConvoy(convoyId, issueId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["convoys"] });
			queryClient.invalidateQueries({ queryKey: ["convoy-detail", convoyId] });
		},
	});

	const synthesisMutation = useMutation({
		mutationFn: (rig?: string) => startSynthesis(convoyId, rig),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["convoys"] });
			queryClient.invalidateQueries({ queryKey: ["convoy-detail", convoyId] });
			queryClient.invalidateQueries({
				queryKey: ["synthesis-status", convoyId],
			});
		},
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<RefreshCw className="animate-spin text-gt-muted" size={24} />
			</div>
		);
	}

	if (error || !detail) {
		return (
			<div className="p-4 bg-red-900/20 border border-red-500 rounded-lg">
				<p className="text-red-400">
					Failed to load convoy details: {error?.message || "Unknown error"}
				</p>
			</div>
		);
	}

	const total = detail.total ?? 0;
	const completed = detail.completed ?? 0;
	const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0;

	// Filter issues not already in convoy
	const trackedIds = new Set(detail.tracked_issues?.map((i) => i.id) || []);
	const filteredAddIssues = availableIssues?.filter(
		(issue) =>
			issue.type !== "convoy" &&
			issue.type !== "agent" &&
			!trackedIds.has(issue.id) &&
			(addSearchQuery === "" ||
				issue.title.toLowerCase().includes(addSearchQuery.toLowerCase()) ||
				issue.id.toLowerCase().includes(addSearchQuery.toLowerCase())),
	);

	const toggleAddIssue = (issueId: string) => {
		setIssuesToAdd((prev) =>
			prev.includes(issueId)
				? prev.filter((id) => id !== issueId)
				: [...prev, issueId],
		);
	};

	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="flex items-start justify-between p-4 border-b border-gt-border">
				<div>
					<div className="flex items-center gap-2">
						<h2 className="text-lg font-semibold">{detail.title}</h2>
						<ConvoyStatusBadge
							status={detail.status}
							isStranded={detail.is_stranded}
							synthesisReady={detail.synthesis_ready}
						/>
					</div>
					<p className="text-sm text-gt-muted mt-1">{detail.id}</p>
				</div>
				<div className="flex items-center gap-2">
					{detail.status === "open" && (
						<>
							<button
								onClick={() => {
									setShowAddIssues(true);
									setShowCloseConfirm(false);
								}}
								className="flex items-center gap-1 px-2 py-1 text-sm rounded-lg bg-gt-surface hover:bg-gt-border transition-colors"
							>
								<Plus size={14} />
								Add Issues
							</button>
							<button
								onClick={() => {
									setShowCloseConfirm(true);
									setShowAddIssues(false);
								}}
								className="flex items-center gap-1 px-2 py-1 text-sm rounded-lg bg-amber-900/30 text-amber-300 hover:bg-amber-900/50 transition-colors"
							>
								<CheckCircle2 size={14} />
								Close
							</button>
						</>
					)}
					<button
						onClick={onClose}
						className="p-1 rounded hover:bg-gt-border transition-colors"
					>
						<X size={18} className="text-gt-muted" />
					</button>
				</div>
			</div>

			{/* Close Confirmation */}
			{showCloseConfirm && (
				<div className="p-4 bg-amber-900/20 border-b border-amber-500/50">
					<h3 className="font-medium text-amber-300 mb-2">Close Convoy?</h3>
					<input
						type="text"
						value={closeReason}
						onChange={(e) => setCloseReason(e.target.value)}
						placeholder="Reason for closing (optional)"
						className="w-full px-3 py-2 rounded-lg bg-gt-bg border border-gt-border focus:border-gt-accent focus:outline-none text-sm mb-3"
					/>
					<div className="flex items-center gap-2">
						<button
							onClick={() => closeMutation.mutate()}
							disabled={closeMutation.isPending}
							className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors"
						>
							{closeMutation.isPending ? (
								<RefreshCw className="animate-spin" size={14} />
							) : (
								<CheckCircle2 size={14} />
							)}
							Confirm Close
						</button>
						<button
							onClick={() => {
								setShowCloseConfirm(false);
								setCloseReason("");
							}}
							className="px-3 py-1.5 text-sm rounded-lg hover:bg-gt-border transition-colors"
						>
							Cancel
						</button>
					</div>
				</div>
			)}

			{/* Add Issues Panel */}
			{showAddIssues && (
				<div className="p-4 bg-gt-accent/10 border-b border-gt-accent/50">
					<h3 className="font-medium text-gt-accent mb-2">
						Add Issues to Convoy
					</h3>

					{/* Selected chips */}
					{issuesToAdd.length > 0 && (
						<div className="flex flex-wrap gap-1 mb-2">
							{issuesToAdd.map((id) => (
								<span
									key={id}
									className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gt-accent/20 text-gt-accent text-xs"
								>
									{id}
									<button
										onClick={() => toggleAddIssue(id)}
										className="hover:text-white"
									>
										<X size={12} />
									</button>
								</span>
							))}
						</div>
					)}

					{/* Search */}
					<div className="relative mb-2">
						<Search
							size={16}
							className="absolute left-3 top-1/2 -translate-y-1/2 text-gt-muted"
						/>
						<input
							type="text"
							value={addSearchQuery}
							onChange={(e) => setAddSearchQuery(e.target.value)}
							placeholder="Search issues..."
							className="w-full pl-9 pr-3 py-2 rounded-lg bg-gt-bg border border-gt-border focus:border-gt-accent focus:outline-none text-sm"
						/>
					</div>

					{/* Issue list */}
					<div className="max-h-40 overflow-auto border border-gt-border rounded-lg mb-3 bg-gt-surface">
						{filteredAddIssues && filteredAddIssues.length > 0 ? (
							<div className="divide-y divide-gt-border">
								{filteredAddIssues.slice(0, 20).map((issue) => (
									<button
										key={issue.id}
										onClick={() => toggleAddIssue(issue.id)}
										className={cn(
											"w-full flex items-center gap-3 p-2 text-left hover:bg-gt-bg transition-colors",
											issuesToAdd.includes(issue.id) && "bg-gt-accent/10",
										)}
									>
										<div
											className={cn(
												"w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
												issuesToAdd.includes(issue.id)
													? "bg-gt-accent border-gt-accent"
													: "border-gt-border",
											)}
										>
											{issuesToAdd.includes(issue.id) && (
												<Check size={12} className="text-black" />
											)}
										</div>
										<div className="min-w-0 flex-1">
											<code className="text-xs text-gt-muted">{issue.id}</code>
											<p className="text-sm truncate">{issue.title}</p>
										</div>
									</button>
								))}
							</div>
						) : (
							<div className="p-4 text-center text-gt-muted text-sm">
								No matching issues found
							</div>
						)}
					</div>

					{/* Actions */}
					<div className="flex items-center gap-2">
						<button
							onClick={() => addIssuesMutation.mutate(issuesToAdd)}
							disabled={issuesToAdd.length === 0 || addIssuesMutation.isPending}
							className={cn(
								"flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors",
								issuesToAdd.length === 0 || addIssuesMutation.isPending
									? "bg-gt-muted/20 text-gt-muted cursor-not-allowed"
									: "bg-gt-accent text-black hover:bg-gt-accent/90",
							)}
						>
							{addIssuesMutation.isPending ? (
								<RefreshCw className="animate-spin" size={14} />
							) : (
								<Plus size={14} />
							)}
							Add {issuesToAdd.length > 0 ? `(${issuesToAdd.length})` : ""}
						</button>
						<button
							onClick={() => {
								setShowAddIssues(false);
								setIssuesToAdd([]);
								setAddSearchQuery("");
							}}
							className="px-3 py-1.5 text-sm rounded-lg hover:bg-gt-border transition-colors"
						>
							Cancel
						</button>
					</div>

					{addIssuesMutation.isError && (
						<p className="text-sm text-red-400 mt-2">
							{addIssuesMutation.error?.message || "Failed to add issues"}
						</p>
					)}
				</div>
			)}

			{/* Content */}
			<div className="flex-1 overflow-auto p-4 space-y-6">
				{/* Progress */}
				<div>
					<h3 className="text-sm font-medium mb-2">Progress</h3>
					<div className="bg-gt-bg rounded-lg p-4">
						<div className="flex items-center justify-between mb-2">
							<span className="text-2xl font-bold">{completedPct}%</span>
							<span className="text-sm text-gt-muted">
								{completed} of {total} issues
							</span>
						</div>
						<div className="h-2 bg-gt-border rounded-full overflow-hidden">
							<div
								className="h-full bg-gt-accent rounded-full transition-all"
								style={{ width: `${completedPct}%` }}
							/>
						</div>

						{/* Status breakdown */}
						<div className="mt-3 grid grid-cols-4 gap-2 text-xs">
							{["closed", "in_progress", "hooked", "open"].map((status) => {
								const count =
									detail.tracked_issues?.filter((i) => i.status === status)
										.length || 0;
								if (count === 0) return null;
								return (
									<div key={status} className="flex items-center gap-1.5">
										<IssueStatusIcon status={status} />
										<span className="text-gt-muted capitalize">
											{status.replace("_", " ")}: {count}
										</span>
									</div>
								);
							})}
						</div>
					</div>
				</div>

				{/* Metadata */}
				<div className="grid grid-cols-2 gap-4 text-sm">
					<div>
						<span className="text-gt-muted">Created</span>
						<p>{formatDate(detail.created_at)}</p>
					</div>
					{detail.formula && (
						<div>
							<span className="text-gt-muted">Formula</span>
							<p>{detail.formula}</p>
						</div>
					)}
					{detail.notify && (
						<div>
							<span className="text-gt-muted">Notify</span>
							<p>{detail.notify}</p>
						</div>
					)}
					{detail.workers.length > 0 && (
						<div>
							<span className="text-gt-muted">Active Workers</span>
							<p>{detail.workers.length}</p>
						</div>
					)}
				</div>

				{/* Synthesis Panel */}
				<SynthesisPanel
					detail={detail}
					onStartSynthesis={(rig) => synthesisMutation.mutate(rig)}
					isStarting={synthesisMutation.isPending}
				onClose={() => closeMutation.mutate()}
				isClosing={closeMutation.isPending}
				/>

				{/* Tracked Issues - now with remove capability for open convoys */}
				<div>
					<h3 className="text-sm font-medium mb-3">Tracked Issues</h3>
					<TrackedIssuesTable
						issues={detail.tracked_issues}
						onRemove={
							detail.status === "open"
								? (issueId) => removeIssueMutation.mutate(issueId)
								: undefined
						}
						isRemoving={removeIssueMutation.isPending}
					/>
				</div>
			</div>
		</div>
	);
}

// Empty detail state
function EmptyDetailState() {
	return (
		<div className="flex flex-col items-center justify-center h-full text-gt-muted">
			<Truck size={48} className="mb-4 opacity-30" />
			<p>Select a convoy to view details</p>
		</div>
	);
}

// Create Convoy Modal
function CreateConvoyModal({
	isOpen,
	onClose,
	onCreated,
}: {
	isOpen: boolean;
	onClose: () => void;
	onCreated: (convoyId: string) => void;
}) {
	const [name, setName] = useState("");
	const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
	const [notify, setNotify] = useState("");
	const [searchQuery, setSearchQuery] = useState("");

	const queryClient = useQueryClient();

	const { data: availableIssues, isLoading: isLoadingIssues } = useQuery({
		queryKey: ["beads", "open"],
		queryFn: () => getBeads({ status: "open" }),
		enabled: isOpen,
	});

	const createMutation = useMutation({
		mutationFn: () =>
			createConvoy({
				name,
				issues: selectedIssues,
				notify: notify || undefined,
			}),
		onSuccess: (result) => {
			queryClient.invalidateQueries({ queryKey: ["convoys"] });
			const convoyId = (result.data as { convoy_id?: string })?.convoy_id || "";
			onCreated(convoyId);
			resetForm();
		},
	});

	const resetForm = () => {
		setName("");
		setSelectedIssues([]);
		setNotify("");
		setSearchQuery("");
	};

	const handleClose = () => {
		resetForm();
		onClose();
	};

	const toggleIssue = (issueId: string) => {
		setSelectedIssues((prev) =>
			prev.includes(issueId)
				? prev.filter((id) => id !== issueId)
				: [...prev, issueId],
		);
	};

	const filteredIssues = availableIssues?.filter(
		(issue) =>
			issue.type !== "convoy" &&
			issue.type !== "agent" &&
			(searchQuery === "" ||
				issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				issue.id.toLowerCase().includes(searchQuery.toLowerCase())),
	);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div className="absolute inset-0 bg-black/60" onClick={handleClose} />

			{/* Modal */}
			<div className="relative bg-gt-surface border border-gt-border rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gt-border">
					<h2 className="text-lg font-semibold">Create Convoy</h2>
					<button
						onClick={handleClose}
						className="p-1 rounded hover:bg-gt-border transition-colors"
					>
						<X size={18} className="text-gt-muted" />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-auto p-4 space-y-4">
					{/* Name */}
					<div>
						<label className="block text-sm font-medium mb-1">
							Convoy Name
						</label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g., Deploy v2.0"
							className="w-full px-3 py-2 rounded-lg bg-gt-bg border border-gt-border focus:border-gt-accent focus:outline-none"
						/>
					</div>

					{/* Issue Picker */}
					<div>
						<label className="block text-sm font-medium mb-1">
							Select Issues to Track
						</label>

						{/* Selected chips */}
						{selectedIssues.length > 0 && (
							<div className="flex flex-wrap gap-1 mb-2">
								{selectedIssues.map((id) => (
									<span
										key={id}
										className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gt-accent/20 text-gt-accent text-xs"
									>
										{id}
										<button
											onClick={() => toggleIssue(id)}
											className="hover:text-white"
										>
											<X size={12} />
										</button>
									</span>
								))}
							</div>
						)}

						{/* Search */}
						<div className="relative mb-2">
							<Search
								size={16}
								className="absolute left-3 top-1/2 -translate-y-1/2 text-gt-muted"
							/>
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search issues..."
								className="w-full pl-9 pr-3 py-2 rounded-lg bg-gt-bg border border-gt-border focus:border-gt-accent focus:outline-none text-sm"
							/>
						</div>

						{/* Issue list */}
						<div className="max-h-48 overflow-auto border border-gt-border rounded-lg">
							{isLoadingIssues ? (
								<div className="p-4 text-center text-gt-muted">
									<RefreshCw className="animate-spin mx-auto mb-2" size={20} />
									Loading issues...
								</div>
							) : filteredIssues && filteredIssues.length > 0 ? (
								<div className="divide-y divide-gt-border">
									{filteredIssues.map((issue) => (
										<button
											key={issue.id}
											onClick={() => toggleIssue(issue.id)}
											className={cn(
												"w-full flex items-center gap-3 p-2 text-left hover:bg-gt-bg transition-colors",
												selectedIssues.includes(issue.id) && "bg-gt-accent/10",
											)}
										>
											<div
												className={cn(
													"w-4 h-4 rounded border flex items-center justify-center",
													selectedIssues.includes(issue.id)
														? "bg-gt-accent border-gt-accent"
														: "border-gt-border",
												)}
											>
												{selectedIssues.includes(issue.id) && (
													<Check size={12} className="text-black" />
												)}
											</div>
											<div className="min-w-0 flex-1">
												<code className="text-xs text-gt-muted">
													{issue.id}
												</code>
												<p className="text-sm truncate">{issue.title}</p>
											</div>
										</button>
									))}
								</div>
							) : (
								<div className="p-4 text-center text-gt-muted text-sm">
									No matching issues found
								</div>
							)}
						</div>
					</div>

					{/* Notify */}
					<div>
						<label className="block text-sm font-medium mb-1">
							Notify on completion (optional)
						</label>
						<input
							type="text"
							value={notify}
							onChange={(e) => setNotify(e.target.value)}
							placeholder="e.g., mayor/, ops/"
							className="w-full px-3 py-2 rounded-lg bg-gt-bg border border-gt-border focus:border-gt-accent focus:outline-none"
						/>
						<p className="text-xs text-gt-muted mt-1">
							Leave empty for no notification
						</p>
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-2 p-4 border-t border-gt-border">
					<button
						onClick={handleClose}
						className="px-4 py-2 rounded-lg hover:bg-gt-border transition-colors"
					>
						Cancel
					</button>
					<button
						onClick={() => createMutation.mutate()}
						disabled={
							!name || selectedIssues.length === 0 || createMutation.isPending
						}
						className={cn(
							"flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
							!name || selectedIssues.length === 0 || createMutation.isPending
								? "bg-gt-muted/20 text-gt-muted cursor-not-allowed"
								: "bg-gt-accent text-black hover:bg-gt-accent/90",
						)}
					>
						{createMutation.isPending ? (
							<>
								<RefreshCw className="animate-spin" size={16} />
								Creating...
							</>
						) : (
							<>
								<Plus size={16} />
								Create Convoy
							</>
						)}
					</button>
				</div>

				{/* Error display */}
				{createMutation.isError && (
					<div className="px-4 pb-4">
						<div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
							<p className="text-sm text-red-400">
								{createMutation.error?.message || "Failed to create convoy"}
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

// Main page component
export default function Convoys() {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [showCreateModal, setShowCreateModal] = useState(false);

	// SSE subscription for real-time updates
	useConvoySubscription({ enabled: true });

	const {
		data: convoys,
		isLoading,
		error,
		refetch,
		isFetching,
	} = useQuery({
		queryKey: ["convoys"],
		queryFn: () => getConvoys(),
		refetchInterval: 30_000, // Reduce polling since SSE handles updates
	});

	if (isLoading) {
		return (
			<div className="p-6 flex items-center justify-center h-full">
				<RefreshCw className="animate-spin text-gt-muted" size={24} />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6">
				<div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
					<p className="text-red-400">
						Failed to load convoys: {error.message}
					</p>
					<button
						onClick={() => refetch()}
						className="mt-2 text-sm text-red-300 hover:text-red-200"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-gt-border">
				<div>
					<h1 className="text-xl font-semibold">Convoys</h1>
					<p className="text-sm text-gt-muted">
						Track batched work across rigs
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => refetch()}
						disabled={isFetching}
						className="p-2 rounded-lg bg-gt-surface hover:bg-gt-border transition-colors"
						title="Refresh"
					>
						<RefreshCw size={18} className={cn(isFetching && "animate-spin")} />
					</button>
					<button
						onClick={() => setShowCreateModal(true)}
						className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gt-accent text-black hover:bg-gt-accent/90 transition-colors"
					>
						<Plus size={16} />
						New Convoy
					</button>
				</div>
			</div>

			{/* Master-detail layout */}
			<div className="flex-1 flex min-h-0">
				{/* List panel */}
				<div className="w-80 flex-shrink-0 border-r border-gt-border overflow-auto p-3 space-y-2">
					{!convoys || convoys.length === 0 ? (
						<div className="text-center py-8">
							<Truck className="mx-auto text-gt-muted mb-4" size={32} />
							<p className="text-sm text-gt-muted">No active convoys</p>
						</div>
					) : (
						convoys.map((convoy) => (
							<ConvoyCard
								key={convoy.id}
								convoy={convoy}
								isSelected={selectedId === convoy.id}
								onClick={() => setSelectedId(convoy.id)}
							/>
						))
					)}
				</div>

				{/* Detail panel */}
				<div className="flex-1 min-w-0 bg-gt-bg/30">
					{selectedId ? (
						<ConvoyDetailPanel
							convoyId={selectedId}
							onClose={() => setSelectedId(null)}
						/>
					) : (
						<EmptyDetailState />
					)}
				</div>
			</div>

			{/* Create Convoy Modal */}
			<CreateConvoyModal
				isOpen={showCreateModal}
				onClose={() => setShowCreateModal(false)}
				onCreated={(convoyId) => {
					setShowCreateModal(false);
					if (convoyId) {
						setSelectedId(convoyId);
					}
				}}
			/>
		</div>
	);
}
