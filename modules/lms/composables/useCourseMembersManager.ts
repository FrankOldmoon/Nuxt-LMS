import type { LmsMember, LmsSearchUser } from '#lms/types/lms'

/**
 * 课程成员管理：加载教师/编辑者、搜索用户、添加/移除成员
 */
export function useCourseMembersManager(props: { courseId: number }) {
  const { t } = useI18n()
  const toast = useToast()

  const members = ref<LmsMember[]>([])
  const memberSearchKeyword = ref('')
  const searchResults = ref<LmsSearchUser[]>([])
  const memberUpdating = ref<number | null>(null)

  const teachers = computed(() => members.value.filter((m) => m.isTeacher))
  const editors = computed(() => members.value.filter((m) => m.isEditor))

  function isMemberRole(userId: number, role: 'teacher' | 'editor'): boolean {
    const m = members.value.find((m) => m.userId === userId)
    if (!m) return false
    return role === 'teacher' ? m.isTeacher : m.isEditor
  }

  async function loadMembers() {
    try {
      const data = await cRequest<LmsMember[]>(`/api/courses/members?id=${props.courseId}`)
      members.value = data || []
    } catch {
      members.value = []
    }
  }

  async function searchUsers() {
    const keyword = memberSearchKeyword.value.trim()
    if (!keyword) {
      searchResults.value = []
      return
    }
    try {
      const data = await cRequest<LmsSearchUser[]>(
        `/api/courses/members-search?courseId=${props.courseId}&keyword=${encodeURIComponent(keyword)}`,
      )
      searchResults.value = data || []
    } catch {
      searchResults.value = []
    }
  }

  async function addMember(userId: number, role: 'teacher' | 'editor') {
    memberUpdating.value = userId
    try {
      await cRequest('/api/courses/members', {
        method: 'POST',
        body: { courseId: props.courseId, userId, role, action: 'add' },
      })
      await loadMembers()
      toast.add({ title: t('courseEditor.memberAdded'), color: 'success' })
    } catch (e: any) {
      toast.add({ title: e.message || t('courseEditor.memberUpdateFailed'), color: 'error' })
    } finally {
      memberUpdating.value = null
    }
  }

  async function removeMember(userId: number, role: 'teacher' | 'editor') {
    memberUpdating.value = userId
    try {
      await cRequest('/api/courses/members', {
        method: 'POST',
        body: { courseId: props.courseId, userId, role, action: 'remove' },
      })
      await loadMembers()
      toast.add({ title: t('courseEditor.memberRemoved'), color: 'success' })
    } catch (e: any) {
      toast.add({ title: e.message || t('courseEditor.memberUpdateFailed'), color: 'error' })
    } finally {
      memberUpdating.value = null
    }
  }

  watch(memberSearchKeyword, () => searchUsers())

  return {
    members,
    memberSearchKeyword,
    searchResults,
    memberUpdating,
    teachers,
    editors,
    isMemberRole,
    loadMembers,
    searchUsers,
    addMember,
    removeMember,
  }
}
