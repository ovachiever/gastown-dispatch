import { useQuery } from "@tanstack/react-query";
import {
	GitMerge,
	Clock,
	Loader2,
	RefreshCw,
	AlertCircle,
	CheckCircle,
	Ban,
	ArrowRight,
	ChevronDown,
	ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getStatus, getAllMergeQueues } from "@/lib/api";
import type { MergeRequest, MergeQueueListResponse } from "@/types/api";

function StatusBadge({ status }: { status: MergeRequest["status"] }) {
	const config: Record<
		MergeRequest["status"],
		{
			icon: typeof CheckCircle;
			color: string;
			label: string;
			spin?: boolean;
		}
	> = {
		ready: {
			icon: CheckCircle,
			color: "text-green-400 bg-green-500/20",
			label: "Ready",
		},
		in_progress: {
			icon: Loader2,
			color: "text-blue-400 bg-blue-500/20",
			label: "In Progress",
			spin: true,
		},
		blocked: {
			icon: Ban,
			color: "text-yellow-400 bg-yellow-500/20",
			label: "Blocked",
		},
		merged: {
			icon: GitMerge,
			color: "text-purple-400 bg-purple-500/20",
			label: "Merged",
		},
		rejected: {
			icon: AlertCircle,
			color: "text-red-400 bg-red-500/20",
			label: "Rejected",
		},
	};

	const { icon: Icon, color, label, spin } = config[status] || config.ready;

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
				color,
			)}
		>
			<Icon size={12} className={cn(spin && "animate-spin")} />
			{label}
		</span>
	);
}

function PriorityBadge({ priority }: { priority: string }) {
	const colorMap: Record<string, string> = {
		P0: "text-red-400 bg-red-500/20 border-red-500/30",
		P1: "text-orange-400 bg-orange-500/20 border-orange-500/30",
		P2: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
		P3: "text-blue-400 bg-blue-500/20 border-blue-500/30",
		P4: "text-gt-muted bg-gt-surface border-gt-border",
	};

	return (
		<span
			className={cn(
				"px-1.5 py-0.5 rounded text-xs font-mono border",
				colorMap[priority] || colorMap.P4,
			)}
		>
			{priority}
		</span>
	);
}

function MergeRequestRow({
	mr,
	isNext,
}: {
	mr: MergeRequest;
	isNext?: boolean;
}) {
	return (
		<div
			className={cn(
				"bg-gt-surface border border-gt-border rounded-lg p-4 flex items-center gap-4",
				isNext && "ring-2 ring-purple-500/50 border-purple-500/50",
			)}
		>
			<div className="flex-shrink-0">
				<PriorityBadge priority={mr.priority} />
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className="font-mono text-sm text-gt-text truncate">
						{mr.id}
					</span>
					{isNext && (
						<span className="text-xs text-purple-400 flex items-center gap-1">
							<ArrowRight size={12} />
							Next to merge
						</span>
					)}
				</div>
				<div className="text-sm text-gt-muted mt-1 flex items-center gap-4 flex-wrap">
					<span className="font-mono truncate max-w-[300px]" title={mr.branch}>
						{mr.branch}
					</span>
					<span className="flex items-center gap-1">
						<Clock size={12} />
						{mr.age}
					</span>
					{mr.worker && <span>by {mr.worker}</span>}
				</div>
				{mr.blocked_by && (
					<div className="text-xs text-yellow-400 mt-1">
						Waiting on: {mr.blocked_by}
					</div>
				)}
			</div>

			<div className="flex-shrink-0">
				<StatusBadge status={mr.status} />
			</div>
		</div>
	);
}

