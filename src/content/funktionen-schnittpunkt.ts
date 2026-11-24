import { buildIntersectionTask, parse } from '../math'
import type { SubtopicContent } from './types'

/**
 * Linear functions 4: intersection of two lines, read off the graph and
 * calculated by equating f(x) = g(x); parallel and identical lines.
 */
export const funktionenSchnittpunkt: SubtopicContent = {
  cards: [
    {
      id: 'grafisch',
      title: 'Zwei Geraden, ein Punkt',
      body: [
        'Zwei Geraden mit verschiedenen Steigungen schneiden sich in genau einem Punkt S. Er liegt auf beiden Geraden.',
        'Hier sind $fn: f(x) = 2x + 1$ und $fn: g(x) = -x + 7$ gezeichnet. Den Schnittpunkt kannst du ablesen.',
      ],
      widget: { kind: 'two-lines', f: { m: 2, n: 1 }, g: { m: -1, n: 7 } },
      question: {
        kind: 'choice',
        prompt: 'Wo schneiden sich die beiden Geraden?',
        options: [
          { text: '$fn: S(2|5)$', correct: true },
          { text: '$fn: S(5|2)$', feedback: 'Die Koordinaten sind vertauscht: Erst kommt $x$, dann $y$.' },
          { text: '$fn: S(0|1)$', feedback: 'Dort schneidet f die y-Achse. g geht durch $fn: (0|7)$.' },
        ],
        explanation: 'Probe: $fn: f(2) = 2·2 + 1 = 5$ und $fn: g(2) = -2 + 7 = 5$.',
      },
    },
    {
      id: 'gleichsetzen',
      title: 'Gleichsetzen',
      body: [
        'Ablesen klappt nicht immer genau. Rechnerisch gilt: Im Schnittpunkt haben f und g an derselben Stelle denselben Funktionswert.',
        'Setze deshalb die Funktionsterme gleich: $eq: 2x + 1 = -x + 7$. Die Lösung ist die x-Koordinate von S.',
      ],
      widget: {
        kind: 'equation-steps',
        start: '2x + 1 = -x + 7',
        steps: [
          { operation: '| + x', equation: '3x + 1 = 7' },
          { operation: '| - 1', equation: '3x = 6' },
          { operation: '| : 3', equation: 'x = 2' },
        ],
        solution: 'L = {2}',
        label: 'Gleichsetzen',
      },
      question: {
        kind: 'term',
        prompt: 'Setze $fn: f(x) = x + 2$ und $fn: g(x) = -x + 6$ gleich. Welche Zahl ist $x$?',
        answer: '2',
        form: { kind: 'expanded' },
        variables: ['x'],
        explanation: 'Aus $eq: x + 2 = -x + 6$ wird $eq: 2x = 4$, also $eq: x = 2$.',
      },
    },
    {
      id: 'y-berechnen',
      title: 'Die y-Koordinate berechnen',
      body: [
        'Setze die x-Koordinate in eine der beiden Funktionen ein: $fn: f(2) = 2·2 + 1 = 5$. Der Schnittpunkt ist $fn: S(2|5)$.',
        'Zur Probe setzt du in die andere Funktion ein: $fn: g(2) = -2 + 7 = 5$. Beide Werte stimmen überein.',
      ],
      widget: { kind: 'two-lines', f: { m: 2, n: 1 }, g: { m: -1, n: 7 }, equate: true },
      question: {
        kind: 'term',
        prompt: 'Für $fn: f(x) = x + 2$ und $fn: g(x) = -x + 6$ ist $eq: x = 2$. Welche y-Koordinate hat der Schnittpunkt?',
        answer: '4',
        form: { kind: 'expanded' },
        explanation: '$fn: f(2) = 2 + 2 = 4$, Probe: $fn: g(2) = -2 + 6 = 4$. Also $fn: S(2|4)$.',
      },
    },
    {
      id: 'geraden-bewegen',
      title: 'Geraden bewegen',
      body: [
        'Verändere g und beobachte den Schnittpunkt. Er kann auch Brüche als Koordinaten haben, dann hilft nur das Rechnen.',
        'Darunter siehst du, wie die Gleichung beim Gleichsetzen aussieht.',
      ],
      widget: { kind: 'two-lines', f: { m: 2, n: 1 }, g: { m: -1, n: 7 }, vary: 'both', equate: true },
      question: {
        kind: 'choice',
        prompt: 'Wo schneiden sich die Graphen von $fn: f(x) = 3x - 1$ und $fn: g(x) = x + 3$?',
        options: [
          { text: '$fn: S(2|5)$', correct: true },
          { text: '$fn: S(1|2)$', feedback: 'Probe mit g: $fn: g(1) = 4$, nicht $2$.' },
          { text: '$fn: S(2|3)$', feedback: 'Die x-Koordinate stimmt. Setze sie in f ein: $fn: f(2) = 5$.' },
        ],
        explanation: 'Aus $eq: 3x - 1 = x + 3$ folgt $eq: x = 2$, dann $fn: f(2) = 3·2 - 1 = 5$.',
      },
    },
    {
      id: 'parallel',
      title: 'Parallele Geraden',
      body: [
        'Haben f und g dieselbe Steigung, aber verschiedene y-Achsenabschnitte, sind die Geraden parallel. Sie schneiden sich nie.',
        'Beim Gleichsetzen fällt $x$ weg: Aus $eq: 2x + 1 = 2x + 5$ wird $eq: 1 = 5$, eine falsche Aussage. Also $eq: L = { }$, kein Schnittpunkt.',
        'Verschiebe g mit $n$. Bei einem Wert liegen beide Geraden aufeinander.',
      ],
      widget: { kind: 'two-lines', f: { m: 2, n: 1 }, g: { m: 2, n: 5 }, vary: 'n', equate: true },
      question: {
        kind: 'choice',
        prompt: 'Wie viele Schnittpunkte haben die Graphen von $fn: f(x) = -x + 3$ und $fn: g(x) = -x - 2$?',
        options: [
          { text: 'Keinen, die Geraden sind parallel.', correct: true },
          { text: 'Genau einen.', feedback: 'Beide haben die Steigung $-1$. Gleichsetzen ergibt $eq: 3 = -2$.' },
          { text: 'Unendlich viele.', feedback: 'Dafür müssten auch die y-Achsenabschnitte gleich sein.' },
        ],
        explanation: 'Gleiche Steigung, verschiedene y-Achsenabschnitte: parallel, $eq: L = { }$.',
      },
    },
    {
      id: 'identisch',
      title: 'Dieselbe Gerade',
      body: [
        'Manchmal sieht g anders aus als f und ist doch dieselbe Gerade: $fn: g(x) = 2(x + 1) - 1$, und $2(x + 1) - 1 = 2x + 1$.',
        'Beim Gleichsetzen bleibt eine wahre Aussage: Aus $eq: 2x + 1 = 2(x + 1) - 1$ wird $eq: 1 = 1$. Also $eq: L = ℚ$, jeder Punkt der Geraden ist ein Schnittpunkt.',
      ],
      widget: { kind: 'two-lines', f: { m: 2, n: 1 }, g: '2(x + 1) - 1', equate: true },
      question: {
        kind: 'choice',
        prompt: 'Welche Lösungsmenge hat $eq: 3x - 2 = 3(x - 1) + 1$?',
        options: [
          { text: '$eq: L = ℚ$', correct: true },
          { text: '$eq: L = { }$', feedback: 'Löse die Klammer auf: $3(x - 1) + 1 = 3x - 2$. Beide Seiten sind gleich.' },
          { text: '$eq: L = {0}$', feedback: 'Nicht nur $0$ passt. Probiere es mit einer anderen Zahl.' },
        ],
        explanation: 'Rechts steht $3(x - 1) + 1 = 3x - 2$. Es bleibt $eq: -2 = -2$, die Geraden sind identisch.',
      },
    },
    {
      id: 'ueberblick',
      title: 'Drei Fälle',
      body: [
        'Verschiedene Steigungen: genau ein Schnittpunkt.',
        'Gleiche Steigung, verschiedene y-Achsenabschnitte: parallel, kein Schnittpunkt.',
        'Gleiche Steigung und gleicher y-Achsenabschnitt: dieselbe Gerade, unendlich viele Schnittpunkte.',
        'Den Fall erkennst du schon an $m$ und $n$, bevor du rechnest.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Wie viele Schnittpunkte haben die Graphen von $fn: f(x) = -3x + 2$ und $fn: g(x) = 2x + 2$?',
        options: [
          { text: 'Genau einen.', correct: true },
          { text: 'Keinen.', feedback: 'Die Steigungen $-3$ und $2$ sind verschieden.' },
          { text: 'Unendlich viele.', feedback: 'Nur die y-Achsenabschnitte sind gleich, die Steigungen nicht.' },
        ],
        explanation: 'Verschiedene Steigungen, also genau ein Schnittpunkt. Hier ist es $fn: S(0|2)$.',
      },
    },
    {
      id: 'typische-fehler',
      title: 'Typische Fehler',
      body: [
        'Nur $x$ angegeben: Die Lösung der Gleichung ist erst die x-Koordinate. Zum Schnittpunkt gehört auch der Funktionswert.',
        'Koordinaten vertauscht: Der Schnittpunkt heißt S(x|y), erst die x-Koordinate.',
        'Keine Probe: Setze die x-Koordinate auch in die andere Funktion ein. Kommt etwas anderes heraus, steckt ein Rechenfehler drin.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Beim Gleichsetzen von f und g kommt $eq: x = 3$ heraus, und es ist $fn: f(3) = 4$. Wie lautet der Schnittpunkt?',
        options: [
          { text: '$fn: S(3|4)$', correct: true },
          { text: '$fn: S(4|3)$', feedback: 'Erst kommt die x-Koordinate.' },
          { text: '$eq: x = 3$', feedback: 'Das ist nur die x-Koordinate. Zum Punkt gehört der Funktionswert.' },
        ],
        explanation: 'x-Koordinate $3$, y-Koordinate $fn: f(3) = 4$: $fn: S(3|4)$.',
      },
    },
  ],
  examples: [
    {
      title: 'Genau ein Schnittpunkt',
      task: buildIntersectionTask([2, 1], [-1, 7]),
      comment: 'Probe mit g: $fn: g(2) = -2 + 7 = 5$.',
    },
    {
      title: 'Parallele Geraden',
      task: buildIntersectionTask([2, 1], [2, 5]),
    },
    {
      title: 'Identische Geraden',
      task: buildIntersectionTask([2, 1], parse('2(x + 1) - 1')),
    },
  ],
  formulaIds: ['intersection-equate', 'intersection-one', 'intersection-parallel', 'intersection-identical'],
}
