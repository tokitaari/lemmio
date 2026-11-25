# Changelog

Alle wichtigen Änderungen an Lemmio. Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/). Ein Release entspricht einer Lerneinheit; die Versionsnummer zählt die Einheiten.

## [0.0.3] – 2026-11-25

Einheit 3: Lineare Funktionen.

### Hinzugefügt

- Neuer Bereich „Funktionen“ mit dem Thema „Lineare Funktionen“ (Klasse 8) und vier Teilthemen: Steigung und Graph, Funktionsgleichung aufstellen, Punktprobe und Nullstelle, Schnittpunkt zweier Geraden. Nur ganze Zahlen für Steigung, y-Achsenabschnitt und Punkte.
- Schreibweise `f(x) = mx + n` mit Funktionswerten wie `f(2) = 5`; Punkte werden als `P(2|5)` geschrieben (Eingabe auch mit `;`).
- Koordinatensystem als wiederverwendbarer Baustein: gleicher Maßstab auf beiden Achsen, Punkte rasten auf Gitterpunkte ein und lassen sich mit Maus, Touch und Tastatur ziehen (Pfeiltasten, Pos1/Ende, Bild↑/Bild↓), Ansagen für Screenreader.
- Neue interaktive Elemente in den Karten: Regler für Steigung m und y-Achsenabschnitt n, Steigungsdreieck („rechts“ und „hoch“) entlang der Geraden, zwei ziehbare Punkte mit mitlaufender Gleichung und Wertetabelle, Wertetabelle zum Ausfüllen (Punkte erscheinen mit jedem richtigen Wert) sowie zwei Geraden mit Schnittpunkt, auch parallel und identisch.
- Übung für die ersten drei Teilthemen: Gleichung vom Graphen ablesen, Graph zeichnen (zwei Punkte setzen oder ziehen, geprüft wird die Gerade), Gleichung aufstellen aus Punkt und Steigung bzw. aus zwei Punkten, Punktprobe mit Rechnung und Entscheidung, Nullstelle. Serien aus 10 Aufgaben mit Musterlösung samt Graph.
- Übung zum Schnittpunkt in zwei Formen, die sich abwechseln: Ablesen aus dem Graphen (`S(x|y)` oder „kein Schnittpunkt“ bzw. „unendlich viele“) und Rechnen (Gleichsetzen Zeile für Zeile wie bei den Gleichungen, dann y berechnen und den Punkt angeben).
- Formelsatz-Gruppen zu Funktionen: Funktionsgleichung, Steigung aus zwei Punkten, Nullstelle, Schnittpunkt.
- Lizenzen: Quellcode unter GPL-3.0-oder-später, Lerninhalte unter CC BY-SA 4.0 (siehe `LICENSE`, `LICENSE-CONTENT` und README).
- Dokumentation: README, Architekturüberblick und Anleitung für neue Themen auf den Stand von Einheit 3 gebracht.

### Geändert

- Intern heißt die Teilthema-Ebene jetzt `SubtopicId` (vorher `TopicId`), ebenso abgeleitete Namen wie `SubtopicPage`. Das Verhalten ist unverändert, der gespeicherte Fortschritt bleibt erhalten.
- Die Fußzeile nennt jetzt zwei Bereiche.

### Technik

- Mathe-Kern für Funktionen (`src/math/functions`) ohne React-Abhängigkeit als drittes Register neben Termen und Gleichungen: Lesen und Prüfen von Funktionsgleichungen, Punkten und Funktionswerten, Prüfung gezeichneter Geraden, Nullstelle, Schnittpunkt, Generatoren mit Musterlösung.
- Koordinatensystem-Logik in `src/plane`, Komponente `CoordinatePlane`; fünf neue Karten-Widgets (`line-sliders`, `slope-triangle`, `line-points`, `value-table`, `two-lines`).
- Markup `$fn: …$` für Funktionsgleichungen, Funktionswerte und Punkte in Kartentexten.
- Die Gleichungsübung ist für den Schnittpunkt wiederverwendbar (Eingabe ohne Feld „Lösungsmenge“).
- Demo-Seiten `/dev/koordinaten` und `/dev/karten` nur im Dev-Server und nicht im Build.

## [0.0.2] – 2026-11-16

Einheit 2: Lineare Gleichungen und Umbau auf Karten.

### Hinzugefügt

