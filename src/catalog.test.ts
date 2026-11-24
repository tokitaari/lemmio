// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  allSubtopics,
  catalog,
  filterByGrade,
  findSubtopic,
  gradeLabel,
  gradesOf,
  subtopicPath,
  type Area,
} from './catalog'
import { subtopicContent } from './content'
import { ALL_SUBTOPIC_IDS, EQUATION_SUBTOPIC_IDS, SUBTOPIC_IDS } from './math'

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Two areas with topics of different school years, independent of the real content. */
const sample: readonly Area[] = [
  {
    slug: 'a',
    title: 'A',
    topics: [
      { slug: 't1', title: 'T1', summary: '', grade: 8, subtopics: [{ slug: 's1', title: 'S1', summary: '' }] },
      { slug: 't2', title: 'T2', summary: '', grade: 9, subtopics: [{ slug: 's2', title: 'S2', summary: '' }] },
    ],
  },
  {
    slug: 'b',
    title: 'B',
    topics: [{ slug: 't3', title: 'T3', summary: '', grade: 9, subtopics: [{ slug: 's3', title: 'S3', summary: '' }] }],
  },
]

describe('catalog data', () => {
  it('has well-formed, unique slugs on every level', () => {
    const areaSlugs = catalog.map((a) => a.slug)
    expect(new Set(areaSlugs).size).toBe(areaSlugs.length)
    for (const area of catalog) {
      expect(area.slug).toMatch(SLUG)
      const topicSlugs = area.topics.map((t) => t.slug)
      expect(new Set(topicSlugs).size).toBe(topicSlugs.length)
      for (const topic of area.topics) {
        expect(topic.slug).toMatch(SLUG)
        const subtopicSlugs = topic.subtopics.map((s) => s.slug)
        expect(new Set(subtopicSlugs).size).toBe(subtopicSlugs.length)
        for (const subtopic of topic.subtopics) expect(subtopic.slug).toMatch(SLUG)
      }
    }
  })

  it('names and describes every entry and gives every topic a school year from 5 to 13', () => {
    for (const area of catalog) {
      expect(area.title).not.toBe('')
      expect(area.topics.length).toBeGreaterThan(0)
      for (const topic of area.topics) {
        expect([topic.title, topic.summary]).not.toContain('')
        expect(Number.isInteger(topic.grade)).toBe(true)
        expect(topic.grade).toBeGreaterThanOrEqual(5)
        expect(topic.grade).toBeLessThanOrEqual(13)
        expect(topic.subtopics.length).toBeGreaterThan(0)
        for (const subtopic of topic.subtopics) expect([subtopic.title, subtopic.summary]).not.toContain('')
      }
    }
  })

  it('lists exactly the subtopics that have a task generator and a content', () => {
    const ids = allSubtopics().map((s) => s.id)
    expect([...ids].sort()).toEqual([...ALL_SUBTOPIC_IDS].sort())
    expect(Object.keys(subtopicContent).sort()).toEqual([...ids].sort())
  })

  it('keeps term and equation subtopics in separate registers', () => {
    const terms: readonly string[] = SUBTOPIC_IDS
    expect(EQUATION_SUBTOPIC_IDS.filter((id) => terms.includes(id))).toEqual([])
    expect(EQUATION_SUBTOPIC_IDS.length).toBeGreaterThan(0)
  })
})

describe('catalog lookups', () => {
  it('builds the id of a subtopic from its path', () => {
    const ids = allSubtopics().map((s) => s.id)
    expect(ids).toContain('algebra/terme/binomische-formeln')
    expect(subtopicPath('algebra/terme/binomische-formeln')).toBe('/algebra/terme/binomische-formeln')
  })

  it('finds a subtopic with its area and topic', () => {
    const ref = findSubtopic('algebra', 'terme', 'faktorisieren')
    expect(ref?.id).toBe('algebra/terme/faktorisieren')
    expect([ref?.area.title, ref?.topic.grade, ref?.subtopic.title]).toEqual(['Algebra', 8, 'Faktorisieren'])
  })

  it.each([
    ['algebra', 'terme', 'gibt-es-nicht'],
    ['algebra', 'gibt-es-nicht', 'faktorisieren'],
    ['gibt-es-nicht', 'terme', 'faktorisieren'],
    ['algebra', 'terme', undefined],
    ['toString', 'constructor', '__proto__'],
  ])('finds nothing for %s/%s/%s', (area, topic, subtopic) => {
    expect(findSubtopic(area, topic, subtopic)).toBeUndefined()
  })

  it('does not mix up equal slugs under different parents', () => {
    const areas: readonly Area[] = [
      { slug: 'x', title: 'X', topics: [{ slug: 't', title: 'T', summary: '', grade: 8, subtopics: [{ slug: 's', title: 'first', summary: '' }] }] },
      { slug: 'y', title: 'Y', topics: [{ slug: 't', title: 'T', summary: '', grade: 9, subtopics: [{ slug: 's', title: 'second', summary: '' }] }] },
    ]
    expect(findSubtopic('y', 't', 's', areas)?.subtopic.title).toBe('second')
  })
})

describe('school years', () => {
  it('collects the years of the catalog, ascending and without duplicates', () => {
    expect(gradesOf(sample)).toEqual([8, 9])
    expect(gradesOf(catalog)).toEqual([8])
    expect(gradesOf([])).toEqual([])
  })

  it('labels a year', () => {
    expect(gradeLabel(8)).toBe('Klasse 8')
  })

  it('keeps everything without a filter', () => {
    expect(filterByGrade(sample, null)).toEqual(sample)
  })

  it('keeps only the topics of one year and drops empty areas', () => {
    const grade8 = filterByGrade(sample, 8)
    expect(grade8.map((a) => [a.slug, a.topics.map((t) => t.slug)])).toEqual([['a', ['t1']]])
    const grade9 = filterByGrade(sample, 9)
    expect(grade9.map((a) => [a.slug, a.topics.map((t) => t.slug)])).toEqual([
      ['a', ['t2']],
      ['b', ['t3']],
    ])
    expect(filterByGrade(sample, 10)).toEqual([])
  })

  it('does not change the catalog it filters', () => {
    filterByGrade(sample, 9)
    expect(sample[0]!.topics).toHaveLength(2)
  })
})
