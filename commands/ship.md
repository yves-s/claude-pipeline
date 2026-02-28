---
name: ship
description: Commit, Push, PR erstellen und Notion-Status auf "Ready to Review"
disable-model-invocation: true
---

# /ship — Commit, Push, PR erstellen

Erstellt einen PR zur Review. Merged wird erst nach Freigabe via `/merge`.

## Konfiguration

Lies `project.json` für Notion-IDs (`notion.tasks_db`, `notion.project_filter`).

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

### 4. Notion-Status auf "Ready to Review"

Setze den Status des aktuellen Tickets auf **"Ready to Review"** via `notion-update-page`.
Falls kein aktives Ticket bekannt: frage den User.

### 5. Bestätigung

Zeige: PR-URL, Notion-Status ("Ready to Review"), Hinweis dass nach Review `/merge` oder "passt" zum Mergen nötig ist.

## Regeln

- NIEMALS `git add -A` — immer gezielt stagen
- NIEMALS `--force` pushen
- Bei Pre-Commit Hook Failure: fixen und NEUEN Commit (nicht amend)
- Bei Merge-Konflikten: dem User zeigen
- NICHT automatisch mergen — das passiert erst nach Freigabe via `/merge`
