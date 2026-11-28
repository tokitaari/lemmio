import { buildAreaTask, buildPerimeterTask, buildReverseTask } from '../math'
import { exampleTask } from './geometryExample'
import type { SubtopicContent } from './types'

/**
 * Geometry 3: the rhombus. Half of the rectangle from its diagonals
 * (A = e · f : 2), as a parallelogram (A = a · h), the perimeter and a
 * diagonal from the area.
 */
export const geometrieRaute: SubtopicContent = {
  cards: [
    {
      id: 'was-ist-eine-raute',
      title: 'Was ist eine Raute?',
      body: [
        'Eine Raute ist ein Parallelogramm mit vier gleich langen Seiten $a$.',
        'Ihre Diagonalen $e$ und $f$ stehen senkrecht aufeinander und halbieren sich im Mittelpunkt M. Ziehe C und D und beobachte die Diagonalen.',
      ],
      widget: {
        kind: 'shape-points',
        shape: 'rhombus',
        vertices: [
          [3, 5],
          [6, 3],
          [9, 5],
          [6, 7],
        ],
      },
      question: {
        kind: 'choice',
        prompt: 'Welche Aussage über die Diagonalen einer Raute stimmt?',
        options: [
          { text: 'Sie stehen senkrecht aufeinander und halbieren sich.', correct: true },
          { text: 'Sie sind immer gleich lang.', feedback: 'Gleich lang sind sie nur beim Quadrat.' },
          { text: 'Sie sind so lang wie die Seiten.', feedback: 'Die Diagonalen verbinden gegenüberliegende Ecken, sie sind keine Seiten.' },
        ],
        explanation: 'Darum passt die Raute genau in ein Rechteck mit den Seiten $e$ und $f$.',
      },
    },
    {
      id: 'rechteck-aus-e-und-f',
      title: 'Das Rechteck aus e und f',
      body: [
        'Lege um die Raute ein Rechteck mit den Seiten $e$ und $f$. Die vier Ecken des Rechtecks sind Kopien der vier Dreiecke der Raute.',
        'Die Raute füllt also genau die Hälfte: $geo: A = e · f : 2$.',
      ],
      widget: { kind: 'decompose', shape: 'rhombus', measures: { e: 6, f: 4 } },
      question: {
        kind: 'term',
        prompt: 'Eine Raute hat die Diagonalen 8 cm und 5 cm. Wie groß ist der Flächeninhalt in cm²?',
        answer: '20',
        form: { kind: 'expanded' },
        explanation: '$geo: A = e · f : 2 = 8 · 5 : 2 = 20 cm²$',
      },
    },
    {
      id: 'regler',
      title: 'Diagonalen verändern',
      body: ['Verändere $e$ und $f$. Die Raute wird breiter oder höher, die Rechnung folgt.'],
      widget: {
        kind: 'shape-sliders',
        shape: 'rhombus',
        measures: { e: { value: 6, min: 2, max: 10 }, f: { value: 4, min: 2, max: 10 } },
      },
      question: {
        kind: 'choice',
        prompt: 'Eine Raute hat $geo: e = 7 cm$ und $geo: f = 3 cm$. Wie groß ist A?',
        options: [
          { text: '$geo: A = 7 · 3 : 2 = 10,5 cm²$', correct: true },
          { text: '21 cm²', feedback: 'Das ist das ganze Rechteck. Die Raute ist die Hälfte.' },
          { text: '20 cm', feedback: 'Das ist $2 · (7 + 3)$, und eine Fläche hat cm².' },
        ],
        explanation: '$geo: A = 7 · 3 : 2 = 10,5 cm²$',
      },
    },
    {
      id: 'als-parallelogramm',
      title: 'Die Raute als Parallelogramm',
      body: [
        'Jede Raute ist ein Parallelogramm. Kennst du eine Seite $a$ und die Höhe $h$ dazu, gilt auch $geo: A = a · h$.',
        'Welche Formel du nimmst, hängt davon ab, welche Längen gegeben sind.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Eine Raute hat die Seite $geo: a = 5 cm$ und die Höhe $geo: h = 4 cm$. Wie groß ist A?',
        options: [
          { text: '20 cm²', correct: true },
          { text: '10 cm²', feedback: 'Durch 2 teilst du nur bei der Formel mit den Diagonalen.' },
          { text: '25 cm²', feedback: 'Das ist $5 · 5$. Die Höhe ist kürzer als die Seite.' },
        ],
        explanation: '$geo: A = a · h = 5 · 4 = 20 cm²$',
      },
    },
    {
      id: 'umfang',
      title: 'Umfang',
      body: ['Alle vier Seiten sind gleich lang, also ist $geo: u = 4 · a$.'],
      widget: {
        kind: 'shape-sliders',
        shape: 'rhombus',
        quantity: 'perimeter',
        measures: { a: { value: 7, min: 2, max: 10 } },
      },
      question: {
        kind: 'term',
        prompt: 'Eine Raute hat die Seitenlänge 7 cm. Wie groß ist der Umfang in cm?',
        answer: '28',
        form: { kind: 'expanded' },
        explanation: '$geo: u = 4 · a = 4 · 7 = 28 cm$',
      },
    },
    {
      id: 'rueckwaerts',
      title: 'Rückwärts rechnen',
      body: [
        'Ist der Flächeninhalt bekannt, kannst du eine Diagonale berechnen.',
        'Beispiel: Flächeninhalt 24 cm², Diagonale $e$ 8 cm. Aus $eq: 24 = 8·f : 2$ wird $eq: 24 = 4f | : 4$, also ist $f$ 6 cm lang.',
      ],
      question: {
        kind: 'term',
        prompt: 'Eine Raute hat den Flächeninhalt 18 cm² und die Diagonale $e$ 6 cm. Wie lang ist $f$ in cm?',
        answer: '6',
        form: { kind: 'expanded' },
        explanation: 'Aus $eq: 18 = 6·f : 2$ wird $eq: 18 = 3f$, also $eq: f = 6$.',
      },
    },
    {
      id: 'typische-fehler',
      title: 'Typische Fehler',
      body: [
        'Durch 2 vergessen: $e · f$ ist das Rechteck, die Raute ist die Hälfte.',
        'Seite statt Diagonale: Die Formel mit dem Halbieren braucht die Diagonalen, nicht die Seiten.',
        'Umfang mit den Diagonalen: Für den Umfang brauchst du die Seite $a$.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Mia soll den Umfang einer Raute mit $geo: e = 6 cm$, $geo: f = 8 cm$ und $geo: a = 5 cm$ berechnen. Was ist richtig?',
        options: [
          { text: '$geo: u = 4 · 5 = 20 cm$', correct: true },
          { text: '$geo: u = 2 · (6 + 8) = 28 cm$', feedback: 'Die Diagonalen gehören nicht zum Rand der Raute.' },
          { text: '24 cm²', feedback: 'Das ist der Flächeninhalt.' },
        ],
        explanation: 'Der Rand besteht aus vier Seiten der Länge 5 cm.',
      },
    },
  ],
  examples: [
    {
      title: 'Aus den Diagonalen',
      task: exampleTask(buildAreaTask('rhombus', { e: 6, f: 4 })),
    },
    {
      title: 'Mit halbem Ergebnis',
      task: exampleTask(buildAreaTask('rhombus', { e: 7, f: 3 })),
    },
    {
      title: 'Umfang',
      task: exampleTask(buildPerimeterTask('rhombus', { a: 4.5 })),
    },
    {
      title: 'Diagonale aus dem Flächeninhalt',
      task: exampleTask(buildReverseTask('rhombus', { e: 8, f: 6 }, 'f')),
    },
  ],
  formulaIds: ['area-rhombus', 'area-rhombus-side', 'perimeter-rhombus'],
}
