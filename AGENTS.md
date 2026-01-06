# gastown-dispatch Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Project Overview

**gastown-dispatch** is a local-first web UI that provides complete replacement for human interaction with Gas Town. Users should never need to use tmux manually or understand CLI commands.

## Project Structure

```
gastown-dispatch/
├── src/
│   ├── backend/              # Node.js + Express + TypeScript
│   │   ├── api/              # REST + SSE endpoints
│   │   ├── services/         # Business logic
│   │   ├── commands/         # gt/bd command wrappers
│   │   └── types/            # TypeScript types
│   └── frontend/             # React + TypeScript + Tailwind
│       └── src/
│           ├── pages/        # Route pages
│           ├── components/   # Reusable UI
│           ├── hooks/        # Custom React hooks
│           └── lib/          # API client, utilities
├── docs/                     # Architecture docs
├── gastown/                  # Gas Town source (reference)
└── .beads/                   # Issue tracking
```

## Development Commands

```bash
npm run dev              # Run both frontend and backend
npm run dev:backend      # Backend only (port 3001)
npm run dev:frontend     # Frontend only (port 3000)
npm run typecheck        # TypeScript checking
npm run lint             # ESLint
npm run test             # Tests
```

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Global Rules

### Beads
- Use **beads** as the task system when a project has `.beads/`.
- Preferred flow: `bd ready` → `bd claim <id>` → `bd status <id> in_progress` → `bd close <id> -r "..."`.
#### Using bv as an AI sidecar
bv is a graph-aware triage engine for Beads projects (.beads/beads.jsonl). Instead of parsing JSONL or hallucinating graph traversal, use robot flags for deterministic, dependency-aware outputs with precomputed metrics (PageRank, betweenness, critical path, cycles, HITS, eigenvector, k-core).

**⚠️ CRITICAL: Use ONLY `--robot-*` flags. Bare `bv` launches an interactive TUI that blocks your session.**
##### The Workflow: Start With Triage
**`bv --robot-triage` is your single entry point.** It returns everything you need in one call:
- `quick_ref`: at-a-glance counts + top 3 picks
- `recommendations`: ranked actionable items with scores, reasons, unblock info
- `quick_wins`: low-effort high-impact items
- `blockers_to_clear`: items that unblock the most downstream work
- `project_health`: status/type/priority distributions, graph metrics
- `commands`: copy-paste shell commands for next steps
bv --robot-triage        # THE MEGA-COMMAND: start here
bv --robot-next          # Minimal: just the single top pick + claim command
##### Other Commands
**Planning:**

| Command | Returns |
|---------|---------|
| `--robot-plan` | Parallel execution tracks with `unblocks` lists |
| `--robot-priority` | Priority misalignment detection with confidence |
**Graph Analysis:**

| Command | Returns |
|---------|---------|
| `--robot-insights` | Full metrics: PageRank, betweenness, HITS (hubs/authorities), eigenvector, critical path, cycles, k-core, articulation points, slack |
| `--robot-label-health` | Per-label health: `health_level` (healthy\|warning\|critical), `velocity_score`, `staleness`, `blocked_count` |
| `--robot-label-flow` | Cross-label dependency: `flow_matrix`, `dependencies`, `bottleneck_labels` |
| `--robot-label-attention [--attention-limit=N]` | Attention-ranked labels by: (pagerank × staleness × block_impact) / velocity |
**History & Change Tracking:**

| Command | Returns |
|---------|---------|
| `--robot-history` | Bead-to-commit correlations: `stats`, `histories` (per-bead events/commits/milestones), `commit_index` |
| `--robot-diff --diff-since <ref>` | Changes since ref: new/closed/modified issues, cycles introduced/resolved |
**Other Commands:**

