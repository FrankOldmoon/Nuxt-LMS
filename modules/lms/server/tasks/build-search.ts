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
 * 从 tiptap JSON content 中提取搜索条目
 * @param headingsOnly - true 时只提取 heading，false 时提取 heading + 段落文本
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
      // 非 heading 内容仅在非 headingsOnly 模式下提取
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

    // 递归子节点
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
    description: '扫描所有课程和章节的 tiptap 内容，构建全局索引(search/index.json)和每课程索引(search/[courseId].json)',
  },
  async run() {
    console.log('[build-search] 开始构建搜索索引...')

    // 创建 search 子目录
    const searchDir = resolve('./storage/search')
    await mkdir(searchDir, { recursive: true })

    // ----- 查询所有未删除的课程 -----
    const allCourses = await db
      .select({
        id: schema.courses.id,
        name: schema.courses.name,
        content: schema.courses.content,
      })
      .from(schema.courses)
      .where(isNull(schema.courses.deletedAt))

    // ----- 查询所有未删除的章节（关联课程名） -----
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

    // 按课程分组章节
    const chaptersByCourse = new Map<number, typeof allChapters>()
    for (const ch of allChapters) {
      if (!chaptersByCourse.has(ch.courseId)) {
        chaptersByCourse.set(ch.courseId, [])
      }
      chaptersByCourse.get(ch.courseId)!.push(ch)
    }

    // ----- 1. 生成 search/index.json（仅 heading） -----
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
    console.log(`[build-search] search/index.json 写入完成，共 ${globalEntries.length} 条 heading`)

    // ----- 2. 为每个课程生成 search/[courseId].json（heading + text） -----
    let totalPerCourseEntries = 0

    for (const course of allCourses) {
      const courseEntries: SearchEntry[] = []

      // 课程本身的内容
      const courseUrl = `/course/${course.id}`
      const ce = extractSearchEntries(
        course.content as Record<string, any> | null,
        courseUrl,
        course.name,
        'course',
        false, // headingsOnly = false，包含 text
      )
      courseEntries.push(...ce)

      // 该课程的所有章节内容
      const courseChapters = chaptersByCourse.get(course.id) || []
      for (const chapter of courseChapters) {
        const chapterUrl = `/course/${chapter.courseId}/${chapter.id}`
        const che = extractSearchEntries(
          chapter.content as Record<string, any> | null,
          chapterUrl,
          `${chapter.courseName} > ${chapter.name}`,
          'chapter',
          false, // headingsOnly = false，包含 text
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

    console.log(`[build-search] 每个课程的索引构建完成，共 ${totalPerCourseEntries} 条记录（${allCourses.length} 个课程文件）`)

    return {
      result: `✅ 搜索索引构建完成`,
      global: { file: 'search/index.json', count: globalEntries.length },
      perCourse: { dir: 'search/', files: allCourses.length, totalEntries: totalPerCourseEntries },
    }
  },
})
