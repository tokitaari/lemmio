import { buildPointTestTask, buildZeroTask } from '../math'
import type { SubtopicContent } from './types'

/**
 * Linear functions 3: Punktprobe (does a point lie on the graph?), a missing
 * coordinate, and zeros including the case without a zero (m = 0, n ≠ 0).
 */
export const funktionenPunktprobeNullstelle: SubtopicContent = {
  cards: [
    {
      id: 'punktprobe',
      title: 'Liegt der Punkt auf dem Graphen?',
      body: [
        'Ein Punkt liegt genau dann auf dem Graphen, wenn sein y-Wert der Funktionswert an seiner x-Stelle ist. Das prüfst du mit der Punktprobe.',
        'Liegt $fn: P(2|5)$ auf dem Graphen von $fn: f(x) = 3x - 1$? Setze die x-Koordinate ein: $fn: f(2) = 3·2 - 1 = 5$. Das ist die y-Koordinate von P, also liegt P auf dem Graphen.',
        'Berechne die Funktionswerte. Jeder Punkt der Tabelle liegt auf der Geraden.',
      ],
      widget: { kind: 'value-table', m: 3, n: -1, table: [0, 1, 2] },
      question: {
        kind: 'choice',
        prompt: 'Liegt $fn: P(-1|-4)$ auf dem Graphen von $fn: f(x) = 3x - 1$?',
        options: [
          { text: 'Ja', correct: true },
          { text: 'Nein', feedback: 'Rechne nach: $fn: f(-1) = 3·(-1) - 1 = -4$.' },
        ],
        explanation: '$fn: f(-1) = 3·(-1) - 1 = -4$, und das ist die y-Koordinate von P.',
      },
    },
    {
      id: 'punktprobe-nein',
      title: 'Wenn die Probe nicht aufgeht',
      body: [
        'Liegt $fn: P(5|-4)$ auf dem Graphen von $fn: f(x) = -2x + 3$? Einsetzen: $fn: f(5) = -2·5 + 3 = -7$.',
        'Es ist $-7 ≠ -4$. Der Funktionswert an der Stelle 5 ist nicht die y-Koordinate von P, also liegt P nicht auf dem Graphen.',
      ],
      question: {
        kind: 'term',
        prompt: 'Berechne $fn: f(-3)$ für $fn: f(x) = -2x + 3$.',
        answer: '9',
        form: { kind: 'expanded' },
        explanation: '$fn: f(-3) = -2·(-3) + 3 = 9$.',
      },
    },
    {
      id: 'nullstelle',
      title: 'Die Nullstelle',
      body: [
        'Wo der Graph die x-Achse schneidet, ist der Funktionswert $0$. Diese Stelle heißt Nullstelle, der Punkt dort hat die Form N(x|0).',
        'Bei $fn: f(x) = 2x + 4$ ist das der Punkt $fn: N(-2|0)$. Verschiebe die Gerade mit $n$ und beobachte, wie die Nullstelle wandert.',
      ],
      widget: { kind: 'line-sliders', m: { value: 2 }, n: { value: 4 }, vary: 'n' },
      question: {
        kind: 'choice',
        prompt: 'Welcher Punkt kann ein Schnittpunkt mit der x-Achse sein?',
        options: [
          { text: '$fn: N(3|0)$', correct: true },
          { text: '$fn: (0|3)$', feedback: 'Dieser Punkt liegt auf der y-Achse.' },
          { text: '$fn: (3|3)$', feedback: 'Auf der x-Achse ist die y-Koordinate $0$.' },
        ],
        explanation: 'Auf der x-Achse ist die y-Koordinate $0$, also kommt nur $fn: N(3|0)$ in Frage.',
      },
    },
    {
      id: 'nullstelle-berechnen',
      title: 'Die Nullstelle berechnen',
      body: [
        'Setze den Funktionsterm gleich $0$ und löse die Gleichung wie gewohnt. Für $fn: f(x) = 2x + 4$ ergibt sich $eq: 2x + 4 = 0$.',
        'Die Lösung $eq: x = -2$ ist die Nullstelle. Der Graph schneidet die x-Achse in $fn: N(-2|0)$.',
      ],
      widget: {
        kind: 'equation-steps',
        start: '2x + 4 = 0',
        steps: [
          { operation: '| - 4', equation: '2x = -4' },
          { operation: '| : 2', equation: 'x = -2' },
        ],
        solution: 'L = {-2}',
        label: 'Nullstelle berechnen',
      },
      question: {
        kind: 'term',
        prompt: 'Berechne die Nullstelle von $fn: f(x) = 3x - 6$. Welche Zahl ist $x$?',
        answer: '2',
        form: { kind: 'expanded' },
        variables: ['x'],
        explanation: 'Aus $eq: 3x - 6 = 0$ wird $eq: 3x = 6$, also $eq: x = 2$. Probe: $fn: f(2) = 3·2 - 6 = 0$.',
      },
    },
    {
      id: 'keine-nullstelle',
      title: 'Keine Nullstelle',
      body: [
        'Bei $fn: m = 0$ ist der Graph waagerecht. Bei $fn: f(x) = 3$ führt das Gleichsetzen zu $eq: 3 = 0$, einer falschen Aussage: $eq: L = { }$.',
        'Der Graph verläuft dann parallel zur x-Achse und schneidet sie nie. Nur bei $fn: n = 0$ liegt er auf der x-Achse, dann ist jede Stelle eine Nullstelle.',
      ],
      widget: { kind: 'line-sliders', m: { value: 0 }, n: { value: 3 }, vary: 'n' },
      question: {
        kind: 'choice',
        prompt: 'Welche Funktion hat keine Nullstelle?',
        options: [
          { text: '$fn: f(x) = 4$', correct: true },
          { text: '$fn: f(x) = 4x$', feedback: 'Hier ist $fn: f(0) = 0$: Die Nullstelle ist $fn: N(0|0)$.' },
          { text: '$fn: f(x) = x + 4$', feedback: 'Aus $eq: x + 4 = 0$ folgt $eq: x = -4$.' },
        ],
        explanation: 'Aus $eq: 4 = 0$ folgt $eq: L = { }$. Der Graph verläuft waagerecht über der x-Achse.',
      },
    },
    {
      id: 'fehlende-koordinate',
      title: 'Eine fehlende Koordinate',
      body: [
        'Der Graph von $fn: f(x) = -x + 5$ geht durch einen Punkt mit der x-Koordinate 4. Seine y-Koordinate ist der Funktionswert: $fn: f(4) = -4 + 5 = 1$.',
        'Trage die fehlenden y-Werte ein.',
      ],
      widget: { kind: 'value-table', m: -1, n: 5, table: [-2, 0, 2, 4], given: [0] },
      question: {
        kind: 'term',
        prompt: 'Welche y-Koordinate hat der Punkt des Graphen von $fn: f(x) = -x + 5$ an der Stelle $-2$?',
        answer: '7',
        form: { kind: 'expanded' },
        explanation: '$fn: f(-2) = -(-2) + 5 = 7$, der Punkt ist $fn: (-2|7)$.',
      },
    },
    {
      id: 'typische-fehler',
      title: 'Typische Fehler',
      body: [
        'Das Falsche null gesetzt: $fn: f(0)$ ist der y-Achsenabschnitt. Für die Nullstelle setzt man den Funktionswert null, nicht $x$.',
        'Koordinaten vertauscht: Bei der Punktprobe setzt du die x-Koordinate ein und vergleichst mit der y-Koordinate.',
        'Nullstelle als N(0|x) geschrieben: Auf der x-Achse steht die $0$ an zweiter Stelle.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Wo hat der Graph von $fn: f(x) = 2x - 6$ seine Nullstelle?',
        options: [
          { text: '$fn: N(3|0)$', correct: true },
          { text: '$fn: (0|-6)$', feedback: 'Das ist der Schnittpunkt mit der y-Achse, denn $fn: f(0) = -6$.' },
          { text: '$fn: (0|3)$', feedback: 'Die Koordinaten sind vertauscht.' },
        ],
        explanation: 'Aus $eq: 2x - 6 = 0$ folgt $eq: x = 3$, also $fn: N(3|0)$.',
      },
    },
  ],
  examples: [
    {
      title: 'Der Punkt liegt auf dem Graphen',
      task: buildPointTestTask([3, -1], [2, 5]),
    },
    {
      title: 'Der Punkt liegt nicht auf dem Graphen',
      task: buildPointTestTask([-2, 3], [5, -4]),
      comment: 'Auf dem Graphen liegt an der Stelle 5 der Punkt $fn: (5|-7)$.',
    },
    {
      title: 'Nullstelle berechnen',
      task: buildZeroTask([2, 4]),
      comment: 'Probe: $fn: f(-2) = 2·(-2) + 4 = 0$.',
    },
    {
      title: 'Keine Nullstelle',
      task: buildZeroTask([0, 3]),
    },
  ],
  formulaIds: ['point-test', 'function-value', 'zero-equation', 'zero-none'],
}
