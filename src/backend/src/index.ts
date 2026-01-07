import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { createServer } from "http";
import routes from "./api/routes.js";
import streamingRoutes from "./api/streaming.js";
import { terminalService } from "./services/terminal.js";

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(
	compression({
		filter: (req, res) => {
			// Disable compression for SSE streams - they need unbuffered delivery
			// Use originalUrl because req.url is modified by sub-routers
			if (req.originalUrl.startsWith("/api/stream")) {
				return false;
			}
			return compression.filter(req, res);
		},
	}),
);
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
	res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api", routes);

// Streaming routes (SSE)
app.use("/api/stream", streamingRoutes);

// Attach WebSocket terminal service
terminalService.attach(server);

// Start server
server.listen(PORT, () => {
	console.log(`gastown-dispatch backend running on http://localhost:${PORT}`);
	console.log(`API available at http://localhost:${PORT}/api`);
	console.log(`Terminal WebSocket at ws://localhost:${PORT}/terminal`);
	if (process.env.GT_TOWN_ROOT) {
		console.log(`Gas Town root: ${process.env.GT_TOWN_ROOT}`);
	}
});
