---
name: status
description: /status — Aktuellen Stand anzeigen
disable-model-invocation: true
---

# /status — Aktuellen Stand anzeigen

Zeige eine Übersicht des aktuellen Arbeitsstands.

## Konfiguration

Lies `project.json` für Notion-Config (`notion.tasks_db`, `notion.project_id`).
Resolve die Data Source URL via `notion-fetch` auf `https://www.notion.so/{notion.tasks_db}` falls noch nicht in der Session gecached.

## Ausführung (direkt in der Hauptsession — kein Sub-Agent nötig)

### 1. Notion-Ticket

Suche das aktuelle Ticket via Notion:
1. Data Source URL resolven (siehe oben)
2. `notion-search` mit Query "In progress" und der Data Source URL
3. Nach Projekt filtern (`notion.project_id` → Projekt-Page resolven, gegen Projekt-Relation matchen)

Zeige:
- Ticket-Titel
- Status
- Priorität

### 2. Git-Status

Zeige via Bash:
- Aktueller Branch (`git branch --show-current`)
- Geänderte Dateien (`git diff --stat`)
- Uncommitted Changes Anzahl

### 3. Zusammenfassung

Zeige eine kompakte Übersicht:

```
Ticket: {ID} — {Titel}
Status: {Notion-Status}
Branch: {git branch}
Änderungen: {N Dateien geändert}
```

### Hinweise
- Dieser Command ist rein informativ — er ändert nichts
- Falls kein Ticket aktiv ist, sage das
