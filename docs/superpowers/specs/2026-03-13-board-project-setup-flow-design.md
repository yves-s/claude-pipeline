# Board Project Setup Flow — Design Spec

> Date: 2026-03-13
> Status: Draft
> Scope: agentic-dev-board + agentic-dev-pipeline

---

## Problem

The current setup flow has three critical gaps:

1. **Projects cannot be created in the Board UI** — the DB supports it, but no UI exists. Users must insert directly into Supabase.
2. **The API Key is shown during workspace creation with no guidance** — the user sees it once and must know on their own that it belongs in `project.json`.
3. **`/setup-pipeline` depends on the Supabase MCP** — only users with direct Supabase access can connect the pipeline. External developers cannot self-onboard.

## Goal

A self-service, guided flow from workspace creation to connected pipeline that works for both internal team members and external developers — without requiring Supabase access.

## Design Decisions

- **API Key scope:** Per workspace (not per project). Access control via workspace membership and roles.
- **Project creation:** Inline dialog in Board toolbar (not a separate settings page). Projects are simple (name + description).
- **Pipeline standalone:** `/setup-pipeline` works without Board connection. Board integration is optional.
- **Telegram Bot:** No changes needed. Bot reads projects dynamically from DB.

---

## 1. User Flow (End-to-End)

```
1. Register/Login → Create Workspace (name + slug only)
2. → Redirect to Board (empty)
3. → Empty State: "Create your first project" CTA
4. → Create project (name + description)
5. → Setup Dialog appears:
     - Option 1 (prominent): CLI command with --board and --key
     - Option 2 (expandable): Manual project.json snippet
6. → Setup Dialog accessible anytime via icon on project
7. → Developer runs /setup-pipeline in their terminal
8. → project.json is configured, pipeline is connected
```

## 2. Board Changes (agentic-dev-board)

### 2.1 Workspace Creation — Simplified

**File:** `src/app/new-workspace/page.tsx`

**Changes:**
- Remove API key generation and display from workspace creation
- After creation: redirect to `/{slug}/board`
- API key is generated later, on first project setup dialog open

### 2.2 Board Empty State

**File:** `src/app/[slug]/board/page.tsx`

When a workspace has 0 projects, show an empty state instead of the bare board:

```
┌──────────────────────────────────────────────┐
│                                              │
│      Willkommen in deinem Workspace!         │
│                                              │
│  Projekte gruppieren deine Tickets und       │
│  verbinden sich mit deiner Codebase.         │
│                                              │
│      [+ Erstes Projekt erstellen]            │
│                                              │
└──────────────────────────────────────────────┘
```

The CTA opens the Create Project Dialog.

### 2.3 Create Project Dialog

**New component:** Inline dialog triggered from Board toolbar ("+" button next to project filter dropdown) and from empty state CTA.

**Fields:**
- Name (required, text input)
- Description (optional, text input)

**On submit:**
- Insert into `projects` table (RLS ensures workspace scoping)
- On success: open Setup Dialog (section 2.4)

### 2.4 Project Setup Dialog

**New component:** Appears after project creation. Also accessible anytime via a "Setup" icon on each project.

**Content:**

```
┌─ Verbinde dein Projekt mit deiner Codebase ─────────┐
│                                                      │
│ ┌─ OPTION 1 (prominent) ─────────────────────────┐   │
│ │ Führe das in deinem Projekt-Terminal aus:       │   │
│ │                                                 │   │
│ │ /setup-pipeline \                               │   │
│ │   --board https://app.agentic-dev.xyz \         │   │
│ │   --key adp_ab18e060...                         │   │
│ │                                  [Kopieren]     │   │
│ └─────────────────────────────────────────────────┘   │
│                                                      │
│ ▸ Manuell in project.json eintragen (aufklappbar)    │
│                                                      │
│ ─────────────────────────────────────────────────     │
│ API Key: adp_ab18...****                             │
│ [Neuen Key generieren]                               │
│                                                      │
│ [Später]  [Fertig]                                   │
└──────────────────────────────────────────────────────┘
```

**API Key behavior:**
- Key is generated automatically when the Setup Dialog opens for the first time (if no key exists for the workspace)
- Key is displayed masked: `adp_<first 8 hex>...****`
- Full plaintext key is shown only once (at generation/regeneration) within the CLI command and manual config
- "Neuen Key generieren" button invalidates the old key and generates a new one

**Key regeneration warning:**

> **Neuen API Key generieren?**
>
> Der aktuelle Key wird sofort ungültig. Folgende Schritte sind danach nötig:
> - Alle verbundenen Projekte müssen den neuen Key erhalten
> - Führe `/setup-pipeline --board <url> --key <neuer-key>` in jedem Projekt erneut aus
> - Oder ersetze `api_key` in der `project.json` manuell
> - Der VPS Worker muss neu gestartet werden (falls aktiv)
>
> [Abbrechen] [Neuen Key generieren]

