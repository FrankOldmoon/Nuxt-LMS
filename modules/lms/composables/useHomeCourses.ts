import type { LmsCourseSummary } from '#lms/types/lms'

/**
 * 首页课程列表的派生数据与排序逻辑
 *
 * - categories：从 useHome() 单例数据派生的分类列表
 * - getCoursesByCategory：返回某分类下的课程；若该分类配置了 orders，
 *   按 orders.order 排序后过滤掉已不存在的课程（与 useHeaderNav 一致）
 *
 * 抽出本 composable 是为了消除 pages/index.vue 与 useHeaderNav 之间
 * 重复的 orders 排序逻辑，并让首页 page 只做组件组合。
 */
export function useHomeCourses() {
  const { data: homeData } = useHome()

  const categories = computed(() => homeData.value?.categories ?? [])

  function getCoursesByCategory(categoryId: number): LmsCourseSummary[] {
    const cat = categories.value.find((c) => c.id === categoryId)
    const catCourses = (homeData.value?.courses ?? []).filter((c) => c.categoryId === categoryId)

    // 如果分类有 orders 配置，按 orders 中的 order 排序显示
    if (cat?.orders && cat.orders.length > 0) {
      const courseMap = new Map(catCourses.map((c) => [String(c.id), c]))
      const sorted = [...cat.orders].sort((a, b) => a.order - b.order)
      return sorted.filter((o) => courseMap.has(o.id)).map((o) => courseMap.get(o.id)!)
    }

    return catCourses
  }

  return { categories, getCoursesByCategory }
}
