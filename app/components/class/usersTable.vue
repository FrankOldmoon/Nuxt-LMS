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
      <div v-if="teachers.length" class="mb-3">
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
      </UTable>
    </template>

    <!-- 用户编辑弹窗 -->
    <AuthUserEditModal ref="editModal" :user-id="editingUserId" @saved="fetchUsers" />
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { LmsClassUser } from '#shared/types/lms'

const UButton = resolveComponent('UButton')

const props = defineProps<{
  classId: number | null
}>()

const { t } = useI18n()

const users = ref<LmsClassUser[]>([])
const pending = ref(false)
const sorting = ref([{ id: 'preferName', desc: false }])

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

const columns = computed<TableColumn<LmsClassUser>[]>(() => [
  { accessorKey: 'name', header: sortableHeader(t('classSelector.colName')) },
  { accessorKey: 'preferName', header: sortableHeader(t('classSelector.colPreferName')) },
  { accessorKey: 'rollNumber', header: sortableHeader(t('classSelector.colRollNumber')) },
  { id: 'actions', header: '' },
])

async function fetchUsers() {
  if (!props.classId) {
    users.value = []
    return
  }
  pending.value = true
  try {
    const data = await cRequest<LmsClassUser[]>(`/api/lms/classes/users?classId=${props.classId}`)
    users.value = data || []
  } catch {
    users.value = []
  } finally {
    pending.value = false
  }
}

watch(() => props.classId, () => fetchUsers(), { immediate: true })

defineExpose({ refresh: fetchUsers })
</script>
