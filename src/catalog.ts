import type { SubtopicId } from './math'

/*
 * The catalog is the single source of truth for the structure of the app:
 * Bereich (area) → Thema (topic) → Teilthema (subtopic). Routes, start page,
 * navigation, breadcrumb, footer and formula sheet are all derived from it.
 * The school year (Klasse) is a property of a topic, not part of the path.
 *
 * A subtopic is reachable at `/area/topic/subtopic`; that path without the
 * leading slash is its `SubtopicId` (see src/math/tasks/types.ts).
 */

export interface Subtopic {
  /** URL segment, lower case with hyphens, e.g. "binomische-formeln". */
  slug: string
  title: string
  summary: string
}

export interface Topic {
  slug: string
  title: string
  summary: string
  /** School year the topic belongs to (5 to 13); shown as a badge and used by the filter. */
  grade: number
  subtopics: readonly Subtopic[]
}

export interface Area {
  slug: string
  title: string
  topics: readonly Topic[]
}

/** Areas follow the content fields (Inhaltsfelder) of the NRW curriculum. */
export const catalog: readonly Area[] = [
  {
    slug: 'algebra',
    title: 'Algebra',
    topics: [
      {
        slug: 'terme',
        title: 'Terme und binomische Formeln',
        summary: 'Klammern auflösen, Formeln durchschauen, Terme zerlegen.',
        grade: 8,
        subtopics: [
          {
            slug: 'ausmultiplizieren',
            title: 'Klammern ausmultiplizieren',
            summary: 'Summe mal Summe: jeden Summanden mit jedem multiplizieren.',
          },
          {
            slug: 'binomische-formeln',
            title: 'Binomische Formeln',
            summary: 'Die drei binomischen Formeln erkennen und anwenden.',
          },
          {
            slug: 'faktorisieren',
            title: 'Faktorisieren',
            summary: 'Ausklammern und binomische Formeln rückwärts nutzen.',
          },
        ],
      },
      {
        slug: 'lineare-gleichungen',
        title: 'Lineare Gleichungen',
        summary: 'Schritt für Schritt umformen, bis die Lösung dasteht.',
        grade: 8,
        subtopics: [
          {
            slug: 'umformen',
            title: 'Gleichungen umformen',
            summary: 'Auf beiden Seiten dasselbe tun, bis x allein steht.',
          },
          {
            slug: 'klammern',
            title: 'Gleichungen mit Klammern',
            summary: 'Erst die Klammern auflösen, dann wie gewohnt umformen.',
          },
          {
            slug: 'sonderfaelle',
            title: 'Sonderfälle',
            summary: 'Wenn x verschwindet: keine oder unendlich viele Lösungen.',
          },
        ],
      },
    ],
  },
  {
    slug: 'funktionen',
    title: 'Funktionen',
    topics: [
      {
        slug: 'lineare-funktionen',
        title: 'Lineare Funktionen',
        summary: 'Geraden zeichnen, ablesen, aufstellen und schneiden.',
        grade: 8,
        subtopics: [
          {
            slug: 'steigung-und-graph',
            title: 'Steigung und Graph',
            summary: 'm und n ablesen, den Graphen zeichnen.',
          },
          {
            slug: 'gleichung-aufstellen',
            title: 'Funktionsgleichung aufstellen',
            summary: 'Aus Punkt und Steigung oder aus zwei Punkten.',
          },
          {
            slug: 'punktprobe-nullstelle',
            title: 'Punktprobe und Nullstelle',
            summary: 'Liegt der Punkt auf der Geraden? Wo schneidet sie die x-Achse?',
          },
          {
            slug: 'schnittpunkt',
            title: 'Schnittpunkt zweier Geraden',
            summary: 'Gleichsetzen, auch bei parallelen und identischen Geraden.',
          },
        ],
      },
    ],
  },
  {
    slug: 'geometrie',
    title: 'Geometrie',
    topics: [
      {
        slug: 'vierecke-und-flaechen',
        title: 'Vierecke und Flächen',
        summary: 'Flächeninhalt und Umfang von Dreieck, Parallelogramm, Raute und Trapez.',
        grade: 8,
        subtopics: [
          {
            slug: 'parallelogramm',
            title: 'Parallelogramm',
            summary: 'Flächeninhalt und Umfang, Scherung zum Rechteck.',
          },
          {
            slug: 'dreieck',
            title: 'Dreieck',
            summary: 'Flächeninhalt als halbes Parallelogramm, auch mit Höhe außerhalb.',
          },
          {
            slug: 'raute',
            title: 'Raute',
            summary: 'Flächeninhalt aus den Diagonalen, Umfang.',
          },
          {
            slug: 'trapez',
            title: 'Trapez',
            summary: 'Flächeninhalt durch Verdoppeln, Umfang.',
          },
        ],
      },
    ],
  },
]

/** A subtopic together with the area and topic it belongs to. */
export interface SubtopicRef {
  id: SubtopicId
  area: Area
  topic: Topic
  subtopic: Subtopic
}

/** All subtopics in catalog order. */
export function allSubtopics(areas: readonly Area[] = catalog): SubtopicRef[] {
  return areas.flatMap((area) =>
    area.topics.flatMap((topic) =>
      topic.subtopics.map((subtopic) => ({
        id: `${area.slug}/${topic.slug}/${subtopic.slug}` as const,
        area,
        topic,
        subtopic,
      })),
    ),
  )
}

/** Looks up a subtopic by its three route segments; `undefined` for anything that is not in the catalog. */
export function findSubtopic(
  areaSlug: string | undefined,
  topicSlug: string | undefined,
  subtopicSlug: string | undefined,
  areas: readonly Area[] = catalog,
): SubtopicRef | undefined {
  return allSubtopics(areas).find(
    (ref) => ref.area.slug === areaSlug && ref.topic.slug === topicSlug && ref.subtopic.slug === subtopicSlug,
  )
}

/** Route of a subtopic, e.g. "/algebra/terme/faktorisieren". */
export function subtopicPath(id: SubtopicId): string {
  return `/${id}`
}

/** The school years that occur in the catalog, ascending. */
export function gradesOf(areas: readonly Area[] = catalog): number[] {
  const grades = new Set(areas.flatMap((area) => area.topics.map((topic) => topic.grade)))
  return [...grades].sort((a, b) => a - b)
}

/** Areas reduced to the topics of one school year; areas without a match are dropped. `null` keeps everything. */
export function filterByGrade(areas: readonly Area[], grade: number | null): Area[] {
  if (grade === null) return [...areas]
  return areas
    .map((area) => ({ ...area, topics: area.topics.filter((topic) => topic.grade === grade) }))
    .filter((area) => area.topics.length > 0)
}

export function gradeLabel(grade: number): string {
  return `Klasse ${grade}`
}
