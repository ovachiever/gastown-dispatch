import type {
	StatusResponse,
	Convoy,
	ConvoyDetail,
	StrandedConvoy,
	SynthesisStatus,
	Bead,
	ActionResult,
	BeadFilters,
	AlarmsResponse,
} from "@/types/api";

const API_BASE = "/api";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
	const response = await fetch(`${API_BASE}${url}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
		},
	});

	if (!response.ok) {
		const error = await response
			.json()
			.catch(() => ({ message: response.statusText }));
		throw new Error(error.message || error.error || "Request failed");
	}

	return response.json();
}

// Status
export async function getStatus(): Promise<StatusResponse> {
	return fetchJson<StatusResponse>("/status");
}

// Alarms
export async function getDerivedAlarms(): Promise<AlarmsResponse> {
	return fetchJson<AlarmsResponse>("/alarms");
}

// Convoys
export async function getConvoys(
	status?: "open" | "closed",
): Promise<Convoy[]> {
	const params = status ? `?status=${status}` : "";
	return fetchJson<Convoy[]>(`/convoys${params}`);
}

export async function getConvoy(id: string): Promise<Convoy> {
	return fetchJson<Convoy>(`/convoys/${encodeURIComponent(id)}`);
}

export async function getConvoyDetail(id: string): Promise<ConvoyDetail> {
	return fetchJson<ConvoyDetail>(`/convoys/${encodeURIComponent(id)}/detail`);
}

export async function getStrandedConvoys(): Promise<StrandedConvoy[]> {
	return fetchJson<StrandedConvoy[]>("/convoys/stranded");
}

export async function closeConvoy(
	id: string,
	reason: string,
): Promise<ActionResult> {
	return fetchJson<ActionResult>(`/convoys/${encodeURIComponent(id)}/close`, {
		method: "POST",
		body: JSON.stringify({ reason }),
	});
}

export async function addIssuesToConvoy(
	id: string,
	issues: string[],
): Promise<ActionResult> {
	return fetchJson<ActionResult>(`/convoys/${encodeURIComponent(id)}/issues`, {
		method: "POST",
		body: JSON.stringify({ issues }),
	});
}

export async function removeIssueFromConvoy(
	convoyId: string,
	issueId: string,
): Promise<ActionResult> {
	return fetchJson<ActionResult>(
		`/convoys/${encodeURIComponent(convoyId)}/issues/${encodeURIComponent(issueId)}`,
		{ method: "DELETE" },
	);
}

// Synthesis
export async function getSynthesisStatus(
	convoyId: string,
): Promise<SynthesisStatus> {
	return fetchJson<SynthesisStatus>(
		`/synthesis/${encodeURIComponent(convoyId)}/status`,
	);
}

export async function startSynthesis(
	convoyId: string,
	rig?: string,
): Promise<ActionResult> {
	return fetchJson<ActionResult>(
		`/synthesis/${encodeURIComponent(convoyId)}/start`,
		{
			method: "POST",
			body: JSON.stringify({ rig }),
		},
	);
}

export async function createConvoy(data: {
	name: string;
	issues: string[];
	notify?: string;
	molecule?: string;
}): Promise<ActionResult> {
	return fetchJson<ActionResult>("/convoys", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

// Beads
export async function getBeads(filters?: BeadFilters): Promise<Bead[]> {
	const params = new URLSearchParams();
	if (filters?.status) params.set("status", filters.status);
	if (filters?.type) params.set("type", filters.type);
	if (filters?.assignee) params.set("assignee", filters.assignee);
	if (filters?.parent) params.set("parent", filters.parent);
	if (filters?.limit) params.set("limit", String(filters.limit));

	const query = params.toString();
	return fetchJson<Bead[]>(`/beads${query ? `?${query}` : ""}`);
}

export async function getReadyBeads(): Promise<Bead[]> {
	return fetchJson<Bead[]>("/beads/ready");
}

export async function getBlockedBeads(): Promise<Bead[]> {
	return fetchJson<Bead[]>("/beads/blocked");
}

export async function getBead(id: string): Promise<Bead> {
	return fetchJson<Bead>(`/beads/${encodeURIComponent(id)}`);
}

export async function createBead(data: {
	title: string;
	description?: string;
	type?: string;
	priority?: number;
	parent?: string;
}): Promise<ActionResult> {
	return fetchJson<ActionResult>("/beads", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export async function updateBeadStatus(
	id: string,
	status: string,
): Promise<ActionResult> {
	return fetchJson<ActionResult>(`/beads/${encodeURIComponent(id)}/status`, {
		method: "PATCH",
		body: JSON.stringify({ status }),
	});
}

export async function closeBead(
	id: string,
	reason?: string,
): Promise<ActionResult> {
	return fetchJson<ActionResult>(`/beads/${encodeURIComponent(id)}/close`, {
		method: "POST",
		body: JSON.stringify({ reason }),
	});
}

// Actions
export async function startTown(): Promise<ActionResult> {
	return fetchJson<ActionResult>("/actions/start", { method: "POST" });
}

export async function shutdownTown(): Promise<ActionResult> {
	return fetchJson<ActionResult>("/actions/shutdown", { method: "POST" });
}

export async function slingWork(data: {
	bead_id: string;
	rig: string;
	formula?: string;
}): Promise<ActionResult> {
	return fetchJson<ActionResult>("/actions/sling", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export async function addRig(data: {
	name: string;
	url: string;
}): Promise<ActionResult> {
	return fetchJson<ActionResult>("/actions/rig/add", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export async function addCrew(data: {
	name: string;
	rig: string;
}): Promise<ActionResult> {
	return fetchJson<ActionResult>("/actions/crew/add", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export async function runDoctor(fix?: boolean): Promise<ActionResult> {
	return fetchJson<ActionResult>("/actions/doctor", {
		method: "POST",
		body: JSON.stringify({ fix }),
	});
}

export async function addPolecat(data: {
	rig: string;
	name: string;
}): Promise<ActionResult> {
	return fetchJson<ActionResult>("/actions/polecat/add", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export async function removePolecat(
	rig: string,
	name: string,
): Promise<ActionResult> {
	return fetchJson<ActionResult>(
		`/actions/polecat/${encodeURIComponent(rig)}/${encodeURIComponent(name)}`,
		{ method: "DELETE" },
	);
}

export async function nukePolecat(
	rig: string,
	name: string,
): Promise<ActionResult> {
	return fetchJson<ActionResult>(
		`/actions/polecat/${encodeURIComponent(rig)}/${encodeURIComponent(name)}/nuke`,
		{ method: "POST" },
	);
}

export async function nudge(agent: string, message: string): Promise<ActionResult> {
	return fetchJson<ActionResult>("/actions/nudge", {
		method: "POST",
		body: JSON.stringify({ agent, message }),
	});
}