| Command | Returns |
|---------|---------|
| `--robot-burndown <sprint>` | Sprint burndown, scope changes, at-risk items |
| `--robot-forecast <id\|all>` | ETA predictions with dependency-aware scheduling |
| `--robot-alerts` | Stale issues, blocking cascades, priority mismatches |
| `--robot-suggest` | Hygiene: duplicates, missing deps, label suggestions, cycle breaks |
| `--robot-graph [--graph-format=json\|dot\|mermaid]` | Dependency graph export |
| `--export-graph <file.html>` | Self-contained interactive HTML visualization |
##### Scoping & Filtering
bv --robot-plan --label backend              # Scope to label's subgraph
bv --robot-insights --as-of HEAD~30          # Historical point-in-time
bv --recipe actionable --robot-plan          # Pre-filter: ready to work (no blockers)
bv --recipe high-impact --robot-triage       # Pre-filter: top PageRank scores
bv --robot-triage --robot-triage-by-track    # Group by parallel work streams
bv --robot-triage --robot-triage-by-label    # Group by domain
##### Understanding Robot Output
**All robot JSON includes:**
- `data_hash` — Fingerprint of source beads.jsonl (verify consistency across calls)
- `status` — Per-metric state: `computed|approx|timeout|skipped` + elapsed ms
- `as_of` / `as_of_commit` — Present when using `--as-of`; contains ref and resolved SHA
**Two-phase analysis:**
- **Phase 1 (instant):** degree, topo sort, density — always available immediately
- **Phase 2 (async, 500ms timeout):** PageRank, betweenness, HITS, eigenvector, cycles — check `status` flags
**For large graphs (>500 nodes):** Some metrics may be approximated or skipped. Always check `status`.
##### jq Quick Reference
bv --robot-triage | jq '.quick_ref'                        # At-a-glance summary
bv --robot-triage | jq '.recommendations[0]'               # Top recommendation
bv --robot-plan | jq '.plan.summary.highest_impact'        # Best unblock target
bv --robot-insights | jq '.status'                         # Check metric readiness
bv --robot-insights | jq '.Cycles'                         # Circular deps (must fix!)
bv --robot-label-health | jq '.results.labels[] | select(.health_level == "critical")'
**Performance:** Phase 1 instant, Phase 2 async (500ms timeout). Prefer `--robot-plan` over `--robot-insights` when speed matters. Results cached by data hash.
Use bv instead of parsing beads.jsonl—it computes PageRank, critical paths, cycles, and parallel tracks deterministically.
### Bug Fixes - MANDATORY Regression Tests
**Every bug fix MUST include a regression test. No exceptions.**
When fixing ANY bug, error, or unexpected behavior:
1. **BEFORE fixing**: Write a test that captures the bug (it should FAIL)
2. **Name it clearly**: `test("REGRESSION: [describe bug scenario]", ...)`
3. **Fix the bug**: Implement your fix
4. **Verify**: The regression test now PASSES
5. **Commit together**: Test and fix go in the same commit
```typescript
test("REGRESSION: empty input causes crash", () => {
  // BUG: function didn't handle empty array
  // ROOT CAUSE: Missing length check before accessing index 0
  expect(() => processItems([])).not.toThrow();
});
```
**Why**: Regression tests prevent AI agents from making the same mistake again. They capture the exact scenario that caused the bug and ensure it stays fixed forever.
See skill: `regression-testing` for detailed patterns and examples.
### Safety & Linting
- **ALWAYS run linters before committing.** Fix all errors, not just warnings.
- Before finishing a code change: run the project's lint/typecheck/tests commands.
- Do not read or write `.env` files unless explicitly necessary.
#### Strict Linting Commands (run before any commit)
```bash
## TypeScript/JavaScript
npm run lint --fix && npm run typecheck
## Python
ruff check --fix . && ruff format . && mypy .
## Rust
cargo clippy -- -D warnings && cargo fmt --check
```
**Why strict linting matters:** Catches bugs early, enforces consistency, prevents tech debt accumulation. Less mess later = faster shipping.
​




<!-- bv-agent-instructions-v1 -->

---

## Beads Workflow Integration

This project uses [beads_viewer](https://github.com/Dicklesworthstone/beads_viewer) for issue tracking. Issues are stored in `.beads/` and tracked in git.

### Essential Commands

```bash
# View issues (launches TUI - avoid in automated sessions)
bv

# CLI commands for agents (use these instead)
bd ready              # Show issues ready to work (no blockers)
bd list --status=open # All open issues
bd show <id>          # Full issue details with dependencies
bd create --title="..." --type=task --priority=2
bd update <id> --status=in_progress
bd close <id> --reason="Completed"
bd close <id1> <id2>  # Close multiple issues at once
bd sync               # Commit and push changes
```

### Workflow Pattern

1. **Start**: Run `bd ready` to find actionable work
2. **Claim**: Use `bd update <id> --status=in_progress`
3. **Work**: Implement the task
4. **Complete**: Use `bd close <id>`
5. **Sync**: Always run `bd sync` at session end

### Key Concepts

- **Dependencies**: Issues can block other issues. `bd ready` shows only unblocked work.
- **Priority**: P0=critical, P1=high, P2=medium, P3=low, P4=backlog (use numbers, not words)
- **Types**: task, bug, feature, epic, question, docs
- **Blocking**: `bd dep add <issue> <depends-on>` to add dependencies

### Session Protocol

**Before ending any session, run this checklist:**

```bash
git status              # Check what changed
git add <files>         # Stage code changes
bd sync                 # Commit beads changes
git commit -m "..."     # Commit code
bd sync                 # Commit any new beads changes
git push                # Push to remote
```

### Best Practices

- Check `bd ready` at session start to find available work
- Update status as you work (in_progress → closed)
- Create new issues with `bd create` when you discover tasks
- Use descriptive titles and set appropriate priority/type
- Always `bd sync` before ending session

<!-- end-bv-agent-instructions -->
