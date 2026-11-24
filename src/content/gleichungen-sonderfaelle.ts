import { buildEquationTask, parse } from '../math'
import type { SubtopicContent } from './types'

const TOPIC = 'algebra/lineare-gleichungen/sonderfaelle'

/** Linear equations 3: x drops out, a false statement (L = { }) or a true one (L = ℚ) is left. */
export const gleichungenSonderfaelle: SubtopicContent = {
  cards: [
    {
      id: 'worum-geht-es',
      title: 'Wenn x verschwindet',
      body: [
        'Manchmal fällt $x$ beim Umformen ganz weg. Dann bleibt eine Aussage ohne $x$ stehen, zum Beispiel $eq: 2 = 5$ oder $eq: 3 = 3$.',
        'Ob diese Aussage wahr oder falsch ist, entscheidet über die Lösungsmenge.',
      ],
      widget: {
        kind: 'equation-steps',
        start: '2x + 2 = 2x + 5',
        steps: [{ operation: '| - 2x', equation: '2 = 5', note: '$x$ fällt weg, eine falsche Aussage bleibt' }],
        solution: 'L = { }',
      },
      question: {
        kind: 'choice',
        prompt: 'Was bleibt bei $eq: 4x + 1 = 4x + 7$ nach $eq: | - 4x$ übrig?',
        options: [
          { text: '$eq: 1 = 7$', correct: true },
          { text: '$eq: x = 6$', feedback: 'Auf beiden Seiten fällt $4x$ ganz weg, ein $x$ bleibt nicht übrig.' },
          { text: '$eq: 0 = 0$', feedback: 'Nur $4x$ fällt weg, die Zahlen $1$ und $7$ bleiben stehen.' },
        ],
        explanation: 'Links wird $4x+1-4x = 1$, rechts $4x+7-4x = 7$.',
      },
    },
    {
      id: 'keine-loesung',
      title: 'Keine Lösung',
      body: [
        'Bleibt eine falsche Aussage wie $eq: 2 = 5$ stehen, erfüllt keine Zahl die Gleichung. Die Lösungsmenge ist leer: $eq: L = { }$.',
        'Auf der Waage siehst du das so: Egal, was ein Kästchen wiegt, die Waage ist nie im Gleichgewicht.',
      ],
      widget: {
        kind: 'balance',
        equation: 'x + 2 = x + 3',
        mode: 'steps',
        steps: ['| - x'],
        label: 'Umformungen auf der Waage',
      },
      question: {
        kind: 'choice',
        prompt: 'Welche Lösungsmenge hat $eq: 3x - 1 = 3x + 4$?',
        options: [
          { text: '$eq: L = { }$', correct: true },
          { text: '$eq: L = ℚ$', feedback: 'Nach $eq: | - 3x$ bleibt $eq: -1 = 4$ stehen, und das ist falsch.' },
          { text: '$eq: L = {0}$', feedback: 'Probe mit $0$: Links steht $-1$, rechts $4$.' },
        ],
        explanation: 'Es bleibt $eq: -1 = 4$, eine falsche Aussage. Keine Zahl erfüllt die Gleichung.',
      },
    },
    {
      id: 'unendlich-viele',
      title: 'Unendlich viele Lösungen',
      body: [
        'Bleibt eine wahre Aussage wie $eq: 3 = 3$ stehen, erfüllt jede Zahl die Gleichung. Die Lösungsmenge ist dann die ganze Grundmenge: $eq: L = ℚ$.',
        'Beide Seiten sind in Wahrheit derselbe Term, nur anders geschrieben: $2(x+1) = 2x+2$. Auf der Waage bleibt das Gleichgewicht, egal, was ein Kästchen wiegt.',
      ],
      widget: {
        kind: 'balance',
        equation: '2x + 2 = 2(x + 1)',
        mode: 'steps',
        steps: ['| - 2'],
        label: 'Umformungen auf der Waage',
      },
      question: {
        kind: 'choice',
        prompt: 'Welche Lösungsmenge hat $eq: 5x + 2 = 2 + 5x$?',
        options: [
          { text: '$eq: L = ℚ$', correct: true },
          { text: '$eq: L = { }$', feedback: 'Nach $eq: | - 5x$ bleibt $eq: 2 = 2$, und das ist wahr.' },
          { text: '$eq: L = {2}$', feedback: 'Nicht nur $2$ passt. Probiere es zum Beispiel mit $0$ aus.' },
        ],
        explanation: 'Beide Seiten sind gleich: $5x+2 = 2+5x$. Jede Zahl erfüllt die Gleichung.',
      },
    },
    {
      id: 'erkennen',
      title: 'Den Sonderfall erkennen',
      body: [
        'Fasse zuerst beide Seiten zusammen. Steht dann links und rechts dieselbe Zahl vor $x$, fällt $x$ beim nächsten Schritt weg.',
        'Danach vergleichst du die Zahlen: Sind sie verschieden, gibt es keine Lösung. Sind sie gleich, gibt es unendlich viele.',
      ],
      widget: {
        kind: 'equation-steps',
        start: '3(x + 2) - x = 2x + 6',
        steps: [
          { operation: 'T', equation: '3x + 6 - x = 2x + 6', note: 'Klammer auflösen' },
          { operation: 'T', equation: '2x + 6 = 2x + 6', note: 'zusammenfassen' },
          { operation: '| - 2x', equation: '6 = 6', note: '$x$ fällt weg, eine wahre Aussage bleibt' },
        ],
        solution: 'L = ℚ',
      },
      question: {
        kind: 'term',
        prompt: 'Welche Zahl steht nach dem Zusammenfassen links vor $x$? Die Gleichung ist $eq: 4(x - 1) + x = 5x + 2$.',
        answer: '5',
        form: { kind: 'expanded' },
        variables: ['x'],
        explanation:
          'Es ist $4(x-1)+x = 5x-4$. Rechts steht auch $5x$, also fällt $x$ weg, und es bleibt $eq: -4 = 2$. Die Lösungsmenge ist $eq: L = { }$.',
      },
    },
    {
      id: 'genau-eine',
      title: 'Kein Sonderfall',
      body: [
        'Auch wenn auf beiden Seiten dieselbe Zahl steht, gibt es meistens genau eine Lösung. Ein Sonderfall liegt nur vor, wenn $x$ ganz wegfällt.',
        'Achtung: Die Lösung kann $0$ sein. Dann ist die Lösungsmenge nicht leer, sie enthält die Zahl $0$.',
      ],
      widget: {
        kind: 'equation-steps',
        start: '3x + 4 = x + 4',
        steps: [
          { operation: '| - x', equation: '2x + 4 = 4', note: '$x$-Terme nach links' },
          { operation: '| - 4', equation: '2x = 0', note: 'Zahlen nach rechts' },
          { operation: '| : 2', equation: 'x = 0', note: 'durch $2$ teilen' },
        ],
        solution: 'L = {0}',
      },
      question: {
        kind: 'choice',
        prompt: 'Welche Lösungsmenge hat $eq: 6x - 1 = 2x - 1$?',
        options: [
          { text: '$eq: L = {0}$', correct: true },
          { text: '$eq: L = { }$', feedback: 'Die Lösung ist $0$, und $0$ ist eine Zahl. Probe: $6·0-1 = -1 = 2·0-1$.' },
          { text: '$eq: L = ℚ$', feedback: 'Probe mit $1$: Links steht $5$, rechts $1$.' },
        ],
        explanation: 'Mit $eq: | - 2x$ und $eq: | + 1$ wird daraus $eq: 4x = 0$, also $eq: x = 0$.',
      },
    },
    {
      id: 'typische-fehler',
      title: 'Typische Fehler',
      body: [
        '$eq: L = { }$ und $eq: L = {0}$ sind verschieden: Die erste Menge ist leer, die zweite enthält die Zahl $0$.',
        '$eq: L = ℚ$ heißt nicht „keine Ahnung“, sondern: Jede rationale Zahl ist eine Lösung.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Nach dem Umformen steht $eq: 0 = 0$ da. Welche Lösungsmenge schreibst du?',
        options: [
          { text: '$eq: L = ℚ$', correct: true },
          { text: '$eq: L = {0}$', feedback: 'Die Aussage ist für jede Zahl wahr, nicht nur für $0$.' },
          { text: '$eq: L = { }$', feedback: 'Die Aussage $eq: 0 = 0$ ist wahr, also gibt es Lösungen.' },
        ],
        explanation: 'Die Aussage $eq: 0 = 0$ ist wahr. Jede Zahl erfüllt die Gleichung.',
      },
    },
  ],
  examples: [
    {
      title: 'Keine Lösung',
      task: buildEquationTask(TOPIC, parse('2(x + 3)'), parse('2x + 1')),
    },
    {
      title: 'Unendlich viele Lösungen',
      task: buildEquationTask(TOPIC, parse('4x - (x - 5)'), parse('3x + 5')),
    },
    {
      title: 'Kein Sonderfall: die Lösung 0',
      task: buildEquationTask(TOPIC, parse('5x + 3'), parse('2x + 3')),
      comment: 'Probe: $5·0+3 = 3 = 2·0+3$.',
    },
  ],
  formulaIds: ['solution-single', 'solution-empty', 'solution-all'],
}
