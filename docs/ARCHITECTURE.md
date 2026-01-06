# gastown-dispatch Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (localhost:3000)                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    React Frontend                         │   │
│  │  ┌──────────┬──────────┬──────────┬──────────┬────────┐  │   │
│  │  │ Overview │ Dispatch │ Convoys  │  Beads   │ Agents │  │   │
│  │  └──────────┴──────────┴──────────┴──────────┴────────┘  │   │
│  │                    TanStack Query                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼ HTTP/SSE
┌─────────────────────────────────────────────────────────────────┐
│                   Node.js Backend (localhost:3001)               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Express API                            │   │
│  │  /api/status  /api/convoys  /api/beads  /api/actions     │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Services Layer                         │   │
│  │  status.ts   convoys.ts   beads.ts   actions.ts          │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Command Runner                           │   │
│  │  runGt()   runBd()   runGtJson()   runBdJson()           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼ subprocess
┌─────────────────────────────────────────────────────────────────┐
│                        Gas Town CLI                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  gt status --json    gt convoy list --json                │   │
│  │  bd list --json      bd ready --json                      │   │
│  │  gt sling           gt rig add                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    tmux Sessions                          │   │
│  │  gt-mayor   gt-deacon   gt-<rig>-witness   polecats      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Design Principles

### 1. CLI Wrapper, Not Reimplementation

We wrap `gt` and `bd` commands rather than reimplementing their logic:

```typescript
// Good: Use existing CLI
const convoys = await runGtJson<Convoy[]>(["convoy", "list"]);

// Bad: Reimplementing parsing
const convoys = parseBeadsJsonlFile(path);
```

**Benefits:**
- Always in sync with Gas Town behavior
- Less code to maintain
- Leverages existing testing

### 2. JSON First

Prefer commands with `--json` output:

```typescript
// Commands with JSON output (preferred)
gt status --json
gt convoy list --json
bd list --json
bd show <id> --json

// Commands without JSON (parse text)
gt agents           // TUI, not supported
gt rig list         // Embedded in status
gt mail inbox       // Needs text parsing
```

### 3. Caching Strategy

Short-lived caches to reduce subprocess overhead:

```typescript
// Status cache: 5 seconds
let statusCache: { data: TownStatus; timestamp: number } | null = null;
const CACHE_TTL = 5_000;

export async function getTownStatus(): Promise<TownStatus> {
  if (statusCache && Date.now() - statusCache.timestamp < CACHE_TTL) {
    return statusCache.data;
  }
  // ... fetch and cache
}
```

### 4. Error Mapping

Transform CLI errors to user-friendly messages:

```typescript
export async function runGtJson<T>(args: string[]): Promise<T> {
  const result = await runGt([...args, "--json"]);
  if (result.exitCode !== 0) {
    throw new Error(`gt ${args.join(" ")} failed: ${result.stderr}`);
  }
  return JSON.parse(result.stdout);
}
```

## Component Architecture

### Frontend Pages

| Page | Data Source | Refresh |
|------|-------------|---------|
| Overview | `GET /api/status` | 10s polling |
| Dispatch | WebSocket/SSE | Real-time |
| Convoys | `GET /api/convoys` | 10s polling |
| Beads | `GET /api/beads` | 10s polling |
| Agents | `GET /api/status` | 10s polling |
| Logs | `GET /api/stream/logs` | SSE stream |
| Settings | `GET /api/status` | Manual |
| Onboarding | Local state | N/A |

### Backend Services

| Service | Commands Used |
|---------|---------------|
| status | `gt status --json` |
| convoys | `gt convoy list --json`, `gt convoy status --json`, `gt convoy create` |
| beads | `bd list --json`, `bd ready --json`, `bd show --json`, `bd create --json` |
| actions | `gt start`, `gt shutdown`, `gt sling`, `gt rig add`, `gt crew add` |

## Dispatch Architecture (Phase 1)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Dispatch Page                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Context Selector: [Town-wide ▼]                          │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  Message History                                          │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │ User: Help me fix the auth bug                     │  │   │
│  │  │ Mayor: I'll create a convoy and sling to gastown   │  │   │
│  │  │   → Created convoy hq-cv-xyz                       │  │   │
│  │  │   → Slung bd-auth to gastown/polecats/dag          │  │   │
│  │  │   Next: Check convoy status in 5 minutes           │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  [Tell the Mayor what you need...              ] [Send]   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Backend Dispatch Handler                       │
│  1. Inject context (town root, rig, convoy, etc.)               │
│  2. Spawn Claude Code subprocess with tools                      │
│  3. Stream output to frontend via SSE                           │
│  4. Track actions taken for UI display                          │
└─────────────────────────────────────────────────────────────────┘
```

## Security Considerations

1. **Local-only**: Backend binds to localhost only
2. **No auth needed**: Single-user local application
3. **Subprocess isolation**: Commands run with user's permissions
4. **No credential storage**: Uses existing Git/SSH config

## Evolution Plan

### Phase 1: Read-Only Dashboard
- Status, convoys, beads display
- Agent monitoring
- Basic actions (start/shutdown)

### Phase 2: Full Actions
- All sling operations
- Convoy management
- Rig/crew management

### Phase 3: Dispatch Chat
- Claude Code subprocess
- Context injection
- Action tracking

### Phase 4: Log Streaming
- SSE implementation
- Real-time tail
- Search/filter

### Phase 5: Polish
- Onboarding wizard
- Empty states
- Error handling
- Inline help
