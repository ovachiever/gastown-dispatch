import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import { findTownRoot } from "../config/townRoot.js";

export interface LogEntry {
	timestamp: string;
	source: string;
	level: "info" | "warn" | "error" | "debug";
	message: string;
	data?: Record<string, unknown>;
}

export interface StreamClient {
	id: string;
	send: (event: string, data: unknown) => void;
	close: () => void;
}

class LogStreamer extends EventEmitter {
	private gtLogProcess: ChildProcess | null = null;
	private daemonTailProcess: ChildProcess | null = null;
	private clients: Map<string, StreamClient> = new Map();
	private buffer: LogEntry[] = [];
	private maxBufferSize = 100;

	start(townRoot?: string): void {
		if (this.gtLogProcess) return;

		const cwd = townRoot || findTownRoot() || process.cwd();

		// Stream 1: gt log -f for agent lifecycle events
		this.gtLogProcess = spawn("gt", ["log", "-f"], {
			cwd,
			env: process.env,
		});

		this.gtLogProcess.stdout?.on("data", (data: Buffer) => {
			const lines = data.toString().split("\n").filter(Boolean);
			for (const line of lines) {
				// Parse gt log output format: "○ 12:30:06 spawn northstar_coherence/witness"
				const match = line.match(/^[○●]\s+(\d{2}:\d{2}:\d{2})\s+(\w+)\s+(.*)$/);
				if (match) {
					const [, time, type, details] = match;
					const today = new Date().toISOString().split("T")[0];
					this.addEntry({
						timestamp: `${today}T${time}`,
						source: "gt-log",
						level: type === "crash" || type === "kill" ? "error" : "info",
						message: `[${type}] ${details}`,
					});
				} else if (line.trim()) {
					this.addEntry({
						timestamp: new Date().toISOString(),
						source: "gt-log",
						level: "info",
						message: line,
					});
				}
			}
		});

		this.gtLogProcess.stderr?.on("data", (data: Buffer) => {
			const msg = data.toString().trim();
			// Ignore "no log file yet" message
			if (!msg.includes("No log file yet")) {
				this.addEntry({
					timestamp: new Date().toISOString(),
					source: "gt-log",
					level: "error",
					message: msg,
				});
			}
		});

		this.gtLogProcess.on("close", () => {
			this.gtLogProcess = null;
		});

		// Stream 2: tail daemon.log for daemon activity
		const daemonLogPath = `${cwd}/daemon/daemon.log`;
		this.daemonTailProcess = spawn("tail", ["-f", "-n", "20", daemonLogPath], {
			cwd,
			env: process.env,
		});

		this.daemonTailProcess.stdout?.on("data", (data: Buffer) => {
			const lines = data.toString().split("\n").filter(Boolean);
			for (const line of lines) {
				// Parse daemon log format: "2026/01/06 12:28:39 Message here"
				const match = line.match(
					/^(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})\s+(.*)$/,
				);
				if (match) {
					const [, timestamp, message] = match;
					const isoTimestamp = timestamp.replace(/\//g, "-").replace(" ", "T");
					const level = message.toLowerCase().includes("error")
						? "error"
						: message.toLowerCase().includes("warn")
							? "warn"
							: "info";
					this.addEntry({
						timestamp: isoTimestamp,
						source: "daemon",
						level,
						message,
					});
				}
			}
		});

		this.daemonTailProcess.on("close", () => {
			this.daemonTailProcess = null;
		});

		this.daemonTailProcess.on("error", () => {
			// Daemon log might not exist yet, ignore
		});
	}

	stop(): void {
		if (this.gtLogProcess) {
			this.gtLogProcess.kill();
			this.gtLogProcess = null;
		}
		if (this.daemonTailProcess) {
			this.daemonTailProcess.kill();
			this.daemonTailProcess = null;
		}
	}

	private addEntry(entry: LogEntry): void {
		this.buffer.push(entry);
		if (this.buffer.length > this.maxBufferSize) {
			this.buffer.shift();
		}
		this.broadcast("log", entry);
		this.emit("log", entry);
	}

	addClient(client: StreamClient): void {
		this.clients.set(client.id, client);

		// Send recent buffer to new client
		for (const entry of this.buffer) {
			client.send("log", entry);
		}

		// Start streaming if not already
		if (!this.gtLogProcess) {
			this.start();
		}
	}

	removeClient(id: string): void {
		this.clients.delete(id);

		// Stop streaming if no clients
		if (this.clients.size === 0) {
			this.stop();
		}
	}

	private broadcast(event: string, data: unknown): void {
		for (const client of this.clients.values()) {
			client.send(event, data);
		}
	}

	getBuffer(): LogEntry[] {
		return [...this.buffer];
	}

	isRunning(): boolean {
		return this.gtLogProcess !== null || this.daemonTailProcess !== null;
	}
}

// Singleton instance
export const logStreamer = new LogStreamer();

