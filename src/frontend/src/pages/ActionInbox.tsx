import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	RefreshCw,
	Mail,
	AlertTriangle,
	Circle,
	Clock,
	ChevronRight,
	Archive,
	Eye,
	EyeOff,
	MessageSquare,
	Zap,
	Send,
	Reply,
	Loader2,
	Inbox,
} from "lucide-react";
import {
	getMailInbox,
	getMailMessage,
	getMailThread,
	markMailRead,
	markMailUnread,
	archiveMail,
} from "@/lib/api";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { MailMessage, MailPriority, MailType } from "@/types/api";

// Priority badge component
function PriorityBadge({ priority }: { priority?: MailPriority }) {
	if (!priority) return null;
	const config: Record<
		MailPriority,
		{ label: string; className: string; icon: typeof AlertTriangle }
	> = {
		urgent: {
			label: "Urgent",
			className: "bg-red-900/30 text-red-300",
			icon: AlertTriangle,
		},
		high: {
			label: "High",
			className: "bg-orange-900/30 text-orange-300",
			icon: Zap,
		},
		normal: {
			label: "Normal",
			className: "bg-blue-900/30 text-blue-300",
			icon: Circle,
		},
		low: {
			label: "Low",
			className: "bg-gray-900/30 text-gray-300",
			icon: Circle,
		},
		backlog: {
			label: "Backlog",
			className: "bg-gray-900/30 text-gray-400",
			icon: Circle,
		},
	};

	const { label, className, icon: Icon } = config[priority];

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
				className,
			)}
		>
			<Icon size={12} />
			{label}
		</span>
	);
}

// Mail type icon
function MailTypeIcon({ type }: { type?: MailType }) {
	switch (type) {
		case "task":
			return <Zap size={14} className="text-amber-400" />;
		case "scavenge":
			return <Send size={14} className="text-purple-400" />;
		case "notification":
			return <Mail size={14} className="text-blue-400" />;
		case "reply":
			return <Reply size={14} className="text-green-400" />;
		default:
			return <Mail size={14} className="text-gt-muted" />;
	}
}

