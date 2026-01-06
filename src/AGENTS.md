# gastown-dispatch Agent Instructions

## Project Overview

**gastown-dispatch** is a local-first web UI that provides complete replacement for human interaction with Gas Town. Users should never need to use tmux manually or understand CLI commands.

## Core Principles

1. **Full CLI Replacement**: Every `gt` and `bd` command must be accessible through the UI
2. **No tmux Knowledge Required**: All tmux operations happen behind the scenes
3. **Progressive Disclosure**: Start simple, expand into details when needed
4. **Clear State Model**: What is happening, where is work, who is doing it, what changed, what next

## Architecture

```
gastown-dispatch/
├── src/
│   ├── backend/              # Node.js backend service
│   │   ├── api/              # REST + SSE endpoints
│   │   ├── services/         # Business logic
│   │   ├── commands/         # gt/bd command wrappers
│   │   └── types/            # TypeScript types
│   └── frontend/             # React SPA
│       └── src/
│           ├── components/   # Reusable UI components
│           ├── pages/        # Route pages
│           ├── hooks/        # Custom React hooks
│           ├── lib/          # Utilities
│           └── types/        # TypeScript types
├── docs/                     # Architecture & evolution docs
└── .beads/                   # Issue tracking
```

## Command Execution Model

The backend wraps `gt` and `bd` CLI commands as subprocesses:

```typescript
// Commands with JSON output (preferred)
gt status --json
gt convoy list --json
gt convoy status <id> --json
bd list --json
bd ready --json
bd show <id> --json

// Commands without JSON (parse text output)
gt agents
gt mail inbox
gt rig list
```

## Key Gas Town Concepts (for UI explanation)

| Term | Plain English |
|------|---------------|
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
| **Hook** | Work assigned to an agent |
| **Molecule** | Structured workflow with steps |

## API Design

### REST Endpoints

```
GET  /api/status                # Town status
GET  /api/rigs                  # List rigs
GET  /api/rigs/:name            # Rig details
GET  /api/convoys               # List convoys
GET  /api/convoys/:id           # Convoy details
GET  /api/beads                 # List beads with filters
GET  /api/beads/:id             # Bead details
GET  /api/agents                # List agents
GET  /api/logs/:source          # Log viewer

POST /api/actions/start         # gt start
POST /api/actions/shutdown      # gt shutdown
POST /api/actions/sling         # gt sling <bead> <rig>
POST /api/actions/rig/add       # gt rig add
POST /api/actions/crew/add      # gt crew add
POST /api/actions/convoy/create # gt convoy create
```

### SSE Endpoints

```
GET /api/stream/logs/:source    # Real-time log streaming
GET /api/stream/status          # Status updates
GET /api/stream/dispatch        # Mayor interaction stream
```

## Dispatch (Mayor Chat)

The Dispatch page provides natural language AI interaction:

1. **Context selector**: Town-wide, rig-scoped, convoy-scoped, bead-scoped
2. **Streaming responses**: Split into summary, actions taken, next steps
3. **Persistence**: Transcript stored locally, linked to created convoys/beads

Implementation phases:
- **Phase 1**: Spawn Claude Code subprocess with context injection
- **Phase 2**: Structured protocol if Gas Town exposes daemon API

## Quality Gates

Before completing work:

```bash
# Backend
cd src/backend && npm run typecheck && npm run lint && npm test

# Frontend  
cd src/frontend && npm run typecheck && npm run lint && npm test

# Integration
npm run test:e2e
```

## Landing the Plane

Same as parent AGENTS.md - push all changes before ending session.

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **State**: TanStack Query for server state
- **Build**: Vite for frontend, tsx for backend
