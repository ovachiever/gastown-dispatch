import {
	ChevronRight,
	Users,
	Plus,
	Search,
	Mail,
	Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentRuntime, RigStatus } from "@/types/api";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";

interface AgentTreeProps {
	globalAgents: AgentRuntime[];
	rigs: RigStatus[];
	selectedAgent: string | null;
	onSelectAgent: (address: string) => void;
	onAddPolecat: (rigName: string) => void;
}

// Build a flat list of navigable items for keyboard navigation
interface TreeItem {
	type: "agent" | "rig" | "add-polecat";
	id: string;
	agent?: AgentRuntime;
	rigName?: string;
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
	const [searchQuery, setSearchQuery] = useState("");
	const [focusedIndex, setFocusedIndex] = useState(-1);
	const containerRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	const toggleRig = useCallback((rigName: string) => {
		setExpandedRigs((prev) => {
			const next = new Set(prev);
			if (next.has(rigName)) {
				next.delete(rigName);
			} else {
				next.add(rigName);
			}
			return next;
		});
	}, []);

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

	const getRoleBgColor = (role: string) => {
		switch (role) {
			case "mayor":
				return "bg-purple-900/30";
			case "deacon":
				return "bg-blue-900/30";
			case "witness":
				return "bg-cyan-900/30";
			case "refinery":
				return "bg-amber-900/30";
			case "polecat":
				return "bg-green-900/30";
			case "crew":
				return "bg-pink-900/30";
			default:
				return "bg-gray-800/30";
		}
	};

	const getStatusColor = (agent: AgentRuntime) => {
		if (!agent.running) return "bg-gray-500";
		if (agent.has_work) return "bg-blue-400 animate-pulse";
		return "bg-green-400";
	};

	// Filter agents based on search query
	const filterAgent = useCallback(
		(agent: AgentRuntime) => {
			if (!searchQuery) return true;
			const query = searchQuery.toLowerCase();
			return (
				agent.name.toLowerCase().includes(query) ||
				agent.role.toLowerCase().includes(query) ||
				agent.address.toLowerCase().includes(query)
			);
		},
		[searchQuery],
	);

	// Build flat list for keyboard navigation
	const flatItems = useMemo(() => {
		const items: TreeItem[] = [];

		// Global agents
		globalAgents.filter(filterAgent).forEach((agent) => {
			items.push({ type: "agent", id: agent.address, agent });
		});

		// Rig agents
		rigs.forEach((rig) => {
			const rigAgents = (rig.agents || []).filter(filterAgent);
			const hasMatchingAgents = rigAgents.length > 0;
			const rigMatchesSearch =
				!searchQuery || rig.name.toLowerCase().includes(searchQuery.toLowerCase());

			if (hasMatchingAgents || rigMatchesSearch) {
				items.push({ type: "rig", id: `rig:${rig.name}`, rigName: rig.name });

				if (expandedRigs.has(rig.name)) {
					// Add agents in order: witness, refinery, polecats, crews
					["witness", "refinery", "polecat", "crew"].forEach((role) => {
						rigAgents
							.filter((a) => a.role === role)
							.forEach((agent) => {
								items.push({ type: "agent", id: agent.address, agent });
							});
					});

					items.push({
						type: "add-polecat",
						id: `add:${rig.name}`,
						rigName: rig.name,
					});
				}
			}
		});

		return items;
	}, [globalAgents, rigs, expandedRigs, filterAgent, searchQuery]);

	// Keyboard navigation handler
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			const currentIndex = focusedIndex;

