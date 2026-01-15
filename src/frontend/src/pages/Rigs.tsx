import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
	RefreshCw,
	Power,
	PowerOff,
	HardDrive,
	Users,
	GitBranch,
	MemoryStick,
	ToggleLeft,
	ToggleRight,
	ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

async function getRigs(): Promise<RigListResponse> {
	const res = await fetch(`${API_BASE_URL}/rigs`);
	if (!res.ok) throw new Error("Failed to fetch rigs");
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

function RigCard({
	rig,
	onToggle,
	isToggling,
	isSelected,
	onSelect,
}: {
	rig: RigInfo;
	onToggle: (enable: boolean) => void;
	isToggling: boolean;
	isSelected: boolean;
	onSelect: () => void;
}) {
	return (
		<button
			onClick={onSelect}
			className={cn(
				"relative w-full text-left rounded-lg border p-4 pr-10 transition-all",
				isSelected
					? "border-gt-accent bg-gt-accent/10"
					: rig.witnessRunning
						? "border-green-600/50 bg-green-950/20 hover:border-gt-accent/50"
						: "border-gt-border bg-gt-card hover:border-gt-accent/50",
			)}
		>
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<HardDrive
						size={18}
						className={rig.witnessRunning ? "text-green-400" : "text-gt-muted"}
					/>
					<span className="font-medium text-gt-text">{rig.name}</span>
					<span className="text-xs text-gt-muted bg-gt-bg px-1.5 py-0.5 rounded">
						{rig.beadPrefix}-
					</span>
				</div>

				<button
					onClick={(e) => {
						e.stopPropagation();
						onToggle(!rig.enabled);
					}}
					disabled={isToggling}
					className={cn(
						"p-1.5 rounded transition-colors",
						isToggling && "opacity-50 cursor-wait",
						rig.enabled
							? "text-green-400 hover:bg-green-900/30"
							: "text-gt-muted hover:bg-gt-hover",
					)}
					title={rig.enabled ? "Disable rig" : "Enable rig"}
				>
					{isToggling ? (
						<RefreshCw size={20} className="animate-spin" />
					) : rig.enabled ? (
						<ToggleRight size={20} />
					) : (
						<ToggleLeft size={20} />
					)}
				</button>
			</div>

			<div className="flex items-center gap-4 text-sm text-gt-muted">
				<div
					className={cn(
						"flex items-center gap-1",
						rig.witnessRunning ? "text-green-400" : "text-gt-muted",
					)}
				>
					{rig.witnessRunning ? <Power size={14} /> : <PowerOff size={14} />}
					<span>{rig.witnessRunning ? "Running" : "Stopped"}</span>
				</div>

				{rig.memoryMB > 0 && (
					<div className="flex items-center gap-1">
						<MemoryStick size={14} />
						<span>{rig.memoryMB} MB</span>
					</div>
				)}

				<div className="flex items-center gap-1">
					<Users size={14} />
					<span>{rig.polecatCount} polecats</span>
				</div>

				<div className="flex items-center gap-1">
					<GitBranch size={14} />
					<span>{rig.crewCount} crew</span>
				</div>
			</div>

			<div className="mt-2 text-xs text-gt-muted truncate" title={rig.gitUrl}>
				{rig.gitUrl}
			</div>

			<ChevronRight
				size={16}
				className={cn(
					"absolute right-4 top-1/2 -translate-y-1/2 transition-transform",
					isSelected ? "text-gt-accent rotate-90" : "text-gt-muted",
				)}
			/>
		</button>
	);
}

export default function Rigs() {
	const [searchParams, setSearchParams] = useSearchParams();
	const selectedRig = searchParams.get("rig");
	const setSelectedRig = (name: string | null) => {
		if (name) {
			setSearchParams({ rig: name });
		} else {
			setSearchParams({});
		}
	};

	const queryClient = useQueryClient();

	const { data, isLoading, error, refetch, isFetching } = useQuery({
		queryKey: ["rigs"],
		queryFn: getRigs,
		refetchInterval: 10_000,
	});

	const toggleMutation = useMutation({
		mutationFn: ({ name, enable }: { name: string; enable: boolean }) =>
			toggleRig(name, enable),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["rigs"] });
			queryClient.invalidateQueries({ queryKey: ["rigs-enabled"] });
		},
	});

	const bulkMutation = useMutation({
		mutationFn: (enable: boolean) => bulkToggle(enable),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["rigs"] });
			queryClient.invalidateQueries({ queryKey: ["rigs-enabled"] });
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

	return (
		<div className="h-full flex flex-col overflow-hidden">
			<div className="flex-shrink-0 p-6 pb-0 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-gt-text">Rigs</h1>
					<p className="text-gt-muted mt-1">
						{activeCount} of {rigs.length} rigs running • {totalMemoryMB} MB
						total
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

			<div className="flex-1 overflow-auto p-6 space-y-6">
				<div className="bg-gt-card rounded-lg border border-gt-border p-4">
					<div className="flex items-center gap-6 text-sm">
						<div>
							<span className="text-gt-muted">Enabled:</span>{" "}
							<span className="text-gt-text font-medium">
								{enabledCount} / {rigs.length}
							</span>
						</div>
						<div>
							<span className="text-gt-muted">Running:</span>{" "}
							<span className="text-green-400 font-medium">{activeCount}</span>
						</div>
						<div>
							<span className="text-gt-muted">Memory:</span>{" "}
							<span className="text-gt-text font-medium">
								{totalMemoryMB} MB
							</span>
						</div>
					</div>
				</div>

				<div className="grid gap-3">
					{rigs.map((rig) => (
						<RigCard
							key={rig.name}
							rig={rig}
							onToggle={(enable) =>
								toggleMutation.mutate({ name: rig.name, enable })
							}
							isToggling={
								toggleMutation.isPending &&
								toggleMutation.variables?.name === rig.name
							}
							isSelected={selectedRig === rig.name}
							onSelect={() =>
								setSelectedRig(selectedRig === rig.name ? null : rig.name)
							}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
