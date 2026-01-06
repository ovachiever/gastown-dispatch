import { Router, Request, Response, NextFunction } from "express";
import { getTownStatus } from "../services/status.js";
import { listConvoys, getConvoyStatus, createConvoy, addToConvoy } from "../services/convoys.js";
import { listBeads, getReadyBeads, getBlockedBeads, getBead, createBead, updateBeadStatus, closeBead } from "../services/beads.js";
import { startTown, shutdownTown, slingWork, addRig, removeRig, addCrew, nudgeAgent, runDoctor } from "../services/actions.js";
import type { ConvoyCreateRequest, SlingRequest, RigAddRequest, CrewAddRequest, BeadFilters } from "../types/gasown.js";

const router = Router();

// Error handling wrapper
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Get town root from request or environment
function getTownRoot(req: Request): string | undefined {
  return (req.query.townRoot as string) || process.env.GT_TOWN_ROOT;
}

// =====================
// Status & Overview
// =====================

router.get("/status", asyncHandler(async (req, res) => {
  const status = await getTownStatus(getTownRoot(req));
  res.json(status);
}));

// =====================
// Convoys
// =====================

router.get("/convoys", asyncHandler(async (req, res) => {
  const status = req.query.status as "open" | "closed" | undefined;
  const convoys = await listConvoys(status, getTownRoot(req));
  res.json(convoys);
}));

router.get("/convoys/:id", asyncHandler(async (req, res) => {
  const convoy = await getConvoyStatus(req.params.id, getTownRoot(req));
  res.json(convoy);
}));

router.post("/convoys", asyncHandler(async (req, res) => {
  const request = req.body as ConvoyCreateRequest;
  const result = await createConvoy(request, getTownRoot(req));
  res.status(result.success ? 201 : 400).json(result);
}));

router.post("/convoys/:id/issues", asyncHandler(async (req, res) => {
  const { issues } = req.body as { issues: string[] };
  const result = await addToConvoy(req.params.id, issues, getTownRoot(req));
  res.json(result);
}));

// =====================
// Beads (Issues)
// =====================

router.get("/beads", asyncHandler(async (req, res) => {
  const filters: BeadFilters = {
    status: req.query.status as string | undefined,
    type: req.query.type as string | undefined,
    assignee: req.query.assignee as string | undefined,
    parent: req.query.parent as string | undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
  };
  const beads = await listBeads(filters, getTownRoot(req));
  res.json(beads);
}));

router.get("/beads/ready", asyncHandler(async (req, res) => {
  const beads = await getReadyBeads(getTownRoot(req));
  res.json(beads);
}));

router.get("/beads/blocked", asyncHandler(async (req, res) => {
  const beads = await getBlockedBeads(getTownRoot(req));
  res.json(beads);
}));

router.get("/beads/:id", asyncHandler(async (req, res) => {
  const bead = await getBead(req.params.id, getTownRoot(req));
  res.json(bead);
}));

router.post("/beads", asyncHandler(async (req, res) => {
  const { title, description, type, priority, parent } = req.body;
  const result = await createBead(title, { description, type, priority, parent }, getTownRoot(req));
  res.status(result.success ? 201 : 400).json(result);
}));

router.patch("/beads/:id/status", asyncHandler(async (req, res) => {
  const { status } = req.body;
  const result = await updateBeadStatus(req.params.id, status, getTownRoot(req));
  res.json(result);
}));

router.post("/beads/:id/close", asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const result = await closeBead(req.params.id, reason, getTownRoot(req));
  res.json(result);
}));

// =====================
// Actions
// =====================

router.post("/actions/start", asyncHandler(async (req, res) => {
  const result = await startTown(getTownRoot(req));
  res.json(result);
}));

router.post("/actions/shutdown", asyncHandler(async (req, res) => {
  const result = await shutdownTown(getTownRoot(req));
  res.json(result);
}));

router.post("/actions/sling", asyncHandler(async (req, res) => {
  const request = req.body as SlingRequest;
  const result = await slingWork(request, getTownRoot(req));
  res.json(result);
}));

router.post("/actions/rig/add", asyncHandler(async (req, res) => {
  const request = req.body as RigAddRequest;
  const result = await addRig(request, getTownRoot(req));
  res.status(result.success ? 201 : 400).json(result);
}));

router.delete("/actions/rig/:name", asyncHandler(async (req, res) => {
  const result = await removeRig(req.params.name, getTownRoot(req));
  res.json(result);
}));

router.post("/actions/crew/add", asyncHandler(async (req, res) => {
  const request = req.body as CrewAddRequest;
  const result = await addCrew(request, getTownRoot(req));
  res.status(result.success ? 201 : 400).json(result);
}));

router.post("/actions/nudge", asyncHandler(async (req, res) => {
  const { agent, message } = req.body;
  const result = await nudgeAgent(agent, message, getTownRoot(req));
  res.json(result);
}));

router.post("/actions/doctor", asyncHandler(async (req, res) => {
  const { fix } = req.body;
  const result = await runDoctor(fix === true, getTownRoot(req));
  res.json(result);
}));

// =====================
// Error handler
// =====================

router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("API Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: err.message,
  });
});

export default router;
