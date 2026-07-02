import { db, schema } from '@nuxthub/db'
import { isNull, eq } from 'drizzle-orm'
import { resolve } from 'path'
import { writeFile, mkdir } from 'fs/promises'

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
 * 递归提取 tiptap inline content 节点中的纯文本
 */
function extractText(nodes: any[]): string {
  if (!nodes) return ''
  return nodes
    .map((node: any) => {
      if (node.type === 'text') return node.text ?? ''
      if (node.content) return extractText(node.content)
      return ''
    })
    .join('')
}

/**
 * 从 tiptap JSON content 中提取所有 heading 和段落文本
 * 返回 search entries，每个 entry 带有最近的 heading id 用于锚点定位
 */
function extractSearchEntries(
  content: Record<string, any> | null | undefined,
  url: string,
  sourceName: string,
  sourceType: 'course' | 'chapter',
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
    } else if (node.type === 'paragraph') {
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
      // 列表项中的文字
      if (Array.isArray(node.content)) {
        for (const item of node.content) {
          walkListItem(item)
        }
      }
    } else if (node.type === 'listItem') {
      walkListItem(node)
    } else if (node.type === 'codeBlock') {
      // 代码块不加入搜索
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

    // 递归子节点（包括 doc、column、table 等容器节点）
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
    description: '扫描所有课程和章节的 tiptap 内容，构建搜索索引到 storage/search.json',
  },
  async run() {
    console.log('[build-search] 开始构建搜索索引...')

    const allEntries: SearchEntry[] = []

    // 查询所有未删除的课程
    const allCourses = await db
      .select({
        id: schema.courses.id,
        name: schema.courses.name,
        content: schema.courses.content,
      })
      .from(schema.courses)
      .where(isNull(schema.courses.deletedAt))

    //console.log(`[build-search] 找到 ${allCourses.length} 个课程`)

    for (const course of allCourses) {
      const url = `/course/${course.id}`
      const entries = extractSearchEntries(
        course.content as Record<string, any> | null,
        url,
        course.name,
        'course',
      )
      allEntries.push(...entries)
    }

    // 查询所有未删除的章节（关联课程名）
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

    //console.log(`[build-search] 找到 ${allChapters.length} 个章节`)

    for (const chapter of allChapters) {
      const url = `/course/${chapter.courseId}/${chapter.id}`
      const entries = extractSearchEntries(
        chapter.content as Record<string, any> | null,
        url,
        `${chapter.courseName} > ${chapter.name}`,
        'chapter',
      )
      allEntries.push(...entries)
    }

    // 写入 storage/search.json
    const storagePath = resolve('./storage')
    const filePath = resolve(storagePath, 'search.json')

    // 确保 storage 目录存在
    await mkdir(storagePath, { recursive: true })

    const jsonContent = JSON.stringify(allEntries, null, 2)
    await writeFile(filePath, jsonContent, 'utf-8')

    //console.log(`[build-search] 搜索索引构建完成，共 ${allEntries.length} 条记录 -> ${filePath}`)

    return {
      result: `✅ 搜索索引构建完成，共 ${allEntries.length} 条记录`,
      count: allEntries.length,
      file: filePath,
    }
  },
})