// Dispatch streaming for Mayor chat with bidirectional tmux capture
class DispatchStreamer extends EventEmitter {
	private clients: Map<string, StreamClient> = new Map();
	private captureInterval: NodeJS.Timeout | null = null;
	private messageCounter = 0;
	private lastSentContent = ""; // Track last content we actually sent

	addClient(client: StreamClient): void {
		this.clients.set(client.id, client);
		// Start capturing Mayor output when first client connects
		if (this.clients.size === 1) {
			this.startCapture();
		}
	}

	removeClient(id: string): void {
		this.clients.delete(id);
		// Stop capturing when no clients
		if (this.clients.size === 0) {
			this.stopCapture();
		}
	}

	private startCapture(): void {
		if (this.captureInterval) return;

		// Capture Mayor's tmux pane every 500ms
		this.captureInterval = setInterval(() => {
			this.captureMayorOutput();
		}, 500);

		// Initial capture
		this.captureMayorOutput();
	}

	private stopCapture(): void {
		if (this.captureInterval) {
			clearInterval(this.captureInterval);
			this.captureInterval = null;
		}
	}

	private captureMayorOutput(): void {
		const proc = spawn(
			"tmux",
			["capture-pane", "-t", "hq-mayor", "-p", "-S", "-50"],
			{
				stdio: ["ignore", "pipe", "pipe"],
			},
		);

		let stdout = "";
		proc.stdout?.on("data", (data: Buffer) => {
			stdout += data.toString();
		});

		proc.on("close", (code) => {
			if (code !== 0 || !stdout) return;

			// Extract the latest Mayor response (after last "> " prompt)
			const latestResponse = this.extractLatestResponse(stdout);
			if (!latestResponse) return;

			// Normalize for comparison (strip volatile UI elements)
			const normalized = this.normalizeForComparison(latestResponse);

			// Only send if this is genuinely new content
			if (normalized && normalized !== this.lastSentContent) {
				this.lastSentContent = normalized;

				this.sendToAll("message", {
					id: `mayor-${++this.messageCounter}-${Date.now()}`,
					role: "mayor",
					content: latestResponse,
					timestamp: new Date().toISOString(),
				});
			}
		});
	}

	private extractLatestResponse(content: string): string | null {
		// Split by input prompts to find the latest exchange
		// Look for "> " at start of line (user input prompt)
		const lines = content.split("\n");

		// Find the last user input ("> something" that isn't just ">")
		let lastPromptIndex = -1;
		for (let i = lines.length - 1; i >= 0; i--) {
			const line = lines[i].trim();
			if (line.startsWith(">") && line.length > 1 && !line.includes("↵ send")) {
				lastPromptIndex = i;
				break;
			}
		}

		if (lastPromptIndex === -1) return null;

		// Get everything after the last prompt
		const responseLines = lines.slice(lastPromptIndex + 1);

		// Filter out UI chrome
		const filtered = responseLines.filter((line) => {
			const trimmed = line.trim();
			if (!trimmed) return false;

			// Skip box drawing / UI elements
			if (/^[─│╭╰╮╯]/.test(trimmed)) return false;

			// Skip status bars and prompts
			if (trimmed.includes("bypass permissions")) return false;
			if (trimmed.includes("shift+tab to cycle")) return false;
			if (trimmed.includes("ctrl+")) return false;
			if (trimmed.includes("↵ send")) return false;
			if (trimmed === ">") return false;

			// Skip loading spinners at end (but keep "Context cleared" etc)
			if (/^[✶·⏺]?\s*(Whirring|Thinking|Meandering|Reticulating)/.test(trimmed))
				return false;
			if (trimmed.includes("esc to interrupt")) return false;

			return true;
		});

		if (filtered.length === 0) return null;

		// Clean up the content
		let result = filtered.join("\n").trim();

		// Remove status indicators from lines
		result = result.replace(/^[⏺✻·]\s*/gm, "");
		result = result.replace(/^⎿\s*/gm, "  ");

		return result || null;
	}

	private normalizeForComparison(content: string): string {
		// Strip things that change frequently but don't represent new content
		return content
			.replace(/\d+s\s*·/g, "") // Remove "55s ·" timers
			.replace(/↓\s*\d+\s*tokens?/g, "") // Remove "↓ 0 tokens"
			.replace(/\s+/g, " ") // Normalize whitespace
			.trim();
	}

	sendToAll(event: string, data: unknown): void {
		for (const client of this.clients.values()) {
			client.send(event, data);
		}
	}

	sendToClient(id: string, event: string, data: unknown): void {
		const client = this.clients.get(id);
		if (client) {
			client.send(event, data);
		}
	}

	hasClients(): boolean {
		return this.clients.size > 0;
	}

	// Reset state when starting a new session
	resetState(): void {
		this.lastSentContent = "";
	}
}

export const dispatchStreamer = new DispatchStreamer();
