/**
 * 课程列表 composable
 */
export interface CourseOption {
  id: number
  name: string
  code: string | null
}

export function useCourses() {
  const courses = ref<CourseOption[]>([])

  const courseOptions = computed(() =>
    courses.value.map((c) => ({ label: c.name, value: c.id })),
  )

  async function loadCourses() {
    try {
      const data = await cRequest<CourseOption[]>('/api/courses/list')
      courses.value = data || []
    } catch {
      courses.value = []
    }
  }

  return { courses, courseOptions, loadCourses }
}
