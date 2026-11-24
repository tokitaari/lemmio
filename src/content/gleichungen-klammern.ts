import { buildEquationTask, parse } from '../math'
import type { SubtopicContent } from './types'

const TOPIC = 'algebra/lineare-gleichungen/klammern'

/** Linear equations 2: brackets are removed first ("Term umformen"), then the equation is solved as usual. */
export const gleichungenKlammern: SubtopicContent = {
  cards: [
    {
      id: 'worum-geht-es',
      title: 'Klammern in Gleichungen',
      body: [
        'In manchen Gleichungen stehen Klammern, zum Beispiel $eq: 3(x + 2) = 2x + 10$. Löse zuerst die Klammern auf, dann geht es weiter wie gewohnt.',
        'Wie das Auflösen geht, kennst du vom Ausmultiplizieren: Die Zahl vor der Klammer wird mit jedem Summanden multipliziert.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Was ergibt $3(x+2)$ ohne Klammer?',
        options: [
          { text: '$3x+2$', feedback: 'Die $3$ wird mit jedem Summanden der Klammer multipliziert, auch mit $2$.' },
          { text: '$3x+6$', correct: true },
          { text: '$x+6$', feedback: 'Auch $x$ wird mit $3$ multipliziert.' },
        ],
        explanation: 'Es ist $3(x+2) = 3x+6$.',
      },
    },
    {
      id: 'aufloesen',
      title: 'Erst auflösen, dann umformen',
      body: [
        'Das Auflösen der Klammern verändert jede Seite nur für sich: Der Wert bleibt gleich, nur die Schreibweise ändert sich. Diesen Schritt kennzeichnest du mit „Term umformen“.',
        'Danach bringst du wie gewohnt die $x$-Terme nach links und die Zahlen nach rechts.',
      ],
      widget: {
        kind: 'equation-steps',
        start: '3(x + 2) = 2x + 10',
        steps: [
          { operation: 'T', equation: '3x + 6 = 2x + 10', note: 'Klammer auflösen' },
          { operation: '| - 2x', equation: 'x + 6 = 10', note: '$x$-Terme nach links' },
          { operation: '| - 6', equation: 'x = 4', note: 'Zahlen nach rechts' },
        ],
        solution: 'L = {4}',
      },
      question: {
        kind: 'term',
        prompt: 'Was steht bei $eq: 4(x - 3) = 2x$ nach „Term umformen“ auf der linken Seite?',
        answer: '4x - 12',
        form: { kind: 'expanded' },
        explanation: 'Es ist $4(x-3) = 4x-12$.',
      },
    },
    {
      id: 'minusklammer',
      title: 'Minus vor der Klammer',
      body: [
        'Steht ein Minus vor der Klammer, dreht sich beim Auflösen jedes Vorzeichen in der Klammer um: $-(x-4) = -x+4$.',
        'Danach fasst du zusammen, auch das ist „Term umformen“.',
      ],
      widget: {
        kind: 'equation-steps',
        start: '5x - (2x - 4) = 13',
        steps: [
          { operation: 'T', equation: '5x - 2x + 4 = 13', note: 'Minusklammer auflösen' },
          { operation: 'T', equation: '3x + 4 = 13', note: 'zusammenfassen' },
          { operation: '| - 4', equation: '3x = 9', note: 'Zahlen nach rechts' },
          { operation: '| : 3', equation: 'x = 3', note: 'durch $3$ teilen' },
        ],
        solution: 'L = {3}',
      },
      question: {
        kind: 'choice',
        prompt: 'Was ergibt $-(3x-5)$ ohne Klammer?',
        options: [
          { text: '$-3x-5$', feedback: 'Auch das Vorzeichen von $5$ dreht sich um.' },
          { text: '$-3x+5$', correct: true },
          { text: '$3x+5$', feedback: 'Das Minus vor der Klammer gilt auch für $3x$.' },
        ],
        explanation: 'Jedes Vorzeichen in der Klammer dreht sich um: $-(3x-5) = -3x+5$.',
      },
    },
    {
      id: 'negative-zahl-vor-klammer',
      title: 'Eine negative Zahl vor der Klammer',
      body: [
        'Bei $-3(x-2)$ wird $-3$ mit jedem Summanden multipliziert: $-3(x-2) = -3x+6$. Minus mal Minus ergibt Plus, deshalb steht vor $6$ ein Plus.',
      ],
      widget: {
        kind: 'equation-steps',
        start: '-3(x - 2) = 2x - 4',
        steps: [
          { operation: 'T', equation: '-3x + 6 = 2x - 4', note: 'Klammer auflösen' },
          { operation: '| - 2x', equation: '-5x + 6 = -4', note: '$x$-Terme nach links' },
          { operation: '| - 6', equation: '-5x = -10', note: 'Zahlen nach rechts' },
          { operation: '| : (-5)', equation: 'x = 2', note: 'durch $-5$ teilen' },
        ],
        solution: 'L = {2}',
      },
      question: {
        kind: 'term',
        prompt: 'Löse die Klammer auf:',
        term: '-2(x-5)',
        answer: '-2x+10',
        form: { kind: 'expanded' },
        explanation: 'Es ist $-2(x-5) = -2x+10$, denn $(-2)·(-5) = 10$.',
      },
    },
    {
      id: 'klammern-auf-beiden-seiten',
      title: 'Klammern auf beiden Seiten',
      body: [
        'Stehen auf beiden Seiten Klammern, löst du alle in einem Schritt „Term umformen“ auf.',
      ],
      widget: {
        kind: 'equation-steps',
        start: '2(3x - 1) = 4(x + 2)',
        steps: [
          { operation: 'T', equation: '6x - 2 = 4x + 8', note: 'beide Klammern auflösen' },
          { operation: '| - 4x', equation: '2x - 2 = 8', note: '$x$-Terme nach links' },
          { operation: '| + 2', equation: '2x = 10', note: 'Zahlen nach rechts' },
          { operation: '| : 2', equation: 'x = 5', note: 'durch $2$ teilen' },
        ],
        solution: 'L = {5}',
      },
      question: {
        kind: 'choice',
        prompt: 'Welche Zeile entsteht aus $eq: 2(3x - 1) = 4(x + 2)$ mit „Term umformen“?',
        options: [
          { text: '$eq: 6x - 2 = 4x + 8$', correct: true },
          { text: '$eq: 6x - 1 = 4x + 2$', feedback: 'Die Zahl vor der Klammer wird mit jedem Summanden multipliziert, nicht nur mit dem ersten.' },
          { text: '$eq: 5x - 1 = 5x + 2$', feedback: 'Hier wurde addiert statt multipliziert.' },
        ],
        explanation: 'Es ist $2(3x-1) = 6x-2$ und $4(x+2) = 4x+8$.',
      },
    },
    {
      id: 'waage-nach-dem-aufloesen',
      title: 'Nach dem Auflösen auf die Waage',
      body: [
        'Aus $eq: 2(x + 1) = x + 5$ wird nach dem Auflösen $eq: 2x + 2 = x + 5$. Diese Gleichung kannst du auf die Waage legen.',
        'Die Waage zeigt nur Kästchen und Gewichte, keine Klammern. Deshalb löst du die Klammern immer zuerst auf.',
      ],
      widget: {
        kind: 'balance',
        equation: '2x + 2 = x + 5',
        mode: 'steps',
        steps: ['| - x', '| - 2'],
        label: 'Umformungen auf der Waage',
      },
      question: {
        kind: 'term',
        prompt: 'Wie viel wiegt ein Kästchen, welche Zahl ist also $x$?',
        answer: '3',
        form: { kind: 'expanded' },
        variables: ['x'],
        explanation: 'Am Ende liegt links ein Kästchen, rechts liegen $3$ Gewichte. Probe: $2·(3+1) = 8 = 3+5$.',
      },
    },
    {
      id: 'typische-fehler',
      title: 'Typische Fehler',
      body: [
        'Nur den ersten Summanden multiplizieren: $3(x+4) ≠ 3x+4$, richtig ist $3(x+4) = 3x+12$.',
        'Die Minusklammer nur halb auflösen: $-(x+2) ≠ -x+2$, richtig ist $-(x+2) = -x-2$.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Aus $eq: 2(x + 3) = 10$ wird $eq: 2x + 3 = 10$. Was ist passiert?',
        options: [
          { text: 'Die $3$ wurde nicht mit $2$ multipliziert. Richtig ist $eq: 2x + 6 = 10$.', correct: true },
          { text: 'Es fehlt die Umformung $eq: | - 3$.', feedback: 'Zuerst muss die Klammer richtig aufgelöst werden.' },
          { text: 'Nichts, die Zeile stimmt.', feedback: 'Die $2$ vor der Klammer gilt für beide Summanden.' },
        ],
        explanation: 'Es ist $2(x+3) = 2x+6$. Danach $eq: | - 6$ und $eq: | : 2$, also $eq: x = 2$.',
      },
    },
  ],
  examples: [
    {
      title: 'Eine Klammer',
      task: buildEquationTask(TOPIC, parse('4(x - 2)'), parse('2x + 6')),
      comment: 'Probe: $4·(7-2) = 20 = 2·7+6$.',
    },
    {
      title: 'Minusklammer und Klammer rechts',
      task: buildEquationTask(TOPIC, parse('5 - (x + 1)'), parse('2(x - 7)')),
      comment: 'Probe: $5-(6+1) = -2 = 2·(6-7)$.',
    },
  ],
  formulaIds: ['distributive', 'number-times-difference', 'minus-before-sum', 'minus-before-difference'],
}
