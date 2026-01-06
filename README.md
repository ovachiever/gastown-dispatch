# Gas Town Dispatch

A local-first web UI that provides complete replacement for human interaction with Gas Town. Never use tmux manually again.

## Overview

Gas Town Dispatch is designed for an experienced CIO who finds CLI tools confusing. It provides:

- **Full CLI replacement**: Every `gt` and `bd` command accessible through the UI
- **No tmux knowledge required**: All session management happens behind the scenes
- **Progressive disclosure**: Start simple, expand into details when needed
- **Clear state model**: What's happening, where's the work, who's doing it

## Quick Start

```bash
# Install dependencies
npm run install:all

# Development (runs both backend and frontend)
npm run dev

# Open browser
open http://localhost:3000
```

## Architecture

```
gastown-dispatch/
├── src/
│   ├── backend/          # Node.js + Express + TypeScript
│   │   ├── api/          # REST endpoints
│   │   ├── services/     # Business logic
│   │   ├── commands/     # gt/bd command wrappers
│   │   └── types/        # TypeScript types
│   └── frontend/         # React + TypeScript + Tailwind
│       └── src/
│           ├── pages/    # Route pages
│           ├── components/
│           ├── hooks/
│           └── lib/
├── docs/                 # Architecture & design docs
└── gastown/              # Gas Town source (reference)
```

## Features

### Overview
Town status, rigs, agents, and summary stats at a glance.

### Dispatch
Chat interface to the Mayor AI coordinator. Issue natural language instructions.

### Convoys
Track batched work across rigs. See progress, tracked issues, and workers.

### Beads
Browse issues, tasks, and work items. Filter by status, type, and priority.

### Agents
Monitor running agents. See status, current work, and mail.

### Logs
Real-time log streaming from Deacon, Mayor, Witness, and Refinery.

### Settings
Health check, configuration, and town management.

### Onboarding
Guided wizard to set up a new town, add a rig, and create your first workspace.

## Development

### Backend

```bash
cd src/backend
npm run dev       # Start with hot reload
npm run typecheck # Type checking
npm run lint      # Linting
npm run test      # Run tests
```

### Frontend

```bash
cd src/frontend
npm run dev       # Start Vite dev server
npm run typecheck # Type checking
npm run lint      # Linting
npm run build     # Production build
```

## API Endpoints

### Status
- `GET /api/status` - Town status

### Convoys
- `GET /api/convoys` - List convoys
- `GET /api/convoys/:id` - Convoy details
- `POST /api/convoys` - Create convoy

### Beads
- `GET /api/beads` - List beads with filters
- `GET /api/beads/ready` - Ready (unblocked) beads
- `GET /api/beads/:id` - Bead details
- `POST /api/beads` - Create bead
- `PATCH /api/beads/:id/status` - Update status

### Actions
- `POST /api/actions/start` - Start Gas Town
- `POST /api/actions/shutdown` - Shutdown
- `POST /api/actions/sling` - Sling work to rig
- `POST /api/actions/rig/add` - Add rig
- `POST /api/actions/crew/add` - Add crew
- `POST /api/actions/doctor` - Health check

## Gas Town Concepts

| Term | Description |
|------|-------------|
| **Town** | Your workspace containing all projects and agents |
| **Rig** | A project container with its own git repo and workers |
| **Mayor** | AI coordinator that manages cross-project work |
| **Deacon** | Background supervisor daemon |
| **Witness** | Per-project monitor that watches workers |
| **Refinery** | Per-project merge queue processor |
| **Polecat** | Ephemeral worker that executes a single task |
| **Crew** | Persistent human workspace in a project |
| **Convoy** | Batch of tracked work across projects |
| **Beads** | Git-backed issue/task tracker |

## Implementation Status

- [x] Project structure
- [x] Backend API skeleton
- [x] Frontend pages skeleton
- [x] Types and API client
- [ ] Status endpoint implementation
- [ ] Convoy management
- [ ] Beads management
- [ ] Action execution
- [ ] Log streaming (SSE)
- [ ] Dispatch (Mayor chat)
- [ ] Onboarding flow
- [ ] Tests

## License

MIT
