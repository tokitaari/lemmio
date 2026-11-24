import { buildExpandTask } from '../math'
import { poly } from './poly'
import type { SubtopicContent } from './types'

/** Subtopic 1: multiplying out a product of two sums. */
export const ausmultiplizieren: SubtopicContent = {
  cards: [
    {
      id: 'worum-geht-es',
      title: 'Worum geht es?',
      body: [
        'Steht ein Produkt aus zwei Klammern da, zum Beispiel $(x+3)(x-5)$, kannst du es in eine Summe ohne Klammern umwandeln. Das nennt man Ausmultiplizieren.',
        'Danach lässt sich der Term meistens noch vereinfachen. Wie das geht, siehst du auf den nächsten Karten.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Welcher Term ist schon ausmultipliziert?',
        options: [
          { text: '$(x+3)(x-5)$', feedback: 'Hier stehen noch zwei Klammern, das ist das Produkt, das wir umwandeln wollen.' },
          { text: '$x^2-2x-15$', correct: true },
          { text: '$3(x-5)$', feedback: 'Auch hier steht noch eine Klammer.' },
        ],
        explanation: 'Ausmultipliziert heißt: keine Klammern mehr, nur noch eine Summe. Es gilt $(x+3)(x-5) = x^2-2x-15$.',
      },
    },
    {
      id: 'als-flaeche',
      title: 'Ein Produkt als Fläche',
      body: [
        'Ein Produkt aus zwei Klammern ist die Fläche eines Rechtecks: Die Summanden teilen die Seiten auf, jede Teilfläche ist ein Produkt.',
        'Ein negativer Summand ist ein Streifen, der am Ende der Seite abgeschnitten wird. Decke die Teilflächen nacheinander auf und fasse dann zusammen.',
      ],
      widget: { kind: 'area-model', first: ['x', '3'], second: ['x', '-5'], mode: 'expand', label: 'Ausmultiplizieren als Fläche' },
    },
    {
      id: 'jeder-mit-jedem',
      title: 'Jeder mit jedem',
      body: [
        'Multipliziere jeden Summanden der ersten Klammer mit jedem Summanden der zweiten Klammer und addiere alle Produkte: $(a+b)(c+d) = ac+ad+bc+bd$.',
        'Das sind genau die Teilflächen des Rechtecks. Steht nur eine Zahl oder Variable vor der Klammer, sind es zwei Produkte: $a(b+c) = ab+ac$.',
      ],
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
        prompt: 'Wie viele Produkte entstehen beim Ausmultiplizieren von $(x+2)(x+3y+1)$?',
        options: [
          { text: '5', feedback: 'Das wäre $2+3$. Jeder Summand links wird aber mit jedem Summanden rechts multipliziert.' },
          { text: '6', correct: true },
          { text: '3', feedback: 'So viele Summanden hat die zweite Klammer. Auch $x$ und $2$ der ersten Klammer sind beteiligt.' },
        ],
        explanation: 'Zwei Summanden mal drei Summanden ergibt $2·3 = 6$ Produkte.',
      },
    },
    {
      id: 'vorzeichen',
      title: 'Vorzeichen gehören dazu',
      body: [
        'Das Rechenzeichen vor einem Summanden gehört zu ihm. In $(x+3)(x-5)$ ist der zweite Summand der zweiten Klammer also $-5$.',
        'Plus mal Minus ergibt Minus, Minus mal Minus ergibt Plus: $3·(-5) = -15$ und $(-2)·(-4) = 8$.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Was ergibt $3·(-5)$?',
        options: [
          { text: '$-15$', correct: true },
          { text: '$15$', feedback: 'Plus mal Minus ergibt Minus.' },
          { text: '$-2$', feedback: 'Hier wird multipliziert, nicht addiert.' },
        ],
        explanation: 'Plus mal Minus ergibt Minus: $3·(-5) = -15$.',
      },
    },
    {
      id: 'zusammenfassen',
      title: 'Zusammenfassen',
      body: [
        'Zum Schluss fasst du gleichartige Terme zusammen. Das sind Terme mit denselben Variablen und denselben Exponenten, zum Beispiel $-5x+3x = -2x$. Zahlen ohne Variable fasst du ebenfalls zusammen.',
        'Ordne das Ergebnis am besten nach fallenden Exponenten: zuerst $x^2$, dann $x$, dann die Zahl.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Welche beiden Terme sind gleichartig?',
        options: [
          { text: '$x^2$ und $x$', feedback: 'Die Exponenten sind verschieden, die Terme lassen sich nicht zusammenfassen.' },
          { text: '$-5x$ und $3x$', correct: true },
          { text: '$3x$ und $3$', feedback: 'Eine Zahl ohne Variable ist nicht gleichartig mit einem Term mit $x$.' },
        ],
        explanation: 'Beide haben die Variable $x$ mit dem Exponenten 1: $-5x+3x = -2x$.',
      },
    },
    {
      id: 'zwei-variablen',
      title: 'Zwei Variablen',
      body: [
        'Auch mit zwei Variablen gilt „jeder mit jedem“. Beim Multiplizieren ist die Reihenfolge egal, also ist $ba = ab$, und diese Teilflächen sind gleichartig.',
        'Decke die Teilflächen auf und achte darauf, welche zusammengefasst werden.',
      ],
      widget: { kind: 'area-model', first: ['2a', 'b'], second: ['a', '-3b'], mode: 'expand', label: 'Zwei Variablen' },
    },
    {
      id: 'jetzt-du',
      title: 'Jetzt du',
      body: ['Multipliziere selbst aus: vier Produkte, dann zusammenfassen.'],
      question: {
        kind: 'term',
        prompt: 'Multipliziere aus und fasse zusammen:',
        term: '(3x-2)(x-5)',
        answer: '3x^2-17x+10',
        form: { kind: 'expanded' },
        explanation: 'Die vier Produkte sind $3x^2$, $-15x$, $-2x$ und $10$; zusammengefasst $3x^2-17x+10$.',
      },
    },
    {
      id: 'typische-fehler',
      title: 'Typische Fehler',
      body: [
        'Kein Produkt vergessen: Bei zwei Klammern mit je zwei Summanden sind es immer vier Produkte.',
        'Gleiche Variablen multipliziert ergeben ein Quadrat: $x·x = x^2$, aber $x·x ≠ 2x$.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Was ergibt $x·x$?',
        options: [
          { text: '$2x$', feedback: 'Das wäre die Summe $x+x = 2x$. Beim Multiplizieren entsteht eine Potenz.' },
          { text: '$x^2$', correct: true },
          { text: '$x$', feedback: 'Zwei Faktoren $x$ ergeben mehr als ein einzelnes $x$.' },
        ],
        explanation: 'Gleiche Variablen werden zur Potenz: $x·x = x^2$.',
      },
    },
  ],
  examples: [
    {
      title: 'Zahlen mit Vorzeichen',
      task: buildExpandTask(poly('x+3'), poly('x-5')),
      comment: 'Die beiden mittleren Produkte $-5x$ und $3x$ sind gleichartig und werden zu $-2x$ zusammengefasst.',
    },
    {
      title: 'Zwei Variablen',
      task: buildExpandTask(poly('2a+b'), poly('a-3b')),
      comment: '$ab$ und $ba$ sind gleichartig, denn beim Multiplizieren ist die Reihenfolge egal: $ba = ab$.',
    },
  ],
  formulaIds: ['distributive', 'sum-times-sum', 'same-variable', 'sign-minus-plus', 'sign-minus-minus'],
}
