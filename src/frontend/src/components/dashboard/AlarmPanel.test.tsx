import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/utils";
import { AlarmPanel } from "./AlarmPanel";
import type { AgentRuntime, RigStatus } from "@/types/api";

function createMockAgent(overrides: Partial<AgentRuntime> = {}): AgentRuntime {
	return {
		name: "test-agent",
		address: "test/agent/001",
		session: "session-001",
		role: "polecat",
		running: true,
		has_work: false,
		unread_mail: 0,
		...overrides,
	};
}

function createMockRig(overrides: Partial<RigStatus> = {}): RigStatus {
	return {
		name: "test-rig",
		polecats: [],
		polecat_count: 0,
		crews: [],
		crew_count: 0,
		has_witness: false,
		has_refinery: false,
		...overrides,
	};
}

describe("AlarmPanel", () => {
	describe("shows ALL OK when no alerts", () => {
		it("displays ALL OK badge when agents and rigs are healthy", () => {
			const agents = [createMockAgent({ running: true, unread_mail: 0 })];
			const rigs = [createMockRig()];

			render(<AlarmPanel agents={agents} rigs={rigs} />);

			expect(screen.getByTestId("all-ok")).toBeInTheDocument();
			expect(screen.getByText("ALL OK")).toBeInTheDocument();
			expect(screen.getByText("No active alarms")).toBeInTheDocument();
		});

		it("displays ALL OK when no agents or rigs", () => {
			render(<AlarmPanel agents={[]} rigs={[]} />);

			expect(screen.getByTestId("all-ok")).toBeInTheDocument();
		});
	});

	describe("shows attention items for agent errors", () => {
		it("displays error alert when agent is in error state", () => {
			const agents = [
				createMockAgent({
					name: "error-agent",
					state: "error",
				}),
			];
			const rigs: RigStatus[] = [];

			render(<AlarmPanel agents={agents} rigs={rigs} />);

			expect(screen.getByTestId("error-count")).toBeInTheDocument();
			expect(screen.getByText("1 ERR")).toBeInTheDocument();
			expect(screen.getByTestId("alert-error")).toBeInTheDocument();
			expect(screen.getByText(/error-agent: Agent in error state/)).toBeInTheDocument();
		});

		it("displays multiple errors for multiple agents in error", () => {
			const agents = [
				createMockAgent({ name: "error-agent-1", state: "error" }),
				createMockAgent({ name: "error-agent-2", state: "error" }),
			];
			const rigs: RigStatus[] = [];

			render(<AlarmPanel agents={agents} rigs={rigs} />);

			expect(screen.getByText("2 ERR")).toBeInTheDocument();
		});
	});

	describe("shows attention items for high mail volume", () => {
		it("displays warning when agent has more than 5 unread messages", () => {
			const agents = [
				createMockAgent({
					name: "busy-agent",
					unread_mail: 10,
				}),
			];
			const rigs: RigStatus[] = [];

			render(<AlarmPanel agents={agents} rigs={rigs} />);

			expect(screen.getByTestId("warning-count")).toBeInTheDocument();
			expect(screen.getByText("1 WARN")).toBeInTheDocument();
			expect(screen.getByTestId("alert-warning")).toBeInTheDocument();
			expect(screen.getByText(/busy-agent: 10 unread messages/)).toBeInTheDocument();
		});

		it("does not show warning when agent has 5 or fewer unread messages", () => {
			const agents = [createMockAgent({ unread_mail: 5 })];
			const rigs: RigStatus[] = [];

			render(<AlarmPanel agents={agents} rigs={rigs} />);

			expect(screen.queryByTestId("warning-count")).not.toBeInTheDocument();
			expect(screen.getByTestId("all-ok")).toBeInTheDocument();
		});
	});

	describe("shows attention items for rig issues", () => {
		it("displays warning when rig has workers allocated but none running", () => {
			const agents: AgentRuntime[] = [];
			const rigs = [
				createMockRig({
					name: "idle-rig",
					polecat_count: 2,
					agents: [createMockAgent({ running: false })],
				}),
			];

			render(<AlarmPanel agents={agents} rigs={rigs} />);

			expect(screen.getByTestId("warning-count")).toBeInTheDocument();
			expect(screen.getByText(/idle-rig: Workers allocated but none running/)).toBeInTheDocument();
		});

		it("does not show warning when workers are running", () => {
			const agents: AgentRuntime[] = [];
			const rigs = [
				createMockRig({
					name: "active-rig",
					polecat_count: 2,
					agents: [createMockAgent({ running: true })],
				}),
			];

			render(<AlarmPanel agents={agents} rigs={rigs} />);

			expect(screen.queryByTestId("warning-count")).not.toBeInTheDocument();
			expect(screen.getByTestId("all-ok")).toBeInTheDocument();
		});

		it("does not show warning when rig has no workers allocated", () => {
			const agents: AgentRuntime[] = [];
			const rigs = [
				createMockRig({
					name: "empty-rig",
					polecat_count: 0,
					crew_count: 0,
					agents: [createMockAgent({ running: false })],
				}),
			];

			render(<AlarmPanel agents={agents} rigs={rigs} />);

			expect(screen.queryByTestId("warning-count")).not.toBeInTheDocument();
			expect(screen.getByTestId("all-ok")).toBeInTheDocument();
		});
	});

	describe("combined alerts", () => {
		it("shows both error and warning counts when both exist", () => {
			const agents = [
				createMockAgent({ name: "error-agent", state: "error" }),
				createMockAgent({ name: "mail-agent", unread_mail: 10 }),
			];
			const rigs: RigStatus[] = [];

			render(<AlarmPanel agents={agents} rigs={rigs} />);

			expect(screen.getByTestId("error-count")).toBeInTheDocument();
			expect(screen.getByTestId("warning-count")).toBeInTheDocument();
			expect(screen.getByText("1 ERR")).toBeInTheDocument();
			expect(screen.getByText("1 WARN")).toBeInTheDocument();
		});

		it("limits displayed alerts to 5", () => {
			const agents = [
				createMockAgent({ name: "agent-1", state: "error" }),
				createMockAgent({ name: "agent-2", state: "error" }),
				createMockAgent({ name: "agent-3", state: "error" }),
				createMockAgent({ name: "agent-4", state: "error" }),
				createMockAgent({ name: "agent-5", state: "error" }),
				createMockAgent({ name: "agent-6", state: "error" }),
			];
			const rigs: RigStatus[] = [];

			render(<AlarmPanel agents={agents} rigs={rigs} />);

			// Should show 6 ERR in the count
			expect(screen.getByText("6 ERR")).toBeInTheDocument();

			// But only 5 alerts should be displayed in the list
			const alertsInList = screen.getAllByTestId("alert-error");
			expect(alertsInList).toHaveLength(5);
		});
	});
});