function RigQueueSection({
	rigName,
	queue,
	defaultExpanded = true,
}: {
	rigName: string;
	queue: MergeQueueListResponse;
	defaultExpanded?: boolean;
}) {
	const [expanded, setExpanded] = useState(defaultExpanded);
	const { summary, requests } = queue;
	const hasRequests = requests.length > 0;

	// Find the "next" MR (first ready one)
	const nextMrId = requests.find((r) => r.status === "ready")?.id;

	return (
		<div className="border border-gt-border rounded-lg overflow-hidden">
			<button
				onClick={() => setExpanded(!expanded)}
				className="w-full px-4 py-3 bg-gt-surface flex items-center justify-between hover:bg-gt-hover transition-colors"
			>
				<div className="flex items-center gap-3">
					{expanded ? (
						<ChevronDown size={16} className="text-gt-muted" />
					) : (
						<ChevronRight size={16} className="text-gt-muted" />
					)}
					<span className="font-medium text-gt-text">{rigName}</span>
					<span className="text-sm text-gt-muted">
						{summary.total} in queue
					</span>
				</div>

				<div className="flex items-center gap-3 text-xs">
					{summary.ready > 0 && (
						<span className="text-green-400">
							{summary.ready} ready
						</span>
					)}
					{summary.in_progress > 0 && (
						<span className="text-blue-400">
							{summary.in_progress} in flight
						</span>
					)}
					{summary.blocked > 0 && (
						<span className="text-yellow-400">
							{summary.blocked} blocked
						</span>
					)}
					{!hasRequests && (
						<span className="text-gt-muted">Empty</span>
					)}
				</div>
			</button>

			{expanded && (
				<div className="p-4 space-y-2 bg-gt-bg">
					{hasRequests ? (
						requests.map((mr) => (
							<MergeRequestRow
								key={mr.id}
								mr={mr}
								isNext={mr.id === nextMrId}
							/>
						))
					) : (
						<div className="text-center py-6 text-gt-muted">
							<GitMerge className="mx-auto mb-2 opacity-50" size={24} />
							<p>No merge requests in queue</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export default function MergeQueue() {
	// Get rigs list from status
	const { data: statusData, isLoading: statusLoading } = useQuery({
		queryKey: ["status"],
		queryFn: getStatus,
		refetchInterval: 30_000,
	});

	const rigNames = statusData?.status?.rigs.map((r) => r.name) || [];

	// Get merge queues for all rigs
	const {
		data: queuesData,
		isLoading: queuesLoading,
		error,
		refetch,
		isFetching,
	} = useQuery({
		queryKey: ["merge-queues", rigNames],
		queryFn: () => getAllMergeQueues(rigNames),
		enabled: rigNames.length > 0,
		refetchInterval: 10_000,
	});

	const isLoading = statusLoading || queuesLoading;

	// Calculate totals
	const totals = {
		total: 0,
		ready: 0,
		in_progress: 0,
		blocked: 0,
	};

	if (queuesData) {
		Object.values(queuesData).forEach((q) => {
			totals.total += q.summary.total;
			totals.ready += q.summary.ready;
			totals.in_progress += q.summary.in_progress;
			totals.blocked += q.summary.blocked;
		});
	}

	// Sort rigs: those with items first, then alphabetically
	const sortedRigs = [...rigNames].sort((a, b) => {
		const aCount = queuesData?.[a]?.summary.total || 0;
		const bCount = queuesData?.[b]?.summary.total || 0;
		if (aCount !== bCount) return bCount - aCount;
		return a.localeCompare(b);
	});

	// Only show rigs with items, or first 5 empty ones
	const rigsWithItems = sortedRigs.filter(
		(r) => (queuesData?.[r]?.summary.total || 0) > 0,
	);
	const emptyRigs = sortedRigs.filter(
		(r) => (queuesData?.[r]?.summary.total || 0) === 0,
	);

	return (
		<div className="p-6 space-y-6 overflow-y-auto h-full">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-semibold flex items-center gap-2">
						<GitMerge className="text-purple-400" size={24} />
						Merge Queue
					</h2>
					<p className="text-sm text-gt-muted mt-1">
						Approved PRs queued for merge across all rigs
					</p>
				</div>
				<button
					onClick={() => refetch()}
					disabled={isFetching}
					className="p-2 rounded hover:bg-gt-hover transition-colors"
					title="Refresh"
				>
					<RefreshCw
						size={18}
						className={cn("text-gt-muted", isFetching && "animate-spin")}
					/>
				</button>
			</div>

			{/* Summary Stats */}
			<div className="grid grid-cols-4 gap-4">
				<div className="bg-gt-surface border border-gt-border rounded-lg p-4">
					<div className="text-2xl font-bold text-gt-text">{totals.total}</div>
					<div className="text-sm text-gt-muted">Total Queued</div>
				</div>
				<div className="bg-gt-surface border border-green-500/30 rounded-lg p-4">
					<div className="text-2xl font-bold text-green-400">{totals.ready}</div>
					<div className="text-sm text-gt-muted">Ready to Merge</div>
				</div>
				<div className="bg-gt-surface border border-blue-500/30 rounded-lg p-4">
					<div className="text-2xl font-bold text-blue-400">
						{totals.in_progress}
					</div>
					<div className="text-sm text-gt-muted">In Flight</div>
				</div>
				<div className="bg-gt-surface border border-yellow-500/30 rounded-lg p-4">
					<div className="text-2xl font-bold text-yellow-400">
						{totals.blocked}
					</div>
					<div className="text-sm text-gt-muted">Blocked</div>
				</div>
			</div>

			{/* Loading State */}
			{isLoading && (
				<div className="flex items-center justify-center py-12">
					<RefreshCw className="animate-spin text-gt-muted" size={24} />
				</div>
			)}

			{/* Error State */}
			{error && (
				<div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
					<p className="text-red-400">
						Failed to load merge queues: {(error as Error).message}
					</p>
					<button
						onClick={() => refetch()}
						className="mt-2 text-sm text-red-300 hover:text-red-200"
					>
						Retry
					</button>
				</div>
			)}

			{/* Queues with items */}
			{!isLoading && queuesData && (
				<div className="space-y-4">
					{rigsWithItems.length > 0 && (
						<>
							<h3 className="text-sm font-semibold text-gt-muted uppercase">
								Active Queues
							</h3>
							{rigsWithItems.map((rigName) => (
								<RigQueueSection
									key={rigName}
									rigName={rigName}
									queue={queuesData[rigName]}
									defaultExpanded={true}
								/>
							))}
						</>
					)}

					{/* Empty state */}
					{rigsWithItems.length === 0 && (
						<div className="bg-gt-surface border border-gt-border rounded-lg p-8 text-center">
							<GitMerge className="mx-auto text-gt-muted mb-4" size={48} />
							<h3 className="text-lg font-medium mb-2">All Queues Empty</h3>
							<p className="text-gt-muted max-w-md mx-auto">
								No merge requests are currently queued. Submit a branch with{" "}
								<code className="bg-gt-bg px-1 rounded">gt mq submit</code> to
								add it to the queue.
							</p>
						</div>
					)}

					{/* Collapsed empty rigs */}
					{emptyRigs.length > 0 && rigsWithItems.length > 0 && (
						<details className="group">
							<summary className="cursor-pointer text-sm text-gt-muted hover:text-gt-text transition-colors list-none flex items-center gap-2">
								<ChevronRight
									size={14}
									className="group-open:rotate-90 transition-transform"
								/>
								{emptyRigs.length} empty queues
							</summary>
							<div className="mt-4 space-y-2">
								{emptyRigs.map((rigName) => (
									<RigQueueSection
										key={rigName}
										rigName={rigName}
										queue={queuesData[rigName]}
										defaultExpanded={false}
									/>
								))}
							</div>
						</details>
					)}
				</div>
			)}
		</div>
	);
}
