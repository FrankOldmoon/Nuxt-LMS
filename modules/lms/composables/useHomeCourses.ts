import type { LmsCourseSummary } from '#lms/types/lms'

/**
 * Home page course list derived data and sorting logic
 *
 * - categories: category list derived from useHome() singleton data
 * - getCoursesByCategory: returns courses under a category; if the category has orders configured,
 *   sort by orders.order and filter out courses that no longer exist (consistent with useHeaderNav)
 *
 * This composable is extracted to eliminate the duplicated orders sorting logic between
 * pages/index.vue and useHeaderNav, and let the home page only do component composition.
 */
export function useHomeCourses() {
  const { data: homeData } = useHome()

  const categories = computed(() => homeData.value?.categories ?? [])

  function getCoursesByCategory(categoryId: number): LmsCourseSummary[] {
    const cat = categories.value.find((c) => c.id === categoryId)
    const catCourses = (homeData.value?.courses ?? []).filter((c) => c.categoryId === categoryId)

    // If the category has orders config, sort by order in orders
    if (cat?.orders && cat.orders.length > 0) {
      const courseMap = new Map(catCourses.map((c) => [String(c.id), c]))
      const sorted = [...cat.orders].sort((a, b) => a.order - b.order)
      return sorted.filter((o) => courseMap.has(o.id)).map((o) => courseMap.get(o.id)!)
    }

    return catCourses
  }

  return { categories, getCoursesByCategory }
}
