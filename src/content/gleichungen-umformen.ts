import { buildEquationTask, parse } from '../math'
import type { SubtopicContent } from './types'

const TOPIC = 'algebra/lineare-gleichungen/umformen'

/** Linear equations 1: equivalence transformations with x on both sides. */
export const gleichungenUmformen: SubtopicContent = {
  cards: [
    {
      id: 'worum-geht-es',
      title: 'Was ist eine Gleichung?',
      body: [
        'In einer Gleichung stehen zwei Terme mit einem Gleichheitszeichen dazwischen, zum Beispiel $eq: 3x + 2 = x + 8$. Gesucht sind alle Zahlen für $x$, die beide Seiten gleich groß machen.',
        'Setzt du $3$ für $x$ ein, ergeben beide Seiten $11$: $3·3+2 = 11 = 3+8$. Also ist $3$ eine Lösung.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Welche Zahl löst $eq: 2x + 1 = 7$?',
        options: [
          { text: '$2$', feedback: 'Probe: $2·2+1 = 5$, nicht $7$.' },
          { text: '$3$', correct: true },
          { text: '$4$', feedback: 'Probe: $2·4+1 = 9$, das ist zu viel.' },
        ],
        explanation: 'Probe mit $3$: $2·3+1 = 7$.',
      },
    },
    {
      id: 'waage',
      title: 'Eine Gleichung als Waage',
      body: [
        'Eine Gleichung ist wie eine Waage im Gleichgewicht: Links liegt $3x+2$, rechts $x+8$. Ein Kästchen wiegt $x$, ein kleines Gewicht $1$.',
        'Nimmst du auf beiden Seiten dasselbe weg, bleibt die Waage im Gleichgewicht. Spiel die Schritte durch, bis ein Kästchen allein liegt.',
      ],
      widget: {
        kind: 'balance',
        equation: '3x + 2 = x + 8',
        mode: 'steps',
        steps: ['| - x', '| - 2', '| : 2'],
        label: 'Umformungen auf der Waage',
      },
      question: {
        kind: 'choice',
        prompt: 'Was passiert, wenn du nur links ein Kästchen wegnimmst?',
        options: [
          { text: 'Die Waage bleibt im Gleichgewicht.', feedback: 'Rechts liegt dann mehr als links.' },
          { text: 'Die linke Seite geht nach oben.', correct: true },
          { text: 'Die linke Seite geht nach unten.', feedback: 'Nach unten geht die schwerere Seite. Links wird es leichter.' },
        ],
        explanation: 'Wer nur eine Seite verändert, zerstört das Gleichgewicht. Deshalb gilt: immer auf beiden Seiten dasselbe tun.',
      },
    },
    {
      id: 'beide-seiten',
      title: 'Auf beiden Seiten dasselbe',
      body: [
        'Du darfst auf beiden Seiten dieselbe Zahl oder denselben Term mit $x$ addieren oder subtrahieren. Die Umformung schreibst du hinter einem Strich rechts neben die Gleichung: $eq: 3x + 2 = x + 8 | - x$.',
        'Die Lösungen bleiben dabei dieselben. Solche Schritte heißen Äquivalenzumformungen. In der Animation siehst du erst die Umformung auf beiden Seiten, dann die zusammengefasste Zeile.',
      ],
      widget: {
        kind: 'equation-steps',
        start: '3x + 2 = x + 8',
        steps: [
          { operation: '| - x', equation: '2x + 2 = 8', note: '$x$ auf die linke Seite' },
          { operation: '| - 2', equation: '2x = 6', note: 'Zahlen auf die rechte Seite' },
          { operation: '| : 2', equation: 'x = 3', note: 'durch die Zahl vor $x$ teilen' },
        ],
        solution: 'L = {3}',
      },
      question: {
        kind: 'term',
        prompt: 'Bei $eq: 5x - 4 = 2x + 5$ subtrahierst du auf beiden Seiten $2x$. Was steht danach links? Fasse zusammen.',
        answer: '3x - 4',
        form: { kind: 'expanded' },
        explanation: 'Links wird $5x-4-2x = 3x-4$, rechts bleibt $5$.',
      },
    },
    {
      id: 'reihenfolge',
      title: 'Der übliche Weg',
      body: [
        'Bringe zuerst alle Terme mit $x$ auf eine Seite, dann alle Zahlen auf die andere. Zum Schluss teilst du durch die Zahl vor $x$.',
        'Steht am Ende $eq: x = 4$ da, liest du die Lösungsmenge ab: $eq: L = {4}$.',
      ],
      widget: {
        kind: 'equation-steps',
        start: '7x - 5 = 3x + 11',
        steps: [
          { operation: '| - 3x', equation: '4x - 5 = 11', note: '$x$-Terme nach links' },
          { operation: '| + 5', equation: '4x = 16', note: 'Zahlen nach rechts' },
          { operation: '| : 4', equation: 'x = 4', note: 'durch $4$ teilen' },
        ],
        solution: 'L = {4}',
      },
      question: {
        kind: 'choice',
        prompt: 'Welche Umformung bringt bei $eq: 4x - 5 = 11$ die $-5$ von der linken Seite weg?',
        options: [
          { text: '$eq: | + 5$', correct: true },
          { text: '$eq: | - 5$', feedback: 'Dann stünde links $4x-10$. Gegen $-5$ hilft $+5$.' },
          { text: '$eq: | : 4$', feedback: 'Das kommt erst danach. Zuerst muss die Zahl auf die andere Seite.' },
        ],
        explanation: 'Mit $eq: | + 5$ wird links $4x-5+5 = 4x$ und rechts $11+5 = 16$.',
      },
    },
    {
      id: 'negative-loesung',
      title: 'Auch negative Lösungen',
      body: [
        'Lösungen können negativ sein. Steht vor $x$ eine negative Zahl, teilst du durch diese negative Zahl.',
        'Bleibt am Ende $eq: -x = 3$ stehen, multiplizierst du mit $-1$: $eq: -x = 3 | · (-1)$ ergibt $eq: x = -3$.',
      ],
      widget: {
        kind: 'equation-steps',
        start: '2x + 9 = 5x + 15',
        steps: [
          { operation: '| - 5x', equation: '-3x + 9 = 15', note: '$x$-Terme nach links' },
          { operation: '| - 9', equation: '-3x = 6', note: 'Zahlen nach rechts' },
          { operation: '| : (-3)', equation: 'x = -2', note: 'durch $-3$ teilen' },
        ],
        solution: 'L = {-2}',
      },
      question: {
        kind: 'term',
        prompt: 'Welche Zahl ist die Lösung von $eq: -4x = 12$?',
        answer: '-3',
        form: { kind: 'expanded' },
        variables: ['x'],
        explanation: 'Teile durch $-4$. Probe: $(-4)·(-3) = 12$.',
      },
    },
    {
      id: 'x-rechts',
      title: 'Wenn x nur rechts steht',
      body: [
        'Steht $x$ nur auf der rechten Seite, tauschst du die Seiten: $eq: | ⇄$. Danach geht es weiter wie gewohnt.',
        'Beim Tauschen ändert sich nichts an den Termen, sie wechseln nur die Seite.',
      ],
      widget: {
        kind: 'equation-steps',
        start: '12 = 3x + 3',
        steps: [
          { operation: '⇄', equation: '3x + 3 = 12', note: 'Seiten tauschen' },
          { operation: '| - 3', equation: '3x = 9', note: 'Zahlen nach rechts' },
          { operation: '| : 3', equation: 'x = 3', note: 'durch $3$ teilen' },
        ],
        solution: 'L = {3}',
      },
      question: {
        kind: 'choice',
        prompt: 'Was ist bei $eq: 20 = 4x$ ein sinnvoller erster Schritt?',
        options: [
          { text: '$eq: | ⇄$', correct: true },
          { text: '$eq: | - 20$', feedback: 'Das ist erlaubt, macht die Gleichung aber nicht einfacher.' },
          { text: '$eq: | · 4$', feedback: 'Mal $4$ macht die Zahl vor $x$ noch größer.' },
        ],
        explanation: 'Nach dem Tauschen steht $eq: 4x = 20$ da, dann hilft $eq: | : 4$.',
      },
    },
    {
      id: 'selbst-umformen',
      title: 'Selbst umformen',
      body: [
        'Forme die Gleichung auf der Waage selbst um, bis ein Kästchen allein liegt. Probiere auch aus, was passiert, wenn du nur eine Seite veränderst.',
        'Mit der Tastatur: Mit Tab zur Auswahl, dort die Pfeiltasten, dann mit Tab zu den Umformungen.',
      ],
      widget: { kind: 'balance', equation: '2x + 1 = 7', mode: 'explore' },
      question: {
        kind: 'term',
        prompt: 'Wie viel wiegt ein Kästchen, welche Zahl ist also $x$?',
        answer: '3',
        form: { kind: 'expanded' },
        variables: ['x'],
        explanation: 'Mit $eq: | - 1$ und $eq: | : 2$ bleibt $eq: x = 3$. Probe: $2·3+1 = 7$.',
      },
    },
    {
      id: 'probe',
      title: 'Die Probe',
      body: [
        'Setze die Lösung in die Gleichung vom Anfang ein. Ergeben beide Seiten dasselbe, stimmt sie.',
        'Für $eq: 7x - 5 = 3x + 11$ mit $4$ für $x$: $7·4-5 = 23 = 3·4+11$.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Ist $2$ eine Lösung von $eq: 5x - 3 = 2x + 3$?',
        options: [
          { text: 'Ja', correct: true },
          { text: 'Nein', feedback: 'Rechne nach: $5·2-3 = 7$ und $2·2+3 = 7$.' },
        ],
        explanation: 'Beide Seiten ergeben $7$: $5·2-3 = 7 = 2·2+3$.',
      },
    },
    {
      id: 'typische-fehler',
      title: 'Typische Fehler',
      body: [
        'Das Vorzeichen gehört zum Term: In $eq: 5x - 3 = 2x$ steht links $-3$, also bringst du es mit $eq: | + 3$ weg.',
        'Eine Zahl vor $x$ ist ein Faktor, kein Summand: Aus $eq: 3x = 12$ wird mit $eq: | : 3$ die Zeile $eq: x = 4$. Abziehen hilft nicht, denn $3x-3 ≠ x$.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Bei $eq: 6x = 18$ rechnet jemand $eq: | - 6$ und schreibt $eq: x = 12$. Was ist falsch?',
        options: [
          { text: 'Die $6$ ist ein Faktor von $x$. Man muss durch $6$ teilen.', correct: true },
          { text: 'Es muss $eq: | + 6$ heißen.', feedback: 'Auch dann bliebe $6x$ stehen. $6$ ist ein Faktor, kein Summand.' },
          { text: 'Nichts, die Lösung ist $12$.', feedback: 'Probe: $6·12 = 72$, nicht $18$.' },
        ],
        explanation: 'Richtig ist $eq: | : 6$, also $eq: x = 3$. Probe: $6·3 = 18$.',
      },
    },
  ],
  examples: [
    {
      title: 'x auf beiden Seiten',
      task: buildEquationTask(TOPIC, parse('4x + 7'), parse('x + 19')),
      comment: 'Probe: $4·4+7 = 23 = 4+19$.',
    },
    {
      title: 'x nur rechts',
      task: buildEquationTask(TOPIC, parse('15'), parse('2x + 3')),
      comment: 'Probe: $2·6+3 = 15$.',
    },
    {
      title: 'Negative Lösung',
      task: buildEquationTask(TOPIC, parse('3x - 4'), parse('5x + 6')),
      comment: 'Probe: $3·(-5)-4 = -19 = 5·(-5)+6$.',
    },
  ],
  formulaIds: ['equation-add', 'equation-subtract', 'equation-multiply', 'equation-divide', 'equation-swap', 'solution-single'],
}
