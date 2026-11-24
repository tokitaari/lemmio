import { buildPointSlopeTask, buildTwoPointsTask } from '../math'
import type { SubtopicContent } from './types'

/**
 * Linear functions 2: setting up f(x) = mx + n from the slope and a point,
 * and from two points (slope first, then n), with a check at the end.
 */
export const funktionenGleichungAufstellen: SubtopicContent = {
  cards: [
    {
      id: 'warum-rechnen',
      title: 'Rechnen statt ablesen',
      body: [
        'Nicht immer lassen sich $m$ und $n$ genau am Graphen ablesen. Dann rechnet man sie aus.',
        'Dafür braucht man entweder die Steigung und einen Punkt oder zwei Punkte der Geraden.',
        'Ziehe P und Q: Zwei Punkte legen die Gerade fest, ihre Gleichung folgt.',
      ],
      widget: {
        kind: 'line-points',
        points: [
          [1, 3],
          [3, 7],
        ],
        table: false,
      },
      question: {
        kind: 'choice',
        prompt: 'Welche Angabe legt eine Gerade eindeutig fest?',
        options: [
          { text: 'Zwei verschiedene Punkte', correct: true },
          { text: 'Ein Punkt', feedback: 'Durch einen Punkt gehen unendlich viele Geraden mit verschiedenen Steigungen.' },
          { text: 'Die Steigung', feedback: 'Mit derselben Steigung gibt es viele parallele Geraden.' },
        ],
        explanation: 'Durch zwei verschiedene Punkte geht genau eine Gerade. Ebenso legen ein Punkt und die Steigung sie fest.',
      },
    },
    {
      id: 'punkt-und-steigung',
      title: 'Aus Steigung und Punkt',
      body: [
        'Gesucht ist die Gerade mit $fn: m = 2$ durch $fn: P(1|3)$. Setze zuerst die Steigung ein: f(x) = 2x + n. Nur $n$ ist noch unbekannt.',
        'Weil P auf der Geraden liegt, gilt $fn: f(1) = 3$. Setze also $1$ für $x$ und $3$ für den Funktionswert ein: $eq: 3 = 2·1 + n$.',
        'Diese Gleichung löst du nach $n$ auf. Mit $fn: n = 1$ heißt die Gleichung $fn: f(x) = 2x + 1$.',
      ],
      widget: {
        kind: 'equation-steps',
        start: '3 = 2·1 + n',
        steps: [
          { operation: 'Term umformen', equation: '3 = 2 + n' },
          { operation: '| - 2', equation: '1 = n' },
          { operation: '| ⇄', equation: 'n = 1' },
        ],
        label: 'n bestimmen',
      },
      question: {
        kind: 'term',
        prompt: 'Eine Gerade hat die Steigung $fn: m = 3$ und geht durch $fn: P(2|1)$. Wie groß ist $n$?',
        answer: '-5',
        form: { kind: 'expanded' },
        explanation: 'Aus $eq: 1 = 3·2 + n$ wird $eq: 1 = 6 + n$, also $fn: n = -5$.',
      },
    },
    {
      id: 'steigung-zwei-punkte',
      title: 'Steigung aus zwei Punkten',
      body: [
        'Von $fn: P(1|3)$ nach $fn: Q(3|7)$ geht es $3 - 1 = 2$ nach rechts und $7 - 3 = 4$ nach oben. Das ist ein Steigungsdreieck.',
        'Also ist $m$ die Differenz der y-Werte geteilt durch die Differenz der x-Werte: $fn: m = (7 - 3)/(3 - 1) = 4/2 = 2$.',
        'Ziehe P an der Geraden entlang oder Q zur Seite: Der Quotient bleibt $2$.',
      ],
      widget: { kind: 'slope-triangle', m: 2, n: 1, at: 1, run: 2, resizable: true },
      question: {
        kind: 'term',
        prompt: 'Eine Gerade geht durch $fn: P(1|2)$ und $fn: Q(3|8)$. Wie groß ist ihre Steigung $m$?',
        answer: '3',
        form: { kind: 'expanded' },
        explanation: '$fn: m = (8 - 2)/(3 - 1) = 6/2 = 3$.',
      },
    },
    {
      id: 'n-bestimmen',
      title: 'Dann n bestimmen',
      body: [
        'Mit der Steigung $2$ ist f(x) = 2x + n. Jetzt geht es weiter wie bei Steigung und Punkt.',
        'Setze einen der beiden Punkte ein, zum Beispiel P: $eq: 3 = 2·1 + n$, also $fn: n = 1$. Mit Q ergibt sich dasselbe: $eq: 7 = 2·3 + n$.',
        'Schiebe die Gerade mit der Steigung $2$ mit $n$ so, dass sie durch beide Punkte geht.',
      ],
      widget: { kind: 'line-sliders', m: { value: 2 }, n: { value: -3 }, vary: 'n', target: { m: 2, n: 1 } },
      question: {
        kind: 'choice',
        prompt: 'Welchen der beiden Punkte setzt du ein, um $n$ zu bestimmen?',
        options: [
          { text: 'Egal, beide ergeben dasselbe $n$.', correct: true },
          { text: 'Nur den ersten Punkt P.', feedback: 'Beide Punkte liegen auf der Geraden, also passen beide.' },
          { text: 'Beide gleichzeitig.', feedback: 'Ein Punkt genügt. Der andere eignet sich für die Probe.' },
        ],
        explanation: 'Beide Punkte liegen auf derselben Geraden. Nimm den mit den kleineren Zahlen und den anderen für die Probe.',
      },
    },
    {
      id: 'fallende-gerade',
      title: 'Eine fallende Gerade',
      body: [
        'Gesucht ist die Gerade durch $fn: P(-1|5)$ und $fn: Q(2|-1)$. Negative Koordinaten setzt du in Klammern ein:',
        '$fn: m = (-1 - 5)/(2 - (-1)) = -6/3 = -2$',
        'Dann P einsetzen: $eq: 5 = -2·(-1) + n$ ergibt $fn: n = 3$.',
      ],
      widget: {
        kind: 'line-points',
        points: [
          [-1, 5],
          [2, -1],
        ],
      },
      question: {
        kind: 'term',
        prompt: 'Wie lautet die Funktionsgleichung der Geraden durch P und Q? Ergänze f(x) = …',
        answer: '-2x + 3',
        form: { kind: 'expanded' },
        variables: ['x'],
        explanation: 'Mit $fn: m = -2$ und $fn: n = 3$: $fn: f(x) = -2x + 3$.',
      },
    },
    {
      id: 'probe',
      title: 'Die Probe',
      body: [
        'Setze zur Probe den Punkt ein, den du nicht für $n$ benutzt hast. Für $fn: f(x) = -2x + 3$ und $fn: Q(2|-1)$: $fn: f(2) = -2·2 + 3 = -1$. Das passt.',
        'Kommt etwas anderes heraus, steckt ein Fehler in $m$ oder in $n$.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Für die Gerade durch $fn: P(1|3)$ und $fn: Q(3|7)$ hat jemand $fn: f(x) = 2x - 1$ berechnet. Stimmt das?',
        options: [
          { text: 'Nein, denn $fn: f(1) = 2·1 - 1 = 1$, nicht $3$.', correct: true },
          { text: 'Ja, die Steigung $2$ stimmt.', feedback: 'Die Steigung stimmt, aber auch $n$ muss passen. Mache die Probe mit P.' },
          { text: 'Ja, denn $fn: f(3) = 7$.', feedback: 'Rechne nach: $fn: f(3) = 2·3 - 1 = 5$.' },
        ],
        explanation: 'Richtig ist $fn: f(x) = 2x + 1$: $fn: f(1) = 3$ und $fn: f(3) = 7$.',
      },
    },
    {
      id: 'typische-fehler',
      title: 'Typische Fehler',
      body: [
        'Quotient falsch herum: Oben steht die Differenz der y-Werte, unten die der x-Werte.',
        'Reihenfolge gemischt: Wer oben mit Q beginnt, muss auch unten mit Q beginnen. Sonst stimmt das Vorzeichen nicht.',
        'Klammern vergessen: Bei negativen Koordinaten wird aus $2 - (-1) = 3$ schnell eine $1$.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Welche Steigung hat die Gerade durch $fn: P(2|1)$ und $fn: Q(4|7)$?',
        options: [
          { text: '$3$', correct: true },
          { text: '$1/3$', feedback: 'Der Quotient ist falsch herum: y-Werte oben, x-Werte unten.' },
          { text: '$-3$', feedback: 'Die Reihenfolge ist gemischt. Beginne oben und unten mit demselben Punkt.' },
        ],
        explanation: '$fn: m = (7 - 1)/(4 - 2) = 6/2 = 3$.',
      },
    },
  ],
  examples: [
    {
      title: 'Aus Steigung und Punkt',
      task: buildPointSlopeTask(-3, [2, 1]),
      comment: 'Probe: $fn: f(2) = -3·2 + 7 = 1$.',
    },
    {
      title: 'Aus zwei Punkten',
      task: buildTwoPointsTask([1, 3], [3, 7]),
      comment: 'Probe mit Q: $fn: f(3) = 2·3 + 1 = 7$.',
    },
    {
      title: 'Fallende Gerade aus zwei Punkten',
      task: buildTwoPointsTask([-1, 5], [2, -1]),
      comment: 'Probe mit Q: $fn: f(2) = -2·2 + 3 = -1$.',
    },
  ],
  formulaIds: ['slope-two-points', 'intercept-from-point', 'function-equation'],
}
