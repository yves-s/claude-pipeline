---
name: merge
description: PR mergen und Notion-Status auf "Done"
disable-model-invocation: true
---

# /merge — PR mergen nach Freigabe

Merged den aktuellen PR und schließt das Ticket ab. Nur nach Review verwenden.

## Konfiguration

Lies `project.json`. **Notion ist optional** — nur ausführen wenn `notion.tasks_db` gesetzt ist.
Falls Notion konfiguriert: Resolve die Data Source URL via `notion-fetch` auf `https://www.notion.so/{notion.tasks_db}` falls noch nicht in der Session gecached.

## Trigger

Wird ausgeführt wenn:
- Der User `/merge` eingibt
- Der User "passt", "done", "sieht gut aus", "klappt", "fertig" o.ä. sagt

## Ausführung (direkt in der Hauptsession)

### 1. PR ermitteln

Finde den offenen PR für den aktuellen Branch:

```bash
gh pr view --json number,title,url,state
```

Falls kein offener PR: dem User mitteilen.

### 2. Merge

```bash
gh pr merge --squash --delete-branch
```

### 3. Zurück auf main

```bash
git checkout main && git pull origin main
```

### 4. Notion-Status auf "Done"

> **Nur wenn Notion konfiguriert ist** (`notion.tasks_db` in `project.json` gesetzt).

**Falls Notion konfiguriert — PFLICHT, NICHT ÜBERSPRINGEN:**
Setze den Status des aktuellen Tickets auf **"Done"** via `notion-update-page`.
Falls kein aktives Ticket bekannt: frage den User.
Warte auf die Bestätigung, dass das Update erfolgreich war.

### 5. Bestätigung

Zeige:
- PR-URL + Merge-Status
- **Falls Notion:** Notion-Status "Done" ✓ (bestätige explizit)

## Regeln

- Nur ausführen wenn ein offener PR existiert
- Bei Merge-Konflikten: dem User zeigen, nicht force-mergen
