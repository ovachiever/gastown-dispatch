import { useState } from "react";
import {
	ChevronRight,
	ChevronDown,
	ScrollText,
	Monitor,
	Users,
	Server,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type LogSourceId =
	| "all"
	| "system"
	| "system/daemon"
	| "system/gt-log"
	| "global"
	| "global/mayor"
	| "global/deacon"
	| `rig/${string}`
	| `rig/${string}/witness`
	| `rig/${string}/refinery`
	| `rig/${string}/polecat/${string}`;

interface LogSourceTreeProps {
	rigs: string[];
	selectedSources: Set<string>;
	onSourceSelect: (sourceId: string, multiSelect: boolean) => void;
	unreadCounts?: Record<string, number>;
}

interface TreeItemProps {
	label: string;
	icon?: React.ReactNode;
	depth?: number;
	isSelected: boolean;
	unreadCount?: number;
	onClick: (multiSelect: boolean) => void;
}

function TreeItem({
	label,
	icon,
	depth = 0,
	isSelected,
	unreadCount,
	onClick,
}: TreeItemProps) {
	return (
		<button
			onClick={(e) => onClick(e.metaKey || e.ctrlKey)}
			className={cn(
				"w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gt-bg transition-colors text-sm",
				isSelected && "bg-gt-bg border border-gt-accent/30",
			)}
			style={{ paddingLeft: `${12 + depth * 16}px` }}
		>
			{icon && <span className="text-gt-muted shrink-0">{icon}</span>}
			<span className="flex-1 truncate">{label}</span>
			{unreadCount !== undefined && unreadCount > 0 && (
				<span className="px-1.5 py-0.5 text-xs rounded-full bg-gt-accent text-black font-medium min-w-[20px] text-center">
					{unreadCount > 99 ? "99+" : unreadCount}
				</span>
			)}
		</button>
	);
}

interface TreeGroupProps {
	label: string;
	icon?: React.ReactNode;
	children: React.ReactNode;
	defaultExpanded?: boolean;
	count?: number;
}

function TreeGroup({
	label,
	icon,
	children,
	defaultExpanded = true,
	count,
}: TreeGroupProps) {
	const [expanded, setExpanded] = useState(defaultExpanded);

	return (
		<div className="mb-1">
			<button
				onClick={() => setExpanded(!expanded)}
				className="w-full text-left px-2 py-1.5 text-sm font-medium flex items-center gap-1 hover:bg-gt-bg rounded transition-colors"
			>
				{expanded ? (
					<ChevronDown size={16} className="text-gt-muted shrink-0" />
				) : (
					<ChevronRight size={16} className="text-gt-muted shrink-0" />
				)}
				{icon && <span className="text-gt-muted mr-1">{icon}</span>}
				<span className="flex-1">{label}</span>
				{count !== undefined && (
					<span className="text-xs text-gt-muted">{count}</span>
				)}
			</button>
			{expanded && <div className="ml-2">{children}</div>}
		</div>
	);
}

export function LogSourceTree({
	rigs,
	selectedSources,
	onSourceSelect,
	unreadCounts = {},
}: LogSourceTreeProps) {
	return (
		<div className="h-full flex flex-col bg-gt-surface border-r border-gt-border">
			<div className="p-4 border-b border-gt-border">
				<h2 className="text-lg font-medium flex items-center gap-2">
					<ScrollText size={20} />
					Log Sources
				</h2>
			</div>

			<div className="flex-1 overflow-y-auto p-2">
				{/* All Logs */}
				<TreeItem
					label="All Logs"
					icon={<ScrollText size={16} />}
					isSelected={selectedSources.has("all")}
					unreadCount={unreadCounts["all"]}
					onClick={(multi) => onSourceSelect("all", multi)}
				/>

				{/* System */}
				<TreeGroup label="System" icon={<Monitor size={16} />}>
					<TreeItem
						label="Daemon"
						depth={1}
						isSelected={selectedSources.has("system/daemon")}
						unreadCount={unreadCounts["system/daemon"]}
						onClick={(multi) => onSourceSelect("system/daemon", multi)}
					/>
					<TreeItem
						label="gt-log events"
						depth={1}
						isSelected={selectedSources.has("system/gt-log")}
						unreadCount={unreadCounts["system/gt-log"]}
						onClick={(multi) => onSourceSelect("system/gt-log", multi)}
					/>
				</TreeGroup>

				{/* Global Agents */}
				<TreeGroup label="Global Agents" icon={<Users size={16} />}>
					<TreeItem
						label="Mayor"
						depth={1}
						isSelected={selectedSources.has("global/mayor")}
						unreadCount={unreadCounts["global/mayor"]}
						onClick={(multi) => onSourceSelect("global/mayor", multi)}
					/>
					<TreeItem
						label="Deacon"
						depth={1}
						isSelected={selectedSources.has("global/deacon")}
						unreadCount={unreadCounts["global/deacon"]}
						onClick={(multi) => onSourceSelect("global/deacon", multi)}
					/>
				</TreeGroup>

				{/* Rigs */}
				{rigs.map((rigName) => (
					<TreeGroup
						key={rigName}
						label={rigName}
						icon={<Server size={16} />}
						count={unreadCounts[`rig/${rigName}`]}
					>
						<TreeItem
							label="Witness"
							depth={1}
							isSelected={selectedSources.has(`rig/${rigName}/witness`)}
							unreadCount={unreadCounts[`rig/${rigName}/witness`]}
							onClick={(multi) =>
								onSourceSelect(`rig/${rigName}/witness`, multi)
							}
						/>
						<TreeItem
							label="Refinery"
							depth={1}
							isSelected={selectedSources.has(`rig/${rigName}/refinery`)}
							unreadCount={unreadCounts[`rig/${rigName}/refinery`]}
							onClick={(multi) =>
								onSourceSelect(`rig/${rigName}/refinery`, multi)
							}
						/>
						{/* Polecats would be dynamically added here based on rig data */}
					</TreeGroup>
				))}
			</div>
		</div>
	);
}
