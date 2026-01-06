# Gas Town Discovery Report

## Overview

Gas Town is a multi-agent orchestrator for Claude Code that tracks work with convoys and slings work to agents. This document captures the discovery analysis for building gastown-dispatch.

## Key Commands with JSON Output

### Town Management

| Command | JSON Support | Purpose |
|---------|--------------|---------|
| `gt status --json` | ✅ Yes | Town status with agents, rigs, summary |
| `gt doctor` | ❌ No | Health check |
| `gt config agent list --json` | ✅ Yes | List configured agents |

### Rig Management

| Command | JSON Support | Purpose |
|---------|--------------|---------|
| `gt rig add <name> <url>` | ❌ No | Add rig |
| `gt rig list` | ❌ No | List rigs (embedded in status) |
| `gt rig remove <name>` | ❌ No | Remove rig |

### Convoy Management

| Command | JSON Support | Purpose |
|---------|--------------|---------|
| `gt convoy list --json` | ✅ Yes | List convoys |
| `gt convoy status <id> --json` | ✅ Yes | Convoy details |
| `gt convoy create` | ✅ Returns ID | Create convoy |
| `gt convoy add <id> <issues>` | ❌ No | Add issues to convoy |

### Beads (Issue Tracking)

| Command | JSON Support | Purpose |
|---------|--------------|---------|
| `bd list --json` | ✅ Yes | List issues |
| `bd ready --json` | ✅ Yes | Ready issues (unblocked) |
| `bd blocked --json` | ✅ Yes | Blocked issues |
| `bd show <id> --json` | ✅ Yes | Issue details |
| `bd create --json` | ✅ Yes | Create issue |
| `bd update <id> --status=X` | ❌ No | Update issue |
| `bd close <id>` | ❌ No | Close issue |

### Agent/Session Management

| Command | JSON Support | Purpose |
|---------|--------------|---------|
| `gt agents` | ❌ No (TUI) | Interactive agent list |
| `gt peek <agent>` | ❌ No | Check agent health |
| `gt nudge <agent> "msg"` | ❌ No | Send message to agent |
| `gt handoff` | ❌ No | Request session cycle |

### Work Assignment

| Command | JSON Support | Purpose |
|---------|--------------|---------|
| `gt sling <bead> <rig>` | ❌ No | Assign work to polecat |
| `gt hook` | ❌ No | Show agent's current work |

### Communication

| Command | JSON Support | Purpose |
|---------|--------------|---------|
| `gt mail inbox` | ❌ No | Check inbox |
| `gt mail inbox <addr> --json` | ✅ Yes | Mailbox with JSON |
| `gt mail send <addr> -s "X" -m "Y"` | ❌ No | Send mail |

### Logs

| Command | Purpose |
|---------|---------|
| `gt log deacon` | Deacon daemon logs |
| `gt log mayor` | Mayor agent logs |
| `gt log witness <rig>` | Witness logs for rig |
| `gt log refinery <rig>` | Refinery logs for rig |

## Directory Structure

```
~/gt/                           Town root
├── .beads/                     Town-level beads (hq-* prefix)
│   ├── beads.db                SQLite database
│   ├── beads.jsonl             Issue journal
│   └── routes.jsonl            Prefix → rig routing
├── mayor/                      Mayor config
│   └── town.json               Town configuration
└── <rig>/                      Project container
    ├── config.json             Rig identity + beads prefix
    ├── .beads/ → mayor/rig/.beads
    ├── .repo.git/              Bare repo (shared)
    ├── mayor/rig/              Mayor's clone
    ├── refinery/rig/           Worktree on main
    ├── witness/                No clone
    ├── crew/<name>/            Human workspaces
    └── polecats/<name>/        Worker worktrees
```

## tmux Sessions

Gas Town creates tmux sessions with naming pattern:

| Pattern | Agent |
|---------|-------|
| `gt-mayor` | Mayor coordinator |
| `gt-deacon` | Deacon daemon |
| `gt-<rig>-witness` | Rig witness |
| `gt-<rig>-refinery` | Rig refinery |
| `gt-<rig>-<name>` | Polecat workers |

## Existing Dashboard

Gas Town has a basic dashboard at `gt dashboard --port 8080`:

- Convoy tracking with progress bars
- Polecat workers with activity status
- Refinery/merge queue status
- Uses htmx for auto-refresh (10s)

## Data Types (from Go code)

### TownStatus
```go
type TownStatus struct {
    Name     string
    Location string
    Overseer *OverseerInfo
    Agents   []AgentRuntime
    Rigs     []RigStatus
    Summary  StatusSum
}
```

### RigStatus
```go
type RigStatus struct {
    Name         string
    Polecats     []string
    PolecatCount int
    Crews        []string
    CrewCount    int
    HasWitness   bool
    HasRefinery  bool
    Hooks        []AgentHookInfo
    Agents       []AgentRuntime
    MQ           *MQSummary
}
```

### Convoy JSON Response
```json
{
  "id": "hq-cv-abc",
  "title": "Feature X",
  "status": "open",
  "tracked_issues": [
    {"id": "gt-xyz", "title": "...", "status": "open", "assignee": "..."}
  ],
  "progress": "2/5",
  "completed": 2,
  "total": 5
}
```

### Bead/Issue JSON Response
```json
{
  "id": "gt-xyz",
  "title": "Fix authentication",
  "description": "...",
  "status": "open",
  "type": "task",
  "priority": 1,
  "assignee": "roxas/polecats/dag",
  "created_at": "2025-01-06T10:00:00Z",
  "updated_at": "2025-01-06T11:00:00Z"
}
```

## Implementation Strategy

### Phase 1: Read-Only Dashboard
- Town status, rigs, convoys, beads
- Log viewer
- Agent status (via tmux list-sessions)

### Phase 2: Actions
- Start/shutdown
- Sling work
- Create convoys
- Add rigs/crew

### Phase 3: Dispatch (Mayor Chat)
- Spawn Claude Code subprocess
- Context injection
- Action execution
- Result streaming

### Phase 4: Onboarding Wizard
- Town selection/creation
- Rig addition
- Crew setup
- First task

## Notes for Implementation

1. **Beads routing**: Issue IDs route to different beads DBs based on prefix
2. **Caching**: Cache read operations briefly (5-10s) to reduce subprocess overhead
3. **SSE for streaming**: Logs and Dispatch need server-sent events
4. **Error mapping**: Parse stderr for user-friendly error messages
5. **tmux optional**: Read state from `gt status --json` rather than tmux directly
