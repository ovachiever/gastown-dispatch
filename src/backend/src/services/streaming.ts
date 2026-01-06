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
  private process: ChildProcess | null = null;
  private clients: Map<string, StreamClient> = new Map();
  private buffer: LogEntry[] = [];
  private maxBufferSize = 100;

  start(townRoot?: string): void {
    if (this.process) return;

    const cwd = townRoot || findTownRoot() || process.cwd();

    // Use gt logs --follow for streaming logs
    this.process = spawn("gt", ["logs", "--follow", "--json"], {
      cwd,
      env: process.env,
    });

    this.process.stdout?.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as LogEntry;
          this.addEntry(entry);
        } catch {
          // Non-JSON log line, wrap it
          this.addEntry({
            timestamp: new Date().toISOString(),
            source: "gastown",
            level: "info",
            message: line,
          });
        }
      }
    });

    this.process.stderr?.on("data", (data: Buffer) => {
      this.addEntry({
        timestamp: new Date().toISOString(),
        source: "gastown",
        level: "error",
        message: data.toString(),
      });
    });

    this.process.on("close", () => {
      this.process = null;
      // Notify clients of disconnection
      this.broadcast("status", { connected: false });
    });

    this.process.on("error", (err) => {
      this.addEntry({
        timestamp: new Date().toISOString(),
        source: "system",
        level: "error",
        message: `Log stream error: ${err.message}`,
      });
    });
  }

  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
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
    if (!this.process) {
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
    return this.process !== null;
  }
}

// Singleton instance
export const logStreamer = new LogStreamer();

// Dispatch streaming for Mayor chat
class DispatchStreamer extends EventEmitter {
  private clients: Map<string, StreamClient> = new Map();

  addClient(client: StreamClient): void {
    this.clients.set(client.id, client);
  }

  removeClient(id: string): void {
    this.clients.delete(id);
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
}

export const dispatchStreamer = new DispatchStreamer();
