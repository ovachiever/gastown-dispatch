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

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

