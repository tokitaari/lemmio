import { buildAreaTask, buildPerimeterTask, buildReverseTask } from '../math'
import { exampleTask } from './geometryExample'
import type { SubtopicContent } from './types'

/**
 * Geometry 2: the triangle as half a parallelogram (A = g · h : 2), also
 * right-angled and with the height outside, the perimeter and a length from
 * the area.
 */
export const geometrieDreieck: SubtopicContent = {
  cards: [
    {
      id: 'grundseite-hoehe',
      title: 'Grundseite und Höhe',
      body: [
        'Im Dreieck ABC ist die Seite AB die Grundseite $g$. Die Höhe $h$ geht von der Ecke C senkrecht auf die Grundseite.',
        'Ziehe B und C. Die Höhe ist immer der senkrechte Abstand von C zur Geraden durch A und B.',
      ],
      widget: {
        kind: 'shape-points',
        shape: 'triangle',
        vertices: [
          [2, 2],
          [8, 2],
          [4, 6],
        ],
      },
      question: {
        kind: 'choice',
        prompt: 'Welche Strecke ist die Höhe zur Grundseite AB?',
        options: [
          { text: 'Die Strecke von C senkrecht auf AB.', correct: true },
          { text: 'Die Seite AC.', feedback: 'AC ist eine Seite. Sie steht nur im rechtwinkligen Dreieck senkrecht auf AB.' },
          { text: 'Die Strecke von C zur Mitte von AB.', feedback: 'Die Höhe trifft AB senkrecht, nicht unbedingt in der Mitte.' },
        ],
        explanation: 'Die Höhe steht senkrecht auf der Grundseite und geht durch die gegenüberliegende Ecke.',
      },
    },
    {
      id: 'verdoppeln',
      title: 'Verdoppeln',
      body: [
        'Drehe eine Kopie des Dreiecks um den Mittelpunkt M der Seite BC. Beide Dreiecke zusammen bilden ein Parallelogramm mit derselben Grundseite und Höhe.',
        'Das Dreieck ist die Hälfte davon: $geo: A = g · h : 2$.',
      ],
      widget: { kind: 'decompose', shape: 'triangle', measures: { g: 6, h: 4 } },
      question: {
        kind: 'term',
        prompt: 'Ein Dreieck hat die Grundseite 8 cm und die Höhe 5 cm. Wie groß ist der Flächeninhalt in cm²?',
        answer: '20',
        form: { kind: 'expanded' },
        explanation: '$geo: A = g · h : 2 = 8 · 5 : 2 = 20 cm²$',
      },
    },
    {
      id: 'scheren',
      title: 'Scheren',
      body: [
        'Schiebe C entlang der Parallelen zu AB. Grundseite und Höhe bleiben gleich, also auch der Flächeninhalt.',
        'Alle diese Dreiecke sind halb so groß wie das Parallelogramm mit derselben Grundseite und Höhe.',
      ],
      widget: {
        kind: 'shear',
        shape: 'triangle',
        vertices: [
          [2, 2],
          [8, 2],
          [5, 7],
        ],
      },
      question: {
        kind: 'choice',
        prompt: 'Zwei Dreiecke haben dieselbe Grundseite und dieselbe Höhe, eines ist spitz, eines stumpf. Welches ist größer?',
        options: [
          { text: 'Beide haben denselben Flächeninhalt.', correct: true },
          { text: 'Das stumpfe Dreieck.', feedback: 'Es hat längere Seiten, aber gleiches $g$ und gleiches $h$.' },
          { text: 'Das spitze Dreieck.', feedback: 'Die Form ändert nichts, es zählen nur $g$ und $h$.' },
        ],
        explanation: 'Der Flächeninhalt hängt nur von Grundseite und Höhe ab.',
      },
    },
    {
      id: 'stumpf',
      title: 'Höhe außerhalb',
      body: [
        'Im stumpfwinkligen Dreieck liegt die Höhe außerhalb. Du verlängerst die Grundseite und misst bis zur Verlängerung.',
        'Auch hier ergeben zwei Dreiecke ein Parallelogramm, die Formel $geo: A = g · h : 2$ gilt weiter.',
      ],
      widget: { kind: 'decompose', shape: 'triangle', measures: { g: 5, h: 3 }, offset: 7 },
      question: {
        kind: 'choice',
        prompt: 'Ein stumpfwinkliges Dreieck hat $geo: g = 5 cm$ und $geo: h = 3 cm$. Wie groß ist A?',
        options: [
          { text: '$geo: A = 5 · 3 : 2 = 7,5 cm²$', correct: true },
          { text: '15 cm²', feedback: 'Das ist das Parallelogramm. Das Dreieck ist die Hälfte.' },
          { text: '8 cm²', feedback: 'Das ist $5 + 3$. Für die Fläche multiplizierst du.' },
        ],
        explanation: 'Die Höhe liegt außerhalb, an der Formel ändert das nichts: $geo: A = 5 · 3 : 2 = 7,5 cm²$.',
      },
    },
    {
      id: 'rechtwinklig',
      title: 'Rechtwinkliges Dreieck',
      body: [
        'Liegt C genau über A, hat das Dreieck bei A einen rechten Winkel. Dann ist die Seite AC selbst die Höhe.',
        'Das rechtwinklige Dreieck ist ein halbes Rechteck aus den beiden Seiten am rechten Winkel.',
      ],
      widget: {
        kind: 'shape-sliders',
        shape: 'triangle',
        measures: { g: { value: 6, min: 2, max: 10 }, h: { value: 4, min: 2, max: 8 } },
        offset: 0,
        label: 'Rechtwinkliges Dreieck',
      },
      question: {
        kind: 'term',
        prompt: 'Die beiden Seiten am rechten Winkel sind 6 cm und 4 cm lang. Wie groß ist der Flächeninhalt in cm²?',
        answer: '12',
        form: { kind: 'expanded' },
        explanation: '$geo: A = 6 · 4 : 2 = 12 cm²$',
      },
    },
    {
      id: 'regler',
      title: 'Mit halben Zentimetern',
      body: [
        'Verändere $g$ und $h$. Ist eines davon ungerade, kommt oft ,5 heraus.',
        'Die Rechnung unter der Figur zeigt die eingesetzten Zahlen.',
      ],
      widget: {
        kind: 'shape-sliders',
        shape: 'triangle',
        measures: { g: { value: 5, min: 2, max: 10 }, h: { value: 3, min: 2, max: 8 } },
      },
      question: {
        kind: 'choice',
        prompt: 'Ein Dreieck hat $geo: g = 7 cm$ und $geo: h = 3 cm$. Wie groß ist A?',
        options: [
          { text: '$geo: A = 7 · 3 : 2 = 10,5 cm²$', correct: true },
          { text: '21 cm²', feedback: 'Du hast nicht durch 2 geteilt.' },
          { text: '10 cm²', feedback: 'Die Hälfte von 21 ist 10,5, nicht 10.' },
        ],
        explanation: '$geo: A = 7 · 3 : 2 = 10,5 cm²$',
      },
    },
    {
      id: 'umfang',
      title: 'Umfang',
      body: [
        'Für den Umfang addierst du die drei Seiten: $geo: u = a + b + c$.',
        'Die Höhe brauchst du dafür nicht.',
      ],
      widget: {
        kind: 'shape-sliders',
        shape: 'triangle',
        quantity: 'perimeter',
        measures: { a: { value: 5, min: 2, max: 6 }, b: 4, c: 3 },
      },
      question: {
        kind: 'term',
        prompt: 'Ein Dreieck hat die Seiten 5 cm, 4 cm und 3 cm. Wie groß ist der Umfang in cm?',
        answer: '12',
        form: { kind: 'expanded' },
        explanation: '$geo: u = 5 + 4 + 3 = 12 cm$',
      },
    },
    {
      id: 'rueckwaerts',
      title: 'Rückwärts rechnen',
      body: [
        'Ist der Flächeninhalt bekannt, setzt du ihn mit der bekannten Länge in die Formel ein und löst die Gleichung.',
        'Beispiel: Flächeninhalt 15 cm², Grundseite 6 cm. Aus $eq: 15 = 6·h : 2$ wird $eq: 15 = 3h | : 3$, also ist die Höhe 5 cm.',
      ],
      question: {
        kind: 'term',
        prompt: 'Ein Dreieck hat den Flächeninhalt 12 cm² und die Grundseite 8 cm. Wie lang ist die Höhe in cm?',
        answer: '3',
        form: { kind: 'expanded' },
        explanation: 'Aus $eq: 12 = 8·h : 2$ wird $eq: 12 = 4h$, also $eq: h = 3$.',
      },
    },
    {
      id: 'typische-fehler',
      title: 'Typische Fehler',
      body: [
        'Durch 2 vergessen: Ohne die Hälfte hast du das Parallelogramm berechnet.',
        'Seite statt Höhe: Nur im rechtwinkligen Dreieck ist eine Seite zugleich die Höhe.',
        'Höhe außerhalb übersehen: Auch beim stumpfen Dreieck gehört die Höhe zur Grundseite, sie endet auf der Verlängerung.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Tom rechnet für ein Dreieck mit $geo: g = 6 cm$ und $geo: h = 5 cm$: $geo: A = 6 · 5 = 30 cm²$. Was ist falsch?',
        options: [
          { text: 'Er hat nicht durch 2 geteilt.', correct: true },
          { text: 'Er hätte $6 + 5$ rechnen müssen.', feedback: 'Für die Fläche multiplizierst du.' },
          { text: 'Die Einheit muss cm sein.', feedback: 'Für einen Flächeninhalt ist cm² richtig.' },
        ],
        explanation: 'Richtig ist $geo: A = 6 · 5 : 2 = 15 cm²$.',
      },
    },
  ],
  examples: [
    {
      title: 'Höhe innen',
      task: exampleTask(buildAreaTask('triangle', { g: 6, h: 4 })),
    },
    {
      title: 'Höhe außerhalb',
      task: exampleTask(buildAreaTask('triangle', { g: 5, h: 3 }, { offset: -2 })),
    },
    {
      title: 'Umfang',
      task: exampleTask(buildPerimeterTask('triangle', { a: 5, b: 4, c: 3 })),
    },
    {
      title: 'Grundseite aus dem Flächeninhalt',
      task: exampleTask(buildReverseTask('triangle', { g: 8, h: 5 }, 'g')),
    },
  ],
  formulaIds: ['area-triangle', 'perimeter-triangle'],
}
