<template>
  <div>
    <div v-if="pending" class="flex items-center justify-center py-6 text-muted">
      <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-2" />
      <span class="text-xs">{{ $t('classSelector.loading') }}</span>
    </div>

    <div v-else-if="!users.length" class="text-center py-6 text-muted text-xs">
      {{ $t('classSelector.noUsers') }}
    </div>

    <template v-else>
      <!-- 小组模式：Tab 切换学生/小组 -->
      <UTabs v-if="showGroup && groupRows.length" v-model="activeTab" :items="tabItems" class="mb-3" />

      <!-- ============ 学生 Tab ============ -->
      <div v-show="!showGroup || activeTab === 'students'">
        <!-- 教师列表 -->
        <div v-if="!hideTeachers && teachers.length" class="mb-3">
          <div class="text-xs font-medium text-muted mb-1.5">{{ $t('classSelector.teachers') }}</div>
          <div class="space-y-1">
            <div
              v-for="t in teachers"
              :key="t.id"
              class="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted"
            >
              <UAvatar :src="t.avatarImg || undefined" :alt="t.name" size="2xs" :text="t.name?.charAt(0)" />
              <span class="text-sm flex-1">{{ t.name }}</span>
              <UButton
                icon="i-lucide-pencil"
                size="xs"
                color="neutral"
                variant="ghost"
                :aria-label="$t('common.edit')"
                @click="openEdit(t.id)"
              />
            </div>
          </div>
          <USeparator v-if="students.length" class="mt-3" />
        </div>

        <!-- 学生表格 -->
        <UTable
          v-if="students.length"
          v-model:sorting="sorting"
          :data="students"
          :columns="columns"
          :ui="{ td: 'py-1.5' }"
        >
          <!-- number 列 -->
          <template v-if="!hideNumber" #number-cell="{ row }">
            <UInput v-model="numberMap[row.original.id]" size="xs" class="w-16"
              :placeholder="'-'"
              @blur="onNumberBlur(row.original.id)"
              @keydown.enter="$event.target.blur()" />
          </template>
          <!-- number 表头：排序按钮 + 一键填充 -->
          <template v-if="!hideNumber" #number-header="{ column }">
            <div class="flex items-center gap-1">
              <component :is="sortableHeader(t('classSelector.colNumber'))({ column })" />
              <UButton icon="i-lucide-list-ordered" size="xs" color="neutral" variant="ghost"
                :title="$t('classSelector.autoFillNumber')" @click="autoFillNumbers" />
            </div>
          </template>
          <template #name-cell="{ row }">
            <div class="flex items-center gap-2">
              <UAvatar :src="row.original.avatarImg || undefined" :alt="row.original.name" size="2xs" :text="row.original.name?.charAt(0)" />
              <span class="text-sm">{{ row.original.name }}</span>
            </div>
          </template>
          <!-- 重置密码列 -->
          <template v-if="!hideActions" #resetPassword-cell="{ row }">
            <UButton
              icon="i-lucide-key-round"
              size="xs"
              color="neutral"
              variant="ghost"
              :aria-label="$t('classSelector.resetPassword')"
              @click="openReset(row.original.id)"
            />
          </template>
          <template #actions-cell="{ row }">
            <UButton
              icon="i-lucide-pencil"
              size="xs"
              color="neutral"
              variant="ghost"
              :aria-label="$t('common.edit')"
              @click="openEdit(row.original.id)"
            />
          </template>
          <!-- 转发额外列的插槽（动态 slot name，注意不能含空格） -->
          <template v-for="col in extraColumns" :key="col.id" #[col.id+'-cell']="slotProps">
            <slot :name="col.id+'-cell'" v-bind="slotProps" />
          </template>
        </UTable>

        <!-- 得分条形图（showChart 时显示） -->
        <ClientOnly v-if="showChart && students.length">
          <div class="mt-4 relative">
            <Chart :option="chartOption" height="320" />
            <!-- 右侧 HTML 覆盖层：头像 + 名字 -->
            <div class="absolute top-0 right-0 h-full flex flex-col justify-around py-[10px]" style="width: 120px;">
              <div v-for="item in chartData" :key="item.id"
                class="flex items-center gap-1.5 h-6 transition-all duration-700 ease-in-out">
                <UAvatar :src="item.avatarImg || undefined" :alt="item.name" size="2xs"
                  :text="item.name?.charAt(0)" class="shrink-0" />
                <span class="text-xs truncate" :class="chartData.indexOf(item) < 3 ? 'font-bold' : ''">
                  {{ item.name }}
                </span>
              </div>
            </div>
          </div>
        </ClientOnly>
      </div>

      <!-- ============ 小组 Tab ============ -->
      <div v-if="showGroup && activeTab === 'groups'">
        <UTable
          v-if="groupTableRows.length"
          v-model:sorting="groupSorting"
          :data="groupTableRows"
          :columns="groupColumns"
          :ui="{ td: 'py-1.5' }"
        >
          <template #groupName-cell="{ row }">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-users" class="size-4 text-primary" />
              <span class="text-sm font-medium">{{ row.original.groupName }}</span>
            </div>
          </template>
          <template #leader-cell="{ row }">
            <div v-if="row.original.leader" class="flex items-center gap-2">
              <UAvatar :src="row.original.leader.avatarImg || undefined" :alt="row.original.leader.name"
                size="2xs" :text="row.original.leader.name?.charAt(0)" />
              <span class="text-sm">{{ row.original.leader.name }}</span>
              <UBadge color="primary" variant="subtle" size="xs">{{ $t('coursePanel.leader') }}</UBadge>
            </div>
          </template>
          <template #memberCount-cell="{ row }">
            <span class="text-sm">{{ row.original.memberCount }}</span>
          </template>
          <template #avgScore-cell="{ row }">
            <span class="text-sm font-mono font-semibold text-highlighted">{{ row.original.avgScore.toFixed(1) }}</span>
          </template>
        </UTable>

        <!-- 小组得分柱状图 -->
        <ClientOnly v-if="showChart && groupTableRows.length">
          <div class="mt-4">
            <Chart :option="groupChartOption" height="320" />
          </div>
        </ClientOnly>
      </div>
    </template>

    <!-- 用户编辑弹窗 -->
    <AuthUserEditModal v-if="!hideActions" ref="editModal" :user-id="editingUserId" @saved="() => { if (props.classId) fetchClassUsers(props.classId) }" />

    <!-- 重置密码弹窗 -->
    <UModal v-model:open="resetOpen">
      <template #content>
        <div class="p-6 space-y-4 w-80">
          <h3 class="text-lg font-semibold">{{ $t('classSelector.resetPassword') }}</h3>
          <UInput v-model="resetPassword" type="text" :placeholder="$t('classSelector.resetPasswordPlaceholder')"
            class="w-full" />
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="resetOpen = false">{{ $t('common.cancel') }}</UButton>
            <UButton color="primary" :disabled="!resetPassword" @click="doResetPassword">
              {{ $t('classSelector.confirmReset') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const UButton = resolveComponent('UButton')

const props = defineProps<{
  classId: number | null
  courseId?: number
  rows?: any[]
  extraColumns?: { id: string; header: any; sortingFn?: any }[]
  hideActions?: boolean
  hideTeachers?: boolean
  hideNumber?: boolean
  loading?: boolean
  defaultSort?: { id: string, desc: boolean }[]
  showChart?: boolean
  showOnline?: boolean
  showGroup?: boolean
}>()

const { t } = useI18n()
const toast = useToast()
const { editableCourseId } = useLayoutState()
const { classUsers, classUsersLoading, fetchUsers: fetchClassUsers } = useClassUsers()

const users = ref<any[]>([])
const _pending = ref(false)
const pending = computed(() => props.loading ?? _pending.value)
const sorting = ref(props.defaultSort ?? [{ id: 'preferName', desc: false }])

const teachers = computed(() => users.value.filter((u) => u.isTeacher === true))
const students = computed(() => users.value.filter((u) => u.isTeacher !== true))

// 在线状态：userId → boolean
const onlineMap = reactive<Record<number, boolean>>({})

// 监听 WebSocket 在线状态
const { onOnlineUpdate, onRaceOnlineUpdate } = useWebSocket()
onOnlineUpdate((data) => {
  onlineMap[data.userId] = data.online
})
onRaceOnlineUpdate((data) => {
  onlineMap[data.userId] = data.online
})

// 基于 loginAt 判断初始在线（2小时内）
function isOnlineByLoginAt(loginAt: any): boolean {
  if (!loginAt) return false
  const diff = Date.now() - new Date(loginAt).getTime()
  return diff < 2 * 60 * 60 * 1000
}

// 条形图数据：按 score 降序取前10
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

// ECharts 水平条形图配置
const chartOption = computed(() => {
  const data = chartData.value
  // 反转使第一名在顶部
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
        show: true,
        position: 'right',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#374151',
        formatter: '{c}',
      },
      animationDuration: 800,
      animationDurationUpdate: 600,
      animationEasingUpdate: 'cubicInOut',
    }],
    animation: true,
    animationDuration: 800,
    animationDurationUpdate: 600,
    animationEasingUpdate: 'cubicInOut',
  }
})

