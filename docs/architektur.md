# Architekturüberblick

Lemmio ist eine reine Frontend-SPA: React, TypeScript und Vite, statisch auf GitHub Pages gehostet. Es gibt kein Backend und keine Konten. Zustand, der über einen Besuch hinausgeht, liegt in `localStorage`.

Stand: Einheit 3 (Lineare Funktionen), Release `release-v0.0.3` folgt.

## Schichten

```text
pages/ + components/        Darstellung (React)
        │
        ├── catalog.ts      Struktur: Bereich → Thema → Teilthema
        ├── content/        Karten, Beispiele, Formelsatz (Daten + KaTeX-Satz)
        ├── cards/          Kartenfolgen: Datenmodell, Zustand, Speicher, Logik der Widgets
        ├── plane/          Koordinatensystem: reine Logik
        ├── practice/       Übungsserien (reiner Zustand) und Fortschritt
        ├── motion/         Animationshilfen
        ├── theme/          Theme-Wahl
        │
        └── math/           Mathe-Kern (Terme, Gleichungen, Funktionen), ohne React
```

Abhängigkeiten zeigen nur nach unten. `src/math` kennt weder React noch den Browser. `src/practice/session.ts`, `equationSession.ts`, `functionSession.ts`, `functionDrawing.ts`, `intersectionSession.ts`, `src/plane` und fast alles in `src/cards` (alles außer dem Hook `useDeck`) sind reiner Zustand bzw. reine Logik ohne React und deshalb ohne DOM testbar. `src/content/types.ts` und `src/cards/types.ts` verweisen nur über Typen aufeinander.

## Verzeichnisse

