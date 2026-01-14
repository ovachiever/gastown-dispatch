import { spawn as ptySpawn, IPty } from "node-pty";
import { WebSocket } from "ws";

interface PtySession {
	pty: IPty;
	ws: WebSocket;
	pane: string;
}

export class PtyService {
	private sessions: Map<WebSocket, PtySession> = new Map();

	/**
	 * Create a PTY session that attaches to a tmux pane and streams output
	 */
	createSession(ws: WebSocket, pane: string): void {
		// Spawn shell that attaches to tmux pane
		// Using bash -c ensures proper terminal allocation for tmux
		const shell = process.env.SHELL || "/bin/bash";
		const pty = ptySpawn(shell, ["-c", `tmux attach-session -t "${pane}"`], {
			name: "xterm-256color",
			cols: 80,
			rows: 24,
			cwd: process.env.HOME || process.cwd(),
			env: process.env as { [key: string]: string },
		});

		const session: PtySession = { pty, ws, pane };
		this.sessions.set(ws, session);

		// Stream PTY output to WebSocket
		pty.onData((data) => {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(data);
			}
		});

		// Handle PTY exit
		pty.onExit(({ exitCode, signal }) => {
			console.log(
				`PTY exited for pane ${pane}: exitCode=${exitCode}, signal=${signal}`,
			);
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
		for (const ws of this.sessions.keys()) {
			this.cleanup(ws);
		}
	}
}

export const ptyService = new PtyService();
