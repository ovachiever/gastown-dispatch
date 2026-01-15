import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import {
	LayoutDashboard,
	MessageSquare,
	Truck,
	CircleDot,
	Users,
	ScrollText,
	Settings,
	Rocket,
	HardDrive,
	GitBranch,
	Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Overview from "@/pages/Overview";
import DispatchTerminal from "@/pages/DispatchTerminal";
import Convoys from "@/pages/Convoys";
import Beads from "@/pages/Beads";
import Agents from "@/pages/Agents";
import Logs from "@/pages/Logs";
import SettingsPage from "@/pages/Settings";
import Onboarding from "@/pages/Onboarding";
import Rigs from "@/pages/Rigs";
import Pipeline from "@/pages/Pipeline";
import TownBanner from "@/components/TownBanner";
import PipelineReviews from "@/pages/pipeline/Reviews";
import PipelineMergeQueue from "@/pages/pipeline/MergeQueue";
import PipelineTests from "@/pages/pipeline/Tests";
import PipelineDeployments from "@/pages/pipeline/Deployments";
import PipelineMonitoring from "@/pages/pipeline/Monitoring";
import ActionInbox from "@/pages/ActionInbox";

const navItems = [
	{ to: "/overview", icon: LayoutDashboard, label: "Overview" },
	{ to: "/dispatch", icon: MessageSquare, label: "Mayor" },
	{ to: "/inbox", icon: Inbox, label: "Inbox" },
	{ to: "/convoys", icon: Truck, label: "Convoys" },
	{ to: "/beads", icon: CircleDot, label: "Beads" },
	{ to: "/pipeline", icon: GitBranch, label: "Pipeline" },
	{ to: "/rigs", icon: HardDrive, label: "Rigs" },
	{ to: "/agents", icon: Users, label: "Agents" },
	{ to: "/logs", icon: ScrollText, label: "Logs" },
	{ to: "/settings", icon: Settings, label: "Settings" },
];

function NavItem({
	to,
	icon: Icon,
	label,
}: {
	to: string;
	icon: typeof LayoutDashboard;
	label: string;
}) {
	return (
		<NavLink
			to={to}
			className={({ isActive }) =>
				cn(
					"flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
					isActive
						? "bg-gt-surface text-gt-accent"
						: "text-gt-muted hover:text-gt-text hover:bg-gt-surface/50",
				)
			}
		>
			<Icon size={18} />
			<span>{label}</span>
		</NavLink>
	);
}

export default function App() {
	return (
		<div className="flex flex-col h-screen overflow-hidden">
			{/* Top Banner */}
			<TownBanner />

			<div className="flex flex-1 overflow-hidden">
				{/* Sidebar */}
				<aside className="w-56 bg-gt-surface border-r border-gt-border flex flex-col">
				<div className="p-4 border-b border-gt-border">
					<h1 className="text-lg font-semibold flex items-center gap-2">
						<span className="text-gt-accent">⛽</span>
						Gas Town
					</h1>
					<p className="text-xs text-gt-muted mt-1">Dispatch Control</p>
				</div>

				<nav className="flex-1 p-3 space-y-1">
					{navItems.map((item) => (
						<NavItem key={item.to} {...item} />
					))}
				</nav>

				<div className="p-3 border-t border-gt-border">
					<NavLink
						to="/onboarding"
						className={({ isActive }) =>
							cn(
								"flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
								isActive
									? "bg-gt-accent/20 text-gt-accent"
									: "text-gt-accent hover:bg-gt-accent/10",
							)
						}
					>
						<Rocket size={18} />
						<span>Get Started</span>
					</NavLink>
				</div>
			</aside>

			{/* Main content */}
			<main className="flex-1 overflow-hidden">
				<Routes>
					<Route path="/" element={<Navigate to="/overview" replace />} />
					<Route path="/overview" element={<Overview />} />
					<Route path="/dispatch" element={<DispatchTerminal />} />
					<Route path="/inbox" element={<ActionInbox />} />
					<Route path="/convoys" element={<Convoys />} />
					<Route path="/beads" element={<Beads />} />
					<Route path="/pipeline" element={<Pipeline />}>
						<Route path="reviews" element={<PipelineReviews />} />
						<Route path="merge-queue" element={<PipelineMergeQueue />} />
						<Route path="tests" element={<PipelineTests />} />
						<Route path="deployments" element={<PipelineDeployments />} />
						<Route path="monitoring" element={<PipelineMonitoring />} />
					</Route>
					<Route path="/rigs" element={<Rigs />} />
					<Route path="/agents" element={<Agents />} />
					<Route path="/logs" element={<Logs />} />
					<Route path="/settings" element={<SettingsPage />} />
					<Route path="/onboarding" element={<Onboarding />} />
				</Routes>
			</main>
			</div>
		</div>
	);
}
