# Lemmio

Algebra üben für Klasse 8 bis Abitur. Responsive Web-App im Browser, ohne Konten und ohne Tracking; der Fortschritt bleibt lokal im Browser.

Live: https://tokitaari.github.io/lemmio/

## Inhalte

Die App ist nach Bereich, Thema und Teilthema gegliedert. Die Klasse ist eine Eigenschaft des Themas (Badge und Filter auf der Startseite). Jedes Teilthema hat unter `/<bereich>/<thema>/<teilthema>` eine Erklärung als Kartenfolge, durchgerechnete Beispiele, die zugehörigen Formeln und eine Übung.

| Bereich | Thema (Klasse) | Teilthemen |
|---|---|---|
| Algebra | Terme und binomische Formeln (8) | Klammern ausmultiplizieren · Binomische Formeln · Faktorisieren |
| Algebra | Lineare Gleichungen (8) | Gleichungen umformen · Gleichungen mit Klammern · Sonderfälle |
| Funktionen | Lineare Funktionen (8) | Steigung und Graph · Funktionsgleichung aufstellen · Punktprobe und Nullstelle · Schnittpunkt zweier Geraden |

**Erklärung als Karten.** Je Karte ein kurzer Text, höchstens ein interaktives Element und meist eine Zwischenfrage; „Weiter“ bleibt gesperrt, bis die Frage gelöst ist oder die Lösung angezeigt wurde. Interaktive Elemente: Flächenmodell (Ausmultiplizieren, binomische Formeln, Faktorisieren), Waage und Umformungsschritte (Gleichungen) sowie Rechnungen Zeile für Zeile. Bei den Funktionen kommen Koordinatensystem-Elemente dazu: Regler für Steigung und y-Achsenabschnitt, Steigungsdreieck, ziehbare Punkte mit Wertetabelle, Wertetabelle zum Eintragen und zwei Geraden mit Schnittpunkt. Alle Animationen laufen im Browser und beachten `prefers-reduced-motion`. Der Kartenstand wird je Teilthema gespeichert.

**Übung bei Termen.** Serien aus 10 Aufgaben. Die Antwort ist ein Term (`x^2+6x+9`, `x²+6x+9`, `9+6x+x^2` sind gleichwertig) und wird doppelt geprüft: auf algebraische Äquivalenz und auf die verlangte Form (z. B. „ausmultipliziert“). Die Rückmeldung zeigt beides getrennt als Chips „äquivalent“ und „Form ok“, danach folgt die Musterlösung.

**Übung bei Gleichungen.** Serien aus 10 Aufgaben, die Zeile für Zeile gelöst werden. Zu jeder neuen Zeile gibt man die Umformung an (`| + 3x`, `| : 2`, „Term umformen“, „⇄“); geprüft werden die Umformung und beide Seiten der neuen Zeile. Am Ende steht die Lösungsmenge (`L = {3}`, `L = { }`, `L = ℚ`). Gewertet wird nur das Ergebnis: Fehler in einer Zeile lassen sich beliebig oft korrigieren, eine falsche Lösungsmenge beendet die Aufgabe.

**Übung bei Funktionen.** Serien aus 10 Aufgaben mit Zahlen ohne Brüche. Je nach Teilthema wird die Gleichung `f(x) = mx + n` vom Graphen abgelesen und eingegeben, ein Graph durch zwei gesetzte oder gezogene Punkte gezeichnet (geprüft wird die Gerade, nicht die Wahl der Punkte), eine Funktionsgleichung aufgestellt, eine Punktprobe mit Rechnung gemacht oder eine Nullstelle `N(z|0)` bestimmt. Beim Schnittpunkt wechseln sich zwei Formen ab: den Schnittpunkt aus dem Graphen ablesen und `S(x|y)` eingeben, oder `f(x) = g(x)` Zeile für Zeile lösen (wie bei den Gleichungen), y ausrechnen und `S(x|y)` angeben. Parallele und identische Geraden werden mit den Tasten „kein Schnittpunkt“ und „unendlich viele“ beantwortet.

Der Fortschritt je Teilthema (beantwortet, richtig, letzte Serie) steht in `localStorage`. Der Formelsatz unter `/formelsatz` ist nach Themen gegliedert.

## Design

