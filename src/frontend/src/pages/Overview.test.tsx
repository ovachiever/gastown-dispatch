import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/utils";
import Overview from "./Overview";
import * as api from "@/lib/api";
import type { StatusResponse, AgentRuntime, RigStatus, Convoy, Bead } from "@/types/api";

// Mock the API module
vi.mock("@/lib/api", () => ({
	getStatus: vi.fn(),
	getConvoys: vi.fn(),
	getBeads: vi.fn(),
	startTown: vi.fn(),
	shutdownTown: vi.fn(),
}));

// Mock useConvoySubscription
vi.mock("@/hooks/useConvoySubscription", () => ({
	useConvoySubscription: () => ({ connected: true }),
}));

const mockGetStatus = vi.mocked(api.getStatus);
const mockGetConvoys = vi.mocked(api.getConvoys);
const mockGetBeads = vi.mocked(api.getBeads);

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

function createMockStatus(overrides: Partial<StatusResponse["status"]> = {}): StatusResponse {
	return {
		initialized: true,
		status: {
			name: "Test Town",
			location: "/test/location",
			agents: [
				createMockAgent({ name: "mayor", role: "mayor", running: true }),
				createMockAgent({ name: "deacon", role: "deacon", running: true }),
			],
			rigs: [createMockRig({ name: "test-rig" })],
			summary: {
				rig_count: 1,
				polecat_count: 0,
				crew_count: 0,
				witness_count: 0,
				refinery_count: 0,
				active_hooks: 0,
			},
			...overrides,
		},
	};
}

function createMockConvoy(overrides: Partial<Convoy> = {}): Convoy {
	return {
		id: "convoy-001",
		title: "Test Convoy",
		status: "open",
		created_at: new Date().toISOString(),
		...overrides,
	};
}

function createMockBead(overrides: Partial<Bead> = {}): Bead {
	return {
		id: "bead-001",
		title: "Test Bead",
		status: "open",
		type: "task",
		priority: 2,
		created_at: new Date().toISOString(),
		...overrides,
	};
}

describe("Overview Page", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetConvoys.mockResolvedValue([]);
		mockGetBeads.mockResolvedValue([]);
	});

	describe("loading state", () => {
		it("shows loading spinner while fetching status", async () => {
			// Make the status query hang
			mockGetStatus.mockImplementation(() => new Promise(() => {}));

			render(<Overview />);

			expect(screen.getByText(/INITIALIZING CONTROL SYSTEM/i)).toBeInTheDocument();
		});
	});

	describe("disconnected state", () => {
		it("shows disconnected message when status is not initialized", async () => {
			mockGetStatus.mockResolvedValue({ initialized: false });

			render(<Overview />);

			await waitFor(() => {
				expect(screen.getByText(/Gas Town Not Connected/i)).toBeInTheDocument();
			});
		});

		it("shows START button when disconnected", async () => {
			mockGetStatus.mockResolvedValue({ initialized: false });

			render(<Overview />);

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /START GAS TOWN/i })).toBeInTheDocument();
			});
		});
	});

	describe("connected state", () => {
		it("renders the dashboard when connected", async () => {
			mockGetStatus.mockResolvedValue(createMockStatus());

			render(<Overview />);

			await waitFor(() => {
				expect(screen.getByText("Test Town")).toBeInTheDocument();
			});
		});

		it("shows ONLINE status when deacon is running", async () => {
			mockGetStatus.mockResolvedValue(createMockStatus());

			render(<Overview />);

			await waitFor(() => {
				expect(screen.getByText("ONLINE")).toBeInTheDocument();
			});
		});

		it("displays agent activity in Control Room section", async () => {
			mockGetStatus.mockResolvedValue(createMockStatus());

			render(<Overview />);

			await waitFor(() => {
				expect(screen.getByText("Control Room")).toBeInTheDocument();
				expect(screen.getByText("MAYOR")).toBeInTheDocument();
				expect(screen.getByText("DEACON")).toBeInTheDocument();
			});
		});
	});

	describe("AlarmPanel integration", () => {
		it("shows AlarmPanel with ALL OK when no issues", async () => {
			mockGetStatus.mockResolvedValue(createMockStatus());

			render(<Overview />);

			await waitFor(() => {
				expect(screen.getByTestId("alarm-panel")).toBeInTheDocument();
				expect(screen.getByTestId("all-ok")).toBeInTheDocument();
			});
		});

		it("shows attention items when agent has errors", async () => {
			const statusWithErrors = createMockStatus({
				agents: [
					createMockAgent({ name: "error-agent", state: "error" }),
					createMockAgent({ name: "deacon", role: "deacon", running: true }),
				],
			});
			mockGetStatus.mockResolvedValue(statusWithErrors);

			render(<Overview />);

			await waitFor(() => {
				expect(screen.getByTestId("alarm-panel")).toBeInTheDocument();
				expect(screen.getByTestId("error-count")).toBeInTheDocument();
			});
		});
	});

	describe("Work Pipeline", () => {
		it("displays work pipeline with bead counts", async () => {
			mockGetStatus.mockResolvedValue(createMockStatus());
			mockGetBeads.mockResolvedValue([
				createMockBead({ status: "open" }),
				createMockBead({ status: "in_progress" }),
				createMockBead({ status: "closed" }),
			]);

			render(<Overview />);

			await waitFor(() => {
				expect(screen.getByText("Work Pipeline")).toBeInTheDocument();
			});
		});
	});

	describe("Convoy Panel", () => {
		it("displays convoy panel", async () => {
			mockGetStatus.mockResolvedValue(createMockStatus());
			mockGetConvoys.mockResolvedValue([createMockConvoy()]);

			render(<Overview />);

			await waitFor(() => {
				// Look for convoy panel header
				expect(screen.getByText("Active Convoys")).toBeInTheDocument();
			});
		});
	});

	describe("Rig Stations", () => {
		it("displays rig stations panel", async () => {
			mockGetStatus.mockResolvedValue(
				createMockStatus({
					rigs: [
						createMockRig({ name: "main-rig", polecat_count: 2 }),
						createMockRig({ name: "backup-rig" }),
					],
				})
			);

			render(<Overview />);

			await waitFor(() => {
				expect(screen.getByText("Rig Stations")).toBeInTheDocument();
			});
		});
	});
});