			switch (e.key) {
				case "ArrowDown":
					e.preventDefault();
					setFocusedIndex((prev) =>
						prev < flatItems.length - 1 ? prev + 1 : prev,
					);
					break;
				case "ArrowUp":
					e.preventDefault();
					setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
					break;
				case "ArrowRight": {
					e.preventDefault();
					const item = flatItems[currentIndex];
					if (item?.type === "rig" && item.rigName) {
						setExpandedRigs((prev) => new Set([...prev, item.rigName!]));
					}
					break;
				}
				case "ArrowLeft": {
					e.preventDefault();
					const item = flatItems[currentIndex];
					if (item?.type === "rig" && item.rigName) {
						setExpandedRigs((prev) => {
							const next = new Set(prev);
							next.delete(item.rigName!);
							return next;
						});
					}
					break;
				}
				case "Enter":
				case " ": {
					e.preventDefault();
					const item = flatItems[currentIndex];
					if (!item) break;

					if (item.type === "agent" && item.agent) {
						onSelectAgent(item.agent.address);
					} else if (item.type === "rig" && item.rigName) {
						toggleRig(item.rigName);
					} else if (item.type === "add-polecat" && item.rigName) {
						onAddPolecat(item.rigName);
					}
					break;
				}
				case "/":
					// Focus search on / key
					e.preventDefault();
					searchInputRef.current?.focus();
					break;
			}
		},
		[flatItems, focusedIndex, onSelectAgent, onAddPolecat, toggleRig],
	);

	// Scroll focused item into view
	useEffect(() => {
		if (focusedIndex >= 0) {
			const item = containerRef.current?.querySelector(
				`[data-index="${focusedIndex}"]`,
			);
			item?.scrollIntoView({ block: "nearest", behavior: "smooth" });
		}
	}, [focusedIndex]);

	// Helper to get the data-index for an item
	const getDataIndex = (id: string) => flatItems.findIndex((i) => i.id === id);

	// Agent node component with proper styling
	const AgentNode = ({
		agent,
		depth = 0,
	}: {
		agent: AgentRuntime;
		depth?: number;
	}) => {
		const index = getDataIndex(agent.address);
		const isFocused = focusedIndex === index;
		const isSelected = selectedAgent === agent.address;

		return (
			<button
				data-index={index}
				onClick={() => {
					onSelectAgent(agent.address);
					setFocusedIndex(index);
				}}
				className={cn(
					"w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-all",
					"hover:bg-gt-bg focus:outline-none",
					depth > 0 && "ml-4",
					isSelected && "bg-gt-accent/10 border border-gt-accent/50",
					isFocused && !isSelected && "ring-1 ring-gt-accent/30",
					// Spring animation for hover
					"duration-200 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]",
				)}
				style={{
					// Stagger animation delay for visual effect
					animationDelay: `${index * 30}ms`,
				}}
			>
				{/* Status indicator with glow effect */}
				<div className="relative">
					<div
						className={cn(
							"w-2.5 h-2.5 rounded-full transition-all",
							getStatusColor(agent),
						)}
					/>
					{agent.has_work && (
						<div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping opacity-50" />
					)}
				</div>

				{/* Agent info */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<span className="truncate font-medium text-sm">{agent.name}</span>
						{/* Work indicator */}
						{agent.has_work && (
							<Briefcase size={12} className="text-blue-400 flex-shrink-0" />
						)}
						{/* Mail indicator */}
						{agent.unread_mail > 0 && (
							<span className="flex items-center gap-0.5 text-amber-400 flex-shrink-0">
								<Mail size={12} />
								<span className="text-xs">{agent.unread_mail}</span>
							</span>
						)}
					</div>
				</div>

				{/* Role badge */}
				<span
					className={cn(
						"text-xs px-2 py-0.5 rounded uppercase font-medium tracking-wide",
						getRoleBgColor(agent.role),
						getRoleColor(agent.role),
					)}
				>
					{agent.role}
				</span>
			</button>
		);
	};

	// Filtered agents for display
	const filteredGlobalAgents = globalAgents.filter(filterAgent);
	const filteredRigs = rigs
		.map((rig) => ({
			...rig,
			agents: (rig.agents || []).filter(filterAgent),
		}))
		.filter(
			(rig) =>
				rig.agents.length > 0 ||
				!searchQuery ||
				rig.name.toLowerCase().includes(searchQuery.toLowerCase()),
		);

	return (
		<div
			ref={containerRef}
			className="h-full flex flex-col bg-gt-surface"
			onKeyDown={handleKeyDown}
			tabIndex={0}
		>
			{/* Header with search */}
			<div className="p-4 border-b border-gt-border space-y-3">
				<h2 className="text-lg font-medium flex items-center gap-2">
					<Users size={20} className="text-gt-muted" />
					Agents
				</h2>

				{/* Search input */}
				<div className="relative">
					<Search
						size={16}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-gt-muted"
					/>
					<input
						ref={searchInputRef}
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Filter agents... (/ to focus)"
						className={cn(
							"w-full pl-9 pr-3 py-2 rounded-lg text-sm",
							"bg-gt-bg border border-gt-border",
							"focus:border-gt-accent focus:outline-none focus:ring-1 focus:ring-gt-accent/30",
							"placeholder:text-gt-muted/50",
							"transition-all duration-200",
						)}
						onFocus={() => setFocusedIndex(-1)}
					/>
					{searchQuery && (
						<button
							onClick={() => setSearchQuery("")}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-gt-muted hover:text-gt-text"
						>
							×
						</button>
					)}
				</div>
			</div>

			{/* Tree content */}
			<div className="flex-1 overflow-y-auto p-2">
				{/* Global Agents */}
				{filteredGlobalAgents.length > 0 && (
					<div className="mb-4">
						<div className="px-2 py-1 text-xs font-medium text-gt-muted uppercase tracking-wider flex items-center justify-between">
							<span>Global</span>
							<span className="bg-gt-bg px-1.5 py-0.5 rounded text-xs tabular-nums">
								{filteredGlobalAgents.length}
							</span>
						</div>
						{filteredGlobalAgents.map((agent) => (
							<AgentNode key={agent.address} agent={agent} />
						))}
					</div>
				)}

				{/* Rigs */}
				{filteredRigs.map((rig) => {
					const isExpanded = expandedRigs.has(rig.name);
					const rigAgents = rig.agents;
					const rigIndex = getDataIndex(`rig:${rig.name}`);
					const isFocused = focusedIndex === rigIndex;
					const totalCount =
						rig.polecat_count +
						rig.crew_count +
						(rig.has_witness ? 1 : 0) +
						(rig.has_refinery ? 1 : 0);

					return (
						<div key={rig.name} className="mb-2">
							<button
								data-index={rigIndex}
								onClick={() => {
									toggleRig(rig.name);
									setFocusedIndex(rigIndex);
								}}
								className={cn(
									"w-full text-left px-2 py-2 text-sm font-medium flex items-center gap-2",
									"hover:bg-gt-bg rounded-lg transition-all focus:outline-none",
									isFocused && "ring-1 ring-gt-accent/30",
									// Spring animation
									"duration-200 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]",
								)}
							>
								{/* Animated chevron */}
								<ChevronRight
									size={16}
									className={cn(
										"text-gt-muted transition-transform",
										"duration-200 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]",
										isExpanded && "rotate-90",
									)}
								/>
								<span className="flex-1">{rig.name}</span>

								{/* Count badge */}
								<span
									className={cn(
										"text-xs px-2 py-0.5 rounded-full tabular-nums",
										"bg-gt-bg text-gt-muted",
									)}
								>
									{totalCount}
								</span>
							</button>

							{/* Expandable content with height animation */}
							<div
								className={cn(
									"overflow-hidden transition-all",
									"duration-300 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]",
									isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0",
								)}
							>
								<div className="ml-2 mt-1 pl-2 border-l border-gt-border/50 space-y-1">
									{/* Witness */}
									{rigAgents
										.filter((a) => a.role === "witness")
										.map((agent) => (
											<AgentNode key={agent.address} agent={agent} />
										))}

									{/* Refinery */}
									{rigAgents
										.filter((a) => a.role === "refinery")
										.map((agent) => (
											<AgentNode key={agent.address} agent={agent} />
										))}

									{/* Polecats */}
									{rigAgents
										.filter((a) => a.role === "polecat")
										.map((agent) => (
											<AgentNode key={agent.address} agent={agent} />
										))}

									{/* Crews */}
									{rigAgents
										.filter((a) => a.role === "crew")
										.map((agent) => (
											<AgentNode key={agent.address} agent={agent} />
										))}

									{/* Add Polecat Button */}
									<button
										data-index={getDataIndex(`add:${rig.name}`)}
										onClick={() => {
											onAddPolecat(rig.name);
											setFocusedIndex(getDataIndex(`add:${rig.name}`));
										}}
										className={cn(
											"w-full text-left px-3 py-2 rounded-lg flex items-center gap-2",
											"hover:bg-gt-bg transition-all text-gt-muted text-sm",
											"focus:outline-none focus:ring-1 focus:ring-gt-accent/30",
											focusedIndex === getDataIndex(`add:${rig.name}`) &&
												"ring-1 ring-gt-accent/30",
										)}
									>
										<Plus size={16} />
										<span>Add Polecat</span>
									</button>
								</div>
							</div>
						</div>
					);
				})}

				{/* Empty state */}
				{filteredGlobalAgents.length === 0 && filteredRigs.length === 0 && (
					<div className="text-center py-8 text-gt-muted">
						{searchQuery ? (
							<>
								<Search size={24} className="mx-auto mb-2 opacity-50" />
								<p className="text-sm">No agents match "{searchQuery}"</p>
							</>
						) : (
							<>
								<Users size={24} className="mx-auto mb-2 opacity-50" />
								<p className="text-sm">No agents available</p>
							</>
						)}
					</div>
				)}
			</div>

			{/* Keyboard shortcuts hint */}
			<div className="px-3 py-2 border-t border-gt-border text-xs text-gt-muted flex items-center justify-center gap-4">
				<span>
					<kbd className="px-1 bg-gt-bg rounded">↑↓</kbd> Navigate
				</span>
				<span>
					<kbd className="px-1 bg-gt-bg rounded">←→</kbd> Expand
				</span>
				<span>
					<kbd className="px-1 bg-gt-bg rounded">Enter</kbd> Select
				</span>
			</div>
		</div>
	);
}
