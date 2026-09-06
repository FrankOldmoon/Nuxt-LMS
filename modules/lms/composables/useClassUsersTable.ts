import { h, inject, provide, type InjectionKey } from 'vue'
import type { TableColumn } from '@nuxt/ui'

interface ExtraColumn {
  id: string
  header: any
  /** 传 true 即可启用排序（内部自动补充 accessorKey + sortableHeader） */
  canSort?: boolean
  /** 自定义排序函数（与 canSort 二选一或同时使用） */
  sortingFn?: any
  /** 显式指定取值字段（默认用 id） */
  accessorKey?: string
}

interface ClassUsersTableProps {
  classId: number | null
  courseId?: number
  rows?: any[]
  extraColumns?: ExtraColumn[]
  hideActions?: boolean
  hideTeachers?: boolean
  hideNumber?: boolean
  loading?: boolean
  defaultSort?: { id: string, desc: boolean }[]
  showChart?: boolean
  showOnline?: boolean
  showGroup?: boolean
  /** 前三名 name 右侧显示金银铜奖杯 */
  showMedal?: boolean
}

const ClassUsersTableKey = Symbol('ClassUsersTable') as InjectionKey<ReturnType<typeof useClassUsersTable>>

export function provideClassUsersTable(ctx: ReturnType<typeof useClassUsersTable>) {
  provide(ClassUsersTableKey, ctx)
}

export function useClassUsersTableContext() {
  const ctx = inject(ClassUsersTableKey)
  if (!ctx) throw new Error('useClassUsersTableContext must be used within ClassUsersTable')
  return ctx
}

/** 需要调用方解析后传入的 UI 组件引用 */
interface ClassUsersTableUiComponents {
  UButton: any
}

/**
 * 班级用户表格：学生/教师列表 + 编号管理 + 在线状态 + 小组 + 得分图表 + 重置密码
 *
 * 注意：UButton 必须由调用方（index.vue）在 setup 顶层 resolveComponent 解析后传入。
 * 因为 composable 内部 resolveComponent 返回的可能是字符串，而 h() 真正在 UTable
 * 的 header() 中渲染发生在 mount 之后，字符串引用会 lookup 失败（按钮列不显示）。
 */
