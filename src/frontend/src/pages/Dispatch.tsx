import { useState, useEffect, useRef } from "react";
import { Send, Settings2, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface DispatchMessage {
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

export default function Dispatch() {
  const [messages, setMessages] = useState<DispatchMessage[]>([]);
  const [input, setInput] = useState("");
  const [context, setContext] = useState<"town" | "rig" | "convoy" | "bead">("town");
  const [isLoading, setIsLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const eventSource = new EventSource("/api/stream/dispatch");
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("connected", (e) => {
      setConnected(true);
      console.log("Dispatch stream connected:", JSON.parse(e.data));
    });

    eventSource.addEventListener("message", (e) => {
      const msg = JSON.parse(e.data) as DispatchMessage;
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setIsLoading(false);
    });

    eventSource.addEventListener("error", (e) => {
      const err = JSON.parse((e as MessageEvent).data);
      console.error("Dispatch error:", err);
      setIsLoading(false);
    });

    eventSource.onerror = () => {
      setConnected(false);
    };

    // Start session
    fetch("/api/stream/dispatch/session", { method: "POST" });

    return () => {
      eventSource.close();
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const content = input.trim();
    setInput("");
    setIsLoading(true);

    // Optimistically add user message
    const userMsg: DispatchMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/stream/dispatch/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to send message");
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "system",
          content: `Error: ${err instanceof Error ? err.message : String(err)}`,
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "user": return "bg-gt-accent/20 text-gt-text";
      case "mayor": return "bg-purple-900/30 border-purple-500/50";
      case "system": return "bg-gt-surface border-gt-border text-gt-muted";
      default: return "bg-gt-surface border-gt-border";
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gt-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold">Dispatch</h1>
            <p className="text-sm text-gt-muted">
              Talk to the Mayor - your AI coordinator
            </p>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-gt-surface">
            {connected ? (
              <>
                <Wifi size={14} className="text-green-400" />
                <span className="text-xs text-green-400">Connected</span>
              </>
            ) : (
              <>
                <WifiOff size={14} className="text-red-400" />
                <span className="text-xs text-red-400">Disconnected</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={context}
            onChange={(e) => setContext(e.target.value as typeof context)}
            className="bg-gt-surface border border-gt-border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="town">Town-wide</option>
            <option value="rig">Rig-scoped</option>
            <option value="convoy">Convoy-scoped</option>
            <option value="bead">Bead-scoped</option>
          </select>
          <button
            className="p-2 rounded-lg bg-gt-surface hover:bg-gt-border transition-colors"
            title="Settings"
          >
            <Settings2 size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <p className="text-gt-muted text-lg mb-4">
                Welcome to Dispatch
              </p>
              <p className="text-sm text-gt-muted mb-6">
                This is your direct line to the Mayor. Ask it to create convoys,
                sling work, check status, or coordinate across rigs.
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <button
                  onClick={() => setInput("What's the status of my workspace?")}
                  className="p-2 bg-gt-surface border border-gt-border rounded-lg hover:bg-gt-border transition-colors text-left"
                >
                  What's the status?
                </button>
                <button
                  onClick={() => setInput("Create a convoy for the auth feature")}
                  className="p-2 bg-gt-surface border border-gt-border rounded-lg hover:bg-gt-border transition-colors text-left"
                >
                  Create a convoy
                </button>
                <button
                  onClick={() => setInput("Show me ready work")}
                  className="p-2 bg-gt-surface border border-gt-border rounded-lg hover:bg-gt-border transition-colors text-left"
                >
                  Show ready work
                </button>
                <button
                  onClick={() => setInput("What should I work on next?")}
                  className="p-2 bg-gt-surface border border-gt-border rounded-lg hover:bg-gt-border transition-colors text-left"
                >
                  What's next?
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-2xl",
                  message.role === "user" ? "ml-auto" : "mr-auto"
                )}
              >
                <div
                  className={cn(
                    "rounded-lg p-3 border",
                    getRoleColor(message.role)
                  )}
                >
                  {message.role === "mayor" && (
                    <p className="text-xs text-purple-400 mb-1 font-medium">Mayor</p>
                  )}
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {message.content}
                  </pre>
                </div>
                <p className="text-xs text-gt-muted mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
        {isLoading && (
          <div className="max-w-2xl mr-auto">
            <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-purple-300">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                <span className="text-sm">Mayor is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-gt-border flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tell the Mayor what you need..."
          className="flex-1 bg-gt-surface border border-gt-border rounded-lg px-4 py-2 focus:outline-none focus:border-gt-accent"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-4 py-2 bg-gt-accent text-black rounded-lg hover:bg-gt-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
