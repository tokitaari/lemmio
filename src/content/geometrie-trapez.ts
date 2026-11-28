import { buildAreaTask, buildPerimeterTask, buildReverseTask } from '../math'
import { exampleTask } from './geometryExample'
import type { SubtopicContent } from './types'

/**
 * Geometry 4: the trapezoid. Doubled to a parallelogram with the base a + c
 * (A = (a + c) · h : 2), isosceles and general, the perimeter and a length
 * from the area.
 */
export const geometrieTrapez: SubtopicContent = {
  cards: [
    {
      id: 'was-ist-ein-trapez',
      title: 'Was ist ein Trapez?',
      body: [
        'Ein Trapez hat zwei parallele Seiten, die Grundseite $a$ unten und die Seite $c$ oben. Die beiden anderen Seiten $b$ und $d$ heißen Schenkel.',
        'Die Höhe $h$ ist der Abstand der parallelen Seiten. Sind die Schenkel gleich lang, ist das Trapez gleichschenklig. Ziehe B, C und D.',
      ],
      widget: {
        kind: 'shape-points',
        shape: 'trapezoid',
        vertices: [
          [1, 2],
          [9, 2],
          [7, 6],
          [3, 6],
        ],
      },
      question: {
        kind: 'choice',
        prompt: 'Was ist die Höhe eines Trapezes?',
        options: [
          { text: 'Der Abstand der beiden parallelen Seiten.', correct: true },
          { text: 'Die Länge eines Schenkels.', feedback: 'Die Schenkel sind meist schräg und länger als der Abstand.' },
          { text: 'Die Differenz von $a$ und $c$.', feedback: 'Das ist eine Länge auf der Grundseite, keine Höhe.' },
        ],
        explanation: 'Die Höhe steht senkrecht auf $a$ und auf $c$.',
      },
    },
    {
      id: 'verdoppeln',
      title: 'Verdoppeln',
      body: [
        'Drehe eine Kopie des Trapezes um den Mittelpunkt M des Schenkels BC. Zusammen entsteht ein Parallelogramm mit der Grundseite $a + c$ und der Höhe $h$.',
        'Das Trapez ist die Hälfte davon: $geo: A = (a + c) · h : 2$.',
      ],
      widget: { kind: 'decompose', shape: 'trapezoid', measures: { a: 6, c: 3, h: 3 } },
      question: {
        kind: 'term',
        prompt: 'Ein Trapez hat die parallelen Seiten 7 cm und 3 cm und die Höhe 4 cm. Wie groß ist der Flächeninhalt in cm²?',
        answer: '20',
        form: { kind: 'expanded' },
        explanation: '$geo: A = (a + c) · h : 2 = (7 + 3) · 4 : 2 = 20 cm²$',
      },
    },
    {
      id: 'regler',
      title: 'Seiten und Höhe verändern',
      body: [
        'Verändere $a$, $c$ und $h$. Zuerst rechnest du die Klammer aus, dann mal $h$ und durch 2.',
        'Ist $c$ fast so lang wie $a$, sieht das Trapez fast wie ein Parallelogramm aus.',
      ],
      widget: {
        kind: 'shape-sliders',
        shape: 'trapezoid',
        measures: {
          a: { value: 6, min: 4, max: 10 },
          c: { value: 3, min: 1, max: 3 },
          h: { value: 3, min: 2, max: 6 },
        },
      },
      question: {
        kind: 'choice',
        prompt: 'Ein Trapez hat $geo: a = 6 cm$, $geo: c = 3 cm$ und $geo: h = 3 cm$. Wie groß ist A?',
        options: [
          { text: '$geo: A = (6 + 3) · 3 : 2 = 13,5 cm²$', correct: true },
          { text: '27 cm²', feedback: 'Das ist das verdoppelte Trapez. Teile noch durch 2.' },
          { text: '7,5 cm²', feedback: 'Die Klammer fehlt: Erst $a + c$, dann mal $h$.' },
        ],
        explanation: '$geo: A = (6 + 3) · 3 : 2 = 9 · 3 : 2 = 13,5 cm²$',
      },
    },
    {
      id: 'allgemein',
      title: 'Nicht gleichschenklig',
      body: [
        'Auch wenn die Schenkel verschieden lang sind, gilt dieselbe Formel. Es kommt nur auf die parallelen Seiten und ihren Abstand an.',
        'Verändere die Höhe dieses Trapezes.',
      ],
      widget: {
        kind: 'shape-sliders',
        shape: 'trapezoid',
        measures: { a: 9, c: 5, h: { value: 2, min: 1, max: 6 } },
        offset: 1,
        label: 'Trapez mit verschieden langen Schenkeln',
      },
      question: {
        kind: 'term',
        prompt: 'Ein Trapez hat die parallelen Seiten 9 cm und 5 cm und die Höhe 2 cm. Wie groß ist der Flächeninhalt in cm²?',
        answer: '14',
        form: { kind: 'expanded' },
        explanation: '$geo: A = (9 + 5) · 2 : 2 = 14 cm²$',
      },
    },
    {
      id: 'umfang',
      title: 'Umfang',
      body: ['Für den Umfang addierst du alle vier Seiten: $geo: u = a + b + c + d$.'],
      widget: {
        kind: 'shape-sliders',
        shape: 'trapezoid',
        quantity: 'perimeter',
        measures: { a: { value: 8, min: 5, max: 11 }, b: 4, c: 4, d: 4 },
      },
      question: {
        kind: 'term',
        prompt: 'Ein Trapez hat die Seiten 8 cm, 4 cm, 4 cm und 4 cm. Wie groß ist der Umfang in cm?',
        answer: '20',
        form: { kind: 'expanded' },
        explanation: '$geo: u = 8 + 4 + 4 + 4 = 20 cm$',
      },
    },
    {
      id: 'rueckwaerts',
      title: 'Rückwärts rechnen',
      body: [
        'Ist der Flächeninhalt bekannt, setzt du ihn mit den bekannten Längen ein und löst die Gleichung.',
        'Beispiel: Flächeninhalt 20 cm², parallele Seiten 7 cm und 3 cm. Aus $eq: 20 = (7 + 3)·h : 2$ wird $eq: 20 = 5h | : 5$, also ist die Höhe 4 cm.',
      ],
      question: {
        kind: 'term',
        prompt: 'Ein Trapez hat den Flächeninhalt 24 cm² und die parallelen Seiten 9 cm und 3 cm. Wie lang ist die Höhe in cm?',
        answer: '4',
        form: { kind: 'expanded' },
        explanation: 'Aus $eq: 24 = (9 + 3)·h : 2$ wird $eq: 24 = 6h$, also $eq: h = 4$.',
      },
    },
    {
      id: 'typische-fehler',
      title: 'Typische Fehler',
      body: [
        'Klammer vergessen: Ohne Klammer rechnest du nur $c · h$ und addierst $a$ dazu.',
        'Schenkel statt Höhe: Die Schenkel sind schräg, die Höhe steht senkrecht auf den parallelen Seiten.',
        'Durch 2 vergessen: $(a + c) · h$ ist das verdoppelte Trapez.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Ben rechnet für ein Trapez mit $geo: a = 8 cm$, $geo: c = 4 cm$ und $geo: h = 3 cm$: $geo: A = 8 + 4 · 3 : 2 = 14 cm²$. Was ist falsch?',
        options: [
          { text: 'Die Klammer um $a + c$ fehlt.', correct: true },
          { text: 'Er hätte nicht durch 2 teilen dürfen.', feedback: 'Durch 2 ist richtig, das Trapez ist die Hälfte.' },
          { text: 'Die Einheit muss cm sein.', feedback: 'Für einen Flächeninhalt ist cm² richtig.' },
        ],
        explanation: 'Richtig ist $geo: A = (8 + 4) · 3 : 2 = 18 cm²$.',
      },
    },
  ],
  examples: [
    {
      title: 'Gleichschenkliges Trapez',
      task: exampleTask(buildAreaTask('trapezoid', { a: 6, c: 3, h: 3 })),
    },
    {
      title: 'Verschieden lange Schenkel',
      task: exampleTask(buildAreaTask('trapezoid', { a: 8, c: 4, h: 3 }, { offset: 1 })),
    },
    {
      title: 'Umfang',
      task: exampleTask(buildPerimeterTask('trapezoid', { a: 8, b: 4, c: 4, d: 4 })),
    },
    {
      title: 'Seite c aus dem Flächeninhalt',
      task: exampleTask(buildReverseTask('trapezoid', { a: 6, c: 4, h: 3 }, 'c')),
    },
  ],
  formulaIds: ['area-trapezoid', 'perimeter-trapezoid'],
}
