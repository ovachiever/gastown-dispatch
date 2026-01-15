import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
	logStreamer,
	dispatchStreamer,
	convoyStreamer,
} from "../services/streaming.js";
import { dispatchService } from "../services/dispatch.js";
import { dashboardStreamer } from "../services/dashboard.js";
import { telemetryStreamer } from "../services/telemetry.js";

const router = Router();

// Helper to get town root
function getTownRoot(req: Request): string | undefined {
	return (req.query.townRoot as string) || process.env.GT_TOWN_ROOT;
}

// SSE helper
function setupSSE(res: Response): void {
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");
	res.setHeader("X-Accel-Buffering", "no");
	res.flushHeaders();
}

function sendSSE(res: Response, event: string, data: unknown): void {
	res.write(`event: ${event}\n`);
	res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// =====================
// Log Streaming
// =====================

router.get("/logs", (req: Request, res: Response) => {
	setupSSE(res);

	const clientId = uuidv4();

	const client = {
		id: clientId,
		send: (event: string, data: unknown) => sendSSE(res, event, data),
		close: () => res.end(),
	};

	// Send initial connected event
	sendSSE(res, "connected", { clientId, timestamp: new Date().toISOString() });

	// Register client
	logStreamer.addClient(client);

	// Handle client disconnect
	req.on("close", () => {
		logStreamer.removeClient(clientId);
	});
});

// Get recent logs (non-streaming)
router.get("/logs/recent", (_req: Request, res: Response) => {
	res.json({
		logs: logStreamer.getBuffer(),
		streaming: logStreamer.isRunning(),
	});
});

// =====================
// Dispatch Streaming (Mayor Chat)
// =====================

router.get("/dispatch", (req: Request, res: Response) => {
	setupSSE(res);

	const clientId = uuidv4();

	const client = {
		id: clientId,
		send: (event: string, data: unknown) => sendSSE(res, event, data),
		close: () => res.end(),
	};

	// Send initial state
	const session = dispatchService.getSession();
	sendSSE(res, "connected", {
		clientId,
		session: session?.id,
		timestamp: new Date().toISOString(),
	});

	// Send existing messages
	if (session) {
		for (const msg of session.messages) {
			sendSSE(res, "message", msg);
		}
	}

	// Register client
	dispatchStreamer.addClient(client);

	// Handle client disconnect
	req.on("close", () => {
		dispatchStreamer.removeClient(clientId);
	});
});

// Send message to Mayor
router.post("/dispatch/send", async (req: Request, res: Response) => {
	try {
		const { content } = req.body;

		if (!content || typeof content !== "string") {
			res.status(400).json({
				success: false,
				message: "Content is required",
			});
			return;
		}

		const message = await dispatchService.sendMessage(
			content,
			getTownRoot(req),
		);
		res.json({ success: true, message });
	} catch (err) {
		res.status(500).json({
			success: false,
			message: "Failed to send message",
			error: err instanceof Error ? err.message : String(err),
		});
	}
});

// Start/get dispatch session
router.post("/dispatch/session", async (req: Request, res: Response) => {
	try {
		const session = await dispatchService.startSession(getTownRoot(req));
		res.json({ success: true, session });
	} catch (err) {
		res.status(500).json({
			success: false,
			message: "Failed to start session",
			error: err instanceof Error ? err.message : String(err),
		});
	}
});

// Get current session info
router.get("/dispatch/session", (_req: Request, res: Response) => {
	const session = dispatchService.getSession();
	res.json({ session });
});

// End dispatch session
router.delete("/dispatch/session", (_req: Request, res: Response) => {
	dispatchService.endSession();
	res.json({ success: true, message: "Session ended" });
});

// =====================
// Transcript Persistence
// =====================

// List all transcripts
router.get("/dispatch/transcripts", (_req: Request, res: Response) => {
	const transcripts = dispatchService.getTranscripts();
	res.json({ transcripts });
});

// Get a specific transcript
router.get("/dispatch/transcripts/:id", (req: Request, res: Response) => {
	const transcript = dispatchService.loadTranscript(req.params.id);
	if (!transcript) {
		res.status(404).json({ success: false, message: "Transcript not found" });
		return;
	}
	res.json({ transcript });
});

// =====================
// Convoy Streaming
// =====================

router.get("/convoys", (req: Request, res: Response) => {
	setupSSE(res);

	const clientId = uuidv4();
	const townRoot = getTownRoot(req);

	const client = {
		id: clientId,
		send: (event: string, data: unknown) => sendSSE(res, event, data),
		close: () => res.end(),
	};

	// Send initial connected event
	sendSSE(res, "connected", {
		clientId,
		timestamp: new Date().toISOString(),
	});

	// Register client
	convoyStreamer.addClient(client, townRoot);

	// Handle client disconnect
	req.on("close", () => {
		convoyStreamer.removeClient(clientId);
	});
});

// =====================
// Dashboard Streaming
// =====================

router.get("/dashboard/stream", (req: Request, res: Response) => {
	setupSSE(res);

	const clientId = uuidv4();
	const townRoot = getTownRoot(req);

	const client = {
		id: clientId,
		send: (event: string, data: unknown) => sendSSE(res, event, data),
		close: () => res.end(),
	};

	// Send initial connected event
	sendSSE(res, "connected", {
		clientId,
		timestamp: new Date().toISOString(),
	});

	// Register client
	dashboardStreamer.addClient(client, townRoot);

	// Handle client disconnect
	req.on("close", () => {
		dashboardStreamer.removeClient(clientId);
	});
});

// =====================
// Telemetry Streaming
// =====================

router.get("/telemetry", (req: Request, res: Response) => {
	setupSSE(res);

	const clientId = uuidv4();
	const townRoot = getTownRoot(req);

	const client = {
		id: clientId,
		send: (event: string, data: unknown) => sendSSE(res, event, data),
		close: () => res.end(),
	};

	// Send initial connected event
	sendSSE(res, "connected", {
		clientId,
		timestamp: new Date().toISOString(),
	});

	// Register client - will send initial snapshot and start polling
	telemetryStreamer.addClient(client, townRoot);

	// Handle client disconnect
	req.on("close", () => {
		telemetryStreamer.removeClient(clientId);
	});
});

export default router;
