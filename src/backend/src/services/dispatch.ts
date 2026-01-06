import { ChildProcess } from "child_process";
import { EventEmitter } from "events";
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { findTownRoot } from "../config/townRoot.js";
import { dispatchStreamer } from "./streaming.js";

export interface DispatchMessage {
  id: string;
  role: "user" | "mayor" | "system";
  content: string;
  timestamp: string;
  metadata?: {
    agent?: string;
    action?: string;
    beadId?: string;
  };
}

export interface DispatchSession {
  id: string;
  started: string;
  ended?: string;
  messages: DispatchMessage[];
  status: "active" | "idle" | "error";
}

// Get transcripts directory
function getTranscriptsDir(): string {
  const dataDir = process.env.DISPATCH_DATA_DIR || join(process.cwd(), ".dispatch");
  const transcriptsDir = join(dataDir, "transcripts");
  
  if (!existsSync(transcriptsDir)) {
    mkdirSync(transcriptsDir, { recursive: true });
  }
  
  return transcriptsDir;
}

class DispatchService extends EventEmitter {
  private process: ChildProcess | null = null;
  private currentSession: DispatchSession | null = null;
  private messageIdCounter = 0;

  async startSession(townRoot?: string): Promise<DispatchSession> {
    // Save previous session before starting new one
    if (this.currentSession && this.currentSession.messages.length > 0) {
      this.saveTranscript(this.currentSession);
    }

    if (this.currentSession?.status === "active") {
      return this.currentSession;
    }

    const sessionId = `dispatch-${Date.now()}`;
    this.currentSession = {
      id: sessionId,
      started: new Date().toISOString(),
      messages: [],
      status: "active",
    };

    // Add system message
    this.addMessage({
      role: "system",
      content: "Dispatch session started. You can now communicate with the Mayor.",
    });

    return this.currentSession;
  }

  async sendMessage(content: string, townRoot?: string): Promise<DispatchMessage> {
    if (!this.currentSession) {
      await this.startSession(townRoot);
    }

    // Add user message
    const userMsg = this.addMessage({
      role: "user",
      content,
    });

    // Broadcast user message to all clients
    dispatchStreamer.sendToAll("message", userMsg);

    // Send to Mayor via gt nudge
    const cwd = townRoot || findTownRoot() || process.cwd();
    
    try {
      // For now, we'll simulate the Mayor response
      // In production, this would use gt nudge mayor "message"
      // and listen for the response via the mail system
      
      const responseMsg = this.addMessage({
        role: "mayor",
        content: `Acknowledged: "${content}". The Mayor will process this request.`,
        metadata: {
          agent: "mayor",
          action: "acknowledge",
        },
      });

      // Broadcast to all connected clients
      dispatchStreamer.sendToAll("message", responseMsg);

      // Auto-save after each exchange
      this.autoSave();

      return responseMsg;
    } catch (err) {
      const errorMsg = this.addMessage({
        role: "system",
        content: `Failed to send message: ${err instanceof Error ? err.message : String(err)}`,
      });
      dispatchStreamer.sendToAll("error", errorMsg);
      throw err;
    }
  }

  private addMessage(
    partial: Omit<DispatchMessage, "id" | "timestamp">
  ): DispatchMessage {
    const message: DispatchMessage = {
      id: `msg-${++this.messageIdCounter}`,
      timestamp: new Date().toISOString(),
      ...partial,
    };

    if (this.currentSession) {
      this.currentSession.messages.push(message);
    }

    this.emit("message", message);
    return message;
  }

  private autoSave(): void {
    if (this.currentSession && this.currentSession.messages.length > 0) {
      this.saveTranscript(this.currentSession);
    }
  }

  private saveTranscript(session: DispatchSession): void {
    try {
      const transcriptsDir = getTranscriptsDir();
      const filename = `${session.id}.json`;
      const filepath = join(transcriptsDir, filename);
      
      writeFileSync(filepath, JSON.stringify(session, null, 2));
    } catch (err) {
      console.error("Failed to save transcript:", err);
    }
  }

  getSession(): DispatchSession | null {
    return this.currentSession;
  }

  getMessages(): DispatchMessage[] {
    return this.currentSession?.messages || [];
  }

  // Get list of saved transcripts
  getTranscripts(): { id: string; started: string; messageCount: number }[] {
    try {
      const transcriptsDir = getTranscriptsDir();
      const files = readdirSync(transcriptsDir).filter(f => f.endsWith(".json"));
      
      return files.map(file => {
        const filepath = join(transcriptsDir, file);
        const content = readFileSync(filepath, "utf-8");
        const session = JSON.parse(content) as DispatchSession;
        return {
          id: session.id,
          started: session.started,
          messageCount: session.messages.length,
        };
      }).sort((a, b) => new Date(b.started).getTime() - new Date(a.started).getTime());
    } catch {
      return [];
    }
  }

  // Load a specific transcript
  loadTranscript(sessionId: string): DispatchSession | null {
    try {
      const transcriptsDir = getTranscriptsDir();
      const filepath = join(transcriptsDir, `${sessionId}.json`);
      
      if (!existsSync(filepath)) {
        return null;
      }
      
      const content = readFileSync(filepath, "utf-8");
      return JSON.parse(content) as DispatchSession;
    } catch {
      return null;
    }
  }

  endSession(): void {
    if (this.currentSession) {
      this.currentSession.ended = new Date().toISOString();
      this.addMessage({
        role: "system",
        content: "Dispatch session ended.",
      });
      this.currentSession.status = "idle";
      
      // Save final transcript
      this.saveTranscript(this.currentSession);
    }
    
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}

export const dispatchService = new DispatchService();
