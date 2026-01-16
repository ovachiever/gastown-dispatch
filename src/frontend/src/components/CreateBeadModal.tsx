import { useState, useEffect, useMemo } from "react";
import { X, Plus, Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBead, getBeads } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Bead } from "@/types/api";

interface CreateBeadModalProps {
	onClose: () => void;
	onSuccess?: (bead: Bead) => void;
}

const BEAD_TYPES = [
	{ value: "task", label: "Task" },
	{ value: "bug", label: "Bug" },
	{ value: "feature", label: "Feature" },
	{ value: "epic", label: "Epic" },
	{ value: "chore", label: "Chore" },
];

const PRIORITY_OPTIONS = [
	{ value: 0, label: "P0 - Critical" },
	{ value: 1, label: "P1 - High" },
	{ value: 2, label: "P2 - Medium" },
	{ value: 3, label: "P3 - Low" },
	{ value: 4, label: "P4 - Backlog" },
];

// Type-specific default priorities
const TYPE_DEFAULT_PRIORITIES: Record<string, number> = {
	bug: 1,
	feature: 2,
	task: 2,
	epic: 2,
	chore: 3,
};

export function CreateBeadModal({ onClose, onSuccess }: CreateBeadModalProps) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [type, setType] = useState("task");
	const [priority, setPriority] = useState(2);
	const [assignee, setAssignee] = useState("");
	const [labelsInput, setLabelsInput] = useState("");
	const [parent, setParent] = useState("");
	const [parentSearch, setParentSearch] = useState("");
	const [showParentPicker, setShowParentPicker] = useState(false);
	const [deps, setDeps] = useState<string[]>([]);
	const [depSearch, setDepSearch] = useState("");
	const [showDepPicker, setShowDepPicker] = useState(false);

	const queryClient = useQueryClient();

	// Fetch epics for parent picker
	const { data: epics = [] } = useQuery({
		queryKey: ["beads", "epics"],
		queryFn: () => getBeads({ type: "epic", status: "open" }),
	});

	// Fetch beads for dependency picker
	const { data: allBeads = [] } = useQuery({
		queryKey: ["beads", "open"],
		queryFn: () => getBeads({ status: "open", limit: 200 }),
	});

	// Filter epics for parent search
	const filteredEpics = useMemo((): Bead[] => {
		if (!parentSearch) return epics;
		const search = parentSearch.toLowerCase();
		return epics.filter(
			(e: Bead) =>
				e.title.toLowerCase().includes(search) ||
				e.id.toLowerCase().includes(search)
		);
	}, [epics, parentSearch]);

	// Filter beads for dependency search (exclude already selected)
	const filteredDeps = useMemo((): Bead[] => {
		const available = allBeads.filter((b: Bead) => !deps.includes(b.id));
		if (!depSearch) return available.slice(0, 10);
		const search = depSearch.toLowerCase();
		return available
			.filter(
				(b: Bead) =>
					b.title.toLowerCase().includes(search) ||
					b.id.toLowerCase().includes(search)
			)
			.slice(0, 10);
	}, [allBeads, deps, depSearch]);

	// Get selected beads for dependency display
	const selectedDeps = useMemo((): Bead[] => {
		return deps
			.map((id: string) => allBeads.find((b: Bead) => b.id === id))
			.filter(Boolean) as Bead[];
	}, [allBeads, deps]);

	// Get selected parent bead
	const selectedParent = useMemo((): Bead | undefined => {
		return epics.find((e: Bead) => e.id === parent);
	}, [epics, parent]);

	// Update priority when type changes
	useEffect(() => {
		setPriority(TYPE_DEFAULT_PRIORITIES[type] ?? 2);
	}, [type]);

	const createMutation = useMutation({
		mutationFn: () => {
			const labels = labelsInput
				.split(",")
				.map((l: string) => l.trim())
				.filter(Boolean);
			return createBead({
				title,
				description: description || undefined,
				type,
				priority,
				parent: parent || undefined,
				assignee: assignee || undefined,
				labels: labels.length > 0 ? labels : undefined,
				deps: deps.length > 0 ? deps : undefined,
			});
		},
		onSuccess: (result) => {
			if (result.success) {
				queryClient.invalidateQueries({ queryKey: ["beads"] });
				if (onSuccess && result.data) {
					onSuccess(result.data as Bead);
				}
				onClose();
			}
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (title.trim()) {
			createMutation.mutate();
		}
	};

	const addDep = (beadId: string) => {
		if (!deps.includes(beadId)) {
			setDeps([...deps, beadId]);
		}
		setDepSearch("");
		setShowDepPicker(false);
	};

	const removeDep = (beadId: string) => {
		setDeps(deps.filter((id: string) => id !== beadId));
	};

	return (
		<div
			className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="bg-gt-surface border border-gt-border rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gt-border sticky top-0 bg-gt-surface">
					<h2 className="text-lg font-semibold">Create Bead</h2>
					<button
						onClick={onClose}
						className="p-1 hover:bg-gt-border rounded transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				{/* Content */}
				<form onSubmit={handleSubmit} className="p-4 space-y-4">
					{/* Title */}
					<div>
						<label htmlFor="title" className="block text-sm font-medium mb-2">
							Title <span className="text-red-400">*</span>
						</label>
						<input
							id="title"
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Brief description of the issue"
							className="w-full px-3 py-2 bg-gt-bg border border-gt-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							autoFocus
						/>
					</div>

					{/* Description */}
					<div>
						<label
							htmlFor="description"
							className="block text-sm font-medium mb-2"
						>
							Description
						</label>
						<textarea
							id="description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Detailed description (markdown supported)"
							className="w-full px-3 py-2 bg-gt-bg border border-gt-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
							rows={4}
						/>
					</div>

					{/* Type and Priority row */}
					<div className="grid grid-cols-2 gap-4">
						{/* Type */}
						<div>
							<label htmlFor="type" className="block text-sm font-medium mb-2">
								Type
							</label>
							<select
								id="type"
								value={type}
								onChange={(e) => setType(e.target.value)}
								className="w-full px-3 py-2 bg-gt-bg border border-gt-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								{BEAD_TYPES.map((t) => (
									<option key={t.value} value={t.value}>
										{t.label}
									</option>
								))}
							</select>
						</div>

						{/* Priority */}
						<div>
							<label
								htmlFor="priority"
								className="block text-sm font-medium mb-2"
							>
								Priority
							</label>
							<select
								id="priority"
								value={priority}
								onChange={(e) => setPriority(Number(e.target.value))}
								className="w-full px-3 py-2 bg-gt-bg border border-gt-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								{PRIORITY_OPTIONS.map((p) => (
									<option key={p.value} value={p.value}>
										{p.label}
									</option>
								))}
							</select>
						</div>
					</div>

					{/* Assignee */}
					<div>
						<label
							htmlFor="assignee"
							className="block text-sm font-medium mb-2"
						>
							Assignee
						</label>
						<input
							id="assignee"
							type="text"
							value={assignee}
							onChange={(e) => setAssignee(e.target.value)}
							placeholder="Optional assignee"
							className="w-full px-3 py-2 bg-gt-bg border border-gt-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					{/* Labels */}
					<div>
						<label htmlFor="labels" className="block text-sm font-medium mb-2">
							Labels
						</label>
						<input
							id="labels"
							type="text"
							value={labelsInput}
							onChange={(e) => setLabelsInput(e.target.value)}
							placeholder="Comma-separated labels (e.g., backend, urgent)"
							className="w-full px-3 py-2 bg-gt-bg border border-gt-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						<p className="text-xs text-gt-muted mt-1">
							Separate multiple labels with commas
						</p>
					</div>

					{/* Parent Issue (Epic picker) */}
					<div>
						<label htmlFor="parent" className="block text-sm font-medium mb-2">
							Parent Epic
						</label>
						<div className="relative">
							{selectedParent ? (
								<div className="flex items-center gap-2 px-3 py-2 bg-gt-bg border border-gt-border rounded-lg">
									<span className="text-xs font-mono text-gt-muted">
										{selectedParent.id}
									</span>
									<span className="flex-1 truncate">{selectedParent.title}</span>
									<button
										type="button"
										onClick={() => setParent("")}
										className="p-1 hover:bg-gt-border rounded"
									>
										<X size={14} />
									</button>
								</div>
							) : (
								<div className="relative">
									<Search
										size={16}
										className="absolute left-3 top-1/2 -translate-y-1/2 text-gt-muted"
									/>
									<input
										id="parent"
										type="text"
										value={parentSearch}
										onChange={(e) => setParentSearch(e.target.value)}
										onFocus={() => setShowParentPicker(true)}
										onBlur={() =>
											setTimeout(() => setShowParentPicker(false), 200)
										}
										placeholder="Search epics..."
										className="w-full pl-9 pr-3 py-2 bg-gt-bg border border-gt-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
							)}
							{showParentPicker && filteredEpics.length > 0 && (
								<div className="absolute z-10 mt-1 w-full bg-gt-surface border border-gt-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
									{filteredEpics.map((epic) => (
										<button
											key={epic.id}
											type="button"
											onClick={() => {
												setParent(epic.id);
												setParentSearch("");
												setShowParentPicker(false);
											}}
											className="w-full px-3 py-2 text-left hover:bg-gt-border flex items-center gap-2"
										>
											<span className="text-xs font-mono text-gt-muted">
												{epic.id}
											</span>
											<span className="truncate">{epic.title}</span>
										</button>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Dependencies */}
					<div>
						<label className="block text-sm font-medium mb-2">
							Dependencies
						</label>
						{/* Selected dependencies */}
						{selectedDeps.length > 0 && (
							<div className="flex flex-wrap gap-2 mb-2">
								{selectedDeps.map((bead) => (
									<span
										key={bead.id}
										className="inline-flex items-center gap-1 px-2 py-1 bg-gt-bg border border-gt-border rounded text-sm"
									>
										<span className="text-xs font-mono text-gt-muted">
											{bead.id}
										</span>
										<button
											type="button"
											onClick={() => removeDep(bead.id)}
											className="p-0.5 hover:bg-gt-border rounded"
										>
											<X size={12} />
										</button>
									</span>
								))}
							</div>
						)}
						{/* Dependency search */}
						<div className="relative">
							<Search
								size={16}
								className="absolute left-3 top-1/2 -translate-y-1/2 text-gt-muted"
							/>
							<input
								type="text"
								value={depSearch}
								onChange={(e) => setDepSearch(e.target.value)}
								onFocus={() => setShowDepPicker(true)}
								onBlur={() => setTimeout(() => setShowDepPicker(false), 200)}
								placeholder="Search issues to add as dependencies..."
								className="w-full pl-9 pr-3 py-2 bg-gt-bg border border-gt-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							{showDepPicker && filteredDeps.length > 0 && (
								<div className="absolute z-10 mt-1 w-full bg-gt-surface border border-gt-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
									{filteredDeps.map((bead) => (
										<button
											key={bead.id}
											type="button"
											onClick={() => addDep(bead.id)}
											className="w-full px-3 py-2 text-left hover:bg-gt-border flex items-center gap-2"
										>
											<span className="text-xs font-mono text-gt-muted">
												{bead.id}
											</span>
											<span className="truncate">{bead.title}</span>
											<span className="text-xs text-gt-muted ml-auto">
												{bead.type}
											</span>
										</button>
									))}
								</div>
							)}
						</div>
						<p className="text-xs text-gt-muted mt-1">
							This bead will be blocked until dependencies are closed
						</p>
					</div>

					{/* Error message */}
					{createMutation.isError && (
						<div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
							<p className="text-sm text-red-400">
								Failed to create bead. Please try again.
							</p>
						</div>
					)}

					{/* Success message */}
					{createMutation.isSuccess && (
						<div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
							<p className="text-sm text-green-400">Bead created successfully!</p>
						</div>
					)}

					{/* Actions */}
					<div className="flex gap-2 justify-end pt-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 bg-gt-bg hover:bg-gt-border rounded-lg transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={!title.trim() || createMutation.isPending}
							className={cn(
								"px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2",
								(!title.trim() || createMutation.isPending) &&
									"opacity-50 cursor-not-allowed"
							)}
						>
							<Plus size={16} />
							{createMutation.isPending ? "Creating..." : "Create Bead"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
