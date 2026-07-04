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
        <ChartIndex :option="chartOption" height="320" class="mt-4" />
      </ClientOnly>
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
}>()

const { t } = useI18n()
const toast = useToast()
const { editableCourseId } = useLayoutState()
const { classUsers, classUsersLoading, fetchUsers: fetchClassUsers } = useClassUsers()

const users = ref<any[]>([])
const _pending = ref(false)
const pending = computed(() => props.loading ?? _pending.value)
const sorting = ref(props.defaultSort ?? [{ id: 'preferName', desc: false }])

const teachers = computed(() => users.value.filter((u) => u.isTeacher))
const students = computed(() => users.value.filter((u) => !u.isTeacher))

// 条形图数据：按 score 降序取前10
const chartData = computed(() => {
  return [...students.value]
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
    .slice(0, 10)
    .map(s => ({
      name: s.name || s.preferName || `#${s.id}`,
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
    grid: { left: 80, right: 40, top: 10, bottom: 20 },
    xAxis: {
      type: 'value',
      max: Math.ceil(maxScore * 1.2),
      splitLine: { show: true, lineStyle: { type: 'dashed', color: '#e5e7eb' } },
      axisLabel: { fontSize: 10, color: '#9ca3af' },
    },
    yAxis: {
      type: 'category',
      data: reversed.map(d => d.name),
      axisLabel: { fontSize: 11, color: '#6b7280' },
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
      label: {
        show: true,
        position: 'right',
        fontSize: 11,
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

// 当前课程 ID
const currentCourseId = computed(() => props.courseId || editableCourseId.value)

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
