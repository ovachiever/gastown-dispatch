import { ChevronRight, ChevronDown, Users, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentRuntime, RigStatus } from "@/types/api";
import { useState } from "react";

interface AgentTreeProps {
	globalAgents: AgentRuntime[];
	rigs: RigStatus[];
	selectedAgent: string | null;
	onSelectAgent: (address: string) => void;
	onAddPolecat: (rigName: string) => void;
}

export function AgentTree({
	globalAgents,
	rigs,
	selectedAgent,
	onSelectAgent,
	onAddPolecat,
}: AgentTreeProps) {
	const [expandedRigs, setExpandedRigs] = useState<Set<string>>(
		new Set(rigs.map((r) => r.name)),
	);

	const toggleRig = (rigName: string) => {
		setExpandedRigs((prev) => {
			const next = new Set(prev);
			if (next.has(rigName)) {
				next.delete(rigName);
			} else {
				next.add(rigName);
			}
			return next;
		});
	};

	const getRoleColor = (role: string) => {
		switch (role) {
			case "mayor":
				return "text-purple-400";
			case "deacon":
				return "text-blue-400";
			case "witness":
				return "text-cyan-400";
			case "refinery":
				return "text-amber-400";
			case "polecat":
				return "text-green-400";
			case "crew":
				return "text-pink-400";
			default:
				return "text-gray-400";
		}
	};

	const getStatusColor = (agent: AgentRuntime) => {
		if (!agent.running) return "bg-gray-500";
		if (agent.has_work) return "bg-blue-400";
		return "bg-green-400";
	};

	return (
		<div className="h-full flex flex-col bg-gt-surface border-r border-gt-border">
			<div className="p-4 border-b border-gt-border">
				<h2 className="text-lg font-medium flex items-center gap-2">
					<Users size={20} />
					Agents
				</h2>
			</div>

			<div className="flex-1 overflow-y-auto p-2">
				{/* Global Agents */}
				<div className="mb-4">
					<div className="px-2 py-1 text-xs font-medium text-gt-muted uppercase tracking-wider">
						Global
					</div>
					{globalAgents.map((agent) => (
						<button
							key={agent.address}
							onClick={() => onSelectAgent(agent.address)}
							className={cn(
								"w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gt-bg transition-colors",
								selectedAgent === agent.address && "bg-gt-bg",
							)}
						>
							<div className={cn("w-2 h-2 rounded-full", getStatusColor(agent))} />
							<span className="flex-1 truncate">{agent.name}</span>
							<span className={cn("text-xs", getRoleColor(agent.role))}>
								{agent.role}
							</span>
						</button>
					))}
				</div>

				{/* Rigs */}
				{rigs.map((rig) => {
					const isExpanded = expandedRigs.has(rig.name);
					const rigAgents = rig.agents || [];

					return (
						<div key={rig.name} className="mb-2">
							<button
								onClick={() => toggleRig(rig.name)}
								className="w-full text-left px-2 py-1 text-sm font-medium flex items-center gap-1 hover:bg-gt-bg rounded transition-colors"
							>
								{isExpanded ? (
									<ChevronDown size={16} className="text-gt-muted" />
								) : (
									<ChevronRight size={16} className="text-gt-muted" />
								)}
								<span className="flex-1">{rig.name}</span>
								<span className="text-xs text-gt-muted">
									{rig.polecat_count + (rig.has_witness ? 1 : 0) + (rig.has_refinery ? 1 : 0)}
								</span>
							</button>

							{isExpanded && (
								<div className="ml-4 mt-1">
									{/* Witness */}
									{rig.has_witness && (
										<>
											{rigAgents
												.filter((a) => a.role === "witness")
												.map((agent) => (
													<button
														key={agent.address}
														onClick={() => onSelectAgent(agent.address)}
														className={cn(
															"w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gt-bg transition-colors",
															selectedAgent === agent.address && "bg-gt-bg",
														)}
													>
														<div className={cn("w-2 h-2 rounded-full", getStatusColor(agent))} />
														<span className="flex-1 truncate">{agent.name}</span>
														<span className={cn("text-xs", getRoleColor(agent.role))}>
															witness
														</span>
													</button>
												))}
										</>
									)}

									{/* Refinery */}
									{rig.has_refinery && (
										<>
											{rigAgents
												.filter((a) => a.role === "refinery")
												.map((agent) => (
													<button
														key={agent.address}
														onClick={() => onSelectAgent(agent.address)}
														className={cn(
															"w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gt-bg transition-colors",
															selectedAgent === agent.address && "bg-gt-bg",
														)}
													>
														<div className={cn("w-2 h-2 rounded-full", getStatusColor(agent))} />
														<span className="flex-1 truncate">{agent.name}</span>
														<span className={cn("text-xs", getRoleColor(agent.role))}>
															refinery
														</span>
													</button>
												))}
										</>
									)}

									{/* Polecats */}
									{rigAgents
										.filter((a) => a.role === "polecat")
										.map((agent) => (
											<button
												key={agent.address}
												onClick={() => onSelectAgent(agent.address)}
												className={cn(
													"w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gt-bg transition-colors",
													selectedAgent === agent.address && "bg-gt-bg",
												)}
											>
												<div className={cn("w-2 h-2 rounded-full", getStatusColor(agent))} />
												<span className="flex-1 truncate">{agent.name}</span>
												<span className={cn("text-xs", getRoleColor(agent.role))}>
													polecat
												</span>
											</button>
										))}

									{/* Add Polecat Button */}
									<button
										onClick={() => onAddPolecat(rig.name)}
										className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gt-bg transition-colors text-gt-muted text-sm"
									>
										<Plus size={16} />
										<span>Add Polecat</span>
									</button>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
