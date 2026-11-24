import { buildBinomialFactorTask, buildCommonFactorTask, buildCommonThenBinomialTask } from '../math'
import { poly } from './poly'
import type { SubtopicContent } from './types'

/** Subtopic 3: factoring by taking out a common factor and with binomial formulas backwards. */
export const faktorisieren: SubtopicContent = {
  cards: [
    {
      id: 'umkehrung',
      title: 'Rückwärts rechnen',
      body: [
        'Faktorisieren ist die Umkehrung des Ausmultiplizierens: Aus einer Summe wird ein Produkt, zum Beispiel $x^2+6x+9 = (x+3)^2$.',
        'Produkte brauchst du später oft, etwa beim Lösen von Gleichungen oder beim Kürzen.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Welcher Term ist ein Produkt, also faktorisiert?',
        options: [
          { text: '$x^2+6x+9$', feedback: 'Das ist eine Summe von drei Summanden.' },
          { text: '$(x+3)^2$', correct: true },
          { text: '$x^2+3x+3x+9$', feedback: 'Das ist ebenfalls eine Summe, nur anders aufgeschrieben.' },
        ],
        explanation: 'Faktorisiert heißt: Der Term besteht aus Faktoren, hier $(x+3)(x+3)$.',
      },
    },
    {
      id: 'ausklammern',
      title: 'Ausklammern',
      body: [
        'Suche den größten Faktor, der in allen Summanden steckt, aus Zahl und Variable. In $6x^2+9x$ steckt in beiden Summanden die Zahl $3$ und die Variable $x$, zusammen also $3x$.',
        'Als Fläche: Die Teilflächen sind gegeben, der gemeinsame Faktor ist die eine Seite des Rechtecks. Decke die Seiten auf.',
      ],
      widget: { kind: 'area-model', first: ['3x'], second: ['2x', '3'], mode: 'factor', label: 'Ausklammern als Fläche' },
      question: {
        kind: 'term',
        prompt: 'Klammere den größten gemeinsamen Faktor aus:',
        term: '4x^2+10x',
        answer: '2x(2x+5)',
        form: { kind: 'factored', sumFactors: 1 },
        explanation: 'Beide Summanden enthalten $2x$: $4x^2+10x = 2x(2x+5)$.',
      },
    },
    {
      id: 'gemeinsamer-faktor',
      title: 'Den größten Faktor finden',
      body: [
        'Schreib den gemeinsamen Faktor vor die Klammer. In die Klammer kommt, was übrig bleibt, wenn du jeden Summanden durch den Faktor teilst: $6x^2+9x = 3x(2x+3)$.',
        'Achte darauf, den größten Faktor zu nehmen. Bei einem kleineren bleibt in der Klammer noch ein gemeinsamer Faktor stehen.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Welcher Faktor ist der größte, den du aus $12x^2+8x$ ausklammern kannst?',
        options: [
          { text: '$2x$', feedback: 'Das geht, ist aber nicht der größte: Auch $4$ steckt in beiden Summanden.' },
          { text: '$4x$', correct: true },
          { text: '$12x$', feedback: 'Die Zahl $12$ steckt nicht in $8x$.' },
        ],
        explanation: 'Der größte gemeinsame Teiler von $12$ und $8$ ist $4$, dazu kommt $x$: $12x^2+8x = 4x(3x+2)$.',
      },
    },
    {
      id: 'binomisch-rueckwaerts',
      title: 'Binomische Formeln rückwärts',
      body: [
        'Hat der Term drei Summanden und sind zwei davon Quadrate, prüfe die 1. oder 2. binomische Formel. In $x^2+6x+9$ sind $x^2$ und $9$ die Quadrate von $x$ und $3$.',
        'Das mittlere Glied muss passen: $2·x·3 = 6x$. Dann ist $x^2+6x+9 = (x+3)^2$. Im Rechteck sind beide Seiten gleich lang.',
      ],
      widget: { kind: 'area-model', first: ['x', '3'], second: ['x', '3'], mode: 'factor', label: 'Binomische Formel rückwärts als Fläche' },
      question: {
        kind: 'term',
        prompt: 'Schreibe als Produkt:',
        term: 'x^2+10x+25',
        answer: '(x+5)^2',
        form: { kind: 'factored', sumFactors: 2 },
        explanation: 'Die Quadrate sind $x^2$ und $25 = 5^2$, das mittlere Glied $2·x·5 = 10x$ passt: $x^2+10x+25 = (x+5)^2$.',
      },
    },
    {
      id: 'mit-minus',
      title: 'Mit Minus: die 2. Formel',
      body: [
        'Ist das mittlere Glied negativ, ist es die 2. binomische Formel. In $x^2-10x+25$ sind $x^2$ und $25$ wieder Quadrate, und es passt $2·x·5 = 10x$. Wegen des Minuszeichens gilt $x^2-10x+25 = (x-5)^2$.',
        'Die Quadrate selbst sind immer positiv. Steht ein Minus zwischen zwei Quadraten, ist es die 3. Formel, die auf der nächsten Karte kommt.',
      ],
      widget: {
        kind: 'term-steps',
        label: 'Lösungsweg',
        start: 'x^2-10x+25',
        steps: [
          { term: 'x^2-2·x·5+5^2', note: 'Quadrate und mittleres Glied erkennen' },
          { term: '(x-5)^2', note: 'Als Produkt schreiben' },
        ],
      },
      question: {
        kind: 'term',
        prompt: 'Schreibe als Produkt:',
        term: 'x^2-8x+16',
        answer: '(x-4)^2',
        form: { kind: 'factored', sumFactors: 2 },
        explanation: 'Die Quadrate sind $x^2$ und $16 = 4^2$, das mittlere Glied $2·x·4 = 8x$ ist negativ: $x^2-8x+16 = (x-4)^2$.',
      },
    },
    {
      id: 'dritte-formel-rueckwaerts',
      title: 'Differenz von zwei Quadraten',
      body: [
        'Ist der Term eine Differenz von zwei Quadraten, hilft die 3. Formel: $4x^2-9 = (2x+3)(2x-3)$.',
        'Eine Summe von zwei Quadraten wie $x^2+9$ lässt sich so nicht zerlegen, nur eine Differenz wie $x^2-9$.',
      ],
      widget: {
        kind: 'term-steps',
        label: 'Lösungsweg',
        start: '4x^2-9',
        steps: [
          { term: '(2x)^2-3^2', note: 'Beide Terme als Quadrate schreiben' },
          { term: '(2x+3)(2x-3)', note: 'Summe mal Differenz' },
        ],
      },
      question: {
        kind: 'term',
        prompt: 'Schreibe als Produkt:',
        term: 'x^2-49',
        answer: '(x+7)(x-7)',
        form: { kind: 'factored', sumFactors: 2 },
        explanation: '$49 = 7^2$, also $x^2-49 = (x+7)(x-7)$. Die Reihenfolge der Klammern ist egal.',
      },
    },
    {
      id: 'reihenfolge',
      title: 'So gehst du vor',
      body: [
        'Faktorisiere immer so weit wie möglich. Diese Reihenfolge hilft:',
        '1. Zuerst den größten gemeinsamen Faktor ausklammern, falls es einen gibt. 2. Dann prüfen, ob in der Klammer eine binomische Formel steckt. 3. Zur Kontrolle ausmultiplizieren: Es muss wieder der Ausgangsterm herauskommen.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Was machst du bei $2x^2+12x+18$ zuerst?',
        options: [
          { text: 'Den Faktor $2$ ausklammern', correct: true },
          { text: 'Gleich eine binomische Formel anwenden', feedback: 'Das passt noch nicht: $2x^2$ ist kein Quadrat eines Terms mit ganzer Zahl. Erst nach dem Ausklammern.' },
          { text: 'Ausmultiplizieren', feedback: 'Das ist die Kontrolle am Schluss, nicht der erste Schritt.' },
        ],
        explanation: 'Alle drei Summanden sind durch $2$ teilbar: $2x^2+12x+18 = 2(x^2+6x+9)$.',
      },
    },
    {
      id: 'vollstaendig',
      title: 'Vollständig faktorisieren',
      body: [
        'Nach dem Ausklammern ist oft noch nicht Schluss: $2x^2+12x+18 = 2(x^2+6x+9)$ stimmt, ist aber noch nicht fertig. In der Klammer steckt noch $(x+3)^2$.',
        'Das vollständige Ergebnis ist $2(x+3)^2$. Zur Kontrolle: $2(x+3)^2 = 2(x^2+6x+9) = 2x^2+12x+18$.',
      ],
      widget: {
        kind: 'term-steps',
        label: 'Lösungsweg',
        start: '2x^2+12x+18',
        steps: [
          { term: '2(x^2+6x+9)', note: 'Gemeinsamen Faktor 2 ausklammern' },
          { term: '2(x+3)^2', note: 'Binomische Formel rückwärts' },
        ],
      },
      question: {
        kind: 'term',
        prompt: 'Faktorisiere so weit wie möglich:',
        term: '3x^2+6x+3',
        answer: '3(x+1)^2',
        form: { kind: 'factored', sumFactors: 2 },
        explanation: 'Zuerst $3$ ausklammern: $3x^2+6x+3 = 3(x^2+2x+1)$. In der Klammer steckt $(x+1)^2$.',
      },
    },
  ],
  examples: [
    {
      title: 'Ausklammern',
      task: buildCommonFactorTask(poly('3x'), poly('2x+3')),
    },
    {
      title: '2. binomische Formel rückwärts',
      task: buildBinomialFactorTask('minus', { a: poly('x'), b: poly('5') }),
    },
    {
      title: '3. binomische Formel rückwärts',
      task: buildBinomialFactorTask('conjugate', { a: poly('2x'), b: poly('3') }),
      comment: 'Die Reihenfolge der Klammern ist egal: $(2x-3)(2x+3)$ ist genauso richtig.',
    },
    {
      title: 'Erst ausklammern, dann binomische Formel',
      task: buildCommonThenBinomialTask(2, 'plus', { a: poly('x'), b: poly('3') }),
      comment: 'Zur Kontrolle: $2(x+3)^2 = 2(x^2+6x+9) = 2x^2+12x+18$.',
    },
  ],
  formulaIds: ['common-factor', 'binomial-1-backwards', 'binomial-2-backwards', 'binomial-3-backwards'],
}
