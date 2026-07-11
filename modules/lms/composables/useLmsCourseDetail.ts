import type { ComputedRef } from 'vue'

/**
 * 课程详情页 lms 扩展
 *
 * 在通用 useCourseDetailPage 之上叠加 lms 专属字段：
 *   - chapterTree：加 accessible / isOpen / isPass（来自 course.chapters）
 *   - firstChapterUrl：排除不可访问章节
 *   - progressPercent：已通过章节数 / 总章节数（无章节时返回 null 隐藏进度条）
 *
 * 提取自 pages/course/[id]/index.vue，让 page 只做组件组合。
 */
export function useLmsCourseDetail(courseId: ComputedRef<string>, apiUrl: ComputedRef<string>) {
  const base = useCourseDetailPage(courseId, apiUrl)

  // lms 扩展：chapterTree 加 accessible / isOpen / isPass 字段
  const chapterTree = computed(() => {
    const chapters = base.course.value?.chapters || []
    const chapterMap = new Map(chapters.map(ch => [ch.id, ch]))
    return base.chapterTree.value.map(item => {
      const ch = chapterMap.get(Number(item.id))
      return { ...item, accessible: ch?.accessible ?? true, isOpen: ch?.isOpen, isPass: ch?.isPass }
    })
  })

  // lms 扩展：firstChapterUrl 排除不可访问的章节
  const firstChapterUrl = computed(() => {
    const first = chapterTree.value.find(ch => ch.accessible !== false && ch.to && !ch.to.includes('#'))
    return first?.to
  })

  // lms 扩展：学习进度（已通过章节数 / 总章节数）
  const progressPercent = computed(() => {
    if (!base.course.value?.chapters?.length) return null
    const total = base.course.value.chapters.length
    const passed = base.course.value.chapters.filter(ch => ch.isPass).length
    return Math.round((passed / total) * 100)
  })

  return {
    ...base,
    chapterTree,
    firstChapterUrl,
    progressPercent,
  }
}
