import { buildGraphTask } from '../math'
import type { SubtopicContent } from './types'

/**
 * Linear functions 1: function notation f(2) = 3, y-intercept n, slope m,
 * slope triangle, reading the equation off the graph and drawing the graph.
 */
export const funktionenSteigungUndGraph: SubtopicContent = {
  cards: [
    {
      id: 'zuordnung',
      title: 'Eine Funktion als Rechenvorschrift',
      body: [
        'Eine Funktion ordnet jeder Zahl $x$ genau eine Zahl zu. Die Vorschrift steht in der Funktionsgleichung, zum Beispiel $fn: f(x) = 2x - 1$.',
        'Für $eq: x = 2$ schreibt man $fn: f(2) = 2·2 - 1 = 3$ und liest „f von 2 ist 3“. $fn: f(2)$ heißt Funktionswert an der Stelle 2.',
        'Rechne die fehlenden Werte aus. Jeder richtige Wert wird ein Punkt im Koordinatensystem.',
      ],
      widget: { kind: 'value-table', m: 2, n: -1, given: [0] },
      question: {
        kind: 'term',
        prompt: 'Berechne $fn: f(3)$ für $fn: f(x) = 2x - 1$.',
        answer: '5',
        form: { kind: 'expanded' },
        explanation: '$fn: f(3) = 2·3 - 1 = 5$.',
      },
    },
    {
      id: 'funktionswert',
      title: 'Funktionswert und Punkt',
      body: [
        '$fn: f(2) = 3$ bedeutet: Der Punkt $fn: P(2|3)$ liegt auf dem Graphen von f. Die erste Koordinate ist $x$, die zweite der Funktionswert.',
        'Hier ist der Graph gegeben. Lies die Funktionswerte an den Stellen ab und trage sie ein.',
      ],
      widget: { kind: 'value-table', m: -1, n: 2, table: [-2, 0, 1, 3], show: 'graph' },
      question: {
        kind: 'choice',
        prompt: 'Welcher Punkt liegt auf dem Graphen von $fn: f(x) = x + 4$?',
        options: [
          { text: '$fn: P(1|5)$', correct: true },
          { text: '$fn: P(5|1)$', feedback: 'Die Koordinaten sind vertauscht: $fn: f(5) = 9$.' },
          { text: '$fn: P(1|4)$', feedback: 'Setze ein: $fn: f(1) = 1 + 4 = 5$.' },
        ],
        explanation: '$fn: f(1) = 1 + 4 = 5$, also liegt $fn: P(1|5)$ auf dem Graphen.',
      },
    },
    {
      id: 'y-achsenabschnitt',
      title: 'Der y-Achsenabschnitt n',
      body: [
        'Eine lineare Funktion hat die Form f(x) = mx + n. Ihr Graph ist eine Gerade.',
        'Setzt man $0$ ein, bleibt f(0) = n. Die Gerade schneidet die y-Achse also im Punkt (0|n). Deshalb heißt $n$ y-Achsenabschnitt.',
        'Verschiebe die Gerade mit $n$. Ihre Richtung bleibt gleich.',
      ],
      widget: { kind: 'line-sliders', m: { value: 1 }, n: { value: 2 }, vary: 'n' },
      question: {
        kind: 'choice',
        prompt: 'Wo schneidet der Graph von $fn: f(x) = 3x - 4$ die y-Achse?',
        options: [
          { text: '$fn: (0|-4)$', correct: true },
          { text: '$fn: (0|3)$', feedback: '$3$ ist die Steigung. Der y-Achsenabschnitt ist die Zahl ohne $x$.' },
          { text: '$fn: (-4|0)$', feedback: 'Auf der y-Achse ist die x-Koordinate $0$.' },
        ],
        explanation: '$fn: f(0) = 3·0 - 4 = -4$, also $fn: n = -4$.',
      },
    },
    {
      id: 'steigung',
      title: 'Die Steigung m',
      body: [
        '$m$ sagt, um wie viel sich der Funktionswert ändert, wenn $x$ um $1$ größer wird.',
        'Ist $m$ positiv, steigt die Gerade. Ist $m$ negativ, fällt sie. Bei $fn: m = 0$ verläuft sie waagerecht.',
        'Je größer der Betrag von $m$, desto steiler die Gerade. Probiere es aus.',
      ],
      widget: { kind: 'line-sliders', m: { value: 1 }, n: { value: -1 }, vary: 'm' },
      question: {
        kind: 'choice',
        prompt: 'Wie verläuft der Graph von $fn: f(x) = -2x + 5$?',
        options: [
          { text: 'Er fällt.', correct: true },
          { text: 'Er steigt.', feedback: 'Die Steigung ist $-2$, also negativ.' },
          { text: 'Er verläuft waagerecht.', feedback: 'Waagerecht ist eine Gerade nur bei $fn: m = 0$.' },
        ],
        explanation: 'Bei $fn: m = -2$ wird der Funktionswert pro Schritt nach rechts um $2$ kleiner.',
      },
    },
    {
      id: 'steigungsdreieck',
      title: 'Das Steigungsdreieck',
      body: [
        'Gehe von einem Punkt der Geraden $1$ nach rechts. Um wie viel musst du dann hoch, um wieder auf die Gerade zu kommen? Das ist $m$.',
        'Ziehe P an der Geraden entlang: Das Dreieck sieht überall gleich aus.',
      ],
      widget: { kind: 'slope-triangle', m: 2, n: -1, at: 1 },
      question: {
        kind: 'term',
        prompt: 'Ein Steigungsdreieck geht $1$ nach rechts und $3$ nach unten. Wie groß ist $m$?',
        answer: '-3',
        form: { kind: 'expanded' },
        explanation: 'Nach unten zählt „hoch“ negativ: $fn: m = -3 : 1 = -3$.',
      },
    },
    {
      id: 'groessere-dreiecke',
      title: 'Größere Dreiecke',
      body: [
        'Oft lässt sich ein größeres Dreieck besser ablesen. Dann gilt: $m$ ist hoch geteilt durch rechts.',
        'Ziehe Q, um das Dreieck größer oder kleiner zu machen. Der Quotient bleibt gleich.',
      ],
      widget: { kind: 'slope-triangle', m: -2, n: 3, at: 0, run: 2, resizable: true },
      question: {
        kind: 'term',
        prompt: 'Ein Steigungsdreieck geht $2$ nach rechts und $6$ nach oben. Wie groß ist $m$?',
        answer: '3',
        form: { kind: 'expanded' },
        explanation: '$fn: m = 6 : 2 = 3$.',
      },
    },
    {
      id: 'ablesen',
      title: 'Die Gleichung ablesen',
      body: [
        'So liest du die Funktionsgleichung am Graphen ab: Erst $n$ am Schnittpunkt mit der y-Achse, dann $m$ mit einem Steigungsdreieck.',
        'Stelle die Regler so ein, dass deine Gerade auf der gestrichelten liegt.',
      ],
      widget: { kind: 'line-sliders', m: { value: 1 }, n: { value: 0 }, target: { m: -1, n: 2 } },
      question: {
        kind: 'term',
        prompt: 'Wie lautet der Funktionsterm der gestrichelten Geraden? Ergänze f(x) = …',
        answer: '-x + 2',
        form: { kind: 'expanded' },
        variables: ['x'],
        explanation: 'Sie schneidet die y-Achse bei $2$ und fällt pro Schritt nach rechts um $1$: $fn: f(x) = -x + 2$.',
      },
    },
    {
      id: 'zeichnen',
      title: 'Den Graphen zeichnen',
      body: [
        'Umgekehrt zeichnest du den Graphen so: Setze den Punkt (0|n) auf die y-Achse. Gehe von dort mit dem Steigungsdreieck zu einem zweiten Punkt.',
        'Ziehe P und Q so, dass der Graph von $fn: f(x) = 2x - 3$ entsteht.',
      ],
      widget: {
        kind: 'line-points',
        points: [
          [-2, 1],
          [2, 1],
        ],
        target: { m: 2, n: -3 },
      },
      question: {
        kind: 'choice',
        prompt: 'Welche beiden Punkte liegen auf dem Graphen von $fn: f(x) = -x + 1$?',
        options: [
          { text: '$fn: (0|1)$ und $fn: (1|0)$', correct: true },
          { text: '$fn: (0|1)$ und $fn: (1|2)$', feedback: 'Bei $fn: m = -1$ geht es pro Schritt nach rechts $1$ nach unten.' },
          { text: '$fn: (1|0)$ und $fn: (0|-1)$', feedback: 'Setze $0$ ein: $fn: f(0) = 1$.' },
        ],
        explanation: '$fn: f(0) = 1$ und $fn: f(1) = -1 + 1 = 0$.',
      },
    },
    {
      id: 'typische-fehler',
      title: 'Typische Fehler',
      body: [
        '$m$ und $n$ vertauscht: In $fn: f(x) = 2x + 5$ ist $2$ die Steigung und $5$ der y-Achsenabschnitt.',
        'Andere Reihenfolge: In $fn: f(x) = 3 - 2x$ ist $fn: m = -2$, nicht $3$. Die Steigung ist die Zahl vor $x$, mit ihrem Vorzeichen.',
        'Kein $n$ zu sehen: Bei $fn: f(x) = 4x$ ist $fn: n = 0$. Die Gerade geht durch den Ursprung.',
        'Steigungsdreieck falsch gezählt: Gehe immer nach rechts. Nach unten zählt „hoch“ negativ.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Welche Steigung hat $fn: f(x) = 3 - 2x$?',
        options: [
          { text: '$-2$', correct: true },
          { text: '$3$', feedback: '$3$ ist die Zahl ohne $x$, also der y-Achsenabschnitt.' },
          { text: '$2$', feedback: 'Das Minus gehört zur Steigung.' },
        ],
        explanation: 'Umgeordnet: $fn: f(x) = -2x + 3$. Also $fn: m = -2$ und $fn: n = 3$.',
      },
    },
  ],
  examples: [
    {
      title: 'Gleichung ablesen',
      task: buildGraphTask('read-equation', [-1, 2]),
      comment: 'Probe mit einem zweiten Punkt: $fn: f(2) = -2 + 2 = 0$, der Graph geht durch $fn: (2|0)$.',
    },
    {
      title: 'Graph zeichnen',
      task: buildGraphTask('draw-graph', [2, -3]),
    },
    {
      title: 'Waagerechte Gerade',
      task: buildGraphTask('read-equation', [0, 3]),
      comment: 'Bei $fn: m = 0$ hat jede Stelle denselben Funktionswert: $fn: f(x) = 3$.',
    },
  ],
  formulaIds: ['function-equation', 'function-value'],
}
