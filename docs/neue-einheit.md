# Anleitung: neues Teilthema, neues Thema, neues Gleichungs-Teilthema

Diese Anleitung beschreibt, welche Stellen im Code angefasst werden, wenn Lemmio um Inhalt wächst. Sie gilt für den Stand nach Einheit 2. Den Hintergrund liefert der [Architekturüberblick](architektur.md).

Begriffe:

- **Bereich → Thema → Teilthema** ist die Gliederung der App (`src/catalog.ts`). Das **Teilthema** ist die kleinste Lerneinheit: Erklärung als Kartenfolge, Beispiele, Formeln, Übung. Die Klasse hängt am Thema.
- Der **Pfad** `bereich/thema/teilthema` (z. B. `algebra/lineare-gleichungen/umformen`) ist zugleich Route (mit führendem Slash), `SubtopicId`, Deck-Id und Schlüssel für Inhalt und Fortschritt.
- **Einheit** ist nur ein interner Begriff für eine Iteration und ihr Release; im Code und in der App kommt er nicht vor.

## Welche Art von Teilthema?

| Die Antwort der Lernenden ist … | Art | Vorlage |
|---|---|---|
| ein Term (ausmultiplizieren, faktorisieren, …) | Term-Teilthema | `ausmultiplizieren.ts`, `src/math/tasks/` |
| eine lineare Gleichung, Zeile für Zeile gelöst | Gleichungs-Teilthema | `gleichungen-umformen.ts`, `src/math/equations/` |
| etwas anderes (Zahl, Funktionsterm, Zeichnung, Bruchgleichung, …) | neue Aufgabenart | [unten](#neue-aufgabenart) |

Die Schritte 1, 3 und 4 gelten für alle Arten. Schritt 2 hängt von der Art ab; für Gleichungen gibt es die eigene Anleitung [Neues Gleichungs-Teilthema](#neues-gleichungs-teilthema).

## Schritt 0: Planen (nur bei neuer Einheit)

Vor dem ersten Code klären und festhalten:

1. Bereich, Thema (mit Klasse) und Teilthemen, jeweils mit Slug (Kleinbuchstaben und Bindestriche, eindeutig unter demselben Elternteil) und deutschem Titel.
2. Welche der drei Aufgabenarten gilt (Tabelle oben)? Eine neue Art ist eine Planungsentscheidung, kein Handgriff.
3. Welche interaktiven Elemente die Karten brauchen. Vorhandene: `term-steps`, `area-model`, `balance`, `equation-steps`. Ein neues Element ist ein eigener Sub-Task (siehe [Neue Widget-Art](#neue-widget-art)).
4. Was ausdrücklich nicht dazugehört; Ideen kommen ins Backlog.

## Schritt 1: Katalog

Datei: `src/catalog.ts`.

- **Neues Teilthema in einem bestehenden Thema:** einen Eintrag in `subtopics` ergänzen (`slug`, `title`, `summary`). Die Reihenfolge bestimmt Navigation und Startseite.
- **Neues Thema:** einen Eintrag in `topics` des Bereichs ergänzen (`slug`, `title`, `summary`, `grade`, `subtopics`).
- **Neuer Bereich:** einen Eintrag in `catalog` ergänzen (`slug`, `title`, `topics`); Bereiche folgen den Inhaltsfeldern des KLP NRW.

Eine Route muss nicht angelegt werden: `:area/:topic/:subtopic` in `routes.tsx` greift automatisch. Navigation, Startseite, Breadcrumb, Fußzeile und Klassenfilter folgen dem Katalog.

Ein neues Thema erscheint im Formelsatz, sobald es in `formulaSheets` (Schlüssel `bereich/thema`) einen Eintrag hat (Schritt 3).

Der Test `lists exactly the subtopics that have a task generator and a content` in `catalog.test.ts` schlägt fehl, solange Generator (Schritt 2) und Inhalt (Schritt 3) fehlen; er stellt die Übereinstimmung von Katalog, `ALL_SUBTOPIC_IDS` und `subtopicContent` sicher.

## Schritt 2: Mathe-Kern

### Term-Teilthema

Dateien: `src/math/tasks/` und `src/math/index.ts`.

1. Generator in `tasks/<name>.ts` schreiben: Funktion `(rng: Rng) => Task`. Zufallszahlen nur über `rng` (`randInt`, `randNonZero`, `pick`, `pickWeighted` aus `random.ts`), nie `Math.random` direkt. Das Ergebnis baut `makeTask` aus `helpers.ts`: Es füllt `key`, `expected` und `solution` aus dem Prompt und den Schritten.
2. Die Musterlösung ist eine Liste `steps` (`expr`, optional `note` als deutscher Klartext). **Jeder Schritt muss zum Prompt äquivalent sein.**
3. Zusätzlich eine `build<Name>Task`-Funktion mit festen Zahlen anbieten, die der Generator selbst benutzt. Sie liefert die Beispiele in den Erklärtexten.
4. In `tasks/index.ts` in die Tabelle `generators` eintragen (der Schlüssel ist der Pfad des Teilthemas) und die `build*`-Funktion exportieren; in `src/math/index.ts` ebenfalls exportieren. `SUBTOPIC_IDS` und `ALL_SUBTOPIC_IDS` leiten sich ab.

Tests: `tasks.test.ts` läuft mit `describe.each(SUBTOPIC_IDS)` über alle Term-Teilthemen und prüft für jedes Äquivalenz der Schritte, dass die Musterlösung als `correct` gilt, dass der unveränderte Prompt `wrong-form` ergibt, kleine ganze Zahlen und Determinismus bei gleichem Seed. Ein neues Teilthema wird davon automatisch erfasst. Eigene Besonderheiten des Generators (Varianten, Grenzfälle) bekommen eigene Tests im selben File.

### Gleichungs-Teilthema

Siehe [Neues Gleichungs-Teilthema](#neues-gleichungs-teilthema).

## Schritt 3: Inhalte

Dateien: `src/content/<name>.ts`, `src/content/index.ts`, ggf. `src/content/formulas.ts`.

1. Eine Datei mit einem `SubtopicContent` anlegen. Vorlage für Terme ist `ausmultiplizieren.ts`, für Gleichungen `gleichungen-umformen.ts`:
   - `cards`: die Kartenfolge (siehe unten)
   - `examples`: Titel, `task` aus `build*Task` bzw. `buildEquationTask`, optional `comment` (Markup)
   - `formulaIds`: Ids aus dem Formelsatz
2. In `index.ts` in `subtopicContent` eintragen (Schlüssel: der Pfad). Weil das Objekt mit `satisfies Record<SubtopicId, SubtopicContent>` typisiert ist, meldet TypeScript Einträge, die kein `SubtopicContent` sind; ein fehlender Eintrag fällt im Test `exists for exactly the subtopics of the app` auf.
3. Neue Formeln und Regeln in `formulas.ts` in eine Gruppe von `formulaSheets` aufnehmen (Schlüssel `bereich/thema`). Ein Eintrag ist eine `Formula` (`id`, `name`, `lhs`, `rhs` in Eingabesyntax), eine `EquivalenceRule` (`kind: 'equivalence'`, `from`, `to`, `condition?`) oder eine `SolutionSetRule` (`kind: 'solution-set'`, `line`, `set`). Die `id` ist eindeutig; die Tests prüfen jeden Eintrag.

### Karten schreiben

Jede Karte hat eine stabile `id` (Kleinbuchstaben und Bindestriche; der gespeicherte Stand bezieht sich darauf, also beim Überarbeiten nicht umbenennen), einen `title`, `body` (Absätze), höchstens ein `widget` und meist eine `question`.

- **Aufbau:** Kurz halten, ein Gedanke pro Karte. Das interaktive Element kommt nach dem Text, die Frage danach. „Weiter“ bleibt gesperrt, bis die Frage gelöst ist; die Lösung lässt sich nach dem ersten Fehlversuch anzeigen.
- **Fragen:** Jedes Deck braucht beide Arten. `choice`: mindestens zwei Optionen, genau eine mit `correct: true`, falsche Optionen mit `feedback`, das den Denkfehler benennt. `term`: `answer` in Eingabesyntax und `form` (`expanded` oder `factored`); die Antwort muss ihre eigene Prüfung bestehen. Zwischenfragen zählen nicht in den Übungsfortschritt.
- **Interaktive Elemente:** Term-Teilthemen brauchen mindestens ein `area-model`, Gleichungs-Teilthemen mindestens eine `balance` und ein `equation-steps` (der Test `uses the card features` verlangt das). Die Datenfelder und Grenzen jedes Widgets stehen in `src/cards/types.ts` und im [Architekturüberblick](architektur.md#interaktive-elemente); `validateDeck` meldet Verstöße.
- **Schreibregeln für Texte:**
  - Alles Mathematische steht in `$…$` und in Eingabesyntax (`$(a+b)^2 = a^2+2ab+b^2$`), nicht als LaTeX. Ein einzelnes `$` im Text ist nicht erlaubt (Fehler „Unbalanced“); Geldbeträge o. Ä. anders schreiben.
  - **Jede `=`-Kette in `$…$` wird als Behauptung geprüft.** Nie `$a = 3x$` als Zuordnung schreiben, sondern „$3x$ steht für $a$“; falsche Gleichungen nur mit `≠`.
  - **Gleichungen (Bedingungen an x)** stehen als `$eq: 3x + 2 = x + 8$`: gelesen und gesetzt, aber nicht als Behauptung geprüft. Mit Umformung `$eq: 3x + 2 = x + 8 | - x$`, Umformung allein `$eq: | : 2$` oder `$eq: | ⇄$`, Lösungsmenge `$eq: L = {3}$`, `$eq: L = { }$`, `$eq: L = ℚ$`.
  - Schritt-Notizen (`note`) in Aufgaben sind Klartext ohne `$…$`; in Widgets sind sie Markup.
  - Texte sind Deutsch, Du-Form, sachlich genug für die Oberstufe.

Tests: `content.test.ts` prüft für jedes Teilthema: gültiges Deck, beide Fragearten, die Widgets seiner Art, KaTeX im strikten Modus für Texte, Terme, Gleichungen und Widget-LaTeX, Wahrheit der Aussagen sowie Beispiele (gehören zum Teilthema, Musterlösung gilt als richtig).

## Schritt 4: Seiten und Übung

Hier ist meist nichts zu tun:

- `SubtopicPage` rendert Erklärung (`CardDeck`), Beispiele, Formeln und die Übung für jeden Pfad aus dem Katalog; `isTermSubtopic` bzw. `isEquationSubtopic` wählt `Practice` oder `EquationPractice`.
- Beide Übungen und ihre Zustände sind themenunabhängig. Bei Termen ergeben sich die Eingabetasten aus den Buchstaben der Aufgabe.
- `progress.ts` legt den Fortschritt für alle Einträge von `ALL_SUBTOPIC_IDS` an. Neue Teilthemen brauchen keine Migration; ältere Speicherstände bleiben gültig. Der Kartenstand (`lemmio:cards`) ist je Deck-Id getrennt.

Nur wenn ein Teilthema eine andere Eingabe oder Rückmeldung braucht (andere Tasten, andere Chips), werden `MathInput.tsx` bzw. `EquationEntry.tsx` erweitert. Die Rückmeldung der Term-Übung ist an `CheckResult` gebunden, die der Gleichungs-Übung an `EquationFeedback` (siehe [Architektur](architektur.md#übung-srcpractice)).

## Schritt 5: Design einhalten

Das Theme-System verlangt für neue Oberflächen nur Disziplin, keine Einrichtung:

- Farben ausschließlich über die Tokens aus `src/index.css` (`var(--surface)`, `var(--text)`, `var(--accent)` …). Keine festen Farbwerte. So funktionieren beide Themes ohne weiteren Code.
- Braucht eine neue Komponente eine Farbe, die es nicht gibt, ein neues Token **in beiden Blöcken** (`:root` und `:root[data-theme='dark']`) anlegen und den Kontrast prüfen (Text mindestens 4,5:1, Rahmen und Zustandsmarken mindestens 3:1).
- Zustände nie nur über Farbe: Zeichen (✓/✗) oder Text dazu, wie bei `SkillPath` und den Chips.
- Touch-Ziele mindestens `2.75rem` hoch, Layout ab 360 px Breite ohne Überlauf.
- Einen neuen `localStorage`-Schlüssel mit Präfix `lemmio:` versehen, mit `try/catch` lesen und schreiben und im Fehlerfall weiterarbeiten wie `theme.ts`, `progress.ts` und `storage.ts`; README (Abschnitt Datenschutz) und Architektur nachziehen.
- Nichts am Inline-Skript in `index.html` ändern, außer Schlüssel oder Farben des Themes ändern sich (dann alle drei Stellen, siehe [Theme-System](architektur.md#theme-system)).

Beide Themes im Browser ansehen (Schalter „Design“ in der Kopfzeile), auch mobil bei 360 px.

## Schritt 6: Prüfen und abschließen

```bash
scripts/dev.sh check    # Lint, Tests und Build wie in der CI
```

`npm` läuft nur im Dev-Container, nicht auf dem Host. Danach per Hand: jedes neue Teilthema durchklicken (alle Karten, Fragen und Widgets mit Maus und Tastatur, ein Mal mit `prefers-reduced-motion`), eine Serie spielen, Seite neu laden (Fortschritt und Kartenstand bleiben), beide Themes ansehen, Direktlink auf die Unterseite öffnen.

README (Abschnitt „Inhalte“) und `docs/` bei Bedarf nachziehen. Zum Release einer Einheit gehören `CHANGELOG.md`, `docs/release-notes/v<version>.md`, die Version in `package.json` und ein Tag `release-v<version>`.

## Neues Gleichungs-Teilthema

Beispiel: ein viertes Teilthema unter `algebra/lineare-gleichungen`. Gleichungen müssen **linear in genau einer Variablen** sein, mit **ganzzahligen Koeffizienten**; in der Musterlösung und in allen Zeilen bleiben die Zahlen unter 100. Alles andere (Brüche, Textaufgaben, nichtlineare Gleichungen) ist eine [neue Aufgabenart](#neue-aufgabenart).

### G1: Katalog

Siehe Schritt 1: Eintrag unter `subtopics` des Themas `lineare-gleichungen`, z. B. `slug: 'beispiel'`. Der Pfad ist dann `algebra/lineare-gleichungen/beispiel`.

### G2: Generator

Datei: `src/math/equations/tasks.ts`.

1. **Konstante** neben `TRANSFORM`, `BRACKETS` und `SPECIAL` anlegen: `const EXAMPLE = 'algebra/lineare-gleichungen/beispiel'`.
2. **Varianten** als Union (`type ExampleVariant = …`) und als gewichtete Liste `readonly (readonly [Variante, Gewicht])[]` (mit Beispielgleichung im Kommentar) anlegen. Genug Varianten und Wertebereiche, damit eine Serie aus 10 Aufgaben ohne Wiederholung entsteht (der Test `offers enough variety` prüft das).
3. **Entwurfsfunktion** `draftExample(rng: Rng): Draft` schreiben. Sie wählt eine Variante (`pickWeighted`) und gibt `{ variant, left, right }` zurück oder `undefined`, wenn die gezogenen Zahlen nicht passen (der Generator zieht dann neu). Jeder Entwurf geht von einer **ganzzahligen Lösung `s`** aus (`randInt(rng, -9, 9)`) und rechnet die letzte freie Zahl daraus, damit die Lösung ganz bleibt. Bausteine: `lin(a, b, x)` (`a·x + b`), `scaled(p, inner)` (`p(inner)`), `mostlyPositive`, `randInt`, `randNonZero`, `pickVar` (Variable), `add`, `neg`, `group`, `num`. Zufall nur über `rng`.
4. **Registrieren** in `equationGenerators`: `[EXAMPLE]: generatorFor(EXAMPLE, draftExample)`. `EQUATION_SUBTOPIC_IDS` und `ALL_SUBTOPIC_IDS` leiten sich ab. `generatorFor` baut die Aufgabe mit `buildEquationTask` (Musterlösung aus `solveStepByStep`) und verwirft Aufgaben, in denen irgendeine Zahl keine ganze Zahl oder größer als 99 ist (`hasSmallIntegers`). Passt kaum ein Entwurf, läuft der Generator in einer Endlosschleife; die Wertebereiche also großzügig wählen und im Test prüfen.
5. **Musterlösung:** `solveStepByStep` löst Klammern auf, fasst zusammen, bringt x nach links und die Zahlen nach rechts und teilt. Reicht dieser Weg für das Teilthema, ist nichts zu tun. Braucht das Teilthema einen anderen Lösungsweg, wird `src/math/equations/solve.ts` erweitert (und seine Tests); das gilt dann für alle Gleichungs-Teilthemen.
6. **Varianten benennen:** Der Name der Variante erscheint in Tests und später in Statistiken. Bei Sonderfällen sagt das Präfix die erwartete Lösungsmenge (`none-…`, `all-…`, `single-…`); der Test `sonderfaelle` liest sie daran ab.

Nichts weiter exportieren: `src/math/equations/index.ts` exportiert `equationGenerators`, `EQUATION_SUBTOPIC_IDS`, `generateEquationTask`, `generateEquationSeries` und `buildEquationTask` bereits.

### G3: Inhalt

Datei: `src/content/gleichungen-<name>.ts`, registriert in `src/content/index.ts` (Schritt 3).

1. `const TOPIC = 'algebra/lineare-gleichungen/beispiel'` und ein `SubtopicContent` mit `cards`, `examples`, `formulaIds`.
2. **Karten:** mindestens eine `balance` und ein `equation-steps`; beide Fragearten.
   - `equation-steps`: `start` (Gleichung in Eingabesyntax), `steps[]` mit `operation` (`'| - x'`, `'| : 2'`, `'T'` für „Term umformen“, `'⇄'`), `equation` (die Zeile **nach** der Umformung), `note?`; `solution` (z. B. `'L = {3}'`). Jeder Schritt wird mit `checkStep` geprüft, die Lösungsmenge gegen `solveEquation`. Ist `equation` zusammengefasster als nötig, ist das erlaubt.
   - `balance`: `equation`, `mode` (`steps` mit `steps: ['| - x', '| - 2', '| : 2']`, oder `explore`, optional mit `operations`). Eine eindeutige Lösung muss ganzzahlig und ≥ 0 sein; je Seite höchstens 6 x-Stücke und 12 Einer. `steps` kennt nur `+ T`, `- T`, `: n` (2 bis 6, nur bei gleichmäßiger Teilbarkeit) und `· (-1)`; „Term umformen“ und „⇄“ lassen sich nicht darstellen, die Musterlösung aus `solveStepByStep` also nicht ungeprüft übernehmen. Gleichungen mit negativer Lösung sind (noch) nicht darstellbar und gehören in `equation-steps`.
3. **Beispiele:** `task: buildEquationTask(TOPIC, parse('4(x - 2)'), parse('2x + 6'))`; optional `comment`. Die Musterlösung zeigt die Seite in Schulnotation.
4. **Formeln:** `formulaIds` verweist auf vorhandene Einträge (`equation-add`, `equation-subtract`, `equation-multiply`, `equation-divide`, `equation-swap`, `solution-single`, `solution-empty`, `solution-all`, …) oder auf neue in `formulaSheets['algebra/lineare-gleichungen']`.
5. **Texte:** Gleichungen als `$eq: …$` (siehe Schritt 3), Terme und Behauptungen als `$…$`.

### G4: Tests von Hand ergänzen

Diese Stellen enthalten feste Tabellen oder Zahlen und laufen nicht von selbst mit:

| Datei | Was ergänzen |
|---|---|
| `src/math/equations/tasks.test.ts` | Test `cover the three subtopics of linear equations …`: Liste der Ids; Titel und Zahl anpassen |
| `src/math/equations/tasks.test.ts` | Block `subtopic specifics`: ein Test für die Besonderheiten der neuen Varianten (z. B. immer Klammern, immer eine Lösung) |
| `src/content/content.test.ts` | Test `works through the planned examples`: Zeile mit den Beispielen des neuen Teilthemas (`Gleichung → Lösungsmenge`) |
| `src/routes.test.tsx` | `expect(subtopics).toHaveLength(6)` auf die neue Zahl |
| `src/content/content.test.ts` | nur wenn eine neue Formelgruppe entsteht: `has rules for equations and the three kinds of solution sets` (Liste der Gruppentitel) |

Alles andere (Katalog, Inhalte, Seiten, Fortschritt, Generator-Eigenschaften wie Determinismus, kleine ganze Zahlen, Musterlösung Zeile für Zeile gültig) läuft über `ALL_SUBTOPIC_IDS` bzw. `EQUATION_SUBTOPIC_IDS` automatisch mit.

### G5: Übung

Nichts zu tun: `EquationPractice` und `equationSession.ts` arbeiten mit jeder Id aus `EQUATION_SUBTOPIC_IDS`. Fortschritt, Skill-Pfad und Serienergebnis kommen mit. Nur wenn das Teilthema andere Umformungen braucht als `+ − · :`, „Term umformen“ und „⇄“, müssen `readOperation`, `checkStep` und die Tastenreihe in `EquationEntry.tsx` erweitert werden.

## Neue Widget-Art

Interaktive Elemente sind Datenobjekte mit Diskriminator `kind`. Eine neue Art braucht:

1. **Typ** in `src/cards/types.ts`: Interface mit `kind: '<name>'` und Datenfeldern, in die Union `CardWidget` aufnehmen; Dokumentation am Typ (Zweck, Grenzen).
2. **Logik** in `src/cards/<name>.ts`, rein und ohne React: Modell aus den Daten bauen, `…Problems(widget)` für die Prüfung (leere Liste = gültig), Zustandsübergänge als Funktionen, Texte für die Live-Region, Terme für den Satz. Über `src/cards/index.ts` exportieren.
3. **Validierung** in `src/cards/validate.ts`: Fall in `widgetProblems`, die Terme in `cardTerms`, ggf. LaTeX in `deckLatex` und Notizen in `cardMarkup`. Der `switch` ist erschöpfend, TypeScript meldet fehlende Fälle.
4. **Ansicht** in `src/components/cards/<Name>View.tsx` und ein `case` in `CardWidgetView.tsx`.
   - Bedienung per Maus, Touch und Tastatur; `prefers-reduced-motion` beachten (`useReducedMotion`, `animate` aus `src/motion`).
   - Eine Live-Region sagt jeden Schritt an; Zustände nie nur über Farbe.
   - Widgets, die Pfeiltasten selbst nutzen, rufen `preventDefault()` auf, sonst blättert das Deck mit.
   - Lint-Falle `react-hooks/refs`: beim Rendern keine Ref-Callbacks in Hilfsfunktionen erzeugen und keine Closures mit Ref-Zugriff weiterreichen; Elemente notfalls über `data-*`-Attribute finden.
5. **Tests:** Unit-Tests der Logik (`src/cards/<name>.test.ts`), Komponententest (`src/components/cards/<Name>View.test.tsx`), eine Demo-Karte in `src/pages/dev/demoDeck.ts` (der Test in `routes.test.tsx` nimmt die Kartenzahl aus dem Demo-Deck) und die Vorgabe in `content.test.ts` (`uses the card features`), falls ein Thema die Art verlangen soll.

## Neue Aufgabenart

Die Antwort ist weder ein Term noch eine zeilenweise gelöste lineare Gleichung (z. B. eine Zahl, ein Funktionsterm, eine Zeichnung, eine Bruchgleichung). Dann gilt wie bei den Gleichungen: eigenes Register statt Aufweichen der bestehenden.

1. **Mathe-Kern:** eigenes Modul (z. B. `src/math/<art>/`) mit Aufgabentyp, Lesen der Eingabe, Prüfung, Generatoren und Musterlösung; ohne React, mit Unit-Tests.
2. **Register:** `<art>Generators` und `<ART>_TOPIC_IDS` im Modul, in `src/math/topics.ts` in `ALL_SUBTOPIC_IDS` und `AnySubtopicId` aufnehmen und eine Prüffunktion `is<Art>Topic` ergänzen; `src/math/index.ts` exportiert sie.
3. **Übung:** eigene Zustandsdatei in `src/practice/` (wie `equationSession.ts`, auf Basis von `SeriesState`) und eine eigene Komponente (wie `EquationPractice`) mit `PracticeProgress`, `SeriesSummary` und `SkillPath`; in `SubtopicPage` über die Prüffunktion einbinden.
4. **Inhalte:** `WorkedExample.task` und `isEquationTask` in `src/content/types.ts` um die neue Aufgabe erweitern; das Beispiel-Rendering in `WorkedExampleCard` ergänzen. Die Tests in `content.test.ts` und `pages.test.tsx` unterscheiden bisher nur Term- und Gleichungs-Teilthemen und werden um die neue Art erweitert.
5. **Fortschritt:** `progress.ts` nimmt jede Id aus `ALL_SUBTOPIC_IDS` auf; eine Migration ist nicht nötig.
