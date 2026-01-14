import { spawn as ptySpawn, IPty } from "node-pty";
import { WebSocket } from "ws";

interface PtySession {
	pty: IPty;
	ws: WebSocket;
	pane: string;
	createdAt: number;
	lastActivity: number;
}

export class PtyService {
	private sessions: Map<WebSocket, PtySession> = new Map();
	private timeoutCheckInterval: NodeJS.Timeout | null = null;
	private readonly IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
	private readonly IDLE_WARNING_MS = 25 * 60 * 1000; // 25 minutes (warn before timeout)

	/**
	 * Create a PTY session that attaches to a tmux pane and streams output
	 */
	createSession(ws: WebSocket, pane: string): void {
		// Spawn tmux directly to attach to the session
		// This allows multiple clients to view/interact with the same session
		const pty = ptySpawn("tmux", ["attach-session", "-t", pane], {
			name: "xterm-256color",
			cols: 80,
			rows: 24,
			cwd: process.env.HOME || process.cwd(),
			env: process.env as { [key: string]: string },
		});

		const now = Date.now();
		const session: PtySession = {
			pty,
			ws,
			pane,
			createdAt: now,
			lastActivity: now,
		};
		this.sessions.set(ws, session);

		// Stream PTY output to WebSocket
		pty.onData((data) => {
			session.lastActivity = Date.now();
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(data);
			}
		});

		// Handle PTY exit
		pty.onExit(({ exitCode, signal }) => {
			const lifespan = Date.now() - session.createdAt;
			console.log(
				`PTY exited for pane ${pane}: exitCode=${exitCode}, signal=${signal}, lifespan=${lifespan}ms`,
			);

			// If PTY exits quickly (within 2 seconds) with error, likely tmux session doesn't exist
			if (lifespan < 2000 && exitCode !== 0) {
				const errorMsg = `\r\n\x1b[31mError: Failed to attach to tmux session "${pane}"\r\n` +
					`The session may not exist or has already terminated.\x1b[0m\r\n`;
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(errorMsg);
				}
			} else if (exitCode !== 0 || signal !== undefined) {
				// Session died unexpectedly
				const errorMsg = `\r\n\x1b[31mTerminal session disconnected (exit code: ${exitCode}, signal: ${signal})\x1b[0m\r\n`;
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(errorMsg);
				}
			}

			this.cleanup(ws);
		});
	}

	/**
	 * Send input from WebSocket to PTY
	 */
	sendInput(ws: WebSocket, data: string): void {
		const session = this.sessions.get(ws);
		if (session) {
			session.pty.write(data);
		}
	}

	/**
	 * Resize PTY to match terminal dimensions
	 */
	resize(ws: WebSocket, cols: number, rows: number): void {
		const session = this.sessions.get(ws);
		if (session && cols > 0 && rows > 0) {
			console.log(`Resizing PTY for pane ${session.pane} to ${cols}x${rows}`);
			session.pty.resize(cols, rows);
		}
	}

	/**
	 * Clean up PTY session
	 */
	cleanup(ws: WebSocket): void {
		const session = this.sessions.get(ws);
		if (session) {
			try {
				session.pty.kill();
			} catch (err) {
				console.error(`Error killing PTY for pane ${session.pane}:`, err);
			}
			this.sessions.delete(ws);
		}
	}

	/**
	 * Clean up all sessions
	 */
	cleanupAll(): void {
		if (this.timeoutCheckInterval) {
			clearInterval(this.timeoutCheckInterval);
			this.timeoutCheckInterval = null;
		}
		for (const ws of this.sessions.keys()) {
			this.cleanup(ws);
		}
	}

	/**
	 * Start periodic timeout checks for idle sessions
	 */
	startTimeoutChecker(): void {
		if (this.timeoutCheckInterval) {
			return; // Already running
		}

		// Check every minute for idle sessions
		this.timeoutCheckInterval = setInterval(() => {
			const now = Date.now();
			for (const [ws, session] of this.sessions.entries()) {
				const idleTime = now - session.lastActivity;

				// Timeout: close connection
				if (idleTime >= this.IDLE_TIMEOUT_MS) {
					console.log(
						`Closing idle PTY session for pane ${session.pane} (idle ${Math.floor(idleTime / 1000)}s)`,
					);
					const timeoutMsg =
						"\r\n\x1b[33mConnection timed out due to inactivity\x1b[0m\r\n";
					if (ws.readyState === WebSocket.OPEN) {
						ws.send(timeoutMsg);
					}
					this.cleanup(ws);
				}
				// Warning: approaching timeout
				else if (
					idleTime >= this.IDLE_WARNING_MS &&
					idleTime < this.IDLE_WARNING_MS + 60000
				) {
					const remainingMin = Math.ceil(
						(this.IDLE_TIMEOUT_MS - idleTime) / 60000,
					);
					const warningMsg = `\r\n\x1b[33mWarning: Connection will timeout in ${remainingMin} minute(s) due to inactivity\x1b[0m\r\n`;
					if (ws.readyState === WebSocket.OPEN) {
						ws.send(warningMsg);
					}
				}
			}
		}, 60000); // Check every minute
	}
}

export const ptyService = new PtyService();