- Neues Thema „Lineare Gleichungen“ (Klasse 8) mit drei Teilthemen: Gleichungen umformen, Gleichungen mit Klammern, Sonderfälle (keine oder unendlich viele Lösungen). Nur ganze Zahlen.
- Erklärungen als Kartenfolge: eine Karte zur Zeit mit Text, höchstens einem interaktiven Element und meist einer Zwischenfrage (Auswahl oder Term). „Weiter“ bleibt gesperrt, bis die Frage gelöst ist oder die Lösung angezeigt wurde; die Kartenleiste springt nur zu erreichten Karten. Der Kartenstand wird je Teilthema gespeichert (`lemmio:cards`).
- Flächenmodell für Ausmultiplizieren, binomische Formeln 1 bis 3 und Faktorisieren, in drei Modi: Teilflächen aufdecken, Seiten aufdecken und maßstäblich erkunden (Längen ziehen, Zahlenprobe). Negative Summanden erscheinen als abgeschnittene Streifen.
- Waage für Gleichungen: Gewichte und Ballons, Umformungen auf beiden Seiten (die Waage bleibt im Gleichgewicht) oder frei ausprobieren, auch auf nur einer Seite (die Waage kippt). Division als Aufteilen in gleiche Gruppen.
- Animation der Umformungsschritte: Erst erscheint die Zwischenzeile mit der Umformung auf beiden Seiten, dann die zusammengefasste Zeile; am Ende steht die Rechnung in Schulnotation mit Lösungsmenge.
- Übung für Gleichungen: Serien aus 10 Aufgaben, Zeile für Zeile. Zu jeder neuen Zeile wird die Umformung angegeben (`| + 3x`, `| − 5`, `| · 2`, `| : 4`, „Term umformen“, „⇄“) und geprüft, ebenso beide Seiten der neuen Zeile. Unzulässige Umformungen (Mal oder geteilt durch einen Term mit x, Mal oder geteilt durch 0, nichtlineare Umformungen) werden mit Hinweis abgelehnt. Am Ende steht die Lösungsmenge: `L = {c}`, `L = { }` oder `L = ℚ`.
- Wertung der Gleichungsübung nur über das Ergebnis: Zeilenfehler lassen sich beliebig oft korrigieren, eine falsche Lösungsmenge beendet die Aufgabe, „Lösung anzeigen“ zählt als falsch. Musterlösung in Schulnotation nach jeder Aufgabe.
- Formelsatz mit Regeln zu Gleichungen: Äquivalenzumformungen, Klammern auflösen, Lösungsmenge ablesen.
- Gliederung nach Bereich, Thema und Teilthema mit Klassen-Badge und Filter auf der Startseite (`?klasse=8`).
- Dokumentation: Architekturüberblick und Anleitung für neue Themen auf den Stand von Einheit 2 gebracht.

### Geändert

- Alle Teilthemen aus Einheit 1 sind auf Karten umgestellt, mit Zwischenfragen und Flächenmodell. Das frühere Erklärformat entfällt.
- Routen folgen Bereich/Thema/Teilthema, z. B. `/algebra/terme/faktorisieren` und `/algebra/lineare-gleichungen/umformen`. Die Routen aus Version 0.0.1 (z. B. `/faktorisieren`) gibt es nicht mehr und werden nicht weitergeleitet.
- Der Formelsatz unter `/formelsatz` ist nach Themen gegliedert.
- Breadcrumb, Fußzeile und Kopfnavigation leiten sich aus dem Katalog ab.

### Technik

- Katalog (`src/catalog.ts`) als einzige Quelle der Struktur.
- Karten-Framework (`src/cards`) mit Datenmodell, Zustand und Prüfung der Decks; Animations-Hilfsschicht auf Basis der Web Animations API (`src/motion`). Animationen beachten `prefers-reduced-motion`.
- Mathe-Kern für Gleichungen (`src/math/equations`) ohne React-Abhängigkeit: Lesen und Prüfen von Umformungen und Zeilen, Lösungsmenge, Generatoren für die drei Teilthemen, Musterlösung mit Umformungen.
- Tests prüfen alle Kartentexte, Gleichungen, Formeln und Widget-Daten.
- Demo-Seite `/dev/karten` mit Beispielkarten, nur im Dev-Server und nicht im Build.

## [0.0.1] – 2026-11-15

Erstes Release: Einheit 1, Terme und binomische Formeln.

### Hinzugefügt

- Drei Teilthemen mit Erklärung, durchgerechneten Beispielen und Formelsatz (KaTeX):
  - Klammern ausmultiplizieren (Summe mal Summe)
  - Binomische Formeln 1 bis 3 anwenden
  - Faktorisieren (Ausklammern, binomische Formeln rückwärts)
- Formelsatz-Seite unter `/formelsatz`.
- Übung je Teilthema: Serien aus 10 zufällig erzeugten Aufgaben, ohne direkte Wiederholung innerhalb einer Serie.
- Antworteingabe als Term mit Tasten für `²`, Klammern und Rechenzeichen. Eingaben wie `x^2+6x+9`, `x²+6x+9` und `9+6x+x^2` gelten als gleich.
- Prüfung auf algebraische Äquivalenz und auf die verlangte Form (z. B. „ausmultipliziert“), mit getrennten Rückmeldungen „äquivalent“ und „Form ok“ und Hinweisen bei falscher Form.
- Musterlösung nach jeder Antwort.
- Fortschritt je Teilthema im Browser (`localStorage`, Schlüssel `lemmio:progress`), mit Zurücksetzen und Rückfrage.
- Design hell und dunkel mit Umschalter in der Kopfzeile; ohne gespeicherte Wahl folgt die App der Systemeinstellung (Schlüssel `lemmio:theme`).
- Responsive Darstellung ab 360 px Breite.
- Dokumentation: README, Architekturüberblick (`docs/architektur.md`) und Anleitung für eine neue Einheit (`docs/neue-einheit.md`).

### Technik

- React, TypeScript und Vite als reine Frontend-SPA, ohne Backend, Konten oder Tracking.
- Mathe-Kern ohne React-Abhängigkeit (`src/math`) mit Unit-Tests.
- Vitest, ESLint und GitHub Actions (Lint, Test, Build) in der CI.
- Deployment auf GitHub Pages bei Pushes auf `main`.

### Geändert

- App umbenannt von Algebro in Lemmio (Code, Repo, Pages-Pfad, Verzeichnis, Dev-Container).

[0.0.2]: https://github.com/tokitaari/lemmio/releases/tag/release-v0.0.2
[0.0.1]: https://github.com/tokitaari/lemmio/releases/tag/release-v0.0.1
