---
name: status
description: /status — Aktuellen Stand anzeigen
disable-model-invocation: true
---

# /status — Aktuellen Stand anzeigen

Zeige eine Übersicht des aktuellen Arbeitsstands.

## Konfiguration

Lies `project.json` für Notion-IDs (`notion.tasks_db`, `notion.data_source`, `notion.project_filter`).

## Ausführung (direkt in der Hauptsession — kein Sub-Agent nötig)

### 1. Notion-Ticket

Suche das aktuelle Ticket via Notion (Tasks DB ID aus `project.json`). Prüfe welches Ticket auf "In progress" steht. Zeige:
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