// Mail card for the list
function MailCard({
	message,
	isSelected,
	onClick,
}: {
	message: MailMessage;
	isSelected: boolean;
	onClick: () => void;
}) {
	const isActionable = message.type === "task" || message.type === "scavenge";
	const isEscalation =
		message.priority === "urgent" || message.priority === "high";

	return (
		<button
			onClick={onClick}
			className={cn(
				"w-full text-left p-3 rounded-lg border transition-all",
				isSelected
					? "bg-gt-accent/10 border-gt-accent"
					: "bg-gt-surface border-gt-border hover:border-gt-accent/50",
				!message.read && "border-l-2 border-l-gt-accent",
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-2 min-w-0">
					<MailTypeIcon type={message.type} />
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<span
								className={cn(
									"font-medium text-sm truncate",
									!message.read ? "text-gt-text" : "text-gt-muted",
								)}
							>
								{message.subject}
							</span>
							{!message.read && (
								<span className="w-2 h-2 rounded-full bg-gt-accent flex-shrink-0" />
							)}
						</div>
						<div className="text-xs text-gt-muted truncate">
							From: {message.from}
						</div>
					</div>
				</div>
				<ChevronRight
					size={16}
					className={cn(
						"flex-shrink-0",
						isSelected ? "text-gt-accent" : "text-gt-muted",
					)}
				/>
			</div>

			<div className="flex items-center gap-2 mt-2">
				{isEscalation && <PriorityBadge priority={message.priority} />}
				{isActionable && (
					<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-900/30 text-amber-300">
						Action Required
					</span>
				)}
				<span className="text-xs text-gt-muted ml-auto">
					{formatRelativeTime(message.timestamp)}
				</span>
			</div>
		</button>
	);
}

// Message detail panel
function MessageDetail({
	messageId,
	onClose,
}: {
	messageId: string;
	onClose: () => void;
}) {
	const queryClient = useQueryClient();

	const { data: message, isLoading } = useQuery({
		queryKey: ["mail", "message", messageId],
		queryFn: () => getMailMessage(messageId),
	});

	const { data: thread } = useQuery({
		queryKey: ["mail", "thread", message?.thread_id],
		queryFn: () => getMailThread(message!.thread_id!),
		enabled: !!message?.thread_id,
	});

	const markReadMutation = useMutation({
		mutationFn: () => markMailRead(messageId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["mail"] });
		},
	});

	const markUnreadMutation = useMutation({
		mutationFn: () => markMailUnread(messageId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["mail"] });
		},
	});

	const archiveMutation = useMutation({
		mutationFn: () => archiveMail(messageId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["mail"] });
			onClose();
		},
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<Loader2 className="animate-spin text-gt-muted" size={24} />
			</div>
		);
	}

	if (!message) {
		return (
			<div className="flex items-center justify-center h-full text-gt-muted">
				Message not found
			</div>
		);
	}

	const isActionable = message.type === "task" || message.type === "scavenge";
	const isEscalation =
		message.priority === "urgent" || message.priority === "high";

	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="p-4 border-b border-gt-border">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 flex-1">
						<h2 className="text-lg font-semibold text-gt-text truncate">
							{message.subject}
						</h2>
						<div className="flex items-center gap-2 mt-1 text-sm text-gt-muted">
							<span>From: {message.from}</span>
							<span>•</span>
							<span>To: {message.to}</span>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{message.read ? (
							<button
								onClick={() => markUnreadMutation.mutate()}
								disabled={markUnreadMutation.isPending}
								className="p-2 rounded hover:bg-gt-surface transition-colors"
								title="Mark as unread"
							>
								<EyeOff size={16} className="text-gt-muted" />
							</button>
						) : (
							<button
								onClick={() => markReadMutation.mutate()}
								disabled={markReadMutation.isPending}
								className="p-2 rounded hover:bg-gt-surface transition-colors"
								title="Mark as read"
							>
								<Eye size={16} className="text-gt-muted" />
							</button>
						)}
						<button
							onClick={() => archiveMutation.mutate()}
							disabled={archiveMutation.isPending}
							className="p-2 rounded hover:bg-gt-surface transition-colors"
							title="Archive"
						>
							<Archive size={16} className="text-gt-muted" />
						</button>
					</div>
				</div>

				<div className="flex items-center gap-2 mt-3">
					<PriorityBadge priority={message.priority} />
					<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gt-surface text-gt-muted">
						<MailTypeIcon type={message.type} />
						{message.type}
					</span>
					{isActionable && (
						<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-900/30 text-amber-300">
							<Zap size={12} />
							Action Required
						</span>
					)}
					{isEscalation && (
						<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-300">
							<AlertTriangle size={12} />
							Escalation
						</span>
					)}
				</div>

				<div className="text-xs text-gt-muted mt-2">
					<Clock size={12} className="inline mr-1" />
					{formatRelativeTime(message.timestamp)}
				</div>
			</div>

			{/* Body */}
			<div className="flex-1 overflow-auto p-4">
				<div className="prose prose-invert prose-sm max-w-none">
					<div className="whitespace-pre-wrap text-gt-text">{message.body}</div>
				</div>

				{/* Thread history */}
				{thread && thread.length > 1 && (
					<div className="mt-6 pt-4 border-t border-gt-border">
						<h3 className="text-sm font-medium text-gt-muted mb-3 flex items-center gap-2">
							<MessageSquare size={14} />
							Thread ({thread.length} messages)
						</h3>
						<div className="space-y-3">
							{thread
								.filter((m) => m.id !== message.id)
								.map((threadMessage) => (
									<div
										key={threadMessage.id}
										className="p-3 rounded-lg bg-gt-surface border border-gt-border"
									>
										<div className="flex items-center justify-between text-xs text-gt-muted mb-2">
											<span>{threadMessage.from}</span>
											<span>{formatRelativeTime(threadMessage.timestamp)}</span>
										</div>
										<div className="text-sm text-gt-text whitespace-pre-wrap">
											{threadMessage.body}
										</div>
									</div>
								))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

// Empty state
function EmptyState({ filter }: { filter: string }) {
	return (
		<div className="flex flex-col items-center justify-center h-full text-gt-muted">
			<Inbox size={48} className="mb-4 opacity-50" />
			<p className="text-lg font-medium">No messages</p>
			<p className="text-sm">
				{filter === "actionable"
					? "No actionable items in your inbox"
					: filter === "unread"
						? "All caught up!"
						: "Your inbox is empty"}
			</p>
		</div>
	);
}

// Main component
export default function ActionInbox() {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [filter, setFilter] = useState<"all" | "actionable" | "unread">(
		"actionable",
	);

	const {
		data: inbox,
		isLoading,
		refetch,
		isRefetching,
	} = useQuery({
		queryKey: ["mail", "inbox", filter === "unread" ? { unread: true } : {}],
		queryFn: () =>
			getMailInbox(filter === "unread" ? { unread: true } : undefined),
		refetchInterval: 30000, // Poll every 30 seconds
	});

	const messages = inbox?.messages;

	// Filter messages based on selected filter
	const filteredMessages = messages?.filter((m: MailMessage) => {
		if (filter === "actionable") {
			// Show only actionable types (task, scavenge) or escalations (urgent, high priority)
			return (
				m.type === "task" ||
				m.type === "scavenge" ||
				m.priority === "urgent" ||
				m.priority === "high"
			);
		}
		return true;
	});

	const unreadCount = messages?.filter((m: MailMessage) => !m.read).length ?? 0;
	const actionableCount =
		messages?.filter(
			(m: MailMessage) =>
				m.type === "task" ||
				m.type === "scavenge" ||
				m.priority === "urgent" ||
				m.priority === "high",
		).length ?? 0;

	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-gt-border">
				<div className="flex items-center gap-3">
					<h1 className="text-xl font-semibold flex items-center gap-2">
						<Mail size={24} className="text-gt-accent" />
						Action Inbox
					</h1>
					{unreadCount > 0 && (
						<span className="px-2 py-0.5 text-xs rounded-full bg-gt-accent text-black font-medium">
							{unreadCount} unread
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					{/* Filter buttons */}
					<div className="flex items-center rounded-lg border border-gt-border bg-gt-surface p-1">
						<button
							onClick={() => setFilter("actionable")}
							className={cn(
								"px-3 py-1 text-sm rounded-md transition-colors",
								filter === "actionable"
									? "bg-gt-accent text-black font-medium"
									: "text-gt-muted hover:text-gt-text",
							)}
						>
							Actionable ({actionableCount})
						</button>
						<button
							onClick={() => setFilter("unread")}
							className={cn(
								"px-3 py-1 text-sm rounded-md transition-colors",
								filter === "unread"
									? "bg-gt-accent text-black font-medium"
									: "text-gt-muted hover:text-gt-text",
							)}
						>
							Unread ({unreadCount})
						</button>
						<button
							onClick={() => setFilter("all")}
							className={cn(
								"px-3 py-1 text-sm rounded-md transition-colors",
								filter === "all"
									? "bg-gt-accent text-black font-medium"
									: "text-gt-muted hover:text-gt-text",
							)}
						>
							All
						</button>
					</div>
					<button
						onClick={() => refetch()}
						disabled={isRefetching}
						className="p-2 rounded hover:bg-gt-surface transition-colors"
						title="Refresh"
					>
						<RefreshCw
							size={18}
							className={cn("text-gt-muted", isRefetching && "animate-spin")}
						/>
					</button>
				</div>
			</div>

			{/* Master-detail layout */}
			<div className="flex-1 flex min-h-0">
				{/* List panel */}
				<div className="w-80 flex-shrink-0 border-r border-gt-border overflow-auto p-3 space-y-2">
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="animate-spin text-gt-muted" size={24} />
						</div>
					) : filteredMessages && filteredMessages.length > 0 ? (
						filteredMessages.map((message: MailMessage) => (
							<MailCard
								key={message.id}
								message={message}
								isSelected={selectedId === message.id}
								onClick={() => setSelectedId(message.id)}
							/>
						))
					) : (
						<EmptyState filter={filter} />
					)}
				</div>

				{/* Detail panel */}
				<div className="flex-1 min-w-0 bg-gt-bg/30">
					{selectedId ? (
						<MessageDetail
							messageId={selectedId}
							onClose={() => setSelectedId(null)}
						/>
					) : (
						<div className="flex flex-col items-center justify-center h-full text-gt-muted">
							<Mail size={48} className="mb-4 opacity-50" />
							<p className="text-lg font-medium">Select a message</p>
							<p className="text-sm">Choose a message from the list to view</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
