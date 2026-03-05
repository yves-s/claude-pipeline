---
name: ticket
description: Notion-Ticket aufnehmen und autonome Entwicklung starten
disable-model-invocation: true
---

# /ticket — Ticket aufnehmen und implementieren

Nimm ein Ticket auf und starte den autonomen Entwicklungsflow.

## Konfiguration

Lies `project.json` für Notion-IDs und Konventionen:
- `notion.tasks_db` — Tasks Database ID (32 hex chars)
- `notion.project_id` — Projekt-ID (Nummer aus P--11 → 11)
- `conventions.branch_prefix` — Branch-Prefix (z.B. "feature/")

## Notion-Zugriff: Data Source resolven

Die Data Source URL ist **nicht** in `project.json` gespeichert — sie wird zur Laufzeit aufgelöst:

1. `notion-fetch` auf die DB URL: `https://www.notion.so/{notion.tasks_db}`
2. Aus dem Response die `<data-source url="collection://...">` extrahieren
3. Diese `collection://`-URL für alle weiteren Queries nutzen

**Cache:** Merke dir die Data Source URL für die Dauer der Session — nicht bei jedem Query neu resolven.

## Ausführung

### 1. Ticket finden

Falls `$ARGUMENTS` übergeben: Nutze als Ticket-ID oder Suchbegriff.
Falls kein Argument: Suche nach Tickets mit Status "Ready to develop".

**Bei übergebener Ticket-ID (z.B. `T--162`):**
1. Nummer extrahieren: `T--162` → `162`
2. `notion-search` mit der resolved Data Source URL
   - Query: die Ticket-Nummer
   - Ergebnis via `notion-fetch` mit der zurückgegebenen Page-URL laden
3. Prüfe dass `userDefined:ID` matcht

**Bei fehlendem Argument (Suche nach "Ready to develop"):**
1. `notion-search` mit Query "Ready to develop" und der resolved Data Source URL
2. Ergebnisse via `notion-fetch` laden (Top 3-5)
3. Nach Projekt filtern: Das Feld "Projekt" ist eine **Relation**. Um zu filtern:
   a. Projekte-DB resolven (aus dem Relation-Schema der Tasks-DB)
   b. Projekt-Page finden: `WHERE "userDefined:ID" = {notion.project_id}`
   c. Nur Tasks behalten, deren "Projekt"-Relation diese Page-URL enthält
4. Status "Ready to develop" im Properties-Objekt prüfen

### 2. Ticket auswählen

- **Mehrere:** Kurze Liste, User wählen lassen
- **Eines:** Automatisch nehmen
- **Keines:** User informieren

### 3. Notion auf "In progress" + Feature-Branch

**PFLICHT — NICHT ÜBERSPRINGEN:**
Status des Tickets via `notion-update-page` auf **"In progress"** setzen.
Warte auf die Bestätigung, dass das Update erfolgreich war, bevor du weitermachst.

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
4. **PFLICHT:** Notion — Status auf **"Ready to review"** via `notion-update-page`

**NICHT automatisch mergen.** Der PR bleibt offen bis der User ihn freigibt (via `/merge` oder "passt").

### Checkliste vor Abschluss

Bevor du den Workflow als fertig meldest, prüfe:
- [ ] Notion-Status wurde auf "In progress" gesetzt (Schritt 3)
- [ ] Notion-Status wurde auf "Ready to review" gesetzt (Schritt 8.4)
Falls ein Status-Update fehlt: **JETZT nachholen**, nicht überspringen.
