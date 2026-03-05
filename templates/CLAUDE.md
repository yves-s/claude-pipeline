# CLAUDE.md – {{PROJECT_NAME}} Project Instructions

> Dieses Dokument wird von Claude Code automatisch gelesen.
> Projektspezifische Konfiguration (Notion-IDs, Build-Commands, Pfade) liegt in `project.json`.

---

## Projekt

**{{PROJECT_NAME}}** – TODO: Kurze Projektbeschreibung hier einfügen.

---

## Konventionen

### Git
- **Branches:** `feature/{ticket-id}-{kurzbeschreibung}`, `fix/...`, `chore/...`
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
- **Sprache:** Commit Messages auf Englisch

### Code
- TODO: Code-Konventionen hier einfügen (Sprache, Framework, Imports, etc.)

### Dateien
- Keine Dateien löschen ohne explizite Anweisung

---

## Autonomer Modus

Dieses Repo nutzt ein Multi-Agent-System. Ob lokal oder auf dem Server:

1. **Arbeite autonom** — keine interaktiven Fragen, keine manuellen Bestätigungen
2. **Plane selbst** — kein Planner-Agent, keine Spec-Datei. Lies betroffene Dateien direkt und gib Agents konkrete Instruktionen
3. **Wenn unklar:** Konservative Lösung wählen, nicht raten
4. **Commit + PR** am Ende des Workflows → Notion "Ready to review"
5. **Merge erst nach Freigabe** — User sagt "passt"/"merge" oder `/merge`

## Notion-Workflow

> Nur aktiv wenn `notion.tasks_db` in `project.json` gesetzt ist. Ohne Notion werden diese Schritte übersprungen.

Falls Notion konfiguriert ist, sind Status-Updates **PFLICHT**:

| Workflow-Schritt | Notion-Status | Wann |
|---|---|---|
| `/ticket` — Ticket aufnehmen | **"In progress"** | Sofort nach Ticket-Auswahl, VOR dem Coding |
| `/ship` — PR erstellen | **"Ready to review"** | Nach PR-Erstellung |
| `/merge` — PR mergen | **"Done"** | Nach erfolgreichem Merge |

**Überspringe KEINEN dieser Schritte.** Falls ein Notion-Update fehlschlägt, versuche es erneut oder informiere den User.

---

## Architektur

TODO: Projektstruktur hier einfügen.

```
src/
├── ...
```

---

## Sicherheit

- Keine API Keys, Tokens oder Secrets im Code
- Input Validation auf allen Endpoints

---

## Konversationelle Trigger

**"passt"**, **"done"**, **"fertig"**, **"klappt"**, **"sieht gut aus"** → automatisch `/merge` ausführen