| Pfad | Inhalt |
|---|---|
| `index.html` | Einstieg, `lang="de"`, Inline-Skript für das Theme |
| `src/main.tsx` | Start: `initTheme()`, Router (`basename` aus `import.meta.env.BASE_URL`), KaTeX-CSS, `index.css` |
| `src/routes.tsx` | Routen (siehe [Katalog und Routing](#katalog-und-routing)) |
| `src/catalog.ts` | Katalog: Bereiche, Themen, Teilthemen, Klasse; Hilfsfunktionen |
| `src/math/` | Mathe-Kern für Terme: Parser, Polynome, Prüfung, Generatoren (`tasks/`); `topics.ts` fasst beide Register zusammen |
| `src/math/equations/` | Mathe-Kern für Gleichungen: Lesen, Prüfen, Lösen, Generatoren |
| `src/math/functions/` | Mathe-Kern für lineare Funktionen: Lesen, Prüfen, Analyse, Ausgabe, Aufgaben und Generatoren |
| `src/plane/` | Koordinatensystem, reine Logik: `plane.ts`, `index.ts` |
| `src/cards/` | `types.ts`, `deck.ts`, `storage.ts`, `useDeck.ts`, `validate.ts`; Logik der Widgets: `areaModel.ts`, `balance.ts`, `equationSteps.ts`, `lineCommon.ts`, `lineSliders.ts`, `slopeTriangle.ts`, `linePoints.ts`, `valueTable.ts`, `twoLines.ts` |
| `src/motion/` | `motion.ts` (`animate`, `runSequence`, Presets), `hooks.ts` |
| `src/content/` | Inhalte je Teilthema (`ausmultiplizieren.ts`, …, `gleichungen-umformen.ts`, …, `funktionen-steigung-und-graph.ts`, …), `index.ts`, `formulas.ts`, `markup.ts`, `functionFigure.ts`, `types.ts`, `poly.ts` |
| `src/practice/` | `session.ts`, `equationSession.ts`, `functionSession.ts`, `functionDrawing.ts`, `intersectionSession.ts`, `progress.ts`, `useSubtopicProgress.ts` |
| `src/theme/` | `theme.ts`, `useTheme.ts` |
| `src/components/` | `Layout`, `Breadcrumb`, `ThemeToggle`, `Practice`, `EquationPractice`, `EquationEntry`, `EquationWork`, `EquationFeedbackMessage`, `FunctionPractice`, `IntersectionPractice`, `FunctionExamplePlane`, `FunctionSolutionSteps`, `functionKeys.ts`, `MathInput`, `PracticeProgress`, `SeriesSummary`, `SkillPath`, `Chip`, `InputEcho`, `SolutionSteps`, `EquationSolutionSteps`, `Tex`, `RichText`, `FormulaList`, `WorkedExampleCard` |
| `src/components/cards/` | `CardDeck`, `CardPath`, `CardWidgetView`, `ChoiceQuestionView`, `TermQuestionView`, `QuestionStatus`, `TermStepsView`, `AreaModelView`, `BalanceView`, `EquationStepsView`, `LineSlidersView`, `SlopeTriangleView`, `LinePointsView`, `ValueTableView`, `TwoLinesView` |
| `src/components/plane/` | `CoordinatePlane` |
| `src/pages/` | `Home`, `SubtopicPage`, `FormulaSheet`, `NotFound`; `dev/` mit der Kartendemo und der Koordinatensystem-Demo |
| `src/index.css` | Design-Tokens beider Themes und alle Styles (eine Datei) |
| `src/test/` | Testumgebung (`setup.ts`, jest-dom) und Testhilfe `matchMedia.ts` (`mockReducedMotion`) |

Tests liegen neben dem Code (`*.test.ts` bzw. `*.test.tsx`).

## Katalog und Routing

`src/catalog.ts` ist die einzige Quelle der Struktur: `Area` → `Topic` (mit `grade`, der Klasse) → `Subtopic`. Startseite, Navigation, Breadcrumb, Fußzeile und Formelsatz werden daraus abgeleitet. Hilfen: `allSubtopics`, `findSubtopic`, `subtopicPath`, `gradesOf`, `filterByGrade`, `gradeLabel`. Bereiche richten sich nach den Inhaltsfeldern des KLP NRW.

Der **Pfad `bereich/thema/teilthema`** ist überall derselbe Schlüssel: die Route (mit führendem Slash), die `SubtopicId` im Mathe-Kern, die Deck-Id der Karten, der Schlüssel für Inhalte und Fortschritt. `SubtopicId` ist nur als Muster `${string}/${string}/${string}` typisiert; welche Ids es gibt, entscheiden der Katalog und die Generator-Register. `SubtopicId` bezeichnet wie `Subtopic` im Katalog die Teilthema-Ebene, `Topic` die Thema-Ebene.

Routen (`routes.tsx`, alle unter `Layout`):

| Route | Seite |
|---|---|
| `/` | `Home`: Teilthemen nach Bereich und Thema, Klassen-Badge, Filter (`?klasse=8`) |
| `/formelsatz` | `FormulaSheet` |
| `/:area/:topic/:subtopic` | `SubtopicPage`; ein Pfad, der nicht im Katalog steht, liefert `NotFound` |
| `/dev/karten`, `/dev/koordinaten` | Kartendemo und Koordinatensystem-Demo, nur bei `import.meta.env.DEV`; im Build fehlen die Routen samt Modulen |
| `*` | `NotFound` |

`createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })`. Lokal ist `BASE_URL` gleich `/`, in der CI `/<repo>/` (Variable `BASE_PATH` in `vite.config.ts`). Es gibt keine Weiterleitungen alter Routen.

Auf GitHub Pages gibt es kein serverseitiges Routing. Die CI kopiert deshalb `dist/index.html` nach `dist/404.html`. Direktlinks funktionieren, der HTTP-Status ist aber 404.

## Mathe-Kern für Terme (`src/math`)

Einstieg ist `src/math/index.ts`.

- **Eingabe:** `parser.ts` liest Terme in Schulschreibweise (`2x`, `3(x+1)`, `^2` und `²`, `·`/`*`/`×`, `:` und `/`, Dezimalkomma, echtes Minus `−`). Vorzeichen stehen nur am Anfang bzw. nach `(`. `parse` wirft `TermError`; `readTerm` fängt das ab und liefert `{ ok, … }`.
- **Normalform:** `polynomial.ts` und `normalize.ts` bringen einen Term in ein kanonisches Polynom (`Polynomial`, Koeffizienten als `Rational`). Zwei Terme sind gleichwertig, wenn ihre Polynome gleich sind (`areEquivalent`).
- **Prüfung:** `checkAnswer(task, input)` prüft zuerst Äquivalenz, dann die verlangte Form (`form.ts`: `expanded` oder `factored`). Ergebnis: `correct`, `wrong`, `wrong-form` (mit `hint.code` und deutschem `hint.message`) oder `invalid` (mit `error.code`, `error.message`, `error.position`, `error.length`). `checkAnswer` nimmt jeden `AnswerKey` (`expected`, `form`), nicht nur `Task`; so prüfen auch die Term-Fragen der Karten.
- **Ausgabe:** `toLatex` für KaTeX, `toText` für Klartext (wieder einlesbar).
- **Aufgaben:** `tasks/` enthält je Teilthema einen Generator (`expand.ts`, `binomial.ts`, `factor.ts`). `generators` ist die Tabelle `SubtopicId → Generator`, `SUBTOPIC_IDS` wird daraus abgeleitet. `generateTask` und `generateSeries` vermeiden Wiederholungen über `task.key`. Jede `Task` trägt `instruction`, `prompt`, `steps[]` (Musterlösung), `solution`, `key` und `form`. `build*Task`-Funktionen erzeugen dieselben Aufgaben mit festen Zahlen für Beispiele.
- **Zufall:** `Rng` ist eine Funktion `() => number`. In der App ist es `Math.random`, in Tests `createRng(seed)`.

Aufgaben haben nur ganzzahlige Koeffizienten; Variablen sind `x`, `y`, `a`, `b`.

## Mathe-Kern für Gleichungen (`src/math/equations`)

Über `src/math/index.ts` re-exportiert (`export * from './equations'`). Eine Gleichung wird Zeile für Zeile gelöst; die Antwort ist kein einzelner Term. Deshalb gibt es eigene Typen, Prüfungen und Generatoren.

- **Typen** (`types.ts`): `Equation` (`left`, `right` als `Expr`); `Operation` ist `{ kind: 'add' | 'subtract' | 'multiply' | 'divide', operand }`, `{ kind: 'simplify' }` („Term umformen“) oder `{ kind: 'swap' }` („⇄“); `SolutionSet` ist `single` (`value`), `empty` oder `all`; `EquationTask` trägt `topic`, `variant`, `key`, `instruction`, `variable`, `equation`, `steps[]` (je `operation`, `equation`, `note`), `solutionSet`, `solutionNote`. Ein Schritt bedeutet: `operation` auf die Zeile davor angewandt ergibt `equation`.
- **Lesen:** `readEquation(input)` (genau ein `=`), `readOperation(input)` (`| + 3x`, `| - 5`, `| · (-2)`, `| : 4`, `⇄`, `T` oder `Term umformen`; der Strich ist optional; Summen als Operand nur in Klammern) und `readSolutionSet(input)` (`L = {3}`, `L = { }`, `L = ℚ`, auch `Q` und `∅`, auch ohne `L =`). `readOperation` trennt `reason: 'invalid'` (nicht lesbar) von `'not-allowed'` (lesbar, aber keine zulässige Umformung: Mal oder geteilt durch einen Term mit x, durch 0, nichtlinear; jeweils mit deutschem Hinweis).
- **Prüfen:** `checkStep(previous, operation, input)` → `correct` (mit der geparsten `equation` für die nächste Zeile), `wrong` (`left` und `right` je Seite, `keepsSolutions`: Zeile hat noch dieselbe Lösungsmenge, passt aber nicht zur angegebenen Umformung, z. B. zwei Schritte auf einmal) oder `invalid`. `checkSolutionSet(task, input)` → `correct`, `wrong` (`given`) oder `invalid`. Jede Seite wird für sich auf Äquivalenz zu „alte Seite ∘ Umformung“ geprüft; wie weit zusammengefasst ist, spielt keine Rolle. `equationForm(equation)` unterscheidet `solved` (`x = c`), `solved-swapped` (`c = x`), `statement` (`3 = 5`) und `open`.
- **Ausgabe:** `equationToText/Latex`, `operationToText/Latex`, `solutionSetToText/Latex`; der Text ist wieder einlesbar.
- **Musterlösung:** `solveStepByStep(equation)` löst Klammern auf, ordnet und fasst zusammen (je „Term umformen“), tauscht die Seiten, falls die Variable nur rechts steht, bringt die Variablen-Terme nach links und die Zahlen nach rechts und teilt durch den Koeffizienten (bei −1 mit `| · (-1)`). Sie endet mit `x = c` oder einer Aussage ohne Variable.
- **Generatoren** (`tasks.ts`): `equationGenerators` (Tabelle `SubtopicId → Generator`) und `EQUATION_SUBTOPIC_IDS` daraus. `buildEquationTask(topic, left, right)` erzeugt eine Aufgabe mit festen Zahlen (für Beispiele); `generateEquationTask` und `generateEquationSeries` verhalten sich wie bei Termen. Jede Aufgabe geht von einer ganzzahligen Lösung aus und rechnet die letzte freie Zahl daraus; Lösungen liegen in −9…9, alle Zahlen in der Rechnung unter 100 (`hasSmallIntegers`).

## Mathe-Kern für Funktionen (`src/math/functions`)

Über `src/math/index.ts` re-exportiert. Lineare Funktionen `f(x) = mx + n` mit ganzzahligen m und n; die Antworten sind Funktionsgleichungen, Punkte, Funktionswerte, Nullstellen, gezeichnete Geraden und Schnittpunkte. Dateien: `types.ts`, `read.ts`, `check.ts`, `analysis.ts`, `print.ts`, `tasks.ts`.

- **Typen:** `LinearFunction` (`name` „f“ oder „g“, `m`, `n` als `Rational`), `Point` (`x`, `y`), `LineThroughPoints` (`function` | `vertical` | `same-point`), `FunctionZero` (`single` | `none` | `all`), `Intersection` (`point` | `parallel` | `identical`), `FunctionSolutionLine` (`text`, `latex`, `note?`).
- **Lesen** (`read…` ohne Ausnahme, `parse…` wirft `TermError`): `readFunction` (`f(x) = 2x - 3`, `y = …` oder nur der Term; andere Variable als x → `wrong-variable`), `readPoint` (`P(2|5)`, `(2|5)`, `P(2;5)`; ein Komma als Trenner wird mit Hinweis abgelehnt, weil es das Dezimalkomma ist), `readFunctionValue` (`f(2) = 5`, auch Ketten `f(2) = 3·2 - 1 = 5`).
- **Prüfen:** `checkFunction` (Äquivalenz und Form; bei falscher Antwort getrennt Steigung und Achsenabschnitt), `checkPoint` (Koordinaten müssen ausgerechnet sein), `checkDrawnLine(fn, p, q)` (nur die Gerade zählt, nicht die gewählten Punkte; `vertical` und `same-point` sind keine Antwort), `checkFunctionValue`, `checkZero` (`N(z|0)`, `x = z` oder die Antwort „keine Nullstelle“) und `checkIntersection` (Punkt, „parallel“ oder „identical“).
- **Analyse:** `valueAt`, `isOnGraph`, `slopeFromPoints`, `lineThroughPoints`, `zeroOf`, `intersect` (löst `mx + n = m'x + n'` mit `solveEquation`), `substitute` (setzt eine Zahl ein, z. B. `3·2 - 1`).
- **Ausgabe:** `functionToText/Latex`, `pointToText/Latex` (`P(2|-3)`, der Text ist wieder einlesbar), `numberToText/Latex`.
- **Aufgaben:** `FunctionTask` ist eine Union über `kind`: `read-equation`, `draw-graph`, `from-point-slope`, `from-two-points`, `point-test`, `zero`, `intersection`. Jede Aufgabe trägt `fn`, `instruction` und `steps` (Musterlösung als `FunctionSolutionLine`); wo eine Gleichung zu lösen ist (n bestimmen, Nullstelle, Gleichsetzen), steht zusätzlich eine `EquationTask` aus `buildEquationTask` in `equation`, damit sie wie in Einheit 2 Zeile für Zeile geübt werden kann. `build…Task` erzeugen Aufgaben mit festen Zahlen (für Beispiele).
- **Generatoren:** `functionGenerators`, `FUNCTION_SUBTOPIC_IDS`, `generateFunctionTask`, `generateFunctionSeries`. Alle Punkte liegen im Fenster `FUNCTION_WINDOW` (−8…8), alle Zahlen sind ganz.

### Drei Register

Term-, Gleichungs- und Funktions-Generatoren stehen bewusst in getrennten Tabellen (`generators`/`SUBTOPIC_IDS`, `equationGenerators`/`EQUATION_SUBTOPIC_IDS`, `functionGenerators`/`FUNCTION_SUBTOPIC_IDS`). `src/math/topics.ts` fasst sie zusammen: `ALL_SUBTOPIC_IDS`, `isTermSubtopic`, `isEquationSubtopic`, `isFunctionSubtopic` und die Typen `TermSubtopicId`, `EquationSubtopicId`, `FunctionSubtopicId`, `AnySubtopicId`. Alles, was alle Teilthemen betrifft (Katalogtest, Inhalte, gespeicherter Fortschritt), nutzt `ALL_SUBTOPIC_IDS`; `SubtopicPage` wählt über Prüffunktionen die passende Übung.

## Koordinatensystem (`src/plane`, `components/plane`)

Ein wiederverwendbarer Baustein außerhalb von `src/cards`: Er ist kein Karten-Widget, sondern wird von den Geraden-Widgets, den Beispielen und der Funktions-Übung genutzt.

- **Logik** (`src/plane`, rein, ohne React): `PlaneWindow` (ganzzahlig, 0 auf beiden Achsen sichtbar, Spannweite 4 bis 20, Standard −8…8, gleicher Maßstab auf beiden Achsen), `PlaneLine` (`function` mit m und n oder `vertical`), `PointDrag` (`free`, `vertical`, `horizontal`, `on-line` mit optionalem `range`). Geometrie: `planeFrame`, `toView`/`fromView`, `clientToPlane`, `gridLines`, `axisTicks`, `clipLine` (Gerade auf das Fenster zuschneiden). Punkte: `snapPoint` (rastet schon beim Ziehen auf Gitterpunkte ein; belegte Punkte anderer ziehbarer Punkte sind gesperrt), `movePoint` (Tastatur), `placeAt` (Tippen). Texte mit echtem Minus (`pointLabelText`, `lineText`, `pointAnnouncement`, …). `planeWindowProblems` und `pointProblems` prüfen Daten für `validateDeck`.
- **Komponente** `CoordinatePlane` ist gesteuert: Sie zeigt nur die übergebenen `lines` und `points`; der Zustand liegt beim Aufrufer (`onPointChange`, optional `onPlace` für Tippen, `describe`, `overlay` als Render-Prop für eigene Zeichnung wie das Steigungsdreieck). Geraden tragen eine Beschreibung (`description`), damit ein Graph zum Ablesen die Gleichung nicht verrät.
- **Bedienung:** Maus und Touch über Pointer Events (`setPointerCapture`, `touch-action: none` nur an ziehbaren Punkten), Tastatur über Pfeile, Pos1/Ende und Bild↑/↓ (mit `preventDefault`). Ziehbare Punkte sind `role="slider"` (`aria-roledescription` „verschiebbarer Punkt“, `aria-valuetext` `x = …, y = …`). Eine Live-Region sagt Schritte, Ränder und gesperrte Punkte an. Keine Animation im Baustein.
- **Demo:** `/dev/koordinaten` (`src/pages/dev/PlaneDemo.tsx`, nur im Dev-Server).

## Karten (`src/cards`, `components/cards`)

Erklärungen sind Kartenfolgen (ähnlich brilliant.org): Eine Karte zur Zeit, je Karte Text, höchstens ein interaktives Element und meist eine Zwischenfrage. Alles ist reine Daten, damit Node-Tests jede Folge prüfen können.

### Datenmodell (`types.ts`)

- `Deck`: `id` (der `SubtopicId`-Pfad) und `cards`.
- `Card`: `id` (stabil, Kleinbuchstaben und Bindestriche; der gespeicherte Stand bezieht sich darauf), `title`, `body` (Absätze als Markup), optional `widget` und `question`.
- `CardWidget` ist eine Union mit dem Diskriminator `kind`: `term-steps`, `area-model`, `balance`, `equation-steps`, `line-sliders`, `slope-triangle`, `line-points`, `value-table`, `two-lines`.
- `CardQuestion`: `choice` (`prompt`, `options[]` mit `text`, genau eine mit `correct: true`, optional `feedback`; `explanation?`) oder `term` (`prompt`, `term?` groß angezeigt, `answer` als Musterlösung in Eingabesyntax, `form`, `variables?`, `explanation?`). Term-Fragen werden mit `checkAnswer` geprüft (`termQuestionKey` baut den Schlüssel).

### Zustand und Speicher

- `deck.ts` ist wie `session.ts` ein reiner Zustand: `DeckState` (`index`, `questions` je Karten-Id mit `resolved`, `misses`, `feedback`). Eine Karte ist erreichbar, wenn alle Karten davor erledigt sind (keine Frage oder Frage gelöst); erreichbar ist also immer ein Präfix der Folge (`lastReachable`). Bei Auswahl- und Term-Fragen gibt es beliebig viele Versuche. `wrong` und `wrong-form` zählen als Fehlversuch, `invalid` nicht. „Lösung anzeigen“ (`reveal`) gibt es erst nach einem Fehlversuch. Zwischenfragen zählen nicht in den Übungsfortschritt.
- `storage.ts` speichert unter `lemmio:cards` (Version 1) je Deck `{ current: Karten-Id, resolved: { Karten-Id: 'correct' | 'revealed' } }`. Antworten und Rückmeldungen werden nicht gespeichert. Unbekannte Karten-Ids werden beim Laden verworfen, die gespeicherte Position bleibt erreichbar. `useDeck(deck)` bindet Zustand und Speicher an React; die Komponente wird mit `key={deck.id}` eingebunden.
- `validate.ts`: `validateDeck(deck)` liefert Strukturfehler (Id-Format, doppelte Ids, leere Titel, Widget- und Fragenprobleme; jede Antwort einer Term-Frage muss ihre eigene Prüfung bestehen). `deckMarkup`, `deckTerms` und `deckLatex` liefern alle Texte, Terme bzw. LaTeX-Teile, die ein Deck außerhalb des Markups setzt. Die Inhaltstests rufen sie für jedes Deck auf.

### Oberfläche

`CardDeck` zeigt die aktuelle Karte mit Kartenleiste (`CardPath`, springt nur zu erreichten Karten), Zähler und „Zurück“/„Weiter“. Gesperrte Knöpfe tragen `aria-disabled` und nennen den Grund. ←/→ blättern, außer der Fokus liegt in einem Feld oder einer Radiogruppe. Der Fokus geht beim Blättern auf die Kartenüberschrift, nach gelöster Frage auf „Weiter“. Nach der letzten erledigten Karte erscheint der Abschlussblock (`finish`), auf der Themenseite der Link „Weiter zur Übung“. `CardWidgetView` wählt über `widget.kind` die Komponente; der `switch` ist erschöpfend, TypeScript meldet einen fehlenden Fall. Widgets, die Pfeiltasten selbst nutzen, rufen `preventDefault()` auf.

### Animation (`src/motion`)

Keine Animationsbibliothek. `animate(el, keyframes, options)` nutzt die Web Animations API; die Keyframes enden im CSS-Ruhezustand (kein `fill`). Ohne WAAPI, bei `prefers-reduced-motion` oder nach Abbruch ist die Animation sofort fertig. Dazu `ENTER`-Presets, `DURATION`, `delay`, `runSequence` und die Hooks `useReducedMotion` und `useSequencePlayer`. Bei reduzierter Bewegung zeigen die Widgets statt „Abspielen“ den Knopf „Alle zeigen“. In Tests setzt `mockReducedMotion` (`src/test/matchMedia.ts`) die Einstellung.

### Interaktive Elemente

| Widget | Zweck | Logik (rein) | Ansicht |
|---|---|---|---|
| `term-steps` | Term Schritt für Schritt umformen; jeder Schritt muss zum Start äquivalent sein | `validate.ts` | `TermStepsView` |
| `area-model` | Produkt zweier Summen als Rechteck mit Teilflächen | `areaModel.ts` | `AreaModelView` |
| `balance` | Gleichung als Waage | `balance.ts` | `BalanceView` |
| `equation-steps` | Gleichung Zeile für Zeile mit Umformung | `equationSteps.ts` | `EquationStepsView` |
| `line-sliders` | Gerade mit Reglern für m und n, optional Zielgerade | `lineSliders.ts` | `LineSlidersView` |
| `slope-triangle` | Steigungsdreieck („rechts“/„hoch“), entlang der Geraden ziehbar | `slopeTriangle.ts` | `SlopeTriangleView` |
| `line-points` | Gerade durch zwei ziehbare Punkte, Gleichung und Wertetabelle folgen | `linePoints.ts` | `LinePointsView` |
| `value-table` | y-Werte eintragen, Punkte erscheinen | `valueTable.ts` | `ValueTableView` |
| `two-lines` | zwei Geraden mit Schnittpunkt, parallel, identisch | `twoLines.ts` | `TwoLinesView` |

**`term-steps`** (`start`, `steps[]` mit `term` und `note?`, `label?`): „Nächster Schritt“/„Von vorn“, „Abspielen“/„Anhalten“ bzw. „Alle zeigen“.

**`area-model`** (`first`, `second`, `mode`, `lengths?`, `label?`): `first` ist die linke Kante (Zeilen), `second` die obere Kante (Spalten), je 1 bis 3 Summanden in Eingabesyntax. Modi: `expand` (Teilflächen aufdecken, dann zusammenfassen), `factor` (Teilflächen gegeben, Seiten aufdecken: Faktorisieren rückwärts), `explore` (maßstäblich, Längen per Griff ziehen, Zahlenprobe). Ohne `lengths` ist es eine Skizze, mit `lengths` maßstäblich (nur Summanden wie `3` oder `2x`); `explore` braucht `lengths` mit `min` und `max`. Negative Summanden sind abgeschnittene Streifen mit echter Geometrie; gleichartige Terme tragen Farbe und Symbol (●■▲◆). Die Griffe sind selbst `role="slider"` (Pfeiltasten, Pos1/Ende), Pointer Events mit `setPointerCapture`, `touch-action: none` nur am Griff. Teilflächen und Seiten sind Buttons. `areaModelProblems` prüft die Daten für `validateDeck`.

**`balance`** (`equation`, `mode`, `steps?`, `operations?`, `label?`): Ein Kästchen wiegt x, ein Gewicht 1, negative Terme sind Ballons. Die Neigung folgt der echten Lösung; das Kästchen zeigt nur „x“. Darum muss eine eindeutige Lösung ganzzahlig und ≥ 0 sein (Sonderfälle ohne oder mit unendlich vielen Lösungen gehen, die Waage ist dann nie oder immer im Gleichgewicht). Grenzen: je Seite höchstens 6 x-Stücke und 12 Einer. Zulässige Umformungen: `+ T`, `- T` (ganze Zahlen und ganzzahlige Vielfache der Variablen), `: n` für n = 2…6 (nur wenn sich alles gleichmäßig teilen lässt), `· (-1)` und `: (-1)`. Modus `steps` wendet vorgegebene Umformungen auf beide Seiten an; Modus `explore` bietet eine Palette, die Wahl „beide Seiten / nur links / nur rechts“ (native Radiogruppe) und „Rückgängig“. `applyMove` liefert `pans`, `frames` (Stücke kommen dazu, Paare werden markiert und heben sich auf) und eine Zusammenfassung oder eine Ablehnung (`not-divisible`, `no-room`) mit Hinweis. Die Grafik ist ein SVG mit `role="img"` und vollständiger Beschreibung; Balken und Schalen bewegen sich per CSS-`transform` mit Transition (bei reduzierter Bewegung aus). Die Musterlösungen aus `solveStepByStep` lassen sich nicht ungeprüft als `steps` übernehmen, weil „Term umformen“ und „⇄“ nicht darstellbar sind (`balanceProblems` simuliert alle Schritte).

**`equation-steps`** (`start`, `steps[]` mit `operation`, `equation`, `note?`, `solution?`, `label?`): `operation` steht in der Syntax von `readOperation` (`| - x`, `T`, `⇄`). Bei `+ − · :` erscheint zuerst eine Zwischenzeile mit der Umformung auf beiden Seiten (Operanden in Akzentfarbe), dann die zusammengefasste Zeile; „T“ und „⇄“ ergeben nur die neue Zeile. Am Ende steht die Schulnotation mit der Umformung neben jeder Zeile und der Lösungsmenge. `equationStepsProblems` prüft jeden Schritt mit `checkStep` und die Lösungsmenge gegen `solveEquation`; `describeFrame` liefert den Text der Live-Region.

**Geraden-Widgets** (alle auf `CoordinatePlane`, ohne Animation, nur ganze Zahlen in den Daten; gemeinsame Felder `name?` (Standard `f`), `window?`, `label?`; gemeinsame Logik in `lineCommon.ts`):

- `line-sliders` (`m`, `n` je `{ value, min?, max? }`, `vary?`, `target?`): native `<input type="range">`; Regler, die nicht variieren, entfallen. Die Gleichung steht im `aria-valuetext`. Mit `target` erscheint eine gestrichelte Zielgerade, „Geschafft“ sperrt aber nichts.
- `slope-triangle` (`m` ≠ 0, `n`, `at?`, `run?`, `resizable?`): Das Dreieck liegt immer vom linken Punkt aus („rechts“ > 0, „hoch“ kann negativ sein) und ist ein `overlay` des Koordinatensystems. Die Punkte sind `on-line` gebunden.
- `line-points` (`points`, `table?`, `target?`): zwei freie Punkte; Bruchsteigungen werden gekürzt gezeigt, eine senkrechte Gerade ist „keine Funktion“.
- `value-table` (`m`, `n`, `table?`, `given?`, `show?`): Textfelder mit Prüfung bei Enter und beim Verlassen. Nur ein ausgerechneter, richtiger Wert setzt den Punkt; falsche Werte erzeugen keinen Punkt.
- `two-lines` (`f`, `g` als Zahlen oder Term, `vary?`, `gRange?`, `equate?`, `names?`): Schnittpunkt S auch mit Bruchkoordinaten (KaTeX); parallel und identisch als Statustext.

Neue Widget-Arten: [Anleitung](neue-einheit.md#neue-widget-art).

### Demo

`/dev/karten` (`src/pages/dev`, nur im Dev-Server) zeigt eine Beispielkarte je Widget und Modus. Der Test in `routes.test.tsx` nimmt die Kartenzahl aus dem Demo-Deck.

## Inhalte (`src/content`)

`subtopicContent[subtopicId]` ist ein `SubtopicContent`: `cards` (die Kartenfolge), `examples` (Titel, `task`, optional `comment`) und `formulaIds`. `subtopicContent` ist mit `satisfies Record<SubtopicId, SubtopicContent>` typisiert; `findContent(id)` gibt für unbekannte Ids `undefined` zurück.

- **Beispiele:** `WorkedExample.task` ist eine `Task` (Terme), eine `EquationTask` oder eine `FunctionTask`; `isFunctionTask` und `isEquationTask` unterscheiden (Funktionsaufgaben tragen auch eine `equation`, `isEquationTask` schließt sie deshalb aus). Die Beispiele entstehen mit `build*Task` bzw. `buildEquationTask`, die Musterlösung kommt also aus dem Mathe-Kern. `WorkedExampleCard` zeigt Terme mit `SolutionSteps`, Gleichungen mit `EquationSolutionSteps` (Schulnotation: Umformung und Notiz neben der Zeile, letzte Zeile die Lösungsmenge), Funktionsaufgaben mit `FunctionExamplePlane` (statisches Koordinatensystem aus `functionExampleFigure`) und `FunctionSolutionSteps`.
- **Markup:** `$…$` steht für einen Term in Eingabesyntax, auch als Kette mit `=` und `≠`; `markup.ts` setzt ihn über `toLatex`, Malpunkte aus der Quelle bleiben erhalten. Jede Kette in `$…$` wird als **Behauptung** geprüft: nie `$a = 3x$` als Zuordnung schreiben, sondern „$3x$ steht für $a$“; falsche Gleichungen nur mit `≠`.
- **Gleichungen im Text** (`$eq: …$`): eine Gleichung, eine Gleichung mit Umformung (`$eq: 3x + 2 = x + 8 | - x$`), eine Umformung allein (`$eq: | : 2$`, `$eq: | ⇄$`) oder eine Lösungsmenge (`$eq: L = {3}$`, `{ }`, `ℚ`). Sie werden gelesen und gesetzt, aber nicht als Behauptung geprüft. Gelesen wird mit `readEquation`, `readOperation` und `readSolutionSet`, die Seiten werden mit `termToLatex` gesetzt.
- **Funktionen im Text** (`$fn: …$`): eine Funktionsgleichung (`$fn: f(x) = 2x - 3$`), ein Funktionswert auch als Kette (`$fn: f(2) = 2·2 - 1 = 3$`), ein Punkt (`$fn: P(2|3)$`) oder ein Wert von m bzw. n (`$fn: m = (9 - 3)/(4 - 1) = 2$`). Gelesen mit `readFunction`, `readFunctionValue` und `readPoint` (`readFunctionSegment` in `markup.ts`); alle Glieder einer Kette müssen gleich sein, ob ein Funktionswert zu einer genannten Funktion passt, wird nicht geprüft. Buchstaben wie m und n gehen nicht (`f(0) = n` bleibt Klartext).
- **Formelsatz** (`formulas.ts`): `formulaSheets` ist eine Tabelle `"bereich/thema" → Gruppen`. Ein Eintrag (`SheetEntry`) ist eine `Formula` (Identität, `lhs` und `rhs`), eine `EquivalenceRule` (`from`, `to`, `condition?`), eine `SolutionSetRule` (`line`, `set`) oder ein `StatementEntry` (`latex`, `condition?`; nur gesetzt und mit KaTeX geprüft, nicht als Aussage nachgerechnet). `findFormula(id)` liefert jeden Eintrag, `allFormulas` nur die Identitäten, `allEntries` alle, `entryLatex` setzt einen Eintrag. `FormulaSheet` zeigt je Thema des Katalogs eine Sektion; Themen ohne Formeln fehlen.
- **Tests** (`content.test.ts`): Formel-Ids eindeutig; jede Identität wahr; jede Äquivalenzregel erhält die Lösungen (geprüft mit Zahlen); jede Lösungsmengen-Regel liest die richtige Menge ab; je Teilthema: gültiges Deck (`validateDeck`), beide Fragearten vorhanden, Term-Teilthemen mit Flächenmodell und Gleichungs-Teilthemen mit Waage und `equation-steps`, alle Terme und Gleichungen lesbar und mit KaTeX im strikten Modus setzbar, alle Behauptungen in `$…$` wahr, jedes Beispiel gehört zum Teilthema und seine Musterlösung gilt als richtig. Ein falscher Text lässt die CI scheitern.

## Übung (`src/practice`)

Es gibt vier Übungskomponenten mit derselben Serienlogik. `SubtopicPage` wählt `Practice` für Term-Teilthemen, `EquationPractice` für Gleichungs-Teilthemen, `FunctionPractice` für die ersten drei Funktions-Teilthemen und `IntersectionPractice` für den Schnittpunkt (`isTermSubtopic`, `isEquationSubtopic`, `isTaskPracticeSubtopic`, `isIntersectionSubtopic`) und bindet sie mit `key={id}` an das Teilthema: Ein Wechsel startet eine frische Serie.

**Gemeinsam:**

- `SeriesState` in `session.ts` (`tasks`, `index`, `outcomes`) mit `isTaskFinished`, `isSeriesOver`, `countCorrect`, `finishedBetween`. Eine Serie hat `SERIES_LENGTH` = 10 Aufgaben; „Lösung anzeigen“ zählt als falsch.
- `progress.ts` und `useSubtopicProgress.ts`: Fortschritt je Teilthema (`answered`, `correct`, `lastSeries`) unter `lemmio:progress` (Version 1, ein Eintrag für alle Teilthemen aus `ALL_SUBTOPIC_IDS`). Beim Lesen wird validiert; kaputte oder fremde Daten fallen auf „leer“ zurück. Ist Speichern nicht möglich, zeigt die Übung eine Warnung und arbeitet im Speicher weiter. Ein neues Teilthema braucht keine Migration.
- Komponenten `PracticeProgress` (Fortschrittstext, Speicherwarnung, bestätigtes Zurücksetzen), `SeriesSummary` (Serienergebnis), `SkillPath`, `Chip`, `InputEcho`.

### Terme (`Practice`, `session.ts`)

`Session` (`tasks`, `index`, `outcomes`, `feedback`); Übergänge: `createSession`, `submitAnswer`, `revealSolution`, `nextTask`. `correct` und `wrong` beenden die Aufgabe und zeigen die Musterlösung; `wrong-form` und `invalid` zeigen nur einen Hinweis und erlauben einen neuen Versuch.

| Ergebnis | Klasse | Chips |
|---|---|---|
| `correct` | `.feedback-correct` | ✓ äquivalent, ✓ Form ok |
| `wrong` | `.feedback-wrong` | ✗ nicht äquivalent |
| `wrong-form` | `.feedback-form` | ✓ äquivalent, ✗ Form nicht ok |
| `revealed` | `.feedback-wrong` | keine |
| `invalid` | `.feedback-invalid` | keine (stattdessen markierte Eingabe) |

Die Eingabetasten ergeben sich aus den Buchstaben der Aufgabe (`MathInput`).

### Gleichungen (`EquationPractice`, `equationSession.ts`)

`EquationSession` (`tasks`, `index`, `outcomes`, `lines`, `feedback`); `lines` sind die akzeptierten Zeilen der aktuellen Aufgabe (`EquationLine`: `operation`, `equation`). Übergänge: `createEquationSession`, `submitLine`, `submitSolutionSet`, `revealEquationSolution`, `nextEquationTask`.

- `submitLine(session, operationInput, equationInput)` liest erst die Umformung (`readOperation`), dann die Zeile und prüft sie mit `checkStep` gegen die letzte akzeptierte Zeile (oder die Aufgabengleichung). Nur `correct` hängt eine Zeile an.
- `submitSolutionSet(session, input)` ist erst erlaubt, wenn die letzte Zeile gelöst ist (`canGiveSolutionSet`: `equationForm` ≠ `open`; `c = x` genügt, ohne „⇄“), sonst `not-solved`. Dann `checkSolutionSet`.
- **Wertung nur über das Ergebnis:** Zeilenfehler (`line-wrong`, auch mit `keepsSolutions`), nicht zulässige und unlesbare Eingaben lassen sich beliebig oft korrigieren und beenden nichts. Richtig ist die Aufgabe, wenn die Lösungsmenge stimmt und die Lösung nicht angezeigt wurde. Eine falsche, lesbare Lösungsmenge beendet die Aufgabe als falsch (`set-wrong`). „Lösung anzeigen“ geht jederzeit und zählt falsch.
- `EquationFeedback`: nicht final sind `line-correct`, `line-wrong`, `operation-invalid`, `operation-not-allowed`, `equation-invalid`, `not-solved`, `set-invalid`; final sind `set-wrong`, `correct`, `revealed`.
- **Oberfläche:** Liste „Deine Rechnung“ in Schulnotation (Umformung neben der Zeile davor; je akzeptierter Zeile die Chips „Umformung ok“ und „beide Seiten ok“; am Ende die Lösungsmenge mit Chip), darunter die Live-Region mit der Rückmeldung, dann `EquationEntry`. Das sind die Felder „Umformung“, „Neue Zeile“ (ein Formular, „Zeile prüfen“) und „Lösungsmenge“ (eigenes Formular, „Lösungsmenge prüfen“) sowie „Lösung anzeigen“. Eine Tastenreihe („Mathe-Tasten“) folgt dem Feld mit Fokus; Tasten behalten den Fokus im Feld. Die Tasten „Term umformen“, „⇄“, `{ }` und `ℚ` ersetzen den Feldinhalt, `L = {…}` setzt den Cursor in die Klammer. Der Fokus wandert per Effekt zum nächsten sinnvollen Feld. Nach Abschluss erscheint die Musterlösung (`EquationSolutionSteps`).

### Funktionen (`FunctionPractice`, `functionSession.ts`)

Gilt für `TASK_PRACTICE_SUBTOPIC_IDS` (Steigung und Graph, Funktionsgleichung aufstellen, Punktprobe und Nullstelle). `FunctionSession` (`tasks`, `index`, `outcomes`, `feedback`); Übergänge `createFunctionSession`, `submitFunctionAnswer`, `revealFunctionSolution`, `nextFunctionTask`.

- **Antwortarten** (`FunctionAnswer`, gewählt über `answerKind(task)`): `equation` (Text), `graph` (zwei Gitterpunkte, geprüft wird nur die Gerade), `point-test` (Rechnung plus ja/nein) und `zero` (Text oder die Taste „keine Nullstelle“). Eine Antwort der falschen Art ändert nichts.
- **Wertung:** Wie bei Termen beendet eine lesbare Antwort die Aufgabe, richtig oder falsch. `wrong-form`, `invalid`, fehlende Punkte, eine senkrechte Gerade, gleiche Punkte und eine fehlende Entscheidung erlauben einen neuen Versuch. Punktprobe: zuerst die Rechnung, dann die Entscheidung; richtig nur, wenn beides stimmt. „Lösung anzeigen“ zählt falsch.
- **Zeichnen:** `functionDrawing.ts` (`Drawing`, `startPoint`, `drawnLine`). Tippen setzt P, dann Q; beide Punkte sind ziehbar und per Tastatur bewegbar, „Punkt setzen“ ist der Weg für Tastaturnutzer. Die Gerade erscheint ohne Gleichung. Eine falsche Gerade steht in der Musterlösung gestrichelt neben der richtigen.
- **Eingabe:** `MathInput` mit eigenen Tasten (`keys`, `MathKey` in `functionKeys.ts`: `FUNCTION_KEYS`, `valueKeys(x)`, `ZERO_KEYS`, `POINT_KEYS`).
- Die Musterlösung zeigt `FunctionExamplePlane` und `FunctionSolutionSteps`.

### Schnittpunkt (`IntersectionPractice`, `intersectionSession.ts`)

Aufgaben wechseln zwischen zwei Formen (`intersectionMode`): ungerader Platz in der Serie **Ablesen** (Graphen von f und g ohne Gleichungen, Antwort `S(x|y)` oder eine Taste), gerader Platz **Rechnen**. Identische Geraden gibt es nur als Rechnen, weil im Graphen nur eine Gerade sichtbar wäre.

- `IntersectionSession` bettet eine `EquationSession` für `task.equation` ein; `submitIntersectionLine` ruft `submitLine` auf. `intersectionPhase` ist `lines` (Gleichung lösen, bis `equationForm` nicht mehr `open` ist), `value` (y mit `f(c) = …` ausrechnen, f oder g) oder `answer`. `answerOptions` bietet beim Ablesen Punkt und Tasten, beim Rechnen nach `x = c` nur den Punkt und nach einer Aussage nur die Tasten „kein Schnittpunkt“ und „unendlich viele“.
- **Wertung:** Zeilenfehler und unlesbare Eingaben sind unbegrenzt korrigierbar; „nicht ausgerechnet“ erlaubt einen neuen Versuch; eine lesbar falsche Rechnung, ein falscher Punkt oder eine falsche Taste beendet die Aufgabe als falsch.
- **Gemeinsame Bausteine mit der Gleichungs-Übung:** `EquationEntry` lässt das Feld „Lösungsmenge“ weg, wenn `onSubmitSolutionSet` und `setRef` fehlen; `EquationWork`, `EquationFeedbackMessage`, `Unreadable` und `equationFocus.ts` stammen aus `EquationPractice`.

### Skill-Pfad und Breadcrumb

- `SkillPath` zeigt eine Serie als Pfad aus Knoten statt als Fortschrittsbalken. Props: `total`, `outcomes`, `current` (fehlt am Ende der Serie), `label`. Zustände: `correct`, `wrong`, `current`, `todo`. Fertige Knoten tragen ✓ oder ✗, jeder Knoten hat einen Text für Screenreader („Aufgabe 3: richtig“), der aktuelle Knoten `aria-current="step"`. Die Liste bekommt `role="list"` ausdrücklich, weil Safari die Listensemantik ohne `list-style` verwirft.
- `Breadcrumb` nimmt `trail` (Slugs aus dem Katalog; Bindestriche werden als Unterstriche gezeigt) und zeigt z. B. `start / algebra / terme / binomische_formeln`. Nur „start“ ist ein Link; Übersichtsseiten für Bereich und Thema gibt es noch nicht.

## Theme-System

Genau zwei Themes: `light` und `dark` (`Theme` in `src/theme/theme.ts`). Es gibt keinen dritten Zustand „System“: Die Systemeinstellung liefert nur den Standardwert, bis die Lernenden selbst wählen.

**Ablauf:**

1. **Vor dem ersten Rendern** läuft das Inline-Skript in `index.html`. Es liest `localStorage['lemmio:theme']`; gilt der Wert nicht (`light` oder `dark`) oder ist der Speicher gesperrt, nimmt es `prefers-color-scheme`. Es setzt `data-theme` und `style.colorScheme` am `<html>`-Element und die Farbe im `<meta name="theme-color">`. Dadurch gibt es kein Aufblitzen im falschen Theme.
2. **`initTheme()`** in `main.tsx` gleicht den App-Zustand damit ab und folgt Änderungen der Systemeinstellung, solange nichts gespeichert ist.
3. **`ThemeToggle`** (Kopfzeile, Gruppe „Design“, Schaltflächen „Hell“ und „Dunkel“ mit `aria-pressed`) ruft über `useTheme` die Funktion `chooseTheme` auf. Sie wendet das Theme an und speichert es unter `lemmio:theme`. Ab dann hat die Wahl Vorrang vor der Systemeinstellung.
4. **`useTheme`** liest den aktiven Wert mit `useSyncExternalStore` aus `data-theme`; `applyTheme` benachrichtigt die Abonnenten.

**Speicher:** `lemmio:theme` ist von Fortschritt (`lemmio:progress`) und Kartenstand (`lemmio:cards`) getrennt. Zurücksetzen des Fortschritts ändert weder Theme noch Kartenstand. Alle Speicherzugriffe sind in `try/catch` gefasst; ohne Speicher gilt die Wahl nur für den Besuch.

**Farben:** `src/index.css` definiert die Design-Tokens als CSS-Variablen. Die Werte für Hell stehen in `:root`, `:root[data-theme='dark']` überschreibt sie. Komponenten verwenden nur Tokens (`--bg`, `--surface`, `--text`, `--muted`, `--border`, `--accent`, `--success`, `--danger`, `--warning` usw.), keine festen Farben. Der Kontrast jedes Text/Hintergrund-Paars liegt in beiden Themes bei mindestens 4,5:1 (WCAG 2.2 AA), Rahmen und Zustandsmarken bei mindestens 3:1.

**Drei Stellen müssen übereinstimmen**, wenn sich etwas ändert:

| Was | Wo |
|---|---|
| Schlüssel `lemmio:theme` | `THEME_STORAGE_KEY` in `src/theme/theme.ts` und Inline-Skript in `index.html` |
| Farbe der Browserleiste (`#e9edfb` hell, `#0a1028` dunkel) | `THEME_COLORS` in `theme.ts`, Inline-Skript und `<meta name="theme-color">` in `index.html`, `--bg` in `index.css` |
| Gültige Werte `light` / `dark` | `isTheme` in `theme.ts` und Inline-Skript |

`src/theme/theme.test.tsx` führt das Inline-Skript aus `index.html` aus und prüft, dass es dieselben Werte setzt wie die App (Schlüssel, Farbe der Browserleiste, Vorrang der gespeicherten Wahl).

**Ein Token ändern:** in beiden Blöcken von `index.css` anpassen und die Kontrastpaare prüfen, in denen es vorkommt.

## Build, CI und Deployment

- `npm run build` führt `tsc -b` und `vite build` aus. KaTeX und React/Router liegen in eigenen Chunks (`vite.config.ts`), damit Browser sie über App-Updates hinweg zwischenspeichern.
- `.github/workflows/ci.yml`: Lint, Tests, Build mit `BASE_PATH=/<repo>/`, Kopie von `index.html` nach `404.html`. Auf `main` folgt der Deploy nach GitHub Pages.
- Der Dev-Container (`.devcontainer/`, `scripts/dev.sh`) ist in der [README](../README.md) beschrieben. `npm` läuft nur im Container; `scripts/dev.sh check` führt Lint, Tests und Build wie die CI aus.

## Entscheidungen, die man kennen sollte

- **Keine Konten, kein Backend, kein Tracking.** Neue Funktionen dürfen nichts an Server senden.
- **Drei Datenspeicher, je ein Schlüssel:** `lemmio:progress`, `lemmio:cards` und `lemmio:theme`. Neue Schlüssel bekommen das Präfix `lemmio:`.
- **Der Katalog ist die einzige Quelle der Struktur.** Routen, Navigation, Startseite und Formelsatz leiten sich daraus ab; „Einheit“ erscheint nirgends in der Oberfläche.
- **Mathe-Kern ohne React.** Neue Logik für Aufgaben und Prüfungen gehört dorthin, nicht in Komponenten. Dasselbe gilt für die Logik der Widgets (`src/cards`).
- **Drei Register für Aufgaben.** Eine Aufgabenart, deren Antwort kein einzelner Term ist, bekommt ein eigenes Register und eine eigene Übung; sie wird nicht in `generators` gepresst. Bisher: Terme, Gleichungen, Funktionen.
- **Das Koordinatensystem ist ein gesteuerter Baustein.** Zustand (Punkte, Geraden) liegt beim Aufrufer, die Logik in `src/plane`; Widgets und Übung nutzen denselben Baustein.
- **Eine Wahrheit für Texte:** Aussagen in Erklärtexten stehen in `$…$` und werden von den Tests bewiesen; Decks und Widgets werden von `validateDeck` geprüft.
- **Animationen nur im Browser** (SVG, React, Web Animations API), immer mit `prefers-reduced-motion`.
- **Barrierefreiheit:** Zustände nie nur über Farbe (Zeichen und Text dazu), Touch-Ziele mindestens 44 px (`min-height: 2.75rem`), bedienbar ab 360 px Breite, interaktive Elemente per Tastatur und Touch bedienbar, Änderungen über Live-Regionen angesagt.
- **Lint-Falle (React-Compiler, `react-hooks/refs`):** Beim Rendern keine Ref-Callbacks in Hilfsfunktionen außerhalb des JSX-Returns erzeugen und keine Funktion aufrufen, der eine Closure mit Ref-Zugriff übergeben wird (z. B. Handler-Fabriken). Handler nur als Prop durchreichen; Elemente notfalls über `data-*`-Attribute finden (so im Flächenmodell).
