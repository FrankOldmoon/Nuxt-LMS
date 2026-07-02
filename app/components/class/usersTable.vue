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
        <template #name-cell="{ row }">
          <div class="flex items-center gap-2">
            <UAvatar :src="row.original.avatarImg || undefined" :alt="row.original.name" size="2xs" :text="row.original.name?.charAt(0)" />
            <span class="text-sm">{{ row.original.name }}</span>
          </div>
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
    </template>

    <!-- 用户编辑弹窗 -->
    <AuthUserEditModal v-if="!hideActions" ref="editModal" :user-id="editingUserId" @saved="fetchUsers" />
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const UButton = resolveComponent('UButton')

const props = defineProps<{
  classId: number | null
  rows?: any[]
  extraColumns?: { id: string; header: any; sortingFn?: any }[]
  hideActions?: boolean
  hideTeachers?: boolean
  loading?: boolean
  defaultSort?: { id: string, desc: boolean }[]
}>()

const { t } = useI18n()
const { classUsers, classUsersLoading, fetchUsers: fetchClassUsers } = useClassUsers()

const users = ref<any[]>([])
const _pending = ref(false)
const pending = computed(() => props.loading ?? _pending.value)
const sorting = ref(props.defaultSort ?? [{ id: 'preferName', desc: false }])

const teachers = computed(() => users.value.filter((u) => u.isTeacher))
const students = computed(() => users.value.filter((u) => !u.isTeacher))

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

const columns = computed(() => {
  const cols: TableColumn<any>[] = [
    { accessorKey: 'name', header: sortableHeader(t('classSelector.colName')) },
    { accessorKey: 'preferName', header: sortableHeader(t('classSelector.colPreferName')) },
    { accessorKey: 'rollNumber', header: sortableHeader(t('classSelector.colRollNumber')) },
  ]
  if (!props.hideActions) {
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
watch(() => props.classId, (id) => {
  if (props.rows === undefined && id) {
    fetchClassUsers(id)
  }
}, { immediate: true })

defineExpose({ refresh: () => {
  if (props.rows === undefined && props.classId) {
    fetchClassUsers(props.classId)
  }
}})
</script>
