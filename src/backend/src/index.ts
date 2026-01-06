import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import routes from "./api/routes.js";
import streamingRoutes from "./api/streaming.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
	res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api", routes);

// Streaming routes (SSE)
app.use("/api/stream", streamingRoutes);

// Start server
app.listen(PORT, () => {
	console.log(`gastown-dispatch backend running on http://localhost:${PORT}`);
	console.log(`API available at http://localhost:${PORT}/api`);
});
