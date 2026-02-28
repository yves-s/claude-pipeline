# Claude Pipeline Framework

Portables Multi-Agent-System für autonome Software-Entwicklung mit Claude Code.

## Was ist das?

Ein Framework aus generischen Agents, Commands und einem Pipeline-Runner, das in jedes Projekt installiert werden kann. Es bietet:

- **7 spezialisierte Agents** (Orchestrator, Backend, Frontend, Data-Engineer, DevOps, QA, Security)
- **4 Slash-Commands** (/ticket, /ship, /merge, /status)
- **Pipeline-Runner** für VPS/CI-Ausführung
- **Notion-Integration** für Ticket-Management

## Quick Start

```bash
# 1. In dein Projekt wechseln
cd /path/to/your/project

# 2. Setup ausführen
/path/to/claude-pipeline/setup.sh

# 3. CLAUDE.md anpassen (Architektur, Konventionen)
# 4. project.json vervollständigen (Stack, Pfade, Notion-IDs)

# 5. Loslegen
claude
> /ticket
```

## Struktur

```
claude-pipeline/
├── setup.sh                # Installiert Framework in ein Projekt
├── agents/                 # Generische Agent-Definitionen
│   ├── orchestrator.md     # Plant, delegiert, shippt
│   ├── backend.md          # API, Hooks, Business Logic
│   ├── frontend.md         # UI Components (design-affin)
│   ├── data-engineer.md    # DB Migrations, RLS, Types
│   ├── devops.md           # Build-Checks, Fixes
│   ├── qa.md               # AC-Verification, Tests, Security
│   └── security.md         # Security Review
├── commands/               # Slash-Commands
│   ├── ticket.md           # Ticket → autonomer Workflow → PR
│   ├── ship.md             # Commit + Push + PR
│   ├── merge.md            # Squash Merge nach Freigabe
│   └── status.md           # Aktueller Stand
├── pipeline/
│   └── run.sh              # VPS/CI Pipeline Runner
├── settings.json           # Template .claude/settings.json
└── templates/
    ├── project.json        # Template für Projektkonfiguration
    └── CLAUDE.md           # Template für Projektinstruktionen
```

## Nach dem Setup

Das Framework installiert folgende Dateien in deinem Projekt:

```
your-project/
├── CLAUDE.md               # Projektspezifische Instruktionen (anpassen!)
├── project.json            # Konfiguration: Notion-IDs, Build-Commands, Pfade
├── .claude/
│   ├── agents/             # Agent-Definitionen (vom Framework)
│   ├── commands/           # Slash-Commands (vom Framework)
│   ├── settings.json       # Permissions
│   └── skills/             # Projektspezifische Skills (optional, selbst anlegen)
└── .pipeline/
    └── run.sh              # Pipeline Runner
```

## Konfiguration

### project.json

Zentrale Konfigurationsdatei. Alle Agents und Commands lesen hieraus.

| Feld | Zweck |
|------|-------|
| `name` | Projektname |
| `stack` | Tech-Stack (Framework, DB, etc.) |
| `build.web` | Build-Command |
| `build.test` | Test-Command |
| `paths` | Wichtige Verzeichnisse |
| `notion.*` | Notion Tasks DB IDs |
| `conventions` | Branch-Prefix, Commit-Format |

### CLAUDE.md

Projektspezifische Instruktionen die Agents als Kontext nutzen:
- Architektur und Verzeichnisstruktur
- Code-Konventionen und Import-Muster
- Sicherheitsanforderungen
- Domain-spezifisches Wissen

## Workflow

```
/ticket
  ├── Phase 1: Orchestrator liest betroffene Dateien (5-10)
  ├── Phase 2: Agents parallel (data-engineer, backend, frontend)
  ├── Phase 3: Build-Check (Bash)
  ├── Phase 4: Review (QA-Agent, ggf. Security-Agent)
  └── Phase 5: /ship (Commit → PR → Notion "Ready to Review") ← STOPP

User reviewed PR → "passt" / /merge
  └── /merge (Squash Merge → Delete Branch → Notion "Done")
```

## VPS/CI Ausführung

```bash
.pipeline/run.sh <TICKET_ID> <TICKET_TITLE> [DESCRIPTION] [LABELS]
# → claude --agent orchestrator --dangerously-skip-permissions
```

## Update

Um die Agents/Commands zu aktualisieren, `setup.sh` erneut ausführen. Bestehende `CLAUDE.md` und `project.json` werden nicht überschrieben.

## Kosten

- ~2-5€ pro Ticket (Anthropic API)
- Haiku für Routine (DB, Build, Review)
- Sonnet für Kreatives (UI, Logic)
- Opus für den Orchestrator