### 2.5 New API Endpoints

#### `GET /api/projects`

Lists projects for the authenticated workspace. Used by `/setup-pipeline`.

```
Request:
  GET /api/projects
  X-Pipeline-Key: adp_...

Response 200:
  {
    "workspace_id": "421dffa5-...",
    "workspace_name": "Agentic Dev",
    "projects": [
      { "id": "e904798e-...", "name": "Aime Web", "description": "..." },
      { "id": "d81500be-...", "name": "Aime Superadmin", "description": null }
    ]
  }
```

#### `POST /api/projects`

Creates a project in the authenticated workspace. Used by `/setup-pipeline` when user wants to create a new project from CLI.

```
Request:
  POST /api/projects
  X-Pipeline-Key: adp_...
  Content-Type: application/json
  { "name": "Mein Projekt", "description": "Optional" }

Response 201:
  { "id": "...", "name": "Mein Projekt", "workspace_id": "421dffa5-..." }

Response 409 (name already exists in workspace):
  { "error": "Project name already exists" }
```

#### `POST /api/workspace/[workspaceId]/api-keys/regenerate`

Regenerates the workspace API key. Board UI only (session auth, not pipeline key).

```
Request:
  POST /api/workspace/{workspaceId}/api-keys/regenerate
  Authorization: Bearer <supabase-session>

Response 200:
  { "api_key": "adp_NEW...", "prefix": "adp_ab18e060" }
```

**No DELETE/PATCH endpoints for projects.** Project management (rename, delete) stays Board-UI-only for now. YAGNI.

## 3. Pipeline Changes (agentic-dev-pipeline)

### 3.1 `/setup-pipeline` Command — Reworked

**File:** `commands/setup-pipeline.md`

The command is freed from Supabase MCP dependency and uses the Board API instead.

#### Two Modes

**Mode 1: Interactive (no arguments)**

```
> /setup-pipeline

✓ Stack detected: Next.js 15, TypeScript, Supabase, pnpm
✓ project.json updated (stack, build, paths)
✓ CLAUDE.md enriched

Connect to Agentic Dev Board? (y/n)
> y

Board URL: [https://app.agentic-dev.xyz]
API Key: [adp_...]

✓ Connected to Workspace "Agentic Dev"

Available projects:
  1. Aime Web
  2. Aime Superadmin
  3. + Create new project

Selection: [3]
Project name: [My Project]

✓ Project created
✓ project.json pipeline config written
```

**Mode 2: Direct Connect (copy-paste from Board)**

```
> /setup-pipeline --board https://app.agentic-dev.xyz --key adp_...

✓ Stack detected: Next.js 15, TypeScript, Supabase, pnpm
✓ project.json updated

✓ Connected to Workspace "Agentic Dev"

Available projects:
  1. Aime Web
  2. + Create new project

Selection: [1]

✓ project.json pipeline config written
```

#### API Communication

Instead of Supabase MCP, the command uses `WebFetch` or `curl`:

```
GET {board_url}/api/projects
Header: X-Pipeline-Key: {api_key}
```

#### Standalone Mode (no Board)

If the user declines Board connection, only stack/build/paths are filled. The `pipeline` section in `project.json` stays empty. `/develop` and `/ship` still work — they operate locally with git branches, without Board status updates.

## 4. No Changes Required

| Component | Reason |
|---|---|
| **Telegram Bot** | Reads projects dynamically from DB. New projects appear automatically as buttons. |
| **DB Schema** | `projects`, `api_keys`, `tickets` tables stay as-is. No migrations needed. |
| **VPS Worker** | Uses `project.json` config. No change needed. |
| **Existing API endpoints** | `/api/events`, `/api/tickets` remain unchanged. |

## 5. Implementation Scope

### agentic-dev-board

| # | Task | Complexity |
|---|---|---|
| B1 | Remove API key generation from `/new-workspace` page | Small |
| B2 | Add Board empty state (0 projects) | Small |
| B3 | Create Project Dialog component (inline, toolbar) | Medium |
| B4 | Project Setup Dialog component (CLI command + manual config + key management) | Medium |
| B5 | `GET /api/projects` endpoint (pipeline key auth) | Small |
| B6 | `POST /api/projects` endpoint (pipeline key auth) | Small |
| B7 | `POST /api/workspace/[id]/api-keys/regenerate` endpoint (session auth) | Small |
| B8 | "Setup" icon on project in toolbar/filter for re-opening Setup Dialog | Small |

### agentic-dev-pipeline

| # | Task | Complexity |
|---|---|---|
| P1 | Rework `/setup-pipeline` command: Board API instead of Supabase MCP | Medium |
| P2 | Support `--board` and `--key` flags for direct connect mode | Small |

## 6. Out of Scope

- Project CRUD settings page (rename, delete) — add later if needed
- Per-project API keys — workspace-level keys are sufficient
- Telegram bot user self-registration — separate concern
- Role-based access control — future iteration
