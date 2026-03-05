---
name: ship
description: Commit, Push, PR erstellen und Notion-Status auf "Ready to review"
disable-model-invocation: true
---

# /ship — Commit, Push, PR erstellen

Erstellt einen PR zur Review. Merged wird erst nach Freigabe via `/merge`.

## Konfiguration

Lies `project.json`. **Notion ist optional** — nur ausführen wenn `notion.tasks_db` gesetzt ist.
Falls Notion konfiguriert: Resolve die Data Source URL via `notion-fetch` auf `https://www.notion.so/{notion.tasks_db}` falls noch nicht in der Session gecached.

## Trigger

Wird ausgeführt wenn:
- Der User `/ship` eingibt
- Phase 5 des Orchestrator-Workflows erreicht ist

## Ausführung (direkt in der Hauptsession)

### 1. Commit

- Stage relevante Dateien gezielt (NICHT `git add -A`)
- Conventional Commit: `feat(#{ticket}): {kurze englische Beschreibung}`
- `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`

### 2. Push

```bash
git push -u origin {branch-name}
```

### 3. PR erstellen

```bash
gh pr create --title "feat(#{ticket}): {Beschreibung}" --body "$(cat <<'EOF'
## Summary
- {Bullet Points}

## Test plan
- {Was wurde getestet}

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### 4. Notion-Status auf "Ready to review"

> **Nur wenn Notion konfiguriert ist** (`notion.tasks_db` in `project.json` gesetzt).

**Falls Notion konfiguriert — PFLICHT, NICHT ÜBERSPRINGEN:**
Setze den Status des aktuellen Tickets auf **"Ready to review"** via `notion-update-page`.
Falls kein aktives Ticket bekannt: frage den User.
Warte auf die Bestätigung, dass das Update erfolgreich war.

### 5. Bestätigung

Zeige:
- PR-URL
- **Falls Notion:** Notion-Status "Ready to review" ✓ (bestätige explizit)
- Hinweis: nach Review `/merge` oder "passt" zum Mergen

## Regeln

- NIEMALS `git add -A` — immer gezielt stagen
- NIEMALS `--force` pushen
- Bei Pre-Commit Hook Failure: fixen und NEUEN Commit (nicht amend)
- Bei Merge-Konflikten: dem User zeigen
- NICHT automatisch mergen — das passiert erst nach Freigabe via `/merge`
