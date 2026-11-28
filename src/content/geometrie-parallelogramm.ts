import { buildAreaTask, buildPerimeterTask, buildReverseTask } from '../math'
import { exampleTask } from './geometryExample'
import type { SubtopicContent } from './types'

/**
 * Geometry 1: the parallelogram. From the rectangle by shearing and by
 * cutting off a triangle (A = g · h), the height outside, the perimeter and
 * a length from the area.
 */
export const geometrieParallelogramm: SubtopicContent = {
  cards: [
    {
      id: 'rechteck',
      title: 'Vom Rechteck aus',
      body: [
        'Beim Rechteck zählst du Kästchen: 6 Reihen zu je 4 Quadraten von 1 cm² sind 24 cm². Kurz: Länge mal Breite.',
        'Ein Rechteck ist ein besonderes Parallelogramm, alle Winkel sind rechte Winkel. Die Grundseite heißt $g$, die Seite senkrecht dazu ist die Höhe $h$.',
        'Verändere $g$ und $h$ und beobachte den Flächeninhalt.',
      ],
      widget: {
        kind: 'shape-sliders',
        shape: 'parallelogram',
        measures: { g: { value: 6, min: 2, max: 10 }, h: { value: 4, min: 2, max: 8 } },
        offset: 0,
        label: 'Rechteck',
      },
      question: {
        kind: 'choice',
        prompt: 'Ein Rechteck ist 6 cm lang und 4 cm breit. Wie groß ist sein Flächeninhalt?',
        options: [
          { text: '24 cm²', correct: true },
          { text: '20 cm', feedback: 'Das ist der Umfang: $2 · (6 + 4) = 20$. Gefragt ist die Fläche.' },
          { text: '24 cm', feedback: 'Die Zahl stimmt, aber eine Fläche misst man in cm².' },
        ],
        explanation: '$geo: A = 6 · 4 = 24 cm²$',
      },
    },
    {
      id: 'seiten-und-hoehe',
      title: 'Seiten und Höhe',
      body: [
        'Im Parallelogramm sind gegenüberliegende Seiten parallel und gleich lang. Die Winkel müssen keine rechten Winkel sein.',
        'Die Grundseite $g$ ist die Seite AB. Die Höhe $h$ ist der Abstand zwischen AB und der gegenüberliegenden Seite CD: Sie steht senkrecht auf $g$.',
        'Die schräge Seite $b$ ist länger als die Höhe. Ziehe B und D und beobachte, wie sich $g$ und $h$ ändern.',
      ],
      widget: {
        kind: 'shape-points',
        shape: 'parallelogram',
        vertices: [
          [2, 2],
          [7, 2],
          [9, 5],
          [4, 5],
        ],
      },
      question: {
        kind: 'choice',
        prompt: 'Welche Strecke ist die Höhe eines Parallelogramms?',
        options: [
          { text: 'Der Abstand von AB zu CD, senkrecht gemessen.', correct: true },
          { text: 'Die schräge Seite AD.', feedback: 'AD ist eine Seite. Sie ist schräg und länger als der Abstand.' },
          { text: 'Die Diagonale AC.', feedback: 'Die Diagonale verbindet gegenüberliegende Ecken, sie steht nicht senkrecht auf AB.' },
        ],
        explanation: 'Die Höhe steht immer senkrecht auf der Grundseite.',
      },
    },
    {
      id: 'scheren',
      title: 'Scheren',
      body: [
        'Schiebe D entlang der gestrichelten Parallelen. C folgt, die Grundseite und die Höhe bleiben gleich.',
        'Steht D genau über A, ist aus dem Parallelogramm ein Rechteck geworden. Das gestrichelte Rechteck hat dieselbe Grundseite und dieselbe Höhe.',
      ],
      widget: {
        kind: 'shear',
        shape: 'parallelogram',
        vertices: [
          [2, 2],
          [8, 2],
          [10, 6],
          [4, 6],
        ],
      },
      question: {
        kind: 'choice',
        prompt: 'Was passiert mit dem Flächeninhalt, wenn du D entlang der Parallelen verschiebst?',
        options: [
          { text: 'Er bleibt gleich.', correct: true },
          { text: 'Er wird größer, je schräger das Parallelogramm ist.', feedback: 'Die Seiten werden länger, aber $g$ und $h$ bleiben gleich.' },
          { text: 'Er ist beim Rechteck am größten.', feedback: 'Das Rechteck hat denselben Flächeninhalt wie jedes Parallelogramm mit gleichem $g$ und $h$.' },
        ],
        explanation: 'Grundseite und Höhe ändern sich beim Scheren nicht, also auch der Flächeninhalt nicht.',
      },
    },
    {
      id: 'zerlegen',
      title: 'Zerlegen',
      body: [
        'Schneide das Parallelogramm entlang der Höhe auf und lege das Dreieck auf die andere Seite. Es entsteht ein Rechteck mit den Seiten $g$ und $h$.',
        'Deshalb gilt für den Flächeninhalt des Parallelogramms: $geo: A = g · h$.',
      ],
      widget: { kind: 'decompose', shape: 'parallelogram', measures: { g: 6, h: 4 }, offset: 2 },
      question: {
        kind: 'term',
        prompt: 'Ein Parallelogramm hat die Grundseite 7 cm und die Höhe 3 cm. Wie groß ist der Flächeninhalt in cm²?',
        answer: '21',
        form: { kind: 'expanded' },
        explanation: '$geo: A = g · h = 7 · 3 = 21 cm²$',
      },
    },
    {
      id: 'regler',
      title: 'Mit halben Zentimetern',
      body: [
        'Die Formel gilt auch für Längen wie 6,5 cm. Verändere $g$ und $h$ in Schritten von 0,5 cm.',
        'Die Rechnung unter der Figur zeigt die eingesetzten Zahlen.',
      ],
      widget: {
        kind: 'shape-sliders',
        shape: 'parallelogram',
        measures: { g: { value: 6.5, min: 2, max: 10 }, h: { value: 4, min: 2, max: 8 } },
      },
      question: {
        kind: 'choice',
        prompt: 'Welcher Flächeninhalt gehört zu $geo: g = 6,5 cm$ und $geo: h = 4 cm$?',
        options: [
          { text: '$geo: A = 6,5 · 4 = 26 cm²$', correct: true },
          { text: '24,5 cm²', feedback: 'Rechne in Teilen: $6 · 4 = 24$ und dazu die Hälfte von 4.' },
          { text: '13 cm²', feedback: 'Durch 2 teilst du beim Dreieck, nicht beim Parallelogramm.' },
        ],
        explanation: '$geo: A = 6,5 · 4 = 26 cm²$, denn 6 mal 4 ist 24 und 0,5 mal 4 ist 2.',
      },
    },
    {
      id: 'hoehe-aussen',
      title: 'Höhe außerhalb',
      body: [
        'Ist das Parallelogramm sehr schräg, trifft die Höhe die Grundseite nicht mehr. Dann verlängerst du AB und misst die Höhe bis zur Verlängerung.',
        'Die Formel $geo: A = g · h$ gilt trotzdem. Schiebe D zurück, bis die Höhe wieder innen liegt.',
      ],
      widget: {
        kind: 'shear',
        shape: 'parallelogram',
        vertices: [
          [1, 2],
          [5, 2],
          [11, 5],
          [7, 5],
        ],
      },
      question: {
        kind: 'choice',
        prompt: 'Ein Parallelogramm hat $geo: g = 3 cm$, die schräge Seite $geo: b = 5 cm$ und die Höhe $geo: h = 4 cm$. Wie groß ist A?',
        options: [
          { text: '12 cm²', correct: true },
          { text: '15 cm²', feedback: 'Das ist $3 · 5$, also Grundseite mal schräge Seite. Nimm die Höhe.' },
          { text: '20 cm²', feedback: 'Das ist $5 · 4$. Die Höhe gehört zur Grundseite $g$, nicht zu $b$.' },
        ],
        explanation: '$geo: A = g · h = 3 · 4 = 12 cm²$. Die Seite $b$ brauchst du nur für den Umfang.',
      },
    },
    {
      id: 'umfang',
      title: 'Umfang',
      body: [
        'Der Umfang ist die Länge des Randes. Im Parallelogramm kommen die Seiten $a$ und $b$ je zweimal vor: $geo: u = 2 · (a + b)$.',
        'Der Umfang ist eine Länge, er hat die Einheit cm.',
      ],
      widget: {
        kind: 'shape-sliders',
        shape: 'parallelogram',
        quantity: 'perimeter',
        measures: { a: { value: 5, min: 3, max: 10 }, b: { value: 3, min: 2, max: 8 } },
      },
      question: {
        kind: 'term',
        prompt: 'Ein Parallelogramm hat die Seiten 5 cm und 3 cm. Wie groß ist der Umfang in cm?',
        answer: '16',
        form: { kind: 'expanded' },
        explanation: '$geo: u = 2 · (a + b) = 2 · (5 + 3) = 16 cm$',
      },
    },
    {
      id: 'rueckwaerts',
      title: 'Rückwärts rechnen',
      body: [
        'Ist der Flächeninhalt bekannt, kannst du eine Länge berechnen. Setze alles Bekannte in die Formel ein, dann löst du die Gleichung.',
        'Beispiel: Flächeninhalt 24 cm², Grundseite 6 cm. Aus $geo: A = g · h$ wird $eq: 24 = 6h | : 6$, also $eq: 4 = h$. Die Höhe ist 4 cm.',
      ],
      question: {
        kind: 'term',
        prompt: 'Ein Parallelogramm hat den Flächeninhalt 30 cm² und die Grundseite 5 cm. Wie hoch ist es in cm?',
        answer: '6',
        form: { kind: 'expanded' },
        explanation: 'Aus $eq: 30 = 5h$ folgt $eq: h = 6$. Die Höhe ist 6 cm.',
      },
    },
    {
      id: 'typische-fehler',
      title: 'Typische Fehler',
      body: [
        'Seite statt Höhe: Die schräge Seite ist länger als die Höhe. In die Formel gehört die Höhe.',
        'Falsche Einheit: Flächen haben cm², Längen und Umfänge cm.',
        'Fläche und Umfang verwechselt: Für die Fläche multiplizierst du, für den Umfang addierst du die Seiten.',
      ],
      question: {
        kind: 'choice',
        prompt: 'Lea rechnet für ein Parallelogramm mit $geo: a = 6 cm$, $geo: b = 5 cm$ und $geo: h = 4 cm$ so: $geo: A = 6 · 5 = 30 cm²$. Was ist falsch?',
        options: [
          { text: 'Sie hat die Seite $b$ statt der Höhe genommen.', correct: true },
          { text: 'Sie hätte durch 2 teilen müssen.', feedback: 'Durch 2 teilt man beim Dreieck.' },
          { text: 'Die Einheit muss cm sein.', feedback: 'Für einen Flächeninhalt ist cm² richtig.' },
        ],
        explanation: 'Richtig ist $geo: A = 6 · 4 = 24 cm²$.',
      },
    },
  ],
  examples: [
    {
      title: 'Mit halben Zentimetern',
      task: exampleTask(buildAreaTask('parallelogram', { g: 6.5, h: 4 })),
    },
    {
      title: 'Seite und Höhe nicht verwechseln',
      task: exampleTask(buildAreaTask('parallelogram', { g: 5, h: 3, b: 4 })),
      comment: 'Die Seite $b$ brauchst du hier nicht, sie ist länger als die Höhe.',
    },
    {
      title: 'Umfang',
      task: exampleTask(buildPerimeterTask('parallelogram', { a: 5, b: 3 })),
    },
    {
      title: 'Höhe aus dem Flächeninhalt',
      task: exampleTask(buildReverseTask('parallelogram', { g: 6, h: 4 }, 'h')),
    },
  ],
  formulaIds: ['area-parallelogram', 'perimeter-parallelogram'],
}
