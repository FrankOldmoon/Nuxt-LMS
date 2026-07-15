import { db, schema } from '@nuxthub/db'
import { isNull, eq } from 'drizzle-orm'
import { resolve } from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { extractText } from '#lms/utils/tiptapText'

interface SearchEntry {
  text: string
  headingId: string | null
  type: 'heading' | 'text'
  level?: number
  url: string
  sourceName: string
  sourceType: 'course' | 'chapter'
}

/**
 * Extract search entries from tiptap JSON content
 * @param headingsOnly - when true, only extract headings; when false, extract headings + paragraph text
 */
function extractSearchEntries(
  content: Record<string, any> | null | undefined,
  url: string,
  sourceName: string,
  sourceType: 'course' | 'chapter',
  headingsOnly: boolean,
): SearchEntry[] {
  if (!content) return []

  const entries: SearchEntry[] = []
  let nearestHeadingId: string | null = null

  function walk(node: any) {
    if (!node) return
    if (node.type === 'heading') {
      const headingId = node.attrs?.id || node.attrs?.['data-toc-id'] || null
      const level = node.attrs?.level ?? 1
      const text = extractText(node.content)
      if (text) {
        nearestHeadingId = headingId
        entries.push({
          text: text.trim(),
          headingId,
          type: 'heading',
          level,
          url,
          sourceName,
          sourceType,
        })
      }
    } else if (!headingsOnly) {
      // Non-heading content is only extracted in non-headingsOnly mode
      if (node.type === 'paragraph') {
        const text = extractText(node.content)
        if (text && text.trim()) {
          entries.push({
            text: text.trim(),
            headingId: nearestHeadingId,
            type: 'text',
            url,
            sourceName,
            sourceType,
          })
        }
      } else if (node.type === 'blockquote') {
        const text = extractText(node.content)
        if (text && text.trim()) {
          entries.push({
            text: text.trim(),
            headingId: nearestHeadingId,
            type: 'text',
            url,
            sourceName,
            sourceType,
          })
        }
      } else if (node.type === 'bulletList' || node.type === 'orderedList') {
        if (Array.isArray(node.content)) {
          for (const item of node.content) {
            walkListItem(item)
          }
        }
      } else if (node.type === 'listItem') {
        walkListItem(node)
      } else if (node.type === 'callout') {
        const text = extractText(node.content)
        if (text && text.trim()) {
          entries.push({
            text: text.trim(),
            headingId: nearestHeadingId,
            type: 'text',
            url,
            sourceName,
            sourceType,
          })
        }
      }
    }

    // Recurse child nodes
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(walk)
    }
  }

  function walkListItem(item: any) {
    if (!item) return
    if (Array.isArray(item.content)) {
      for (const child of item.content) {
        if (child.type === 'paragraph') {
          const text = extractText(child.content)
          if (text && text.trim()) {
            entries.push({
              text: text.trim(),
              headingId: nearestHeadingId,
              type: 'text',
              url,
              sourceName,
              sourceType,
            })
          }
        } else if (child.type === 'bulletList' || child.type === 'orderedList') {
          walk(child)
        } else {
          walk(child)
        }
      }
    }
  }

  walk(content)
  return entries
}

export default defineTask({
  meta: {
    name: 'build-search',
    description: 'Scan the tiptap content of all courses and chapters, build a global index (search/index.json) and a per-course index (search/[courseId].json)',
  },
  async run() {
    console.log('[build-search] Start building search index...')

    // Create the search subdirectory
    const searchDir = resolve('./storage/search')
    await mkdir(searchDir, { recursive: true })

    // ----- Query all non-deleted courses -----
    const allCourses = await db
      .select({
        id: schema.courses.id,
        name: schema.courses.name,
        content: schema.courses.content,
      })
      .from(schema.courses)
      .where(isNull(schema.courses.deletedAt))

    // ----- Query all non-deleted chapters (with course name joined) -----
    const allChapters = await db
      .select({
        id: schema.chapters.id,
        name: schema.chapters.name,
        content: schema.chapters.content,
        courseId: schema.chapters.courseId,
        courseName: schema.courses.name,
      })
      .from(schema.chapters)
      .innerJoin(schema.courses, eq(schema.chapters.courseId, schema.courses.id))
      .where(isNull(schema.chapters.deletedAt))

    // Group chapters by course
    const chaptersByCourse = new Map<number, typeof allChapters>()
    for (const ch of allChapters) {
      if (!chaptersByCourse.has(ch.courseId)) {
        chaptersByCourse.set(ch.courseId, [])
      }
      chaptersByCourse.get(ch.courseId)!.push(ch)
    }

    // ----- 1. Generate search/index.json (headings only) -----
    const globalEntries: SearchEntry[] = []

    for (const course of allCourses) {
      const url = `/course/${course.id}`
      const entries = extractSearchEntries(
        course.content as Record<string, any> | null,
        url,
        course.name,
        'course',
        true, // headingsOnly
      )
      globalEntries.push(...entries)
    }

    for (const chapter of allChapters) {
      const url = `/course/${chapter.courseId}/${chapter.id}`
      const entries = extractSearchEntries(
        chapter.content as Record<string, any> | null,
        url,
        `${chapter.courseName} > ${chapter.name}`,
        'chapter',
        true, // headingsOnly
      )
      globalEntries.push(...entries)
    }

    await writeFile(
      resolve(searchDir, 'index.json'),
      JSON.stringify(globalEntries, null, 2),
      'utf-8',
    )
    console.log(`[build-search] search/index.json written, total ${globalEntries.length} headings`)

    // ----- 2. Generate search/[courseId].json (heading + text) for each course -----
    let totalPerCourseEntries = 0

    for (const course of allCourses) {
      const courseEntries: SearchEntry[] = []

      // Content of the course itself
      const courseUrl = `/course/${course.id}`
      const ce = extractSearchEntries(
        course.content as Record<string, any> | null,
        courseUrl,
        course.name,
        'course',
        false, // headingsOnly = false, includes text
      )
      courseEntries.push(...ce)

      // Content of all chapters in this course
      const courseChapters = chaptersByCourse.get(course.id) || []
      for (const chapter of courseChapters) {
        const chapterUrl = `/course/${chapter.courseId}/${chapter.id}`
        const che = extractSearchEntries(
          chapter.content as Record<string, any> | null,
          chapterUrl,
          `${chapter.courseName} > ${chapter.name}`,
          'chapter',
          false, // headingsOnly = false, includes text
        )
        courseEntries.push(...che)
      }

      await writeFile(
        resolve(searchDir, `${course.id}.json`),
        JSON.stringify(courseEntries, null, 2),
        'utf-8',
      )
      totalPerCourseEntries += courseEntries.length
    }

    console.log(`[build-search] Per-course index built, total ${totalPerCourseEntries} records (${allCourses.length} course files)`)

    return {
      result: `✅ Search index build complete`,
      global: { file: 'search/index.json', count: globalEntries.length },
      perCourse: { dir: 'search/', files: allCourses.length, totalEntries: totalPerCourseEntries },
    }
  },
})
