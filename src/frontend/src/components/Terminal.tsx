import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
	pane?: string;
	className?: string;
	onConnectionChange?: (connected: boolean) => void;
	onReady?: (api: TerminalApi) => void;
}

export interface TerminalApi {
	paste: (text: string) => void;
}

export function Terminal({
	pane = "hq-mayor",
	className = "",
	onConnectionChange,
	onReady,
}: TerminalProps) {
	const terminalRef = useRef<HTMLDivElement>(null);
	const xtermRef = useRef<XTerm | null>(null);
	const wsRef = useRef<WebSocket | null>(null);
	const fitAddonRef = useRef<FitAddon | null>(null);
	const [_connected, setConnected] = useState(false);

	useEffect(() => {
		if (!terminalRef.current) return;

		// Initialize xterm.js with Gas Town aesthetic
		const term = new XTerm({
			cursorBlink: false,
			cursorStyle: "bar",
			cursorInactiveStyle: "none",
			fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace",
			fontSize: 13,
			lineHeight: 1.2,
			letterSpacing: 0,
			scrollOnUserInput: true,
			// Enable text selection without modifier keys
			// Plain drag now selects text and auto-copies to clipboard
			// Safe for this use case: terminal only observes tmux (no mouse-mode apps)
			macOptionClickForcesSelection: false,
			// Enable word selection on right-click (standard macOS behavior)
			rightClickSelectsWord: true,
			theme: {
				background: "#0a0a0f", // Deep dark - the void
				foreground: "#e4e4e7", // Soft white
				cursor: "#0a0a0f", // Hidden - tmux shows its own cursor
				cursorAccent: "#0a0a0f",
				selectionBackground: "#facc1540",
				selectionForeground: "#ffffff",
				// ANSI colors - muted but readable
				black: "#18181b",
				red: "#f87171",
				green: "#4ade80",
				yellow: "#facc15",
				blue: "#60a5fa",
				magenta: "#c084fc",
				cyan: "#22d3ee",
				white: "#e4e4e7",
				brightBlack: "#3f3f46",
				brightRed: "#fca5a5",
				brightGreen: "#86efac",
				brightYellow: "#fde047",
				brightBlue: "#93c5fd",
				brightMagenta: "#d8b4fe",
				brightCyan: "#67e8f9",
				brightWhite: "#fafafa",
			},
			allowTransparency: true,
			scrollback: 5000,
			convertEol: true,
		});

		// Addons
		const fitAddon = new FitAddon();
		const webLinksAddon = new WebLinksAddon();
		term.loadAddon(fitAddon);
		term.loadAddon(webLinksAddon);

		// Mount terminal
		term.open(terminalRef.current);
		fitAddon.fit();

		// Enable copy-on-select with DEBUG LOGGING
		// Track last selection to prevent spam from empty/duplicate events
		let lastSelection = '';
		term.onSelectionChange(() => {
			console.log('[Terminal] Selection changed event fired');
			const selection = term.getSelection();
			console.log('[Terminal] Selection length:', selection?.length, 'chars');
			console.log('[Terminal] Selection text:', selection?.substring(0, 50));

			// Guard: Only process if selection actually changed and is non-empty
			if (selection && selection !== lastSelection && selection.length > 0) {
				lastSelection = selection;
				navigator.clipboard.writeText(selection)
					.then(() => {
						console.log('[Terminal] ✓ Successfully copied to clipboard');
					})
					.catch(err => {
						console.error('[Terminal] ✗ Clipboard write failed:', err);
					});
			} else {
				console.log('[Terminal] No selection to copy (empty or duplicate)');
			}
		});

		// DEBUG: Add mouse event listeners to verify events reach terminal
		const terminalElement = terminalRef.current;
		const handleMouseDown = (e: MouseEvent) => {
			console.log('[Terminal] mousedown:', {
				target: (e.target as HTMLElement)?.className,
				button: e.button,
				clientX: e.clientX,
				clientY: e.clientY,
			});
		};
		const handleMouseUp = (e: MouseEvent) => {
			console.log('[Terminal] mouseup:', {
				target: (e.target as HTMLElement)?.className,
				button: e.button,
			});
		};
		let mouseMoveCount = 0;
		const handleMouseMove = (e: MouseEvent) => {
			// Only log every 10th mousemove to avoid spam
			if (mouseMoveCount++ % 10 === 0) {
				console.log('[Terminal] mousemove (sampled):', {
					target: (e.target as HTMLElement)?.className,
				});
			}
		};
		terminalElement.addEventListener('mousedown', handleMouseDown);
		terminalElement.addEventListener('mouseup', handleMouseUp);
		terminalElement.addEventListener('mousemove', handleMouseMove);

		xtermRef.current = term;
		fitAddonRef.current = fitAddon;

		// Connect WebSocket
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const wsUrl = `${protocol}//${window.location.hostname}:4320/terminal?pane=${encodeURIComponent(pane)}`;
		const ws = new WebSocket(wsUrl);
		wsRef.current = ws;

		ws.onopen = () => {
			setConnected(true);
			onConnectionChange?.(true);
			term.write("\x1b[2m── Connected to " + pane + " ──\x1b[0m\r\n\r\n");

			// Send resize immediately after connection to sync tmux with terminal size
			setTimeout(() => {
				fitAddon.fit();
				if (term.cols && term.rows) {
					ws.send(
						JSON.stringify({
							type: "resize",
							cols: term.cols,
							rows: term.rows,
						}),
					);
				}
			}, 50);

			onReady?.({
				paste: (text: string) => {
					const socket = wsRef.current;
					if (socket?.readyState === WebSocket.OPEN) {
						socket.send(JSON.stringify({ type: "input", data: text }));
					}
				},
			});
		};

		// Handle incoming PTY data - write raw bytes directly to terminal
		ws.onmessage = (event) => {
			term.write(event.data);
		};

		ws.onclose = () => {
			setConnected(false);
			onConnectionChange?.(false);
			term.write("\r\n\x1b[2m── Disconnected ──\x1b[0m\r\n");
		};

		ws.onerror = () => {
			setConnected(false);
			onConnectionChange?.(false);
		};

		// Send input to server
		term.onData((data) => {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: "input", data }));
			}
		});

		// Handle resize - fit xterm to container and resize tmux pane
		let lastCols = 0;
		let lastRows = 0;
		let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

		const handleResize = () => {
			if (resizeTimeout) return; // Debounce
			resizeTimeout = setTimeout(() => {
				resizeTimeout = null;
				try {
					fitAddon.fit();
					// Only send if dimensions actually changed
					if (ws.readyState === WebSocket.OPEN && term.cols && term.rows) {
						if (term.cols !== lastCols || term.rows !== lastRows) {
							lastCols = term.cols;
							lastRows = term.rows;
							ws.send(
								JSON.stringify({
									type: "resize",
									cols: term.cols,
									rows: term.rows,
								}),
							);
						}
					}
				} catch {
					// Ignore fit errors
				}
			}, 100);
		};

		window.addEventListener("resize", handleResize);

		// ResizeObserver for container size changes - debounced
		const resizeObserver = new ResizeObserver((entries) => {
			// Only trigger if container has real dimensions
			const entry = entries[0];
			if (
				entry &&
				entry.contentRect.width > 0 &&
				entry.contentRect.height > 0
			) {
				handleResize();
			}
		});
		resizeObserver.observe(terminalRef.current);

		// Initial fit - retry multiple times as CSS layout settles
		// This handles flex containers that may not have final size immediately
		const fitAttempts = [50, 150, 300, 500];
		const fitTimeouts: ReturnType<typeof setTimeout>[] = [];
		fitAttempts.forEach((delay) => {
			fitTimeouts.push(
				setTimeout(() => {
					const container = terminalRef.current;
					if (
						container &&
						container.clientWidth > 0 &&
						container.clientHeight > 0
					) {
						handleResize();
					}
				}, delay),
			);
		});

		return () => {
			fitTimeouts.forEach(clearTimeout);
			window.removeEventListener("resize", handleResize);
			resizeObserver.disconnect();
			// Remove DEBUG mouse event listeners
			terminalElement.removeEventListener('mousedown', handleMouseDown);
			terminalElement.removeEventListener('mouseup', handleMouseUp);
			terminalElement.removeEventListener('mousemove', handleMouseMove);
			ws.close();
			term.dispose();
		};
	}, [pane, onConnectionChange]);

	return (
		<div
			ref={terminalRef}
			className={className}
			style={{
				width: "100%",
				height: "100%",
				backgroundColor: "#0a0a0f",
				position: "relative",
			}}
		/>
	);
}
