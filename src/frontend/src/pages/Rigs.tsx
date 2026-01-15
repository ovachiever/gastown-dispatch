import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
	RefreshCw,
	Power,
	PowerOff,
	HardDrive,
	Users,
	ToggleLeft,
	ToggleRight,
	Server,
	Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RigDetail } from "@/components/RigDetail";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "/api";

interface RigInfo {
	name: string;
	enabled: boolean;
	witnessRunning: boolean;
	memoryMB: number;
	polecatCount: number;
	crewCount: number;
	beadPrefix: string;
	gitUrl: string;
}

interface RigListResponse {
	rigs: RigInfo[];
	totalMemoryMB: number;
	activeCount: number;
}

// Extended rig info for detail view - comes from status API
interface RigStatusInfo {
	name: string;
	polecats: string[];
	polecat_count: number;
	crews: string[];
	crew_count: number;
	has_witness: boolean;
	has_refinery: boolean;
	hooks?: Array<{
		agent: string;
		role: string;
		has_work: boolean;
		molecule?: string;
		title?: string;
	}>;
	agents?: Array<{
		name: string;
		address: string;
		session: string;
		role: string;
		running: boolean;
		has_work: boolean;
		work_title?: string;
		hook_bead?: string;
		state?: string;
		unread_mail: number;
		first_subject?: string;
	}>;
	mq?: {
		pending: number;
		in_flight: number;
		blocked: number;
		state: "idle" | "processing" | "blocked";
		health: "healthy" | "stale" | "empty";
	};
}

async function getRigs(): Promise<RigListResponse> {
	const res = await fetch(`${API_BASE_URL}/rigs`);
	if (!res.ok) throw new Error("Failed to fetch rigs");
	return res.json();
}

async function getStatus(): Promise<{ initialized: boolean; status?: { rigs: RigStatusInfo[] } }> {
	const res = await fetch(`${API_BASE_URL}/status`);
	if (!res.ok) throw new Error("Failed to fetch status");
	return res.json();
}

async function toggleRig(
	name: string,
	enable: boolean,
): Promise<{ success: boolean; message: string }> {
	const res = await fetch(
		`${API_BASE_URL}/rigs/${name}/${enable ? "enable" : "disable"}`,
		{ method: "POST" },
	);
	if (!res.ok) throw new Error("Failed to toggle rig");
	return res.json();
}

async function bulkToggle(
	enable: boolean,
): Promise<{ success: boolean; message: string }> {
	const res = await fetch(
		`${API_BASE_URL}/rigs/bulk/${enable ? "enable" : "disable"}`,
		{ method: "POST" },
	);
	if (!res.ok) throw new Error("Failed to bulk toggle");
	return res.json();
}

