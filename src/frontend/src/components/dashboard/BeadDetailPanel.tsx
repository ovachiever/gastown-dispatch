import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	X,
	RefreshCw,
	Circle,
	Play,
	CheckCircle2,
	Clock,
	User,
	Tag,
	Link2,
	LinkIcon,
	Plus,
	MessageSquare,
	Send,
	Edit2,
	ChevronDown,
	ChevronRight,
	Bug,
	Lightbulb,
	CheckSquare,
	Layers,
	Wrench,
	Truck,
	Bot,
	GitMerge,
} from "lucide-react";
import {
	getBeadDetail,
	addBeadComment,
	addBeadDependency,
	removeBeadDependency,
	updateBead,
	updateBeadStatus,
	closeBead,
} from "@/lib/api";
import { cn, formatDate, formatRelativeTime, getPriorityLabel, getPriorityColor } from "@/lib/utils";
import type { BeadDetail, BeadDependency, BeadComment } from "@/types/api";

interface BeadDetailPanelProps {
	beadId: string;
	onClose: () => void;
	initialData?: BeadDetail;
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
	const getStatusStyles = () => {
		switch (status) {
			case "closed":
				return "bg-green-900/30 text-green-300";
			case "in_progress":
			case "hooked":
				return "bg-amber-900/30 text-amber-300";
			default:
				return "bg-blue-900/30 text-blue-300";
		}
	};

	const getStatusIcon = () => {
		switch (status) {
			case "closed":
				return <CheckCircle2 size={12} />;
			case "in_progress":
			case "hooked":
				return <Play size={12} />;
			default:
				return <Circle size={12} />;
		}
	};

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
				getStatusStyles()
			)}
		>
			{getStatusIcon()}
			{status.replace("_", " ")}
		</span>
	);
}

// Type badge with icon
function TypeBadge({ type }: { type: string }) {
	const getTypeIcon = () => {
		switch (type) {
			case "bug":
				return <Bug size={12} />;
			case "feature":
				return <Lightbulb size={12} />;
			case "task":
				return <CheckSquare size={12} />;
			case "epic":
				return <Layers size={12} />;
			case "chore":
				return <Wrench size={12} />;
			case "convoy":
				return <Truck size={12} />;
			case "agent":
				return <Bot size={12} />;
			case "merge-request":
				return <GitMerge size={12} />;
			default:
				return <Circle size={12} />;
		}
	};

	return (
		<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300">
			{getTypeIcon()}
			{type}
		</span>
	);
}