// ====================== 小组模式 ======================
const activeTab = ref('students')
const groupRows = ref<any[]>([])
const groupSorting = ref([{ id: 'avgScore', desc: true }])

// 当前课程 ID（提前定义，供下方 watch immediate 使用）
const currentCourseId = computed(() => props.courseId || editableCourseId.value)

const tabItems = computed(() => [
  { label: t('classSelector.tabStudents'), value: 'students', icon: 'i-lucide-user' },
  { label: t('classSelector.tabGroups'), value: 'groups', icon: 'i-lucide-users' },
])

// 规范化 group 名称（去掉 c_ 前缀，c_ 表示组长）
function normalizeGroupName(group: string): string {
  if (!group) return ''
  return group.startsWith('c_') ? group.slice(2) : group
}

// 拉取小组数据
async function fetchGroupData() {
  if (!currentCourseId.value || !props.classId) return
  try {
    const data = await cRequest(`/api/lms/courses/groups?courseId=${currentCourseId.value}&classId=${props.classId}`)
    buildGroupRows(data || [])
  } catch {
    groupRows.value = []
  }
}

// 将 API 返回的分组数据聚合为小组行
function buildGroupRows(rawData: any[]) {
  const studentMap = new Map(students.value.map(s => [s.id, s]))
  const groupMap = new Map<string, { members: any[]; leader: any | null }>()

  for (const r of rawData) {
    const rawGroup = r.group || ''
    const name = normalizeGroupName(rawGroup)
    if (!name) continue // 未分组学生不计入小组

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
    // 组长（group 带 c_ 前缀）
    if (rawGroup.startsWith('c_')) {
      g.leader = member
    }
  }

  groupRows.value = Array.from(groupMap.entries()).map(([groupName, g]) => {
    const scores = g.members.map(m => m.score)
    const totalScore = scores.reduce((a, b) => a + b, 0)
    return {
      groupName,
      leader: g.leader,
      memberCount: g.members.length,
      members: g.members,
      totalScore,
      avgScore: g.members.length > 0 ? totalScore / g.members.length : 0,
    }
  })
}

