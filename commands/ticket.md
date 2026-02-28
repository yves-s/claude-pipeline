---
name: ticket
description: Notion-Ticket aufnehmen und autonome Entwicklung starten
disable-model-invocation: true
---

# /ticket — Ticket aufnehmen und implementieren

Nimm ein Ticket auf und starte den autonomen Entwicklungsflow.

## Konfiguration

Lies `project.json` für Notion-IDs und Konventionen:
- `notion.tasks_db` — Tasks Database ID
- `notion.data_source` — Data Source URL
- `notion.project_page` — Projekt Page ID
- `notion.project_filter` — Projektname zum Filtern
- `conventions.branch_prefix` — Branch-Prefix (z.B. "feature/")

## Ausführung

### 1. Ticket finden

Falls `$ARGUMENTS` übergeben: Nutze als Ticket-ID oder Suchbegriff.
Falls kein Argument: Suche nach Tickets mit Status "Ready to develop".

**Bei übergebener Ticket-ID (z.B. `T--162`):**
1. Nummer extrahieren: `T--162` → `162`
2. Direkt querien – **kein notion-search**:
   - Data Source: aus `project.json` (`notion.data_source`)
   - Filter: `WHERE "userDefined:ID" = 162`
3. Ergebnis via `notion-fetch` mit der zurückgegebenen Page-URL laden

**Bei fehlendem Argument (Suche nach "Ready to develop"):**
1. `notion-search` mit Query "Ready to develop" und `data_source_url` aus `project.json`
2. Ergebnisse via `notion-fetch` laden (Top 3-5)
3. Nach Projekt filtern (Wert aus `project.json` → `notion.project_filter`)
4. Status "Ready to develop" im Properties-Objekt prüfen

### 2. Ticket auswählen

- **Mehrere:** Kurze Liste, User wählen lassen
- **Eines:** Automatisch nehmen
- **Keines:** User informieren

### 3. Notion auf "In progress" + Feature-Branch

```bash
git checkout main && git pull origin main
git checkout -b {branch_prefix}{ticket-nummer}-{kurzbeschreibung}
```

### 4. Planung (SELBST, kein Planner-Agent)

**Lies nur die 5-10 betroffenen Dateien** direkt mit Read/Glob/Grep.
Lies `CLAUDE.md` für Architektur und Konventionen.
Lies `project.json` für Pfade und Stack-Details.

**Dann: Instruktionen für Agents formulieren** — mit exakten Code-Änderungen und neuen Dateien direkt im Prompt.

### 5. Implementierung (parallel wo möglich)

Spawne Agents via Task-Tool mit konkreten Instruktionen:

| Agent | `model` | Wann |
|-------|---------|------|
| `data-engineer` | `haiku` | Bei Schema-Änderungen |
| `backend` | `sonnet` | Bei API/Hook-Änderungen |
| `frontend` | `sonnet` | Bei UI-Änderungen |

**Prompt-Muster:** Exakte Dateiliste + Code-Snippets, NICHT "lies die Spec".

### 6. Build-Check (Bash, kein Agent)

Lies Build-Commands aus `project.json` und führe sie aus.
Nur bei Build-Fehlern: DevOps-Agent mit `model: "haiku"` spawnen.

### 7. Review (ein Agent)

Ein QA-Agent mit `model: "haiku"`:
- Acceptance Criteria gegen Code prüfen
- Security-Quick-Check (Secrets, RLS, Auth, Input Validation)
- Bei Problemen: direkt fixen

### 8. Ship (ohne Merge)

Direkt in der Hauptsession (kein Agent):
1. Commit — Conventional Commits, gezielt stagen
2. Push — `git push -u origin {branch}`
3. PR — `gh pr create` mit Summary + Test Plan
4. Notion — Status auf "Ready to Review"

**NICHT automatisch mergen.** Der PR bleibt offen bis der User ihn freigibt (via `/merge` oder "passt").