Genau zwei Themes: hell und dunkel. Ohne gespeicherte Wahl folgt die App der Systemeinstellung. Der Schalter „Design: Hell / Dunkel“ in der Kopfzeile speichert die Wahl unter dem Schlüssel `lemmio:theme`. Ein kleines Inline-Skript in `index.html` setzt das Theme vor dem ersten Rendern, damit nichts aufblitzt. Details: [Theme-System](docs/architektur.md#theme-system).

## Entwicklung

Voraussetzung: Node.js 22 (siehe `.nvmrc`).

```bash
npm ci            # Abhängigkeiten installieren
npm run dev       # Dev-Server auf http://localhost:5173
npm run lint      # ESLint
npm test          # Vitest (einmalig)
npm run build     # Typprüfung + Produktions-Build nach dist/
npm run preview   # Build lokal ansehen
```

Im Dev-Server gibt es zusätzlich die Demo-Seiten `/dev/karten` (Beispielkarten für alle interaktiven Elemente) und `/dev/koordinaten` (das Koordinatensystem mit ziehbaren und setzbaren Punkten). Sie sind nicht Teil des Builds.

### Dev-Container

Alles läuft in einem Container mit Node 22; `node_modules` liegt in einem Docker-Volume. Auf dem Host wird weder Node noch npm benötigt, nur Docker.

**Mit VS Code:** Ordner öffnen und „Reopen in Container“ wählen. Danach im Terminal `npm run dev` starten, die Seite ist unter http://localhost:5173 erreichbar.

**Ohne VS Code:**

```bash
scripts/dev.sh dev      # Container starten und Dev-Server auf http://localhost:5173
scripts/dev.sh check    # Lint, Tests und Build wie in der CI
scripts/dev.sh preview  # Produktions-Build auf http://localhost:4173
scripts/dev.sh shell    # Shell im Container
scripts/dev.sh rebuild  # Image mit der neuesten Node-22-Version neu bauen
scripts/dev.sh down     # stoppen
scripts/dev.sh reset    # stoppen und node_modules-Volume löschen
```

Liegt das Repo unter WSL2 auf einem Windows-Laufwerk (`/mnt/d/...`), schaltet das Skript das Polling für Dateiänderungen automatisch ein. Besser und schneller ist ein Klon im WSL-Dateisystem (z. B. `~/lemmio`). Ports lassen sich mit `DEV_PORT` und `PREVIEW_PORT` ändern.

## Projektaufbau

```text
index.html        Einstieg mit Inline-Skript für das Theme
src/catalog.ts    Struktur der App: Bereich → Thema → Teilthema (einzige Quelle)
src/math/         Mathe-Kern: Parser, Polynome, Prüfung, Aufgabengeneratoren (ohne React)
src/math/equations/  Mathe-Kern für Gleichungen: Umformungen, Zeilenprüfung, Lösungsmenge
src/math/functions/  Mathe-Kern für lineare Funktionen: Lesen, Prüfen, Analyse, Generatoren
src/plane/        Koordinatensystem: reine Logik (Fenster, Gitter, Snapping, Texte)
src/cards/        Kartenfolgen: Datenmodell, Zustand, Speicher, Logik der interaktiven Elemente
src/motion/       Kleine Animationsschicht (Web Animations API, reduzierte Bewegung)
src/content/      Karten, Beispiele und Formelsatz je Teilthema
src/practice/     Übungsserien als reiner Zustand und Fortschritt in localStorage
src/theme/        Theme-System (hell/dunkel)
src/components/   React-Bausteine (Practice, EquationPractice, FunctionPractice, IntersectionPractice, SkillPath, MathInput, ...)
src/components/plane/  Koordinatensystem als SVG-Komponente (`CoordinatePlane`)
src/components/cards/  Kartenfolge und interaktive Elemente (Flächenmodell, Waage, Geraden-Widgets, ...)
src/pages/        Seiten: Startseite, Teilthema, Formelsatz, nicht gefunden (dev/: Demos)
src/index.css     Design-Tokens beider Themes und alle Styles
```

Mehr dazu:

- [Architekturüberblick](docs/architektur.md)
- [Anleitung: neues Teilthema, neues Thema, neues Gleichungs- oder Funktions-Teilthema hinzufügen](docs/neue-einheit.md)

## Stack

React, TypeScript, Vite, React Router, KaTeX (lokal gebündelt), Vitest (mit Testing Library), ESLint. Animationen ohne Bibliothek (Web Animations API).

## CI und Deployment

`.github/workflows/ci.yml` führt bei jedem Push und Pull Request Lint, Tests und Build aus. Pushes auf `main` werden zusätzlich auf GitHub Pages veröffentlicht (Basispfad `/<repo>/`). Direktlinks auf Unterseiten laufen über eine Kopie von `index.html` als `404.html`: Der Inhalt stimmt, der HTTP-Status ist dabei 404.

Einmalig im Repo einstellen: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Releases

Ein Release entspricht einer Lerneinheit (Iteration); die Versionsnummer zählt die Einheiten. „Einheit“ ist nur ein interner Begriff und erscheint nicht in der App. Änderungen stehen im [Changelog](CHANGELOG.md), die Release Notes je Version unter `docs/release-notes/`.

## Datenschutz

Keine Konten, kein Backend, kein Tracking, keine Übertragung an Server. Gespeichert werden nur drei Einträge im Browser: `lemmio:progress` (Übungsfortschritt), `lemmio:cards` (Stand der Kartenfolgen) und `lemmio:theme` (gewähltes Design).