export function useClassUsersTable(
  props: ClassUsersTableProps,
  ui: ClassUsersTableUiComponents,
) {
  const { t } = useI18n()
  const toast = useToast()
  const { UButton } = ui
  const { courseId: ctxCourseId } = useLmsContext()
  const { classUsers, classUsersLoading, fetchUsers: fetchClassUsers } = useClassUsers()

  const users = ref<any[]>([])
  const _pending = ref(false)
  const pending = computed(() => props.loading ?? _pending.value)
  const sorting = ref(props.defaultSort ?? [{ id: 'name', desc: false }])

  const teachers = computed(() => users.value.filter((u) => u.isTeacher === true))
  const students = computed(() => users.value.filter((u) => u.isTeacher !== true))

  const onlineMap = reactive<Record<number, boolean>>({})

  const { onOnlineUpdate, onRaceOnlineUpdate } = useWebSocket()
  onOnlineUpdate((data) => {
    onlineMap[data.userId] = data.online
  })
  onRaceOnlineUpdate((data) => {
    onlineMap[data.userId] = data.online
  })

  function isOnlineByLoginAt(loginAt: any): boolean {
    if (!loginAt) return false
    const diff = Date.now() - new Date(loginAt).getTime()
    return diff < 2 * 60 * 60 * 1000
  }

  // 在线判定（cell 渲染与排序共用同一逻辑）
  function isOnline(row: any): boolean {
    return onlineMap[row?.id] ?? isOnlineByLoginAt(row?.loginAt)
  }

  const currentCourseId = computed(() => props.courseId || ctxCourseId.value)

  // ====================== 学生得分图表 ======================
  const chartData = computed(() => {
    return [...students.value]
      .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
      .slice(0, 10)
      .map(s => ({
        id: s.id,
        name: s.name || s.preferName || `#${s.id}`,
        avatarImg: s.avatarImg || '',
        score: Number(s.score) || 0,
      }))
  })

  const chartOption = computed(() => {
    const data = chartData.value
    const reversed = [...data].reverse()
    const maxScore = Math.max(...data.map(d => d.score), 1)
    const colors = ['#f59e0b', '#fbbf24', '#d1d5db', '#60a5fa', '#60a5fa', '#60a5fa', '#60a5fa', '#60a5fa', '#60a5fa', '#60a5fa']
    return {
      grid: { left: 10, right: 140, top: 10, bottom: 20 },
      xAxis: {
        type: 'value',
        max: Math.ceil(maxScore * 1.2),
        splitLine: { show: true, lineStyle: { type: 'dashed', color: '#e5e7eb' } },
        axisLabel: { fontSize: 10, color: '#9ca3af' },
      },
      yAxis: {
        type: 'category',
        data: reversed.map(() => ''),
        axisLabel: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [{
        type: 'bar',
        data: reversed.map((d, i) => ({
          value: d.score,
          itemStyle: {
            color: colors[reversed.length - 1 - i] || '#60a5fa',
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barWidth: '60%',
        showBackground: true,
        backgroundStyle: { color: 'rgba(0,0,0,0.04)', borderRadius: [0, 4, 4, 0] },
        label: {
          show: true, position: 'right', fontSize: 12, fontWeight: 'bold',
          color: '#374151', formatter: '{c}',
        },
        animationDuration: 800, animationDurationUpdate: 600, animationEasingUpdate: 'cubicInOut',
      }],
      animation: true, animationDuration: 800, animationDurationUpdate: 600, animationEasingUpdate: 'cubicInOut',
    }
  })

  // ====================== 小组模式 ======================
  const activeTab = ref('students')
  const groupRows = ref<any[]>([])
  const groupSorting = ref([{ id: 'avgScore', desc: true }])

  const tabItems = computed(() => [
    { label: t('classSelector.tabStudents'), value: 'students', icon: 'i-lucide-user' },
    { label: t('classSelector.tabGroups'), value: 'groups', icon: 'i-lucide-users' },
  ])

  function normalizeGroupName(group: string): string {
    if (!group) return ''
    return group.startsWith('c_') ? group.slice(2) : group
  }

  // 分组数据缓存 key：classId:courseId + students 内容签名。
  // students 每 2 秒被章节得分轮询更新（新数组引用），但内容未变时不应重复请求，
  // 因此用稳定的内容签名代替引用比较，内容一致则复用上次结果。
  let _groupCacheKey = ''
  let _groupLoaded = false
  function groupCacheKey(): string {
    const sig = students.value.map((s: any) => s.id).join(',')
    return `${props.classId || ''}:${currentCourseId.value || ''}:${sig}`
  }

  async function fetchGroupData(force = false) {
    if (!currentCourseId.value || !props.classId) return
    if (!force && _groupLoaded && _groupCacheKey === groupCacheKey()) return
    _groupCacheKey = groupCacheKey()
    try {
      const data = await cRequest(`/api/courses/groups?courseId=${currentCourseId.value}&classId=${props.classId}`)
      buildGroupRows(data || [])
      _groupLoaded = true
    } catch {
      groupRows.value = []
      _groupLoaded = true
    }
  }

  function buildGroupRows(rawData: any[]) {
    const studentMap = new Map(students.value.map(s => [s.id, s]))
    const groupMap = new Map<string, { members: any[]; leader: any | null }>()

    for (const r of rawData) {
      const rawGroup = r.group || ''
      const name = normalizeGroupName(rawGroup)
      if (!name) continue

      if (!groupMap.has(name)) {
        groupMap.set(name, { members: [], leader: null })
      }
      const g = groupMap.get(name)!
      const stu = studentMap.get(r.userId)
      const member = {
        userId: r.userId,
        name: stu?.name || `#${r.userId}`,
        avatarImg: stu?.avatarImg || '',
        score: Number(r.score) || 0,
      }
      g.members.push(member)
      if (rawGroup.startsWith('c_')) {
        g.leader = member
      }
    }

    groupRows.value = Array.from(groupMap.entries()).map(([groupName, g]) => {
      const scores = g.members.map(m => m.score)
      const totalScore = scores.reduce((a, b) => a + b, 0)
      return {
        groupName, leader: g.leader, memberCount: g.members.length,
        members: g.members, totalScore,
        avgScore: g.members.length > 0 ? totalScore / g.members.length : 0,
      }
    })
  }

  const groupColumns = computed<TableColumn<any>[]>(() => [
    { accessorKey: 'groupName', header: sortableHeader(t('classSelector.colGroupName')), sortingFn: (a: any, b: any) => String(a.original?.groupName).localeCompare(String(b.original?.groupName)) },
    { id: 'leader', header: t('classSelector.colLeader') },
    { accessorKey: 'memberCount', header: sortableHeader(t('classSelector.colMemberCount')), sortingFn: (a: any, b: any) => (a.original?.memberCount || 0) - (b.original?.memberCount || 0) },
    { accessorKey: 'avgScore', header: sortableHeader(t('classSelector.colAvgScore')), sortingFn: (a: any, b: any) => (a.original?.avgScore || 0) - (b.original?.avgScore || 0) },
  ])

  const groupTableRows = computed(() => {
    const list = [...groupRows.value]
    for (const sort of groupSorting.value) {
      const key = sort.id
      const desc = sort.desc
      list.sort((a: any, b: any) => {
        const va = a[key] ?? 0
        const vb = b[key] ?? 0
        if (typeof va === 'number' && typeof vb === 'number') {
          return desc ? vb - va : va - vb
        }
        return desc ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb))
      })
    }
    return list
  })

  const groupChartOption = computed(() => {
    const data = groupTableRows.value
    if (!data.length) return {}
    const maxScore = Math.max(...data.map(d => d.avgScore), 1)
    const colors = ['#f59e0b', '#fbbf24', '#d1d5db', '#60a5fa', '#60a5fa', '#60a5fa', '#60a5fa', '#60a5fa']
    return {
      grid: { left: 20, right: 20, top: 20, bottom: 50 },
      xAxis: {
        type: 'category',
        data: data.map(d => d.groupName),
        axisLabel: { fontSize: 11, color: '#6b7280', rotate: data.length > 6 ? 30 : 0, interval: 0 },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e5e7eb' } },
      },
      yAxis: {
        type: 'value',
        max: Math.ceil(maxScore * 1.2),
        splitLine: { show: true, lineStyle: { type: 'dashed', color: '#e5e7eb' } },
        axisLabel: { fontSize: 10, color: '#9ca3af' },
      },
      series: [{
        type: 'bar',
        data: data.map((d, i) => ({
          value: Number(d.avgScore.toFixed(1)),
          itemStyle: { color: colors[i] || '#60a5fa', borderRadius: [4, 4, 0, 0] },
        })),
        barWidth: '50%',
        label: {
          show: true, position: 'top', fontSize: 12, fontWeight: 'bold',
          color: '#374151', formatter: '{c}',
        },
        animationDuration: 800, animationDurationUpdate: 600, animationEasingUpdate: 'cubicInOut',
      }],
      animation: true, animationDuration: 800, animationDurationUpdate: 600, animationEasingUpdate: 'cubicInOut',
    }
  })

  // 切换班级/课程时强制重新拉取分组；students 内容变化时按缓存 key 判断是否需刷新
  const watchStudentKey = ref('')
  watch([() => props.classId, currentCourseId], () => {
    if (props.showGroup && props.classId && currentCourseId.value) {
      _groupCacheKey = ''
      _groupLoaded = false
      fetchGroupData()
    }
  }, { immediate: true })
  watch(students, (list) => {
    if (!props.showGroup || !props.classId) return
    const key = list.map((s: any) => s.id).join(',')
    if (key === watchStudentKey.value) return
    watchStudentKey.value = key
    fetchGroupData()
  })

  // ====================== 编辑弹窗 ======================
  const editModal = ref<{ show: () => void } | null>(null)
  const editingUserId = ref<number | null>(null)

  function openEdit(userId: number) {
    editingUserId.value = userId
    editModal.value?.show()
  }

  // ====================== 移除教师（任课关系） ======================
  const removeTeacherOpen = ref(false)
  const removeTeacherUserId = ref<number | null>(null)
  const removeTeacherName = ref('')
  const removingTeacher = ref(false)

  function confirmRemoveTeacher(t: any) {
    removeTeacherUserId.value = t?.id ?? null
    removeTeacherName.value = t?.name || ''
    removeTeacherOpen.value = true
  }

  async function doRemoveTeacher() {
    if (!props.classId || !removeTeacherUserId.value) return
    removingTeacher.value = true
    try {
      await cRequest('/api/classes/remove-teacher', {
        method: 'POST',
        body: { classId: props.classId, userId: removeTeacherUserId.value },
      })
      toast.add({ title: t('classSelector.removeTeacherSuccess'), color: 'success' })
      removeTeacherOpen.value = false
      refresh()
    } catch (err: any) {
      toast.add({ title: err.message || t('classSelector.removeTeacherFailed'), color: 'error' })
    } finally {
      removingTeacher.value = false
    }
  }

  // ====================== 排序表头 ======================
  

  function sortableHeader(label: string) {
    return ({ column }: { column: any }) => {
      const isSorted = column.getIsSorted()
      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label,
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      })
    }
  }

  // ====================== 编号管理 ======================
  const numberMap = reactive<Record<number, string>>({})

  watch(students, (list) => {
    for (const s of list) {
      numberMap[s.id] = (s as any).number || ''
    }
  }, { immediate: true })

  const sortedStudents = computed(() => {
    const list = [...students.value]
    for (const sort of sorting.value) {
      const key = sort.id
      const desc = sort.desc
      list.sort((a: any, b: any) => {
        const va = a[key] ?? ''
        const vb = b[key] ?? ''
        if (!isNaN(Number(va)) && !isNaN(Number(vb)) && va !== '' && vb !== '') {
          return desc ? Number(vb) - Number(va) : Number(va) - Number(vb)
        }
        return desc
          ? String(vb).localeCompare(String(va))
          : String(va).localeCompare(String(vb))
      })
    }
    return list
  })

  async function autoFillNumbers() {
    sortedStudents.value.forEach((s: any, idx) => {
      numberMap[s.id] = String(idx + 1)
      s.number = String(idx + 1)
    })
    if (!currentCourseId.value) return
    try {
      await Promise.all(sortedStudents.value.map((s: any) =>
        cRequest('/api/courses/number', {
          method: 'POST',
          body: {
            course_id: currentCourseId.value,
            user_id: s.id,
            number: numberMap[s.id],
          },
        })
      ))
      toast.add({ title: t('classSelector.numberSaveSuccess'), color: 'success' })
    } catch {
      toast.add({ title: t('classSelector.numberSaveFailed'), color: 'error' })
    }
  }

  const savingNumber = ref<Record<number, boolean>>({})
  async function onNumberBlur(userId: number) {
    const val = numberMap[userId]
    if (val === undefined || val === null) return
    const user = users.value.find(u => u.id === userId)
    if (user) (user as any).number = val
    savingNumber.value[userId] = true
    try {
      await cRequest('/api/courses/number', {
        method: 'POST',
        body: { course_id: currentCourseId.value, user_id: userId, number: val },
      })
    } catch {
      toast.add({ title: t('classSelector.numberSaveFailed'), color: 'error' })
    } finally {
      savingNumber.value[userId] = false
    }
  }

  // ====================== 重置密码 ======================
  const resetUserId = ref<number | null>(null)
  const resetPassword = ref('')
  const resetOpen = ref(false)

  function openReset(userId: number) {
    resetUserId.value = userId
    resetPassword.value = ''
    resetOpen.value = true
  }

  // ====================== 学生学习数据弹窗 ======================
  const statsUserId = ref<number | null>(null)
  const statsUser = ref<any | null>(null)
  const statsOpen = ref(false)

  function openStats(row: any) {
    if (!row || !row.id) return
    statsUserId.value = Number(row.id)
    statsUser.value = row
    statsOpen.value = true
  }

  async function doResetPassword() {
    if (!resetUserId.value || !resetPassword.value) return
    try {
      await cRequest('/api/users/reset-password', {
        method: 'POST',
        body: { user_id: resetUserId.value, password: resetPassword.value },
      })
      toast.add({ title: t('classSelector.resetPasswordSuccess'), color: 'success' })
      resetOpen.value = false
    } catch (err: any) {
      toast.add({ title: err.message || t('classSelector.resetPasswordFailed'), color: 'error' })
    }
  }

  // ====================== 列定义 ======================
  const columns = computed(() => {
    const cols: TableColumn<any>[] = []
    if (props.showOnline) {
      cols.push({
        id: 'online',
        header: sortableHeader(t('classSelector.online')),
        // 提供 accessorFn 使列可排序（TanStack 无 accessorFn 时 getCanSort()=false）
        accessorFn: (row: any) => (isOnline(row) ? 1 : 0),
        // 在线优先（降序时在线排在前面）
        sortingFn: (a: any, b: any) => (isOnline(a.original) ? 1 : 0) - (isOnline(b.original) ? 1 : 0),
        cell: ({ row }) => {
          const online = isOnline(row.original)
          return h('div', {
            class: ['w-4 h-4 rounded-full shrink-0', online ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'],
            title: online ? t('classSelector.online') : t('classSelector.offline'),
          })
        },
      })
    }
    if (!props.hideNumber) {
      cols.push({
        accessorKey: 'number',
        header: sortableHeader(t('classSelector.colNumber')),
        sortingFn: (a: any, b: any) => {
          const va = Number(a.original?.number) || 0
          const vb = Number(b.original?.number) || 0
          return va - vb
        },
      })
    }
    cols.push(
      { accessorKey: 'name', header: sortableHeader(t('classSelector.colName')) },
      { accessorKey: 'username', header: sortableHeader(t('classSelector.colUsername')) },
    )
    if (!props.hideActions) {
      cols.push({ id: 'resetPassword', header: t('classSelector.resetPassword') })
      cols.push({ id: 'actions', header: t('classSelector.actions') })
    }
    if (props.extraColumns?.length) {
      // canSort / sortingFn 触发自动装配：
      // 1. accessorKey 缺省时用 id 补上 → TanStack Table 创建 accessorFn → getCanSort() = true
      // 2. header 为字符串时自动包装 sortableHeader → 渲染可点击的排序按钮
      // 3. sortingFn 缺省时由 TanStack Table 的 getAutoSortingFn 按数据类型自动选择
      for (const col of props.extraColumns) {
        if (col.canSort || col.sortingFn) {
          const merged: any = { ...col }
          if (!merged.accessorKey) merged.accessorKey = col.id
          if (typeof merged.header === 'string') {
            merged.header = sortableHeader(merged.header as string)
          }
          cols.push(merged)
        } else {
          cols.push(col)
        }
      }
    }
    return cols
  })

  // ====================== 数据源 watchers ======================
  watch(() => props.rows, (val) => {
    if (val !== undefined) {
      users.value = val
    }
  }, { immediate: true })

  watch([classUsers, () => props.rows], () => {
    if (props.rows === undefined) {
      users.value = classUsers.value
      _pending.value = classUsersLoading.value
    }
  }, { immediate: true })

  watch([() => props.classId, currentCourseId], () => {
    if (props.rows === undefined && props.classId) {
      fetchClassUsers(props.classId, currentCourseId.value)
    }
  }, { immediate: true })

  function refresh() {
    if (props.rows === undefined && props.classId) {
      fetchClassUsers(props.classId, currentCourseId.value)
    }
  }

  return {
    pending, users, sorting, teachers, students, onlineMap, numberMap,
    chartData, chartOption,
    activeTab, tabItems, groupTableRows, groupColumns, groupSorting, groupChartOption,
    columns,
    showGroup: () => props.showGroup,
    showChart: () => props.showChart,
    showMedal: () => props.showMedal,
    hideNumber: () => props.hideNumber,
    hideActions: () => props.hideActions,
    hideTeachers: () => props.hideTeachers,
    extraColumns: () => props.extraColumns,
    classId: () => props.classId,
    currentCourseId,
    openEdit, openReset, openStats, autoFillNumbers, onNumberBlur,
    editModal, editingUserId,
    confirmRemoveTeacher, doRemoveTeacher,
    removeTeacherOpen, removeTeacherUserId, removeTeacherName, removingTeacher,
    resetOpen, resetPassword, doResetPassword,
    statsOpen, statsUserId, statsUser,
    sortableHeader,
    refresh,
  }
}

export type { ClassUsersTableProps, ExtraColumn }
