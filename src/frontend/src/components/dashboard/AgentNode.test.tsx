import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/utils";
import { AgentNode } from "./AgentNode";
import type { AgentRuntime } from "@/types/api";

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

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

describe("AgentNode", () => {
	beforeEach(() => {
		mockNavigate.mockClear();
	});

	describe("renders correct status for each state", () => {
		it("shows offline status when agent is not running", () => {
			const agent = createMockAgent({ running: false });
			render(
				<svg>
					<AgentNode agent={agent} x={0} y={0} />
				</svg>
			);

			// Check that the agent name is displayed
			expect(screen.getByText("test-agent")).toBeInTheDocument();
		});

		it("shows working status when agent has work", () => {
			const agent = createMockAgent({
				running: true,
				has_work: true,
				work_title: "Test Task",
			});
			render(
				<svg>
					<AgentNode agent={agent} x={0} y={0} />
				</svg>
			);

			expect(screen.getByText("test-agent")).toBeInTheDocument();
			// Work badge should show "1" when has_work is true
			expect(screen.getByText("1")).toBeInTheDocument();
		});

		it("shows error status when agent state is error", () => {
			const agent = createMockAgent({
				running: true,
				state: "error",
			});
			render(
				<svg>
					<AgentNode agent={agent} x={0} y={0} />
				</svg>
			);

			expect(screen.getByText("test-agent")).toBeInTheDocument();
		});

		it("shows active status when agent is running without work", () => {
			const agent = createMockAgent({
				running: true,
				has_work: false,
			});
			render(
				<svg>
					<AgentNode agent={agent} x={0} y={0} />
				</svg>
			);

			expect(screen.getByText("test-agent")).toBeInTheDocument();
		});
	});

	describe("displays correct role icons", () => {
		it("shows M for mayor role", () => {
			const agent = createMockAgent({ role: "mayor" });
			render(
				<svg>
					<AgentNode agent={agent} x={0} y={0} />
				</svg>
			);

			expect(screen.getByText("M")).toBeInTheDocument();
		});

		it("shows D for deacon role", () => {
			const agent = createMockAgent({ role: "deacon" });
			render(
				<svg>
					<AgentNode agent={agent} x={0} y={0} />
				</svg>
			);

			expect(screen.getByText("D")).toBeInTheDocument();
		});

		it("shows first letter capitalized for other roles", () => {
			const agent = createMockAgent({ role: "polecat" });
			render(
				<svg>
					<AgentNode agent={agent} x={0} y={0} />
				</svg>
			);

			expect(screen.getByText("P")).toBeInTheDocument();
		});
	});

	describe("click handlers navigate to correct routes", () => {
		it("navigates to agent detail page on click", () => {
			const agent = createMockAgent({ address: "test/agent/001" });
			render(
				<svg>
					<AgentNode agent={agent} x={0} y={0} />
				</svg>
			);

			// Click the group element containing the agent
			const agentElement = screen.getByText("test-agent").closest("g");
			expect(agentElement).toBeInTheDocument();
			fireEvent.click(agentElement!);

			expect(mockNavigate).toHaveBeenCalledWith("/agents/test/agent/001");
		});

		it("calls custom onClick handler when provided", () => {
			const customHandler = vi.fn();
			const agent = createMockAgent();
			render(
				<svg>
					<AgentNode agent={agent} x={0} y={0} onClick={customHandler} />
				</svg>
			);

			const agentElement = screen.getByText("test-agent").closest("g");
			fireEvent.click(agentElement!);

			expect(customHandler).toHaveBeenCalled();
			expect(mockNavigate).not.toHaveBeenCalled();
		});
	});

	describe("work badge display", () => {
		it("does not show work badge when agent has no work", () => {
			const agent = createMockAgent({ has_work: false });
			render(
				<svg>
					<AgentNode agent={agent} x={0} y={0} />
				</svg>
			);

			// Work count badge should not be present
			expect(screen.queryByText("1")).not.toBeInTheDocument();
		});

		it("shows work badge when agent has work", () => {
			const agent = createMockAgent({ has_work: true });
			render(
				<svg>
					<AgentNode agent={agent} x={0} y={0} />
				</svg>
			);

			expect(screen.getByText("1")).toBeInTheDocument();
		});
	});

	describe("tooltip content", () => {
		it("displays agent name and role in tooltip", () => {
			const agent = createMockAgent({
				name: "worker-01",
				role: "polecat",
			});
			render(
				<svg>
					<AgentNode agent={agent} x={0} y={0} />
				</svg>
			);

			// The SVG title element should contain the tooltip content
			const title = screen.getByText(/worker-01 \(polecat\)/);
			expect(title).toBeInTheDocument();
		});

		it("includes work title in tooltip when present", () => {
			const agent = createMockAgent({
				has_work: true,
				work_title: "Important Task",
			});
			render(
				<svg>
					<AgentNode agent={agent} x={0} y={0} />
				</svg>
			);

			const title = screen.getByText(/Work: Important Task/);
			expect(title).toBeInTheDocument();
		});

		it("includes unread mail count in tooltip when present", () => {
			const agent = createMockAgent({
				unread_mail: 5,
			});
			render(
				<svg>
					<AgentNode agent={agent} x={0} y={0} />
				</svg>
			);

			const title = screen.getByText(/Unread: 5/);
			expect(title).toBeInTheDocument();
		});
	});
});