function RigListItem({
	rig,
	rigStatus,
	isSelected,
	onSelect,
	onToggle,
	isToggling,
}: {
	rig: RigInfo;
	rigStatus?: RigStatusInfo;
	isSelected: boolean;
	onSelect: () => void;
	onToggle: (enable: boolean) => void;
	isToggling: boolean;
}) {
	const activeHooks = rigStatus?.hooks?.filter((h) => h.has_work).length || 0;
	const runningAgents = rigStatus?.agents?.filter((a) => a.running).length || 0;
	const totalAgents = rigStatus?.agents?.length || 0;

	return (
		<button
			onClick={onSelect}
			className={cn(
				"w-full text-left rounded-lg border p-3 transition-all",
				isSelected
					? "border-blue-500 bg-blue-950/30"
					: rig.witnessRunning
						? "border-green-600/50 bg-green-950/20 hover:border-green-500"
						: "border-gt-border bg-gt-card hover:border-gt-muted",
			)}
		>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<HardDrive
						size={16}
						className={rig.witnessRunning ? "text-green-400" : "text-gt-muted"}
					/>
					<span className="font-medium text-gt-text">{rig.name}</span>
				</div>
				<div className="flex items-center gap-2">
					{activeHooks > 0 && (
						<span className="text-[10px] px-1.5 py-0.5 bg-yellow-900/50 text-yellow-400 rounded-full flex items-center gap-1">
							<Zap size={10} />
							{activeHooks}
						</span>
					)}
					<button
						onClick={(e) => {
							e.stopPropagation();
							onToggle(!rig.enabled);
						}}
						disabled={isToggling}
						className={cn(
							"p-1 rounded transition-colors",
							isToggling && "opacity-50 cursor-wait",
							rig.enabled
								? "text-green-400 hover:bg-green-900/30"
								: "text-gt-muted hover:bg-gt-hover",
						)}
						title={rig.enabled ? "Disable rig" : "Enable rig"}
					>
						{isToggling ? (
							<RefreshCw size={16} className="animate-spin" />
						) : rig.enabled ? (
							<ToggleRight size={16} />
						) : (
							<ToggleLeft size={16} />
						)}
					</button>
				</div>
			</div>

			<div className="flex items-center gap-3 text-xs text-gt-muted">
				<div
					className={cn(
						"flex items-center gap-1",
						rig.witnessRunning ? "text-green-400" : "text-gt-muted",
					)}
				>
					{rig.witnessRunning ? <Power size={12} /> : <PowerOff size={12} />}
					<span>{rig.witnessRunning ? "Running" : "Stopped"}</span>
				</div>

				<div className="flex items-center gap-1">
					<Users size={12} />
					<span>{rig.polecatCount}p/{rig.crewCount}c</span>
				</div>

				{totalAgents > 0 && (
					<div className="flex items-center gap-1">
						<Server size={12} />
						<span>{runningAgents}/{totalAgents}</span>
					</div>
				)}
			</div>
		</button>
	);
}

