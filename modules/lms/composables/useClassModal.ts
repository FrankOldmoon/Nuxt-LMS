import { inject, provide, type InjectionKey } from 'vue'
import type { LmsClass, LmsSearchUser } from '#lms/types/lms'

const ClassModalKey = Symbol('ClassModal') as InjectionKey<ReturnType<typeof useClassModal>>

export function provideClassModal(ctx: ReturnType<typeof useClassModal>) {
  provide(ClassModalKey, ctx)
}

export function useClassModalContext() {
  const ctx = inject(ClassModalKey)
  if (!ctx) throw new Error('useClassModalContext must be used within ClassModal')
  return ctx
}

/**
 * 班级选择弹窗：班级切换/新增/改名 + 成员搜索添加（学生/教师）
 */
export function useClassModal(open: Ref<boolean>) {
  const { user, refreshUser, hasRole } = useAuth()
  const toast = useToast()
  const { t } = useI18n()
  const { courseId } = useLmsContext()
  const { fetchUsers } = useClassUsers()

  // ==================== 班级选择 ====================
  const { classes: classList, loadClasses: loadClassList } = useClasses()
  const classLoading = ref(false)
  const selectedItem = ref<number | undefined>(undefined)
  const newClassName = ref('')
  const adding = ref(false)
  const classUsersTableRef = ref<{ refresh: () => void } | null>(null)

  const selectedClassId = computed(() => user.value?.defaultClass?.id ?? null)
  const classOptions = computed(() =>
    classList.value.map((c) => ({ label: c.name, value: c.id })),
  )

  async function loadClasses() {
    classLoading.value = true
    try {
      await loadClassList()
    } finally {
      classLoading.value = false
    }
  }

  // ==================== 学生模式（单选班级） ====================
  const studentMode = computed(() => !hasRole('admin') && classList.value.length === 0)
  const myClasses = ref<LmsClass[]>([])
  const myClassLoading = ref(false)
  const selectedMyClassId = ref<number | null>(null)
  const myClassOptions = computed(() =>
    myClasses.value.map((c) => ({ label: c.name, value: c.id })),
  )

  async function loadMyClasses() {
    myClassLoading.value = true
    try {
      const data = await cRequest<LmsClass[]>('/api/classes/mine')
      myClasses.value = data || []
      selectedMyClassId.value = selectedClassId.value ?? null
    } catch {
      myClasses.value = []
    } finally {
      myClassLoading.value = false
    }
  }

  async function onMyClassChange(value: number | null) {
    if (!value) return
    const c = myClasses.value.find((c) => c.id === value)
    if (!c) return
    await switchClass(c.id, c.name)
  }

  async function switchClass(classId: number, className: string) {
    try {
      await cRequest('/api/auth/me', {
        method: 'PUT',
        body: { defaultClass: { id: classId, name: className } },
      })
      await refreshUser()
      await fetchUsers(classId, courseId.value)
      toast.add({ title: t('classSelector.updateSuccess'), color: 'success' })
    } catch (e: any) {
      toast.add({ title: e.message || t('classSelector.updateFailed'), color: 'error' })
    }
  }

  async function onClassChange() {
    const classId = selectedItem.value
    if (!classId) return
    const c = classList.value.find((c) => c.id === classId)
    if (!c) return
    await switchClass(c.id, c.name)
  }

  async function addClass() {
    const name = newClassName.value.trim()
    if (!name) return
    adding.value = true
    try {
      const result = await cRequest<LmsClass[]>('/api/classes/add', {
        method: 'POST',
        body: { name, code: name },
      })
      newClassName.value = ''
      await loadClasses()
      const newClass = result?.[0]
      if (newClass) {
        await cRequest('/api/auth/me', {
          method: 'PUT',
          body: { defaultClass: { id: newClass.id, name: newClass.name } },
        })
        await refreshUser()
        selectedItem.value = newClass.id
      }
      toast.add({ title: t('classSelector.addClassSuccess'), color: 'success' })
    } catch (e: any) {
      toast.add({ title: e.message || t('classSelector.addClassFailed'), color: 'error' })
    } finally {
      adding.value = false
    }
  }

  // ==================== 编辑班级名称 ====================
  const editingClassName = ref(false)
  const editClassName = ref('')
  const savingClassName = ref(false)

  function startEditClassName() {
    const c = classList.value.find((c) => c.id === selectedClassId.value)
    editClassName.value = c?.name || ''
    editingClassName.value = true
  }

  function cancelEditClassName() {
    editingClassName.value = false
    editClassName.value = ''
  }

  async function saveClassName() {
    const name = editClassName.value.trim()
    if (!name || !selectedClassId.value) return
    savingClassName.value = true
    try {
      await cRequest('/api/classes/update', {
        method: 'POST',
        body: { id: selectedClassId.value, name },
      })
      await cRequest('/api/auth/me', {
        method: 'PUT',
        body: { defaultClass: { id: selectedClassId.value, name } },
      })
      await refreshUser()
      await loadClasses()
      editingClassName.value = false
      editClassName.value = ''
      toast.add({ title: t('classSelector.editClassNameSuccess'), color: 'success' })
    } catch (e: any) {
      toast.add({ title: e.message || t('classSelector.editClassNameFailed'), color: 'error' })
    } finally {
      savingClassName.value = false
    }
  }

  // ==================== 学生搜索与添加 ====================
  const studentSearch = ref('')
  const studentSearching = ref(false)
  const studentSearchResults = ref<LmsSearchUser[]>([])
  const selectedStudents = ref<LmsSearchUser[]>([])
  const addingStudents = ref(false)
  let _studentTimer: ReturnType<typeof setTimeout> | null = null

  function isSelectedStudent(userId: number) {
    return selectedStudents.value.some((u) => u.id === userId)
  }
  function toggleStudentSelect(user: LmsSearchUser) {
    if (isSelectedStudent(user.id)) {
      removeSelectedStudent(user.id)
    } else {
      selectedStudents.value.push(user)
    }
  }
  function removeSelectedStudent(userId: number) {
    selectedStudents.value = selectedStudents.value.filter((u) => u.id !== userId)
  }
  function onStudentSearchInput() {
    if (_studentTimer) clearTimeout(_studentTimer)
    const keyword = studentSearch.value.trim()
    if (!keyword) { studentSearchResults.value = []; return }
    studentSearching.value = true
    _studentTimer = setTimeout(async () => {
      try {
        const data = await cRequest<LmsSearchUser[]>(`/api/users/search?keyword=${encodeURIComponent(keyword)}`)
        studentSearchResults.value = data || []
      } catch { studentSearchResults.value = [] }
      finally { studentSearching.value = false }
    }, 300)
  }
  async function addStudentsToClass() {
    if (!selectedClassId.value || !selectedStudents.value.length) return
    addingStudents.value = true
    try {
      await cRequest('/api/classes/users', {
        method: 'POST',
        body: { classId: selectedClassId.value, userIds: selectedStudents.value.map((u) => u.id) },
      })
      toast.add({ title: t('classSelector.addStudentsSuccess'), color: 'success' })
      selectedStudents.value = []; studentSearch.value = ''; studentSearchResults.value = []
      if (selectedClassId.value) await fetchUsers(selectedClassId.value, courseId.value)
    } catch (e: any) {
      toast.add({ title: e.message || t('classSelector.addStudentsFailed'), color: 'error' })
    } finally { addingStudents.value = false }
  }

  // ==================== 教师搜索与添加 ====================
  const teacherSearch = ref('')
  const teacherSearching = ref(false)
  const teacherSearchResults = ref<LmsSearchUser[]>([])
  const selectedTeachers = ref<LmsSearchUser[]>([])
  const addingTeachers = ref(false)
  let _teacherTimer: ReturnType<typeof setTimeout> | null = null

  function isSelectedTeacher(userId: number) {
    return selectedTeachers.value.some((u) => u.id === userId)
  }
  function toggleTeacherSelect(user: LmsSearchUser) {
    if (isSelectedTeacher(user.id)) {
      removeSelectedTeacher(user.id)
    } else {
      selectedTeachers.value.push(user)
    }
  }
  function removeSelectedTeacher(userId: number) {
    selectedTeachers.value = selectedTeachers.value.filter((u) => u.id !== userId)
  }
  function onTeacherSearchInput() {
    if (_teacherTimer) clearTimeout(_teacherTimer)
    const keyword = teacherSearch.value.trim()
    if (!keyword) { teacherSearchResults.value = []; return }
    teacherSearching.value = true
    _teacherTimer = setTimeout(async () => {
      try {
        const data = await cRequest<LmsSearchUser[]>(`/api/users/search?keyword=${encodeURIComponent(keyword)}`)
        teacherSearchResults.value = data || []
      } catch { teacherSearchResults.value = [] }
      finally { teacherSearching.value = false }
    }, 300)
  }
  async function addTeachersToClass() {
    if (!selectedClassId.value || !selectedTeachers.value.length) return
    addingTeachers.value = true
    try {
      await cRequest('/api/classes/users', {
        method: 'POST',
        body: { classId: selectedClassId.value, userIds: selectedTeachers.value.map((u) => u.id), isTeacher: true },
      })
      toast.add({ title: t('classSelector.addTeachersSuccess'), color: 'success' })
      selectedTeachers.value = []; teacherSearch.value = ''; teacherSearchResults.value = []
      if (selectedClassId.value) await fetchUsers(selectedClassId.value, courseId.value)
    } catch (e: any) {
      toast.add({ title: e.message || t('classSelector.addTeachersFailed'), color: 'error' })
    } finally { addingTeachers.value = false }
  }

  // ==================== 初始化 ====================
  watch(open, async (val) => {
    if (val) {
      selectedItem.value = selectedClassId.value ?? undefined
      newClassName.value = ''
      editingClassName.value = false
      editClassName.value = ''
      studentSearch.value = ''
      studentSearchResults.value = []
      selectedStudents.value = []
      teacherSearch.value = ''
      teacherSearchResults.value = []
      selectedTeachers.value = []
      await loadClasses()
      if (studentMode.value) {
        await loadMyClasses()
      } else if (selectedClassId.value) {
        await fetchUsers(selectedClassId.value, courseId.value)
      }
    }
  })

  // 用户加载完成后存在 default_class 时，无需弹开 select-class，一进页面即预取学生名单
  watch(
    () => selectedClassId.value,
    async (id) => {
      if (id) await fetchUsers(id, courseId.value)
    },
    { immediate: true },
  )

  return {
    hasRole,
    classLoading, myClassLoading,
    studentMode, myClasses, myClassOptions, selectedMyClassId, onMyClassChange,
    classOptions, selectedItem, classList, onClassChange,
    newClassName, adding, addClass,
    selectedClassId, classUsersTableRef,
    editingClassName, editClassName, savingClassName,
    startEditClassName, cancelEditClassName, saveClassName,
    // 学生
    studentSearch, studentSearching, studentSearchResults, selectedStudents, addingStudents,
    isSelectedStudent, toggleStudentSelect, removeSelectedStudent, onStudentSearchInput, addStudentsToClass,
    // 教师
    teacherSearch, teacherSearching, teacherSearchResults, selectedTeachers, addingTeachers,
    isSelectedTeacher, toggleTeacherSelect, removeSelectedTeacher, onTeacherSearchInput, addTeachersToClass,
  }
}
