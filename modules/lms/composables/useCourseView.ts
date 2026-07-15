export interface CourseViewProps {
  course: any
  pending: boolean
  canEdit: boolean
  hasContent: boolean
  chapterTree: any[]
  firstChapterUrl?: string
  exporting: boolean
  canManageTeachers: boolean
  courseId: string | number
}

/** Course detail view: page title + teacher management modal state */
export function useCourseView(props: CourseViewProps, emit: (e: 'saved') => void) {
  const { siteTitle } = useSiteConfig()

  useHead(computed(() => ({
    title: props.course?.title ? `${props.course.title} - ${siteTitle.value}` : siteTitle.value,
  })))

  const teachersModalOpen = ref(false)
  const membersEl = ref<{ loadMembers: () => Promise<void> } | null>(null)

  function openTeachersModal() {
    teachersModalOpen.value = true
  }

  function closeTeachersModal() {
    teachersModalOpen.value = false
  }

  watch(teachersModalOpen, (val: boolean) => {
    if (val) {
      nextTick(() => membersEl.value?.loadMembers())
    } else {
      emit('saved')
    }
  })

  return { teachersModalOpen, membersEl, openTeachersModal, closeTeachersModal }
}
