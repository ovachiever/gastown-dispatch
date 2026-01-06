import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Users, Terminal, MessageSquare, AlertTriangle } from "lucide-react";
import { getStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AgentRuntime, RigStatus } from "@/types/api";

export default function Agents() {
	const {
		data: response,
		isLoading,
		error,
		refetch,
		isFetching,
	} = useQuery({
		queryKey: ["status"],
		queryFn: getStatus,
		refetchInterval: 10_000,
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
					<p className="text-red-400">Failed to load agents: {error.message}</p>
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

	// Handle uninitialized state
	if (!response?.initialized || !response.status) {
		return (
			<div className="p-6">
				<div className="bg-amber-900/20 border border-amber-500 rounded-lg p-6">
					<div className="flex items-center gap-3 mb-3">
						<AlertTriangle className="text-amber-400" size={24} />
						<h2 className="text-lg font-medium text-amber-300">
							Gas Town Not Configured
						</h2>
					</div>
					<p className="text-amber-200/80">
						{response?.error || "Not connected to a Gas Town workspace."}
					</p>
				</div>
			</div>
		);
	}

	const status = response.status;

	// Collect all agents from global + rig-level
	const allAgents: AgentRuntime[] = [
		...(status.agents || []),
		...(status.rigs?.flatMap((rig: RigStatus) => rig.agents || []) || []),
	];

	const globalAgents = status.agents || [];

	// rigAgents used for future features
	void allAgents;

	return (
		<div className="p-6">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-semibold">Agents</h1>
					<p className="text-sm text-gt-muted">
						Monitor and interact with running agents
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
				</div>
			</div>

			{/* Global Agents */}
			<section className="mb-8">
				<h2 className="text-lg font-medium mb-3">Global Agents</h2>
				<p className="text-sm text-gt-muted mb-4">
					Town-wide coordinators that manage cross-project work
				</p>
				<div className="grid grid-cols-2 gap-4">
					{globalAgents.map((agent) => (
						<AgentCard key={agent.address} agent={agent} />
					))}
				</div>
			</section>

			{/* Rig Agents by Rig */}
			{status?.rigs?.map((rig) => (
				<section key={rig.name} className="mb-8">
					<h2 className="text-lg font-medium mb-3">{rig.name}</h2>
					<div className="grid grid-cols-2 gap-4">
						{rig.agents?.map((agent) => (
							<AgentCard key={agent.address} agent={agent} />
						))}
						{/* Show polecat placeholders if no agent info */}
						{!rig.agents?.length && rig.polecats.length > 0 && (
							<>
								{rig.polecats.map((name) => (
									<div
										key={name}
										className="bg-gt-surface border border-gt-border rounded-lg p-4"
									>
										<div className="flex items-center gap-3">
											<div className="w-2 h-2 rounded-full bg-green-400" />
											<div>
												<span className="font-medium">{name}</span>
												<span className="ml-2 text-xs text-gt-muted bg-gt-bg px-2 py-0.5 rounded">
													polecat
												</span>
											</div>
										</div>
									</div>
								))}
							</>
						)}
					</div>
					{!rig.agents?.length && rig.polecats.length === 0 && (
						<div className="bg-gt-surface border border-gt-border rounded-lg p-6 text-center">
							<p className="text-gt-muted">No active agents in this rig</p>
						</div>
					)}
				</section>
			))}

			{allAgents.length === 0 && (
				<div className="bg-gt-surface border border-gt-border rounded-lg p-8 text-center">
					<Users className="mx-auto text-gt-muted mb-4" size={48} />
					<p className="text-gt-muted mb-2">No agents running</p>
					<p className="text-sm text-gt-muted">
						Start Gas Town to bring up the Mayor and Deacon.
					</p>
				</div>
			)}
		</div>
	);
}

function AgentCard({
	agent,
}: {
	agent: {
		name: string;
		address: string;
		role: string;
		running: boolean;
		has_work: boolean;
		work_title?: string;
		state?: string;
		unread_mail: number;
		first_subject?: string;
	};
}) {
	const getRoleColor = (role: string) => {
		switch (role) {
			case "mayor":
				return "bg-purple-900/50 text-purple-300";
			case "deacon":
				return "bg-blue-900/50 text-blue-300";
			case "witness":
				return "bg-cyan-900/50 text-cyan-300";
			case "refinery":
				return "bg-amber-900/50 text-amber-300";
			case "polecat":
				return "bg-green-900/50 text-green-300";
			case "crew":
				return "bg-pink-900/50 text-pink-300";
			default:
				return "bg-gray-800 text-gray-300";
		}
	};

	return (
		<div className="bg-gt-surface border border-gt-border rounded-lg p-4">
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<div
						className={cn(
							"w-2 h-2 rounded-full",
							agent.running ? "bg-green-400" : "bg-gray-500",
						)}
					/>
					<span className="font-medium">{agent.name}</span>
					<span
						className={cn(
							"text-xs px-2 py-0.5 rounded",
							getRoleColor(agent.role),
						)}
					>
						{agent.role}
					</span>
				</div>
				{agent.state && (
					<span className="text-xs text-gt-muted">{agent.state}</span>
				)}
			</div>

			<p className="text-sm text-gt-muted mb-3">{agent.address}</p>

			{agent.has_work && agent.work_title && (
				<p className="text-sm mb-3 truncate">
					<span className="text-gt-muted">📌</span> {agent.work_title}
				</p>
			)}

			{agent.unread_mail > 0 && (
				<p className="text-sm text-amber-400 mb-3">
					📬 {agent.unread_mail} unread
					{agent.first_subject && `: ${agent.first_subject}`}
				</p>
			)}

			<div className="flex gap-2">
				<button
					className="flex items-center gap-1 px-2 py-1 text-xs bg-gt-bg rounded hover:bg-gt-border transition-colors"
					title="Open terminal"
				>
					<Terminal size={12} />
					Terminal
				</button>
				<button
					className="flex items-center gap-1 px-2 py-1 text-xs bg-gt-bg rounded hover:bg-gt-border transition-colors"
					title="Send message"
				>
					<MessageSquare size={12} />
					Nudge
				</button>
			</div>
		</div>
	);
}
