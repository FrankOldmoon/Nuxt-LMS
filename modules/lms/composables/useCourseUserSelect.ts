type CourseUserSelectEmit = {
  (e: 'impersonated', userId: number): void
  (e: 'restored'): void
}

/**
 * 课程用户切换（教师/管理员以学生身份查看）
 */
export function useCourseUserSelect(
  props: { courseId: number },
  emit: CourseUserSelectEmit,
) {
  const { t } = useI18n()
  const toast = useToast()
  const { hasRole, refreshUser, user } = useAuth()
  const { students, fetchUsers } = useClassUsers()

  // 记录原始角色（教师或管理员），切换学生后仍保留显示
  const originalIsAdmin = computed(() => hasRole('admin'))
  const isAdmin = ref(false)

  const loading = ref(false)
  const restoring = ref(false)
  const selectedUserId = ref<number | null>(null)
  const impersonating = ref(false)
  const allStudents = ref<any[]>([])

  // 与 select class 一致：始终显示当前班级（defaultClass）的学生；View As 列表按字母顺序排序
  const userOptions = computed(() => students.value
    .map(s => ({
      label: s.name || `#${s.id}`,
      value: s.id,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' })))

  // 加载学生列表：使用当前 defaultClass 班级（与 select class 的班级学生一致）
  async function loadStudents() {
    loading.value = true
    try {
      // 记录初始角色（加载时仍是教师/管理员）
      isAdmin.value = originalIsAdmin.value
      const classId = user.value?.defaultClass?.id
      if (classId) {
        await fetchUsers(classId, props.courseId)
      }
    } catch (e) {
      console.error('[userSelect] 加载学生失败', e)
    } finally {
      loading.value = false
    }
  }

  // 选择学生 → 切换身份
  async function onSelect(userId: number) {
    if (!userId) return
    try {
      await cRequest('/api/auth/impersonate', {
        method: 'POST',
        body: { userId },
      })
      // 设置 localStorage 标记，刷新页面时自动恢复
      if (import.meta.client) {
        localStorage.setItem('impersonating', 'true')
      }
      impersonating.value = true
      // 刷新用户状态
      await refreshUser()
      toast.add({ title: t('coursePanel.impersonateSuccess'), color: 'success' })
      // 通知父组件重新加载数据
      emit('impersonated', userId)
    } catch (e: any) {
      toast.add({ title: e.message || t('coursePanel.impersonateFailed'), color: 'error' })
      selectedUserId.value = null
    }
  }

  // 恢复原始身份
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