// 小组表格列
const groupColumns = computed<TableColumn<any>[]>(() => [
  { accessorKey: 'groupName', header: sortableHeader(t('classSelector.colGroupName')), sortingFn: (a: any, b: any) => String(a.original?.groupName).localeCompare(String(b.original?.groupName)) },
  { id: 'leader', header: t('classSelector.colLeader') },
  { accessorKey: 'memberCount', header: sortableHeader(t('classSelector.colMemberCount')), sortingFn: (a: any, b: any) => (a.original?.memberCount || 0) - (b.original?.memberCount || 0) },
  { accessorKey: 'avgScore', header: sortableHeader(t('classSelector.colAvgScore')), sortingFn: (a: any, b: any) => (a.original?.avgScore || 0) - (b.original?.avgScore || 0) },
])

// 小组表格数据（按 groupSorting 排序）
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

// 小组柱状图配置（竖向柱状图）
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
        itemStyle: {
          color: colors[i] || '#60a5fa',
          borderRadius: [4, 4, 0, 0],
        },
      })),
      barWidth: '50%',
      label: {
        show: true,
        position: 'top',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#374151',
        formatter: '{c}',
      },
      animationDuration: 800,
      animationDurationUpdate: 600,
      animationEasingUpdate: 'cubicInOut',
    }],
    animation: true,
    animationDuration: 800,
    animationDurationUpdate: 600,
    animationEasingUpdate: 'cubicInOut',
  }
})

// classId/courseId 变化时拉取小组数据
watch([() => props.classId, currentCourseId, students], () => {
  if (props.showGroup && props.classId && currentCourseId.value) {
    fetchGroupData()
  }
}, { immediate: true })

// 当前课程 ID（已在上方定义）

// 编辑弹窗
const editModal = ref<{ show: () => void } | null>(null)
const editingUserId = ref<number | null>(null)

function openEdit(userId: number) {
  editingUserId.value = userId
  editModal.value?.show()
}

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

// 学生编号 map: userId -> number，直接从用户数据读取（API 已附带）
const numberMap = reactive<Record<number, string>>({})

// 用户数据变化时同步 numberMap（从 API 返回的 number 字段读取）
watch(students, (list) => {
  for (const s of list) {
    numberMap[s.id] = (s as any).number || ''
  }
}, { immediate: true })

