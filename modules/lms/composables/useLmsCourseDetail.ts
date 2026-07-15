import type { ComputedRef } from 'vue'

/**
 * Course detail page lms extension
 *
 * Layered on top of the generic useCourseDetailPage with lms-specific fields:
 *   - chapterTree: add accessible / isOpen / isPass (from course.chapters)
 *   - firstChapterUrl: exclude inaccessible chapters
 *   - progressPercent: passed chapters / total chapters (returns null to hide progress bar when no chapters)
 *
 * Extracted from pages/course/[id]/index.vue, letting the page only do component composition.
 */
export function useLmsCourseDetail(courseId: ComputedRef<string>, apiUrl: ComputedRef<string>) {
  const base = useCourseDetailPage(courseId, apiUrl)

  // lms extension: chapterTree adds accessible / isOpen / isPass fields
  const chapterTree = computed(() => {
    const chapters = base.course.value?.chapters || []
    const chapterMap = new Map(chapters.map(ch => [ch.id, ch]))
    return base.chapterTree.value.map(item => {
      const ch = chapterMap.get(Number(item.id))
      return { ...item, accessible: ch?.accessible ?? true, isOpen: ch?.isOpen, isPass: ch?.isPass }
    })
  })

  // lms extension: firstChapterUrl excludes inaccessible chapters
  const firstChapterUrl = computed(() => {
    const first = chapterTree.value.find(ch => ch.accessible !== false && ch.to && !ch.to.includes('#'))
    return first?.to
  })

  // lms extension: learning progress (passed chapters / total chapters)
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
