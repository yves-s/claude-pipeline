# Frontend Design Quality — Design Spec

**Datum:** 2026-03-14
**Problem:** UI-Output der autonomen Pipeline sieht häufig nach "Developer-UI" aus — funktional korrekt, aber visuell generisch und mit suboptimaler Pattern-Wahl.
**Ziel:** Systematisch bessere UI/UX-Qualität, ohne den autonomen Flow zu unterbrechen.

---

## Problemanalyse

Zwei Kernprobleme identifiziert:

1. **Visuelles Feingefühl fehlt** — generische Layouts, gleichmäßige Gewichtung, langweilige Defaults (Problem A)
2. **Falsche UI-Patterns gewählt** — Inline-Buttons statt Overflow-Menü, Modals wo Inline besser wäre, zu viele Elemente permanent sichtbar (Problem C)

Der UX-Flow (Problem B) hat sich durch den bestehenden Spec-Review-Schritt im Frontend-Agent bereits verbessert und ist kein primäres Ziel.

### Verworfene Ansätze

- **Statische Pattern-Matrix:** Spröde, muss gepflegt werden, deckt nur Pattern-Wahl ab — nicht visuelles Feingefühl.
- **Separate UX-Planning-Phase in der Pipeline:** Overengineering für das aktuelle Problem. Der `ux-planning`-Skill bleibt für manuelle Nutzung verfügbar.
- **Post-Implementation-Review:** "Bau es falsch, dann fix es" ist teuer und führt zu Patches statt echten Verbesserungen.

### Gewählter Ansatz

Kombination aus:
1. **Design-Thinking-Schritt im Frontend-Agent** — erzwungenes Nachdenken vor dem Coden
2. **Design-Kontext vom Orchestrator** — Koordinaten, damit der Frontend-Agent weiß wo er hinschauen soll
3. **Design-Prinzipien statt Regeln** — erklären *warum* etwas gut aussieht, veralten nicht

---

## Änderung 1: Frontend-Agent — Design-Thinking-Schritt

### Neuer Workflow

```
1. Aufgabe verstehen (Orchestrator-Prompt lesen)
1b. Spec-Review — Challenge die Spec (unverändert)
2. Design-Modus bestimmen — Greenfield vs. Bestehend (unverändert)
3. NEU → Design-Thinking: Studieren, Entscheiden, Begründen
4. Implementieren
```

### Schritt 3 im Detail

**3a. Studieren** — Der Agent liest 2-3 bestehende Seiten/Komponenten im Projekt, die dem zu bauenden Feature am ähnlichsten sind. Ziel: Die visuelle Sprache verstehen — Dichte, Abstände, Aktionspräsentation, Typografie-Hierarchie.

Bei Greenfield (kein bestehendes UI): Stattdessen eine bewusste Referenz-App wählen ("Ich orientiere mich an der Dichte und Klarheit von Linear's Project Views") und als Anker für alle visuellen Entscheidungen nutzen.

**3b. Entscheiden** — Der Agent formuliert eine kurze Design-Rationale (3-5 Sätze), die drei Fragen beantwortet:
- **Layout:** Warum dieses Layout und nicht ein anderes?
- **Interaktion:** Wie interagiert der User mit den Elementen — und warum so?
- **Visuelles Level:** Dicht oder luftig? Prominent oder zurückhaltend? Warum?

**3c. Begründen** — Der Agent gibt die Rationale als Log-Output aus, bevor er Code schreibt. Kein User-Approval, kein Warten — reiner Selbst-Disziplinierungs-Effekt. Wer seine Entscheidung formuliert, trifft bewusstere Entscheidungen.

Beispiel-Output:
> "Design-Entscheidung: Card Grid statt Table, weil die Items visuell unterschiedlich sind und wenig tabellarische Daten haben. Aktionen per Hover-Overlay, Verwaltungskontext → ghost Buttons. Orientierung an bestehender `/dashboard`-Seite für Spacing und Hierarchie."

### Design-Prinzipien (neu, direkt im Frontend-Agent)

Fünf Prinzipien, die erklären *warum* etwas gut aussieht:

**1. Visuelle Hierarchie ist die halbe Arbeit**
Jede Seite hat genau eine Sache, die der User zuerst sehen soll. Wenn alles gleich gewichtet ist, sieht alles gleich unwichtig aus. Developer-UI-Fehler: Alles hat die gleiche Schriftgröße, gleiche Farbe, gleichen Abstand.

**2. Reduktion vor Addition**
Gutes UI entsteht durch Weglassen, nicht durch Hinzufügen. Bevor du ein Element einbaust, frage: Braucht der User das *jetzt*, oder nur *manchmal*? Was nur manchmal gebraucht wird, gehört in Hover, Overflow-Menü oder eine Unterseite. Developer-UI-Fehler: Alles ist permanent sichtbar.

**3. Rhythm & Breathing**
Konsistente Abstände erzeugen visuellen Rhythmus. Großzügiger Weißraum zwischen Sektionen, enge Abstände innerhalb einer Gruppe. Developer-UI-Fehler: Gleichmäßige Abstände überall — keine Gruppierung, keine Hierarchie.

**4. Zurückhaltung bei Interaktivität**
Nicht jedes Element braucht einen sichtbaren Button. Aktionen können durch den Kontext implizit sein (Klick auf eine Card öffnet sie). Developer-UI-Fehler: Jedes Element hat explizite Buttons für jede mögliche Aktion.

**5. Das Referenz-Prinzip**
Wenn du unsicher bist: Wie würde das in der besten App aussehen, die du kennst? Nicht kopieren, aber das Qualitätslevel matchen. "Würde das in Linear so aussehen?" ist die konstante Prüffrage.

---

## Änderung 2: Orchestrator — Design-Kontext

### Erweiterung des Frontend-Agent-Prompts

Der Orchestrator gibt dem Frontend-Agent bei UI-Tickets einen `## Design-Kontext` Block mit:

```markdown
## Design-Kontext
- Kontext: Verwaltungs-/Settings-Bereich (kein Conversion-Flow)
- Ähnlichste bestehende Seite: `/settings/workspace` — dort Spacing und Patterns studieren
- Komplexität: Wenige Daten, wenige Aktionen → eher luftig, nicht dicht
```

### Was der Orchestrator NICHT tut

- Kein konkretes Pattern vorschreiben ("nimm Cards")
- Keine visuelle Richtung diktieren
- Keinen Design Brief schreiben

Er gibt dem Frontend-Agent nur **Koordinaten** — der Agent trifft die Design-Entscheidung selbst im Design-Thinking-Schritt. Der Orchestrator muss kein Designer sein, er zeigt nur, wo der Agent hinschauen soll.

---

## Was sich NICHT ändert

- **Pipeline-Architektur** — keine neue Phase, kein neuer Agent
- **Design-Skills** — `design`, `frontend-design`, `creative-design` bleiben unverändert
- **Autonomer Flow** — kein zusätzlicher Interaktionspunkt, keine User-Fragen
- **`ux-planning`-Skill** — bleibt für manuelle Nutzung verfügbar
- **Spec-Review (Schritt 1b)** — bleibt unverändert, ergänzt sich mit Design-Thinking

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `agents/frontend.md` | Neuer Schritt 3 (Design-Thinking) + Design-Prinzipien-Sektion |
| `agents/orchestrator.md` | Erweiterung des Frontend-Agent-Prompt-Musters um `## Design-Kontext` |

---

## Risiken

- **Token-Overhead:** Der Design-Thinking-Schritt erfordert 2-3 extra File-Reads. Bei einem Sonnet-Agent ist das minimal (~500 Tokens extra).
- **Qualität der Selbst-Reflexion:** Der Agent könnte den Design-Thinking-Schritt oberflächlich abhandeln. Mitigation: Die Prinzipien sind konkret genug ("Developer-UI-Fehler: ..."), um generische Begründungen zu verhindern.
- **Orchestrator-Kontext:** Der Orchestrator könnte falsche Referenz-Seiten angeben. Mitigation: Der Frontend-Agent validiert im Design-Thinking-Schritt selbst und kann die Referenz überschreiben.
