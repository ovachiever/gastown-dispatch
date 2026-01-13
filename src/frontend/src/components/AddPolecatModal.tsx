import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addPolecat } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AddPolecatModalProps {
	rigName: string;
	onClose: () => void;
}

export function AddPolecatModal({ rigName, onClose }: AddPolecatModalProps) {
	const [name, setName] = useState("");
	const queryClient = useQueryClient();

	const addMutation = useMutation({
		mutationFn: () => addPolecat({ rig: rigName, name }),
		onSuccess: (result) => {
			if (result.success) {
				queryClient.invalidateQueries({ queryKey: ["status"] });
				onClose();
			}
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (name.trim()) {
			addMutation.mutate();
		}
	};

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
			<div className="bg-gt-surface border border-gt-border rounded-lg shadow-xl max-w-md w-full">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gt-border">
					<h2 className="text-lg font-semibold">
						Add Polecat to {rigName}
					</h2>
					<button
						onClick={onClose}
						className="p-1 hover:bg-gt-border rounded transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				{/* Content */}
				<form onSubmit={handleSubmit} className="p-4 space-y-4">
					<div>
						<label htmlFor="name" className="block text-sm font-medium mb-2">
							Polecat Name
						</label>
						<input
							id="name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g., nux"
							className="w-full px-3 py-2 bg-gt-bg border border-gt-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							autoFocus
						/>
						<p className="text-xs text-gt-muted mt-2">
							The polecat name will be used to create a worktree and branch.
						</p>
					</div>

					{addMutation.isError && (
						<div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
							<p className="text-sm text-red-400">
								Failed to add polecat. Please try again.
							</p>
						</div>
					)}

					{addMutation.isSuccess && (
						<div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
							<p className="text-sm text-green-400">
								Polecat added successfully!
							</p>
						</div>
					)}

					{/* Actions */}
					<div className="flex gap-2 justify-end">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 bg-gt-bg hover:bg-gt-border rounded-lg transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={!name.trim() || addMutation.isPending}
							className={cn(
								"px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2",
								(!name.trim() || addMutation.isPending) &&
									"opacity-50 cursor-not-allowed",
							)}
						>
							<Plus size={16} />
							{addMutation.isPending ? "Adding..." : "Add Polecat"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