// 根据 sorting 状态计算排序后的学生列表
const sortedStudents = computed(() => {
  const list = [...students.value]
  for (const sort of sorting.value) {
    const key = sort.id
    const desc = sort.desc
    list.sort((a: any, b: any) => {
      const va = a[key] ?? ''
      const vb = b[key] ?? ''
      // 数字比较
      if (!isNaN(Number(va)) && !isNaN(Number(vb)) && va !== '' && vb !== '') {
        return desc ? Number(vb) - Number(va) : Number(va) - Number(vb)
      }
      // 字符串比较
      return desc
        ? String(vb).localeCompare(String(va))
        : String(va).localeCompare(String(vb))
    })
  }
  return list
})

// 一键填充编号（1, 2, 3...）并批量保存，按当前排序顺序
async function autoFillNumbers() {
  sortedStudents.value.forEach((s: any, idx) => {
    numberMap[s.id] = String(idx + 1)
    s.number = String(idx + 1)
  })
  // 批量保存
  if (!currentCourseId.value) return
  try {
    await Promise.all(sortedStudents.value.map((s: any) =>
      cRequest('/api/lms/courses/number', {
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

// 保存单个编号
const savingNumber = ref<Record<number, boolean>>({})
async function onNumberBlur(userId: number) {
  const val = numberMap[userId]
  if (val === undefined || val === null) return
  // 同步回用户对象，让表格排序能感知
  const user = users.value.find(u => u.id === userId)
  if (user) (user as any).number = val
  savingNumber.value[userId] = true
  try {
    await cRequest('/api/lms/courses/number', {
      method: 'POST',
      body: {
        course_id: currentCourseId.value,
        user_id: userId,
        number: val,
      },
    })
  } catch {
    toast.add({ title: t('classSelector.numberSaveFailed'), color: 'error' })
  } finally {
    savingNumber.value[userId] = false
  }
}

// 重置密码
const resetUserId = ref<number | null>(null)
const resetPassword = ref('')
const resetOpen = ref(false)

function openReset(userId: number) {
  resetUserId.value = userId
  resetPassword.value = ''
  resetOpen.value = true
}

async function doResetPassword() {
  if (!resetUserId.value || !resetPassword.value) return
  try {
    await cRequest('/api/lms/users/reset-password', {
      method: 'POST',
      body: {
        user_id: resetUserId.value,
        password: resetPassword.value,
      },
    })
    toast.add({ title: t('classSelector.resetPasswordSuccess'), color: 'success' })
    resetOpen.value = false
  } catch (err: any) {
    toast.add({ title: err.message || t('classSelector.resetPasswordFailed'), color: 'error' })
  }
}

const columns = computed(() => {
  const cols: TableColumn<any>[] = []
  // 在线状态列（在 number 之前）
  if (props.showOnline) {
    cols.push({
      id: 'online',
      header: '',
      cell: ({ row }) => {
        const uid = row.original.id
        const online = onlineMap[uid] ?? isOnlineByLoginAt(row.original.loginAt)
        return h('div', {
          class: ['w-4 h-4 rounded-full shrink-0', online ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'],
          title: online ? t('classSelector.online') : t('classSelector.offline'),
        })
      },
    })
  }
  // number 列（在 name 之前，可排序）
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
    { accessorKey: 'preferName', header: sortableHeader(t('classSelector.colPreferName')) },
    { accessorKey: 'rollNumber', header: sortableHeader(t('classSelector.colRollNumber')) },
  )
  if (!props.hideActions) {
    // 重置密码列 + actions 列
    cols.push({ id: 'resetPassword', header: '' })
    cols.push({ id: 'actions', header: '' })
  }
  if (props.extraColumns?.length) {
    cols.push(...props.extraColumns)
  }
  return cols
})

// 外部传入 rows 时直接使用；否则使用全局缓存的班级用户
watch(() => props.rows, (val) => {
  if (val !== undefined) {
    users.value = val
  }
}, { immediate: true })

// 没有传入 rows 时，使用全局缓存数据
watch([classUsers, () => props.rows], () => {
  if (props.rows === undefined) {
    users.value = classUsers.value
    _pending.value = classUsersLoading.value
  }
}, { immediate: true })

// classId 变化时触发全局 fetch（仅在没有 rows 时）
watch([() => props.classId, currentCourseId], () => {
  if (props.rows === undefined && props.classId) {
    fetchClassUsers(props.classId, currentCourseId.value)
  }
}, { immediate: true })

defineExpose({ refresh: () => {
  if (props.rows === undefined && props.classId) {
    fetchClassUsers(props.classId, currentCourseId.value)
  }
}})
</script>
