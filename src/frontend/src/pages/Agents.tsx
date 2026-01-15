import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, AlertTriangle, Users } from "lucide-react";
import { getStatus, removePolecat, nukePolecat } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AgentTree } from "@/components/AgentTree";
import { AgentDetail } from "@/components/AgentDetail";
import { NudgeModal } from "@/components/NudgeModal";
import { AddPolecatModal } from "@/components/AddPolecatModal";
import type { AgentRuntime } from "@/types/api";

export default function Agents() {
	const [searchParams, setSearchParams] = useSearchParams();
	const selectedAgent = searchParams.get("agent");
	const setSelectedAgent = (address: string | null) => {
		if (address) {
			setSearchParams({ agent: address });
		} else {
			setSearchParams({});
		}
	};
	const [nudgeModal, setNudgeModal] = useState<{ address: string; name: string } | null>(null);
	const [addPolecatModal, setAddPolecatModal] = useState<string | null>(null);
	const queryClient = useQueryClient();

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

	const removeMutation = useMutation({
		mutationFn: ({ rig, name }: { rig: string; name: string }) =>
			removePolecat(rig, name),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["status"] });
			setSelectedAgent(null);
		},
	});

	const nukeMutation = useMutation({
		mutationFn: ({ rig, name }: { rig: string; name: string }) =>
			nukePolecat(rig, name),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["status"] });
			setSelectedAgent(null);
		},
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
	const globalAgents = status.agents || [];
	const rigs = status.rigs || [];

	// Collect all agents
	const allAgents: AgentRuntime[] = [
		...globalAgents,
		...rigs.flatMap((rig) => rig.agents || []),
	];

	const agent = allAgents.find((a) => a.address === selectedAgent);

	const handleNudge = (address: string) => {
		const agent = allAgents.find((a) => a.address === address);
		if (agent) {
			setNudgeModal({ address, name: agent.name });
		}
	};

	const handleTerminal = (address: string) => {
		console.log("Open terminal for:", address);
		// TODO: Implement terminal integration
	};

	const handleRemove = (address: string) => {
		const agent = allAgents.find((a) => a.address === address);
		if (!agent) return;

		// Extract rig name from address (format: rig/polecat/name)
		const parts = address.split("/");
		if (parts.length >= 3) {
			const rigName = parts[0];
			const polecatName = parts[2];
			if (confirm(`Remove polecat ${polecatName} from ${rigName}?`)) {
				removeMutation.mutate({ rig: rigName, name: polecatName });
			}
		}
	};

	const handleNuke = (address: string) => {
		const agent = allAgents.find((a) => a.address === address);
		if (!agent) return;

		// Extract rig name from address
		const parts = address.split("/");
		if (parts.length >= 3) {
			const rigName = parts[0];
			const polecatName = parts[2];
			if (
				confirm(
					`NUKE polecat ${polecatName}? This will forcefully destroy the worktree and branch. This cannot be undone.`,
				)
			) {
				nukeMutation.mutate({ rig: rigName, name: polecatName });
			}
		}
	};

	return (
		<div className="h-screen flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between p-6 border-b border-gt-border bg-gt-bg">
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

			{/* Master-Detail Layout */}
			<div className="flex-1 flex overflow-hidden">
				{allAgents.length === 0 ? (
					<div className="flex-1 flex items-center justify-center">
						<div className="text-center">
							<Users className="mx-auto text-gt-muted mb-4" size={48} />
							<p className="text-gt-muted mb-2">No agents running</p>
							<p className="text-sm text-gt-muted">
								Start Gas Town to bring up the Mayor and Deacon.
							</p>
						</div>
					</div>
				) : (
					<>
						{/* Agent Tree (Master) */}
						<div className="w-80 border-r border-gt-border">
							<AgentTree
								globalAgents={globalAgents}
								rigs={rigs}
								selectedAgent={selectedAgent}
								onSelectAgent={setSelectedAgent}
								onAddPolecat={setAddPolecatModal}
							/>
						</div>

						{/* Agent Detail (Detail) */}
						<div className="flex-1">
							{agent ? (
								<AgentDetail
									agent={agent}
									onNudge={handleNudge}
									onTerminal={handleTerminal}
									onRemove={handleRemove}
									onNuke={handleNuke}
								/>
							) : (
								<div className="h-full flex items-center justify-center">
									<p className="text-gt-muted">
										Select an agent to view details
									</p>
								</div>
							)}
						</div>
					</>
				)}
			</div>

			{/* Modals */}
			{nudgeModal && (
				<NudgeModal
					agentAddress={nudgeModal.address}
					agentName={nudgeModal.name}
					onClose={() => setNudgeModal(null)}
				/>
			)}

			{addPolecatModal && (
				<AddPolecatModal
					rigName={addPolecatModal}
					onClose={() => setAddPolecatModal(null)}
				/>
			)}
		</div>
	);
}