export default function Rigs() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [selectedRig, setSelectedRig] = useState<string | null>(null);
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	// Handle rig selection from URL parameter
	useEffect(() => {
		const rigParam = searchParams.get("rig");
		if (rigParam && rigParam !== selectedRig) {
			setSelectedRig(rigParam);
			// Clear the URL parameter after processing
			setSearchParams({}, { replace: true });
		}
	}, [searchParams, selectedRig, setSearchParams]);

	const { data, isLoading, error, refetch, isFetching } = useQuery({
		queryKey: ["rigs"],
		queryFn: getRigs,
		refetchInterval: 10_000,
	});

	const { data: statusData } = useQuery({
		queryKey: ["status"],
		queryFn: getStatus,
		refetchInterval: 10_000,
	});

	const toggleMutation = useMutation({
		mutationFn: ({ name, enable }: { name: string; enable: boolean }) =>
			toggleRig(name, enable),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["rigs"] });
			queryClient.invalidateQueries({ queryKey: ["rigs-enabled"] });
			queryClient.invalidateQueries({ queryKey: ["status"] });
		},
	});

	const bulkMutation = useMutation({
		mutationFn: (enable: boolean) => bulkToggle(enable),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["rigs"] });
			queryClient.invalidateQueries({ queryKey: ["rigs-enabled"] });
			queryClient.invalidateQueries({ queryKey: ["status"] });
		},
	});

	// Get detailed rig status from status API
	const rigStatusMap = new Map<string, RigStatusInfo>();
	if (statusData?.initialized && statusData.status?.rigs) {
		for (const rig of statusData.status.rigs) {
			rigStatusMap.set(rig.name, rig);
		}
	}

	const handleSelectAgent = (address: string) => {
		// Navigate to agents page with the agent selected
		navigate(`/agents?agent=${encodeURIComponent(address)}`);
	};

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
						Failed to load rigs: {(error as Error).message}
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

	const { rigs, totalMemoryMB, activeCount } = data!;
	const enabledCount = rigs.filter((r) => r.enabled).length;

	// Get selected rig's detailed status
	const selectedRigStatus = selectedRig ? rigStatusMap.get(selectedRig) : null;

	return (
		<div className="h-screen flex flex-col">
			{/* Header */}
			<div className="flex-shrink-0 p-6 pb-4 flex items-center justify-between border-b border-gt-border">
				<div>
					<h1 className="text-2xl font-semibold text-gt-text">Rigs</h1>
					<p className="text-gt-muted mt-1 text-sm">
						{activeCount} of {rigs.length} running • {totalMemoryMB} MB total
					</p>
				</div>

				<div className="flex items-center gap-2">
					<button
						onClick={() => bulkMutation.mutate(false)}
						disabled={bulkMutation.isPending}
						className="px-3 py-1.5 rounded text-sm bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors disabled:opacity-50"
					>
						{bulkMutation.isPending ? (
							<RefreshCw size={14} className="animate-spin inline mr-1" />
						) : (
							<PowerOff size={14} className="inline mr-1" />
						)}
						Disable All
					</button>
					<button
						onClick={() => bulkMutation.mutate(true)}
						disabled={bulkMutation.isPending}
						className="px-3 py-1.5 rounded text-sm bg-green-900/30 text-green-400 hover:bg-green-900/50 transition-colors disabled:opacity-50"
					>
						{bulkMutation.isPending ? (
							<RefreshCw size={14} className="animate-spin inline mr-1" />
						) : (
							<Power size={14} className="inline mr-1" />
						)}
						Enable All
					</button>
					<button
						onClick={() => refetch()}
						disabled={isFetching}
						className="p-1.5 rounded hover:bg-gt-hover transition-colors"
						title="Refresh"
					>
						<RefreshCw
							size={18}
							className={cn("text-gt-muted", isFetching && "animate-spin")}
						/>
					</button>
				</div>
			</div>

			{/* Master-Detail Layout */}
			<div className="flex-1 flex overflow-hidden">
				{/* Rig List (Master) */}
				<div className="w-80 border-r border-gt-border flex flex-col">
					{/* Summary */}
					<div className="p-4 border-b border-gt-border bg-gt-surface/50">
						<div className="flex items-center gap-4 text-sm">
							<div>
								<span className="text-gt-muted">Enabled:</span>{" "}
								<span className="text-gt-text font-medium">
									{enabledCount}/{rigs.length}
								</span>
							</div>
							<div>
								<span className="text-gt-muted">Running:</span>{" "}
								<span className="text-green-400 font-medium">{activeCount}</span>
							</div>
						</div>
					</div>

					{/* Rig List */}
					<div className="flex-1 overflow-y-auto p-4 space-y-2">
						{rigs.map((rig) => (
							<RigListItem
								key={rig.name}
								rig={rig}
								rigStatus={rigStatusMap.get(rig.name)}
								isSelected={selectedRig === rig.name}
								onSelect={() => setSelectedRig(rig.name)}
								onToggle={(enable) =>
									toggleMutation.mutate({ name: rig.name, enable })
								}
								isToggling={
									toggleMutation.isPending &&
									toggleMutation.variables?.name === rig.name
								}
							/>
						))}
					</div>
				</div>

				{/* Rig Detail (Detail) */}
				<div className="flex-1 overflow-hidden">
					{selectedRigStatus ? (
						<RigDetail
							rig={selectedRigStatus}
							onSelectAgent={handleSelectAgent}
						/>
					) : selectedRig ? (
						<div className="h-full flex items-center justify-center">
							<div className="text-center">
								<Server className="mx-auto text-gt-muted mb-4" size={48} />
								<p className="text-gt-muted mb-2">Loading rig details...</p>
								<p className="text-sm text-gt-muted">
									Detailed status will appear when available.
								</p>
							</div>
						</div>
					) : (
						<div className="h-full flex items-center justify-center">
							<div className="text-center">
								<Server className="mx-auto text-gt-muted mb-4" size={48} />
								<p className="text-gt-muted mb-2">Select a rig to view details</p>
								<p className="text-sm text-gt-muted">
									Click on a rig to see hooks, agents, and queue status.
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
