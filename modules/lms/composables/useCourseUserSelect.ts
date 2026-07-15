type CourseUserSelectEmit = {
  (e: 'impersonated', userId: number): void
  (e: 'restored'): void
}

/**
 * Course user switching (teacher/admin view as a student)
 */
export function useCourseUserSelect(
  props: { courseId: number },
  emit: CourseUserSelectEmit,
) {
  const { t } = useI18n()
  const toast = useToast()
  const { hasRole, refreshUser, user } = useAuth()
  const { students, fetchUsers } = useClassUsers()

  // Record original role (teacher or admin), retained after switching to student
  const originalIsAdmin = computed(() => hasRole('admin'))
  const isAdmin = ref(false)

  const loading = ref(false)
  const restoring = ref(false)
  const selectedUserId = ref<number | null>(null)
  const impersonating = ref(false)
  const allStudents = ref<any[]>([])

  // Admin: all students; Teacher: current class students
  const userOptions = computed(() => {
    const list = isAdmin.value ? allStudents.value : students.value
    return list.map(s => ({
      label: `${s.name}${s.preferName ? ` (${s.preferName})` : ''}`,
      value: s.id,
    }))
  })

  // Load student list
  async function loadStudents() {
    loading.value = true
    try {
      // Record initial role (still teacher/admin when loading)
      isAdmin.value = originalIsAdmin.value
      if (isAdmin.value) {
        const data = await cRequest<any[]>('/api/users/students')
        allStudents.value = data || []
      } else {
        const classId = user.value?.defaultClass?.id
        if (classId) {
          await fetchUsers(classId, props.courseId)
        }
      }
    } catch (e) {
      console.error('[userSelect] Failed to load students', e)
    } finally {
      loading.value = false
    }
  }

  // Select student → switch identity
  async function onSelect(userId: number) {
    if (!userId) return
    try {
      await cRequest('/api/auth/impersonate', {
        method: 'POST',
        body: { userId },
      })
      // Set localStorage flag for auto-restore on page refresh
      if (import.meta.client) {
        localStorage.setItem('impersonating', 'true')
      }
      impersonating.value = true
      // Refresh user state
      await refreshUser()
      toast.add({ title: t('coursePanel.impersonateSuccess'), color: 'success' })
      // Notify parent component to reload data
      emit('impersonated', userId)
    } catch (e: any) {
      toast.add({ title: e.message || t('coursePanel.impersonateFailed'), color: 'error' })
      selectedUserId.value = null
    }
  }

  // Restore original identity
  async function restore() {
    restoring.value = true
    try {
      await cRequest('/api/auth/restore', { method: 'POST' })
      if (import.meta.client) {
        localStorage.removeItem('impersonating')
      }
      impersonating.value = false
      selectedUserId.value = null
      await refreshUser()
      toast.add({ title: t('coursePanel.restoreSuccess'), color: 'success' })
      emit('restored')
    } catch (e: any) {
      toast.add({ title: e.message || t('coursePanel.restoreFailed'), color: 'error' })
    } finally {
      restoring.value = false
    }
  }

  onMounted(() => {
    loadStudents()
  })

  return {
    loading,
    restoring,
    selectedUserId,
    impersonating,
    allStudents,
    userOptions,
    loadStudents,
    onSelect,
    restore,
  }
}
