---
name: ship
description: Commit, Push, PR erstellen und Supabase-Status auf "in_review". Vollständig autonom, keine Rückfragen.
disable-model-invocation: true
---

# /ship — Commit, Push, PR erstellen

Erstellt einen PR zur Review. Merged wird erst nach Freigabe via `/merge` oder "passt".

**KEINE RÜCKFRAGEN. KEINE BESTÄTIGUNGEN. EINFACH MACHEN.**

## Konfiguration

Lies `project.json`. **Supabase ist optional** — nur ausführen wenn `supabase.project_id` gesetzt ist.

## Trigger

Wird ausgeführt wenn:
- Der User `/ship` eingibt
- Phase 5 des Orchestrator-Workflows erreicht ist

## Ausführung (direkt in der Hauptsession, KEINE Rückfragen)

### 1. Commit

- Stage relevante Dateien gezielt (NICHT `git add -A`)
- Conventional Commit: `feat(#{ticket}): {kurze englische Beschreibung}`
- `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`

**Nicht fragen ob committed werden soll. Einfach committen.**

### 2. Push

```bash
git push -u origin {branch-name}
```

**Nicht fragen ob gepusht werden soll. Einfach pushen.**

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

**Nicht fragen ob ein PR erstellt werden soll. Einfach erstellen.**

### 4. Supabase-Status auf "in_review"

> **Nur wenn Supabase konfiguriert ist** (`supabase.project_id` in `project.json` gesetzt).

**Falls Supabase konfiguriert — PFLICHT, NICHT ÜBERSPRINGEN:**

Via `mcp__claude_ai_Supabase__execute_sql`:
```sql
UPDATE public.tickets SET status = 'in_review' WHERE number = {N} RETURNING number, title, status;
```
Falls kein aktives Ticket bekannt: frage den User.

### 5. Bestätigung

Zeige eine einzige Zusammenfassung am Ende:

```
Shipped: feat(#T--162): Add user settings page
PR: https://github.com/...
Supabase: In review (falls konfiguriert)

→ Nach Review: "passt" oder /merge zum Mergen
```

## Regeln

- **KEINE RÜCKFRAGEN** — alle Schritte autonom durchführen
- NIEMALS `git add -A` — immer gezielt stagen
- NIEMALS `--force` pushen
- Bei Pre-Commit Hook Failure: fixen und NEUEN Commit (nicht amend)
- Bei Merge-Konflikten: dem User zeigen
- NICHT automatisch mergen — das passiert erst nach Freigabe via `/merge`
