import { useState } from "react";
import { Send, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function Dispatch() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [context, setContext] = useState<"town" | "rig" | "convoy" | "bead">("town");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // TODO: Implement actual Mayor interaction
    // For now, show a placeholder response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `[Mayor interaction coming in Phase 1]\n\nYou said: "${userMessage.content}"\n\nContext: ${context}\n\nThis will spawn Claude Code subprocess with context injection and execute your request.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gt-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dispatch</h1>
          <p className="text-sm text-gt-muted">
            Talk to the Mayor - your AI coordinator
          </p>
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
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "max-w-2xl",
                message.role === "user" ? "ml-auto" : "mr-auto"
              )}
            >
              <div
                className={cn(
                  "rounded-lg p-3",
                  message.role === "user"
                    ? "bg-gt-accent/20 text-gt-text"
                    : "bg-gt-surface border border-gt-border"
                )}
              >
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {message.content}
                </pre>
              </div>
              <p className="text-xs text-gt-muted mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          ))
        )}
        {isLoading && (
          <div className="max-w-2xl mr-auto">
            <div className="bg-gt-surface border border-gt-border rounded-lg p-3">
              <div className="flex items-center gap-2 text-gt-muted">
                <div className="w-2 h-2 bg-gt-accent rounded-full animate-pulse" />
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
