import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
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
  messages: DispatchMessage[];
  status: "active" | "idle" | "error";
}

class DispatchService extends EventEmitter {
  private process: ChildProcess | null = null;
  private currentSession: DispatchSession | null = null;
  private messageIdCounter = 0;

  async startSession(townRoot?: string): Promise<DispatchSession> {
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

  getSession(): DispatchSession | null {
    return this.currentSession;
  }

  getMessages(): DispatchMessage[] {
    return this.currentSession?.messages || [];
  }

  endSession(): void {
    if (this.currentSession) {
      this.addMessage({
        role: "system",
        content: "Dispatch session ended.",
      });
      this.currentSession.status = "idle";
    }
    
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}

export const dispatchService = new DispatchService();