// Priority dropdown
function PriorityBadge({
	priority,
	editable,
	onUpdate,
}: {
	priority: number;
	editable?: boolean;
	onUpdate?: (priority: number) => void;
}) {
	const [isOpen, setIsOpen] = useState(false);

	const priorities = [0, 1, 2, 3, 4];

	return (
		<div className="relative">
			<button
				onClick={() => editable && setIsOpen(!isOpen)}
				className={cn(
					"inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
					getPriorityColor(priority),
					"bg-slate-800",
					editable && "cursor-pointer hover:bg-slate-700"
				)}
			>
				P{priority} - {getPriorityLabel(priority)}
				{editable && <ChevronDown size={12} />}
			</button>

			{isOpen && (
				<div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded shadow-lg z-10">
					{priorities.map((p) => (
						<button
							key={p}
							onClick={() => {
								onUpdate?.(p);
								setIsOpen(false);
							}}
							className={cn(
								"block w-full px-3 py-1.5 text-left text-xs hover:bg-slate-700",
								getPriorityColor(p)
							)}
						>
							P{p} - {getPriorityLabel(p)}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

// Dependency item component
function DependencyItem({
	dep,
	onRemove,
	onNavigate,
}: {
	dep: BeadDependency;
	onRemove?: () => void;
	onNavigate?: (id: string) => void;
}) {
	return (
		<div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-slate-800/50 group">
			<div className="flex items-center gap-2 min-w-0">
				<StatusBadge status={dep.status} />
				<button
					onClick={() => onNavigate?.(dep.id)}
					className="text-sm text-slate-300 hover:text-blue-400 truncate"
				>
					{dep.id}
				</button>
				<span className="text-xs text-slate-500 truncate hidden sm:inline">
					{dep.title}
				</span>
			</div>
			{onRemove && (
				<button
					onClick={onRemove}
					className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400"
				>
					<X size={14} />
				</button>
			)}
		</div>
	);
}

// Comments list component
function CommentsList({ comments }: { comments: BeadComment[] }) {
	if (!comments || comments.length === 0) {
		return (
			<div className="text-center py-4 text-slate-500 text-sm">
				No comments yet
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{comments.map((comment) => (
				<div key={comment.id} className="bg-slate-800/50 rounded p-3">
					<div className="flex items-center gap-2 mb-1">
						<User size={12} className="text-slate-500" />
						<span className="text-xs font-medium text-slate-300">
							{comment.author}
						</span>
						<span className="text-xs text-slate-500">
							{formatRelativeTime(comment.created_at)}
						</span>
					</div>
					<p className="text-sm text-slate-300 whitespace-pre-wrap">
						{comment.content}
					</p>
				</div>
			))}
		</div>
	);
}

// Add comment form
function AddCommentForm({
	onSubmit,
	isSubmitting,
}: {
	onSubmit: (content: string) => void;
	isSubmitting: boolean;
}) {
	const [content, setContent] = useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (content.trim()) {
			onSubmit(content.trim());
			setContent("");
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex gap-2">
			<input
				type="text"
				value={content}
				onChange={(e) => setContent(e.target.value)}
				placeholder="Add a comment..."
				className="flex-1 px-3 py-2 text-sm rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none text-slate-200"
				disabled={isSubmitting}
			/>
			<button
				type="submit"
				disabled={!content.trim() || isSubmitting}
				className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{isSubmitting ? (
					<RefreshCw size={14} className="animate-spin" />
				) : (
					<Send size={14} />
				)}
			</button>
		</form>
	);
}

// Add dependency form
function AddDependencyForm({
	onSubmit,
	isSubmitting,
	placeholder,
}: {
	onSubmit: (id: string) => void;
	isSubmitting: boolean;
	placeholder: string;
}) {
	const [id, setId] = useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (id.trim()) {
			onSubmit(id.trim());
			setId("");
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex gap-2">
			<input
				type="text"
				value={id}
				onChange={(e) => setId(e.target.value)}
				placeholder={placeholder}
				className="flex-1 px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none text-slate-200"
				disabled={isSubmitting}
			/>
			<button
				type="submit"
				disabled={!id.trim() || isSubmitting}
				className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs transition-colors disabled:opacity-50"
			>
				{isSubmitting ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
			</button>
		</form>
	);
}

// Collapsible section component
function Section({
	title,
	icon: Icon,
	children,
	defaultOpen = true,
	count,
}: {
	title: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	children: React.ReactNode;
	defaultOpen?: boolean;
	count?: number;
}) {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	return (
		<div className="border border-slate-700 rounded-lg overflow-hidden">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/50 hover:bg-slate-800 text-left"
			>
				<div className="flex items-center gap-2">
					<Icon size={14} className="text-slate-400" />
					<span className="text-sm font-medium text-slate-200">{title}</span>
					{count !== undefined && (
						<span className="text-xs text-slate-500">({count})</span>
					)}
				</div>
				{isOpen ? (
					<ChevronDown size={14} className="text-slate-500" />
				) : (
					<ChevronRight size={14} className="text-slate-500" />
				)}
			</button>
			{isOpen && <div className="p-3">{children}</div>}
		</div>
	);
}

export function BeadDetailPanel({
	beadId,
	onClose,
	initialData,
}: BeadDetailPanelProps) {
	const [showAddBlockedBy, setShowAddBlockedBy] = useState(false);
	const queryClient = useQueryClient();

	const {
		data: detail,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["bead-detail", beadId],
		queryFn: () => getBeadDetail(beadId),
		initialData,
		staleTime: 0,
		refetchInterval: 10_000,
	});

	const addCommentMutation = useMutation({
		mutationFn: (content: string) => addBeadComment(beadId, content),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["bead-detail", beadId] });
		},
	});

	const addDepMutation = useMutation({
		mutationFn: (dependsOnId: string) => addBeadDependency(beadId, dependsOnId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["bead-detail", beadId] });
			setShowAddBlockedBy(false);
		},
	});

	const removeDepMutation = useMutation({
		mutationFn: (dependsOnId: string) =>
			removeBeadDependency(beadId, dependsOnId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["bead-detail", beadId] });
		},
	});

	const updatePriorityMutation = useMutation({
		mutationFn: (priority: number) => updateBead(beadId, { priority }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["bead-detail", beadId] });
			queryClient.invalidateQueries({ queryKey: ["beads"] });
		},
	});

	const updateStatusMutation = useMutation({
		mutationFn: (status: string) => updateBeadStatus(beadId, status),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["bead-detail", beadId] });
			queryClient.invalidateQueries({ queryKey: ["beads"] });
		},
	});

	const closeMutation = useMutation({
		mutationFn: (reason?: string) => closeBead(beadId, reason),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["bead-detail", beadId] });
			queryClient.invalidateQueries({ queryKey: ["beads"] });
		},
	});

	const handleNavigateToBead = (id: string) => {
		// For now, just close and let parent handle navigation
		// Could emit an event or callback here
		console.log("Navigate to:", id);
	};

	return (
		<div
			className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
				{/* Header */}
				<div className="flex items-start justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-1">
							<code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
								{beadId}
							</code>
							{detail && (
								<>
									<StatusBadge status={detail.status} />
									<TypeBadge type={detail.type} />
									<PriorityBadge
										priority={detail.priority}
										editable={detail.status !== "closed"}
										onUpdate={(p) => updatePriorityMutation.mutate(p)}
									/>
								</>
							)}
						</div>
						<h2 className="font-semibold text-lg text-slate-100 truncate">
							{detail?.title || beadId}
						</h2>
					</div>
					<div className="flex items-center gap-2 ml-4">
						{detail?.status !== "closed" && (
							<>
								{detail?.status === "open" && (
									<button
										onClick={() => updateStatusMutation.mutate("in_progress")}
										disabled={updateStatusMutation.isPending}
										className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors disabled:opacity-50"
									>
										<Play size={12} />
										Start
									</button>
								)}
								<button
									onClick={() => closeMutation.mutate()}
									disabled={closeMutation.isPending}
									className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-600 hover:bg-green-500 text-white font-medium transition-colors disabled:opacity-50"
								>
									<CheckCircle2 size={12} />
									Close
								</button>
							</>
						)}
						<button
							onClick={onClose}
							className="p-1.5 rounded hover:bg-slate-800 transition-colors"
						>
							<X size={16} className="text-slate-400 hover:text-slate-200" />
						</button>
					</div>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-auto p-4 space-y-4">
					{isLoading ? (
						<div className="flex items-center justify-center h-32">
							<RefreshCw className="animate-spin text-slate-500" size={24} />
						</div>
					) : error || !detail ? (
						<div className="p-4 bg-red-900/20 border border-red-500 rounded-lg">
							<p className="text-red-400 text-sm">
								Failed to load bead details
							</p>
						</div>
					) : (
						<>
							{/* Description */}
							{detail.description && (
								<Section title="Description" icon={Edit2} defaultOpen={true}>
									<div className="prose prose-sm prose-invert max-w-none">
										<pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans bg-transparent p-0 m-0">
											{detail.description}
										</pre>
									</div>
								</Section>
							)}

							{/* Metadata Grid */}
							<div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
								<div className="bg-slate-800/50 rounded p-2">
									<div className="flex items-center gap-1 text-slate-500 mb-1">
										<Clock size={12} />
										<span className="text-xs">Created</span>
									</div>
									<p className="text-slate-300 text-xs">
										{formatDate(detail.created_at)}
									</p>
								</div>

								{detail.updated_at && (
									<div className="bg-slate-800/50 rounded p-2">
										<div className="flex items-center gap-1 text-slate-500 mb-1">
											<Clock size={12} />
											<span className="text-xs">Updated</span>
										</div>
										<p className="text-slate-300 text-xs">
											{formatRelativeTime(detail.updated_at)}
										</p>
									</div>
								)}

								{detail.assignee && (
									<div className="bg-slate-800/50 rounded p-2">
										<div className="flex items-center gap-1 text-slate-500 mb-1">
											<User size={12} />
											<span className="text-xs">Assignee</span>
										</div>
										<p className="text-slate-300 text-xs truncate">
											{detail.assignee}
										</p>
									</div>
								)}

								{detail.created_by && (
									<div className="bg-slate-800/50 rounded p-2">
										<div className="flex items-center gap-1 text-slate-500 mb-1">
											<User size={12} />
											<span className="text-xs">Created by</span>
										</div>
										<p className="text-slate-300 text-xs">{detail.created_by}</p>
									</div>
								)}

								{detail.parent && (
									<div className="bg-slate-800/50 rounded p-2">
										<div className="flex items-center gap-1 text-slate-500 mb-1">
											<Layers size={12} />
											<span className="text-xs">Parent</span>
										</div>
										<button
											onClick={() => handleNavigateToBead(detail.parent!)}
											className="text-blue-400 hover:text-blue-300 text-xs"
										>
											{detail.parent}
										</button>
									</div>
								)}
							</div>

							{/* Labels */}
							{detail.labels && detail.labels.length > 0 && (
								<div className="flex items-center gap-2 flex-wrap">
									<Tag size={12} className="text-slate-500" />
									{detail.labels.map((label) => (
										<span
											key={label}
											className="px-2 py-0.5 text-xs rounded-full bg-slate-700 text-slate-300"
										>
											{label}
										</span>
									))}
								</div>
							)}

							{/* Dependencies - Blocked By */}
							<Section
								title="Blocked By"
								icon={LinkIcon}
								defaultOpen={true}
								count={detail.dependencies?.length || 0}
							>
								{detail.dependencies && detail.dependencies.length > 0 ? (
									<div className="space-y-1">
										{detail.dependencies.map((dep) => (
											<DependencyItem
												key={dep.id}
												dep={dep}
																								onRemove={() => removeDepMutation.mutate(dep.id)}
												onNavigate={handleNavigateToBead}
											/>
										))}
									</div>
								) : (
									<p className="text-xs text-slate-500">No blocking dependencies</p>
								)}

								{detail.status !== "closed" && (
									<div className="mt-2">
										{showAddBlockedBy ? (
											<AddDependencyForm
												onSubmit={(id) => addDepMutation.mutate(id)}
												isSubmitting={addDepMutation.isPending}
												placeholder="Enter bead ID this is blocked by..."
											/>
										) : (
											<button
												onClick={() => setShowAddBlockedBy(true)}
												className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300"
											>
												<Plus size={12} />
												Add dependency
											</button>
										)}
									</div>
								)}
							</Section>

							{/* Dependencies - Blocks */}
							<Section
								title="Blocks"
								icon={Link2}
								defaultOpen={true}
								count={detail.dependents?.length || 0}
							>
								{detail.dependents && detail.dependents.length > 0 ? (
									<div className="space-y-1">
										{detail.dependents.map((dep) => (
											<DependencyItem
												key={dep.id}
												dep={dep}
																								onNavigate={handleNavigateToBead}
											/>
										))}
									</div>
								) : (
									<p className="text-xs text-slate-500">
										This bead doesn't block any other beads
									</p>
								)}
							</Section>

							{/* Comments */}
							<Section
								title="Comments"
								icon={MessageSquare}
								defaultOpen={true}
								count={detail.comments?.length || 0}
							>
								<CommentsList comments={detail.comments || []} />
								<div className="mt-3">
									<AddCommentForm
										onSubmit={(content) => addCommentMutation.mutate(content)}
										isSubmitting={addCommentMutation.isPending}
									/>
								</div>
							</Section>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
