import type { Deck } from '../../cards'

/**
 * Demo deck for the card framework, shown at /dev/karten in the dev server
 * only. It uses every card feature at least once, including the three modes
 * of the area model, both modes of the balance and the line widgets of the
 * coordinate plane (including the table of values and two lines) and the
 * geometry widgets (sliders for lengths, movable vertices); real decks arrive with the subtopics.
 */
export const demoDeck: Deck = {
  id: 'dev/karten/demo',
  cards: [
    {
      id: 'start',
      title: 'Worum geht es?',
      body: [
        'Steht ein Produkt aus zwei Klammern da, zum Beispiel $(x+3)(x-5)$, kannst du es in eine Summe ohne Klammern umwandeln.',
        'Diese Karte hat keine Frage. Mit „Weiter“ oder der Pfeiltaste → geht es zur nächsten Karte.',
      ],
    },
    {
      id: 'jeder-mit-jedem',
      title: 'Jeder mit jedem',
      body: ['Multipliziere jeden Summanden der ersten Klammer mit jedem Summanden der zweiten Klammer.'],
      widget: {
        kind: 'term-steps',
        label: 'Lösungsweg',
        start: '(x+3)(x-5)',
        steps: [
          { term: 'x·x + x·(-5) + 3·x + 3·(-5)', note: 'Jeder mit jedem' },
          { term: 'x^2 - 5x + 3x - 15', note: 'Produkte ausrechnen' },
          { term: 'x^2 - 2x - 15', note: 'Zusammenfassen' },
        ],
      },
      question: {
        kind: 'choice',
        prompt: 'Wie viele Produkte entstehen beim Ausmultiplizieren von $(a+b)(c+d)$?',
        options: [
          { text: '2', feedback: 'Das wären nur die Produkte mit $a$. Auch $b$ wird mit beiden Summanden multipliziert.' },
          { text: '4', correct: true },
          { text: '8', feedback: 'Jeder Summand links trifft jeden Summanden rechts genau einmal.' },
        ],
        explanation: 'Zwei Summanden mal zwei Summanden ergibt $2·2 = 4$ Produkte: $(a+b)(c+d) = ac+ad+bc+bd$.',
      },
    },
    {
      id: 'vorzeichen',
      title: 'Vorzeichen',
      body: ['Das Rechenzeichen vor einem Summanden gehört zu ihm.'],
      question: {
        kind: 'choice',
        prompt: 'Was ergibt $(-2)·(-4)$?',
        options: [
          { text: '$-8$', feedback: 'Minus mal Minus ergibt Plus.' },
          { text: '$8$', correct: true },
          { text: '$-6$', feedback: 'Hier wird multipliziert, nicht addiert.' },
        ],
        explanation: 'Minus mal Minus ergibt Plus: $(-2)·(-4) = 8$.',
      },
    },
    {
      id: 'selbst-ausmultiplizieren',
      title: 'Jetzt du',
      body: ['Wende die Regel selbst an.'],
      question: {
        kind: 'term',
        prompt: 'Multipliziere aus und fasse zusammen:',
        term: '(x+2)(x+4)',
        answer: 'x^2+6x+8',
        form: { kind: 'expanded' },
        explanation: 'Die vier Produkte sind $x^2$, $4x$, $2x$ und $8$; zusammengefasst $x^2+6x+8$.',
      },
    },
    {
      id: 'flaechenmodell',
      title: 'Als Fläche',
      body: [
        'Ein Produkt aus zwei Klammern ist die Fläche eines Rechtecks: Die Summanden teilen die Seiten auf, jede Teilfläche ist ein Produkt.',
        'Ein negativer Summand ist ein Streifen, der am Ende der Seite abgeschnitten wird.',
      ],
      widget: { kind: 'area-model', first: ['x', '3'], second: ['x', '-5'], mode: 'expand' },
    },
    {
      id: 'dritte-binomische-formel',
      title: 'Was sich aufhebt',
      body: ['Dieses Rechteck ist maßstabsgetreu gezeichnet, mit der Länge 5 für $a$ und 2 für $b$.'],
      widget: { kind: 'area-model', first: ['a', 'b'], second: ['a', '-b'], mode: 'expand', lengths: { a: { value: 5 }, b: { value: 2 } } },
      question: {
        kind: 'choice',
        prompt: 'Welche Teilflächen heben sich bei $(a+b)(a-b)$ auf?',
        options: [
          { text: '$a^2$ und $-b^2$', feedback: 'Diese beiden bleiben übrig: $(a+b)(a-b) = a^2-b^2$.' },
          { text: '$-ab$ und $ab$', correct: true },
        ],
        explanation: 'Der Streifen $-ab$ nimmt genau so viel weg, wie die Teilfläche $ab$ dazugibt.',
      },
    },
    {
      id: 'quadrat-ziehen',
      title: 'Ziehen und prüfen',
      body: [
        'Ziehe die Punkte an den Kanten. Die Formel $(a-b)^2 = a^2-2ab+b^2$ stimmt für jede Länge.',
        'Mit der Tastatur: Punkt mit Tab wählen, dann die Pfeiltasten.',
      ],
      widget: {
        kind: 'area-model',
        first: ['a', '-b'],
        second: ['a', '-b'],
        mode: 'explore',
        lengths: { a: { value: 6, min: 4, max: 9 }, b: { value: 2, min: 1, max: 3 } },
      },
    },
    {
      id: 'flaeche-rueckwaerts',
      title: 'Rückwärts gedacht',
      body: ['Die Teilflächen sind gegeben. Welche Seiten hat das Rechteck?'],
      widget: { kind: 'area-model', first: ['x', '3'], second: ['x', '3'], mode: 'factor' },
      question: {
        kind: 'term',
        prompt: 'Schreibe als Produkt:',
        term: 'x^2+6x+9',
        answer: '(x+3)^2',
        form: { kind: 'factored', sumFactors: 2 },
        explanation: 'Beide Seiten sind $x+3$: $x^2+6x+9 = (x+3)^2$.',
      },
    },
    {
      id: 'ausklammern',
      title: 'Rückwärts',
      body: ['Ausklammern ist Ausmultiplizieren rückwärts.'],
      question: {
        kind: 'term',
        prompt: 'Klammere den größten gemeinsamen Faktor aus:',
        term: '6x^2+9x',
        answer: '3x(2x+3)',
        form: { kind: 'factored', sumFactors: 1 },
        explanation: 'Beide Summanden enthalten $3x$: $6x^2+9x = 3x(2x+3)$.',
      },
    },
    {
      id: 'waage-schritte',
      title: 'Gleichung als Waage',
      // Equations are written without $ here: inside $…$ every "=" is checked as an identity of terms.
      body: [
        'Die Waage zeigt die Gleichung 3x + 2 = x + 8. Ein Kästchen wiegt x, ein kleines Gewicht 1.',
        'Wer auf beiden Seiten dasselbe tut, hält die Waage im Gleichgewicht. Abziehen heißt hier: Ballons anhängen, die nach oben ziehen.',
      ],
      widget: { kind: 'balance', equation: '3x + 2 = x + 8', mode: 'steps', steps: ['| - x', '| - 2', '| : 2'] },
      question: {
        kind: 'choice',
        prompt: 'Die Waage ist im Gleichgewicht. Was passiert, wenn du nur links 2 Gewichte wegnimmst?',
        options: [
          { text: 'Nichts, sie bleibt im Gleichgewicht.', feedback: 'Links fehlt dann etwas, rechts nicht.' },
          { text: 'Die linke Seite wird leichter und geht nach oben.', correct: true },
          { text: 'Die linke Seite geht nach unten.', feedback: 'Nach unten geht die schwerere Seite. Links wird es leichter.' },
        ],
        explanation: 'Nur wenn auf beiden Seiten dasselbe geschieht, bleibt die Waage im Gleichgewicht.',
      },
    },
    {
      id: 'waage-ballons',
      title: 'Ballons',
      body: [
        'Hier steht 2x − 3 = x + 1. Die drei Ballons links ziehen die Schale um 3 nach oben.',
        'Legst du auf beiden Seiten 3 Gewichte dazu, heben sich links Gewichte und Ballons auf.',
      ],
      widget: { kind: 'balance', equation: '2x - 3 = x + 1', mode: 'steps', steps: ['| + 3', '| - x'] },
    },
    {
      id: 'waage-probieren',
      title: 'Selbst umformen',
      body: [
        'Forme um, bis ein Kästchen allein liegt. Probiere auch aus, was passiert, wenn du nur eine Seite veränderst.',
        'Mit der Tastatur: Mit Tab zur Auswahl, dort die Pfeiltasten, dann mit Tab zu den Umformungen.',
      ],
      widget: { kind: 'balance', equation: '2x + 1 = 7', mode: 'explore' },
    },
    // Function equations are written without $ here: inside $…$ every "=" is checked as an identity of terms.
    {
      id: 'gerade-regler',
      title: 'Steigung und y-Achsenabschnitt',
      body: [
        'Die Gerade gehört zu f(x) = mx + n. Verändere $m$ und $n$ mit den Schiebereglern.',
        'Mit der Tastatur: Regler mit Tab wählen, dann die Pfeiltasten, Pos1 oder Ende.',
      ],
      widget: { kind: 'line-sliders', m: { value: 1 }, n: { value: 2 } },
      question: {
        kind: 'choice',
        prompt: 'Was passiert mit der Geraden, wenn nur $n$ größer wird?',
        options: [
          { text: 'Sie wird steiler.', feedback: 'Die Steilheit hängt nur von $m$ ab.' },
          { text: 'Sie verschiebt sich nach oben.', correct: true },
          { text: 'Sie dreht sich um den Ursprung.', feedback: 'Um einen festen Punkt dreht sie sich, wenn sich $m$ ändert.' },
        ],
        explanation: '$n$ ist der y-Wert an der Stelle 0. Wird $n$ größer, rutscht die ganze Gerade nach oben.',
      },
    },
    {
      id: 'gerade-ziel',
      title: 'Auf das Ziel schieben',
      body: ['Die Steigung bleibt fest. Schiebe die Gerade mit $n$ auf die gestrichelte Zielgerade.'],
      widget: { kind: 'line-sliders', m: { value: -2 }, n: { value: 4 }, vary: 'n', target: { m: -2, n: -1 }, name: 'g' },
    },
    {
      id: 'steigungsdreieck',
      title: 'Steigungsdreieck',
      body: [
        'Gehe von P aus ein Kästchen nach rechts. Um wie viel musst du hoch, um wieder auf die Gerade zu kommen?',
        'Ziehe P an der Geraden entlang: Das Dreieck sieht überall gleich aus.',
      ],
      widget: { kind: 'slope-triangle', m: 2, n: -1, at: 1 },
      question: {
        kind: 'choice',
        prompt: 'Wie groß ist die Steigung dieser Geraden?',
        options: [
          { text: '$1$', feedback: 'Das ist der Schritt nach rechts. Gefragt ist hoch durch rechts.' },
          { text: '$2$', correct: true },
          { text: '$-1$', feedback: 'Das ist der y-Achsenabschnitt.' },
        ],
        explanation: 'Ein Kästchen nach rechts, zwei hoch: Die Steigung ist $2 : 1$, also $2$.',
      },
    },
    {
      id: 'steigungsdreieck-groesse',
      title: 'Größer oder kleiner',
      body: [
        'Hier lassen sich P und Q ziehen. Die Gerade fällt, deshalb ist „hoch“ negativ.',
        'Wie groß du das Dreieck auch machst: hoch durch rechts ergibt immer dieselbe Zahl.',
      ],
      widget: { kind: 'slope-triangle', m: -1, n: 3, at: 0, run: 2, resizable: true },
    },
    {
      id: 'zwei-punkte',
      title: 'Gerade durch zwei Punkte',
      body: [
        'Ziehe P und Q. Die Gleichung und die Wertetabelle passen sich an.',
        'Stehen P und Q übereinander, ist die Gerade senkrecht. Sie gehört zu keiner Funktion.',
      ],
      widget: {
        kind: 'line-points',
        points: [
          [0, -3],
          [2, 1],
        ],
        target: { m: -1, n: 2 },
      },
    },
    {
      id: 'wertetabelle-rechnen',
      title: 'Wertetabelle ausfüllen',
      body: [
        'Setze jeden x-Wert in die Gleichung ein und trage den y-Wert ein. Enter prüft.',
        'Jeder richtige Wert setzt einen Punkt. Sind alle richtig, erscheint die Gerade.',
      ],
      widget: { kind: 'value-table', m: 2, n: -3, given: [0] },
    },
    {
      id: 'wertetabelle-ablesen',
      title: 'Werte am Graphen ablesen',
      body: ['Lies die y-Werte am Graphen ab. Die Gleichung erscheint, wenn alle Werte stimmen.'],
      widget: { kind: 'value-table', m: -1, n: 2, table: [-3, -1, 0, 2, 4], show: 'graph' },
    },
    {
      id: 'schnittpunkt',
      title: 'Zwei Geraden schneiden sich',
      body: [
        'Verändere die Gerade g. Wo schneidet sie f?',
        'Beim Gleichsetzen suchst du das x, an dem beide Funktionen denselben Wert haben.',
      ],
      widget: { kind: 'two-lines', f: { m: 2, n: 1 }, g: { m: -1, n: 7 }, vary: 'both', equate: true },
    },
    {
      id: 'parallel-identisch',
      title: 'Parallel oder identisch',
      body: [
        'Beide Geraden haben dieselbe Steigung. Verschiebe g mit $n$.',
        'Meist gibt es keinen Schnittpunkt. Bei einem Wert von $n$ liegen beide Geraden aufeinander.',
      ],
      widget: { kind: 'two-lines', f: { m: 2, n: 1 }, g: { m: 2, n: -3 }, vary: 'n', equate: true },
    },
    {
      id: 'identisch-klammer',
      title: 'Gleich, nur anders geschrieben',
      body: ['Die Gleichung von g sieht anders aus als die von f. Trotzdem liegen beide Geraden aufeinander.'],
      widget: { kind: 'two-lines', f: { m: 2, n: 1 }, g: '2(x + 1) - 1', equate: true },
    },
    {
      id: 'flaeche-regler',
      title: 'Grundseite und Höhe',
      body: ['Verändere die Grundseite und die Höhe des Parallelogramms. Die Formel rechnet mit den neuen Zahlen.'],
      widget: {
        kind: 'shape-sliders',
        shape: 'parallelogram',
        measures: { g: { value: 6, min: 2, max: 10 }, h: { value: 4, min: 1, max: 8 } },
      },
    },
    {
      id: 'trapez-regler',
      title: 'Trapez mit Reglern',
      body: ['Die beiden parallelen Seiten heißen a und c. Die Figur bleibt gleichschenklig.'],
      widget: {
        kind: 'shape-sliders',
        shape: 'trapezoid',
        measures: { a: { value: 8, min: 5, max: 12 }, c: { value: 4, min: 1, max: 4.5 }, h: { value: 3, min: 1, max: 6 } },
      },
    },
    {
      id: 'dreieck-stumpf-regler',
      title: 'Spitze außerhalb',
      body: ['Die Spitze C bleibt an ihrer Stelle. Wird die Grundseite kürzer, liegt die Höhe außerhalb des Dreiecks.'],
      widget: { kind: 'shape-sliders', shape: 'triangle', measures: { g: { value: 4, min: 2, max: 8 }, h: 3 }, offset: 6 },
    },
    {
      id: 'umfang-regler',
      title: 'Umfang eines Dreiecks',
      body: ['Der Umfang ist die Summe aller Seiten. Die Seite c bleibt fest.'],
      widget: {
        kind: 'shape-sliders',
        shape: 'triangle',
        quantity: 'perimeter',
        measures: { a: { value: 5, min: 4, max: 6 }, b: { value: 4, min: 3, max: 5 }, c: 6 },
      },
    },
    {
      id: 'ecken-parallelogramm',
      title: 'Ecken ziehen',
      body: ['Ziehe B und D. C folgt, die Figur bleibt ein Parallelogramm. Grundseite, Höhe und Fläche folgen.'],
      widget: {
        kind: 'shape-points',
        shape: 'parallelogram',
        vertices: [
          [2, 2],
          [7, 2],
          [9, 5],
          [4, 5],
        ],
      },
    },
    {
      id: 'ecken-dreieck-ziel',
      title: 'Dreieck mit Ziel',
      body: ['Ziehe B und C, bis das Dreieck 15 cm² groß ist.'],
      widget: {
        kind: 'shape-points',
        shape: 'triangle',
        vertices: [
          [2, 2],
          [8, 2],
          [4, 6],
        ],
        target: 15,
      },
    },
    {
      id: 'ecken-raute',
      title: 'Raute mit Diagonalen',
      body: ['Ziehe C und D. Die Diagonalen e und f bleiben senkrecht zueinander.'],
      widget: {
        kind: 'shape-points',
        shape: 'rhombus',
        vertices: [
          [3, 5],
          [6, 3],
          [9, 5],
          [6, 7],
        ],
      },
    },
    {
      id: 'ecken-trapez',
      title: 'Trapez im Gitter',
      body: ['Ziehe B, C und D. Die Seiten AB und CD bleiben parallel.'],
      widget: {
        kind: 'shape-points',
        shape: 'trapezoid',
        vertices: [
          [1, 2],
          [9, 2],
          [7, 6],
          [3, 6],
        ],
      },
    },
  ],
}
