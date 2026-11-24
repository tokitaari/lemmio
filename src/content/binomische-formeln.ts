import { buildBinomialTask } from '../math'
import { poly } from './poly'
import type { SubtopicContent } from './types'

/** Subtopic 2: the three binomial formulas. */
export const binomischeFormeln: SubtopicContent = {
  cards: [
    {
      id: 'quadrat-einer-summe',
      title: 'Das Quadrat einer Summe',
      body: [
        'Manche Produkte kommen so oft vor, dass es für sie eigene Formeln gibt: die drei binomischen Formeln. Mit ihnen geht das Ausmultiplizieren schneller als mit „jeder mit jedem“.',
        'Schreib das Quadrat als Produkt und multipliziere aus: $(a+b)^2 = (a+b)(a+b)$.',
      ],
      widget: {
        kind: 'term-steps',
        label: 'Herleitung',
        start: '(a+b)^2',
        steps: [
          { term: '(a+b)(a+b)', note: 'Quadrat als Produkt schreiben' },
          { term: 'a^2+ab+ab+b^2', note: 'Jeder mit jedem' },
          { term: 'a^2+2ab+b^2', note: 'Gleichartige Terme zusammenfassen' },
        ],
      },
      question: {
        kind: 'choice',
        prompt: 'Woher kommt das $2ab$ in der Formel?',
        options: [
          { text: 'Das Produkt $ab$ entsteht zweimal.', correct: true },
          { text: 'Es wird $a$ mit $2$ und $b$ multipliziert.', feedback: 'Die 2 steht nicht in der Klammer. Sie entsteht beim Zusammenfassen.' },
          { text: 'Es ist eine Regel, die man sich merken muss.', feedback: 'Man kann sie herleiten, wie in der Rechnung oben.' },
        ],
        explanation: 'Beim Ausmultiplizieren entstehen $ab$ und $ba$. Beide sind gleich, also $ab+ab = 2ab$.',
      },
    },
    {
      id: 'erste-formel',
      title: 'Die 1. binomische Formel',
      body: [
        '1. binomische Formel: $(a+b)^2 = a^2+2ab+b^2$.',
        'Als Fläche: Ein Quadrat mit der Seite $a+b$ besteht aus dem Quadrat $a^2$, dem Quadrat $b^2$ und zwei gleichen Rechtecken $ab$.',
      ],
      widget: {
        kind: 'area-model',
        first: ['a', 'b'],
        second: ['a', 'b'],
        mode: 'expand',
        lengths: { a: { value: 5 }, b: { value: 2 } },
        label: '1. binomische Formel als Fläche',
      },
      question: {
        kind: 'choice',
        prompt: 'Welche Teilfläche kommt zweimal vor?',
        options: [
          { text: '$a^2$', feedback: 'Das große Quadrat $a^2$ gibt es nur einmal.' },
          { text: '$ab$', correct: true },
          { text: '$b^2$', feedback: 'Das kleine Quadrat $b^2$ gibt es nur einmal.' },
        ],
        explanation: 'Die beiden Rechtecke $ab$ ergeben zusammen $2ab$.',
      },
    },
    {
      id: 'zweite-formel',
      title: 'Die 2. binomische Formel',
      body: [
        '2. binomische Formel: $(a-b)^2 = a^2-2ab+b^2$.',
        'Hier ist $-b$ ein Streifen, der am Rand abgeschnitten wird. Das Quadrat $a^2$ verliert zwei Streifen $ab$, aber die Ecke $b^2$ wurde dabei zweimal abgezogen und kommt einmal zurück.',
      ],
      widget: {
        kind: 'area-model',
        first: ['a', '-b'],
        second: ['a', '-b'],
        mode: 'expand',
        lengths: { a: { value: 6 }, b: { value: 2 } },
        label: '2. binomische Formel als Fläche',
      },
      question: {
        kind: 'choice',
        prompt: 'Welches Vorzeichen hat $b^2$ in $(a-b)^2$?',
        options: [
          { text: 'Plus', correct: true },
          { text: 'Minus', feedback: 'Zwei Minuszeichen ergeben Plus: $(-b)·(-b) = b^2$.' },
        ],
        explanation: 'Nur das mittlere Glied ist negativ. $b^2$ ist immer positiv: $(x-3)^2 = x^2-6x+9$.',
      },
    },
    {
      id: 'ziehen-und-pruefen',
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
        label: 'Zahlenprobe zur 2. binomischen Formel',
      },
    },
    {
      id: 'dritte-formel',
      title: 'Die 3. binomische Formel',
      body: [
        '3. binomische Formel: $(a+b)(a-b) = a^2-b^2$.',
        'Bei $(a+b)(a-b)$ heben sich die gemischten Produkte $ab$ und $-ab$ gegenseitig auf. Deshalb bleiben nur zwei Quadrate übrig, zum Beispiel $(x+5)(x-5) = x^2-25$.',
      ],
      widget: {
        kind: 'area-model',
        first: ['a', 'b'],
        second: ['a', '-b'],
        mode: 'expand',
        lengths: { a: { value: 5 }, b: { value: 2 } },
        label: '3. binomische Formel als Fläche',
      },
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
      id: 'formel-anwenden',
      title: 'Formel anwenden',
      body: [
        'Überlege zuerst, welche Formel passt und was in der Formel für $a$ und was für $b$ steht. In $(3x-2)^2$ steht $3x$ für $a$ und $2$ für $b$; es passt die 2. binomische Formel.',
        'Setze dann ein und rechne Potenzen und Produkte aus. Steht vor der Variable eine Zahl, wird beides quadriert: $(3x)^2 = 9x^2$.',
      ],
      widget: {
        kind: 'term-steps',
        label: 'Lösungsweg',
        start: '(3x-2)^2',
        steps: [
          { term: '(3x)^2 - 2·3x·2 + 2^2', note: 'In die 2. Formel einsetzen' },
          { term: '9x^2 - 12x + 4', note: 'Potenzen und Produkte ausrechnen' },
        ],
      },
      question: {
        kind: 'term',
        prompt: 'Multipliziere mit einer binomischen Formel aus:',
        term: '(x+6)^2',
        answer: 'x^2+12x+36',
        form: { kind: 'expanded' },
        explanation: 'Mit $x$ für $a$ und $6$ für $b$: $(x+6)^2 = x^2+12x+36$, denn $2·x·6 = 12x$.',
      },
    },
    {
      id: 'welche-formel',
      title: 'Welche Formel passt?',
      body: ['Erkenne an der Form des Produkts, welche der drei Formeln passt: Quadrat einer Summe, Quadrat einer Differenz oder Summe mal Differenz.'],
      question: {
        kind: 'choice',
        prompt: 'Welche Formel gehört zu $(x+5)(x-5)$?',
        options: [
          { text: '1. binomische Formel', feedback: 'Die 1. Formel gilt für ein Quadrat wie $(x+5)^2$.' },
          { text: '2. binomische Formel', feedback: 'Die 2. Formel gilt für ein Quadrat wie $(x-5)^2$.' },
          { text: '3. binomische Formel', correct: true },
        ],
        explanation: 'Eine Klammer mit Plus mal dieselbe Klammer mit Minus: $(x+5)(x-5) = x^2-25$.',
      },
    },
    {
      id: 'typische-fehler',
      title: 'Typische Fehler',
      body: [
        'Das mittlere Glied nicht vergessen: $(a+b)^2 ≠ a^2+b^2$.',
        'Bei der 2. binomischen Formel ist nur das mittlere Glied negativ; $b^2$ ist immer positiv.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Was ergibt $(x+3)^2$?',
        options: [
          { text: '$x^2+9$', feedback: 'Das mittlere Glied fehlt: $2·x·3 = 6x$.' },
          { text: '$x^2+6x+9$', correct: true },
          { text: '$x^2+3x+9$', feedback: 'Das mittlere Glied ist $2ab$, also $2·x·3 = 6x$.' },
        ],
        explanation: 'Mit $x$ für $a$ und $3$ für $b$ gilt $(x+3)^2 = x^2+6x+9$.',
      },
    },
    {
      id: 'jetzt-du',
      title: 'Jetzt du',
      body: ['Hier steht ein Koeffizient vor der Variable und ein Minus in der Klammer. Achte auf beides.'],
      question: {
        kind: 'term',
        prompt: 'Multipliziere mit einer binomischen Formel aus:',
        term: '(2x-5)^2',
        answer: '4x^2-20x+25',
        form: { kind: 'expanded' },
        explanation: 'Es ist die 2. Formel mit $2x$ für $a$ und $5$ für $b$: $(2x)^2 = 4x^2$, $2·2x·5 = 20x$, $5^2 = 25$.',
      },
    },
  ],
  examples: [
    {
      title: '1. binomische Formel',
      task: buildBinomialTask('plus', { a: poly('x'), b: poly('4') }),
    },
    {
      title: '2. binomische Formel mit Koeffizient',
      task: buildBinomialTask('minus', { a: poly('3x'), b: poly('2') }),
      comment: 'Hier steht $3x$ für $a$. Deshalb wird die ganze Klammer quadriert: $(3x)^2 = 9x^2$.',
    },
    {
      title: '3. binomische Formel',
      task: buildBinomialTask('conjugate', { a: poly('x'), b: poly('5') }),
    },
  ],
  formulaIds: ['binomial-1', 'binomial-2', 'binomial-3', 'square-product'],
}
