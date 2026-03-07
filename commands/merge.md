---
name: merge
description: Alles abschliessen — commit, push, PR, merge, Notion "Done". Vollständig autonom, keine Rückfragen.
disable-model-invocation: true
---

# /merge — Ship + Merge in einem Rutsch

Schliesst die aktuelle Arbeit vollständig ab. Führt alle nötigen Schritte autonom durch — vom uncommitted Code bis zum gemergten PR.

**KEINE RÜCKFRAGEN. KEINE BESTÄTIGUNGEN. EINFACH MACHEN.**

## Konfiguration

Lies `project.json`. **Notion ist optional** — nur ausführen wenn `notion.tasks_db` gesetzt ist.
Falls Notion konfiguriert: Resolve die Data Source URL via `notion-fetch` auf `https://www.notion.so/{notion.tasks_db}` falls noch nicht in der Session gecached.

## Trigger

Wird ausgeführt wenn:
- Der User `/merge` eingibt
- Der User "passt", "done", "sieht gut aus", "klappt", "fertig" o.ä. sagt

## Ausführung (direkt in der Hauptsession, KEINE Rückfragen)

Prüfe den aktuellen Zustand und führe **alle nötigen Schritte** ohne Unterbrechung durch:

### 1. Uncommitted Changes? → Commit

Falls `git status` uncommitted Changes zeigt:

```bash
# Gezielt stagen (NICHT git add -A)
git add <betroffene-dateien>

# Conventional Commit
git commit -m "feat(#{ticket}): {englische Beschreibung}

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

**Nicht fragen ob committed werden soll. Einfach committen.**

### 2. Nicht gepusht? → Push

Falls der Branch nicht auf Remote existiert oder ahead ist:

```bash
git push -u origin {branch-name}
```

**Nicht fragen ob gepusht werden soll. Einfach pushen.**

### 3. Kein PR? → PR erstellen

Falls `gh pr view` keinen offenen PR findet:

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

### 4. Merge

```bash
gh pr merge --squash --delete-branch
```

**Nicht fragen ob gemergt werden soll. Einfach mergen.**

### 5. Zurück auf main

```bash
git checkout main && git pull origin main
```

### 6. Notion-Status auf "Done"

> **Nur wenn Notion konfiguriert ist** (`notion.tasks_db` in `project.json` gesetzt).

Setze den Status des aktuellen Tickets auf **"Done"** via `notion-update-page`.
Falls kein aktives Ticket bekannt: frage den User.

### 7. Bestätigung

Zeige eine einzige Zusammenfassung am Ende:

```
Merged: feat(#T--162): Add user settings page
PR: https://github.com/...
Branch: feature/T--162-user-settings → deleted
Notion: Done ✓ (falls konfiguriert)
```

## Regeln

- **KEINE RÜCKFRAGEN** — der User hat mit "passt"/"merge" bereits seine Freigabe gegeben
- Jeden Schritt der nötig ist autonom durchführen (Commit, Push, PR, Merge)
- Schritte die schon erledigt sind überspringen (z.B. PR existiert bereits → direkt mergen)
- NIEMALS `git add -A` — immer gezielt stagen
- NIEMALS `--force` pushen
- Bei Pre-Commit Hook Failure: fixen und NEUEN Commit (nicht amend)
- Bei Merge-Konflikten: dem User zeigen, nicht force-mergen
