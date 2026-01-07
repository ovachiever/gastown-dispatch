import { WebSocket, WebSocketServer } from "ws";
import { spawn, ChildProcess } from "child_process";
import type { Server } from "http";

interface TerminalSession {
	ws: WebSocket;
	tmuxProc: ChildProcess | null;
	pane: string;
}

class TerminalService {
	private wss: WebSocketServer | null = null;
	private sessions: Map<WebSocket, TerminalSession> = new Map();

	attach(server: Server): void {
		this.wss = new WebSocketServer({ server, path: "/terminal" });

		this.wss.on("connection", (ws, req) => {
			// Parse pane from query string: /terminal?pane=hq-mayor
			const url = new URL(req.url || "", `http://${req.headers.host}`);
			const pane = url.searchParams.get("pane") || "hq-mayor";

			console.log(`Terminal WebSocket connected for pane: ${pane}`);

			const session: TerminalSession = {
				ws,
				tmuxProc: null,
				pane,
			};
			this.sessions.set(ws, session);

			// Start streaming tmux output
			this.startTmuxStream(session);

			// Handle input from client
			ws.on("message", (data) => {
				const message = data.toString();
				try {
					const parsed = JSON.parse(message);
					if (parsed.type === "input") {
						this.sendToTmux(session.pane, parsed.data);
					} else if (parsed.type === "resize") {
						this.resizeTmux(session.pane, parsed.cols, parsed.rows);
					}
				} catch {
					// Raw input fallback
					this.sendToTmux(session.pane, message);
				}
			});

			ws.on("close", () => {
				console.log(`Terminal WebSocket disconnected for pane: ${pane}`);
				this.cleanup(session);
				this.sessions.delete(ws);
			});

			ws.on("error", (err) => {
				console.error(`Terminal WebSocket error for pane ${pane}:`, err);
				this.cleanup(session);
				this.sessions.delete(ws);
			});
		});

		console.log("Terminal WebSocket server attached at /terminal");
	}

	private startTmuxStream(session: TerminalSession): void {
		// Use tmux pipe-pane to stream output, or capture-pane polling
		// For real-time streaming, we use a control mode approach
		this.streamWithCapture(session);
	}

	private streamWithCapture(session: TerminalSession): void {
		let lastOutput = "";

		// Poll tmux pane content at regular intervals
		const poll = () => {
			if (session.ws.readyState !== WebSocket.OPEN) return;

			const proc = spawn("tmux", [
				"capture-pane",
				"-t",
				session.pane,
				"-p",
				"-e", // Include escape sequences for colors
			]);

			let output = "";
			proc.stdout?.on("data", (data: Buffer) => {
				output += data.toString();
			});

			proc.on("close", () => {
				// Only send if content changed
				if (output !== lastOutput) {
					lastOutput = output;
					if (session.ws.readyState === WebSocket.OPEN) {
						session.ws.send(JSON.stringify({ type: "output", data: output }));
					}
				}
			});
		};

		// Initial capture
		poll();

		// Start polling interval
		const intervalId = setInterval(poll, 100);

		// Store interval for cleanup
		session.tmuxProc = { kill: () => clearInterval(intervalId) } as any;
	}

	private sendToTmux(pane: string, keys: string): void {
		// Send keystrokes to tmux pane
		spawn("tmux", ["send-keys", "-t", pane, "-l", keys]);
	}

	private resizeTmux(pane: string, cols: number, rows: number): void {
		// Resize the tmux window and pane to match the web terminal
		if (cols > 0 && rows > 0) {
			console.log(`Resizing tmux ${pane} to ${cols}x${rows}`);
			// Extract session name from pane (e.g., "hq-mayor" -> "hq-mayor")
			const session = pane.split(":")[0];
			// Resize window first (pane can't be bigger than window)
			spawn("tmux", [
				"resize-window",
				"-t",
				session,
				"-x",
				String(cols),
				"-y",
				String(rows),
			]);
			// Then resize pane
			spawn("tmux", [
				"resize-pane",
				"-t",
				pane,
				"-x",
				String(cols),
				"-y",
				String(rows),
			]);
		}
	}

	private cleanup(session: TerminalSession): void {
		if (session.tmuxProc) {
			session.tmuxProc.kill();
			session.tmuxProc = null;
		}
	}

	// Get list of available tmux panes (Gas Town agents)
	async listPanes(): Promise<
		Array<{ name: string; session: string; active: boolean }>
	> {
		return new Promise((resolve) => {
			const proc = spawn("tmux", [
				"list-panes",
				"-a",
				"-F",
				"#{session_name}:#{pane_title}:#{pane_active}",
			]);

			let output = "";
			proc.stdout?.on("data", (data: Buffer) => {
				output += data.toString();
			});

			proc.on("close", () => {
				const panes = output
					.split("\n")
					.filter(Boolean)
					.map((line) => {
						const [session, title, active] = line.split(":");
						return {
							name: title || session,
							session,
							active: active === "1",
						};
					})
					.filter((p) => p.session.startsWith("hq-")); // Only Gas Town sessions

				resolve(panes);
			});

			proc.on("error", () => resolve([]));
		});
	}
}

export const terminalService = new TerminalService();
