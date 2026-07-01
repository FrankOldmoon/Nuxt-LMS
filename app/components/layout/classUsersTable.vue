<template>
  <div>
    <div v-if="pending" class="flex items-center justify-center py-6 text-muted">
      <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-2" />
      <span class="text-xs">{{ $t('classSelector.loading') }}</span>
    </div>

    <div v-else-if="!users.length" class="text-center py-6 text-muted text-xs">
      {{ $t('classSelector.noUsers') }}
    </div>

    <UTable
      v-else
      :data="users"
      :columns="columns"
      :ui="{ td: 'py-1.5' }"
    >
      <template #name-cell="{ row }">
        <div class="flex items-center gap-2">
          <UAvatar :src="row.original.avatarImg || undefined" :alt="row.original.name" size="2xs" :text="row.original.name?.charAt(0)" />
          <span class="text-sm">{{ row.original.name }}</span>
          <UBadge v-if="row.original.isTeacher" :label="$t('classSelector.roleTeacher')" color="primary" variant="subtle" size="xs" />
        </div>
      </template>
      <template #preferName-cell="{ row }">
        <span class="text-xs text-muted">{{ row.original.preferName || '-' }}</span>
      </template>
      <template #rollNumber-cell="{ row }">
        <span class="text-xs text-muted">{{ row.original.rollNumber || '-' }}</span>
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

    <!-- 用户编辑弹窗 -->
    <AuthUserEditModal ref="editModal" :user-id="editingUserId" @saved="fetchUsers" />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  classId: number | null
}>()

const { t } = useI18n()

interface ClassUser {
  id: number
  username: string
  name: string
  preferName: string | null
  englishName: string | null
  avatarImg: string | null
  rollNumber: string | null
  email: string | null
  telephone: string | null
  isTeacher: boolean | null
}

const users = ref<ClassUser[]>([])
const pending = ref(false)

// 编辑弹窗
const editModal = ref<{ show: () => void } | null>(null)
const editingUserId = ref<number | null>(null)

function openEdit(userId: number) {
  editingUserId.value = userId
  editModal.value?.show()
}

const columns = computed(() => [
  { accessorKey: 'name', header: t('classSelector.colName') },
  { accessorKey: 'preferName', header: t('classSelector.colPreferName') },
  { accessorKey: 'rollNumber', header: t('classSelector.colRollNumber') },
  { id: 'actions', header: '' },
])

async function fetchUsers() {
  if (!props.classId) {
    users.value = []
    return
  }
  pending.value = true
  try {
    const data = await cRequest<ClassUser[]>(`/api/lms/classes/users?classId=${props.classId}`)
    users.value = data || []
  } catch {
    users.value = []
  } finally {
    pending.value = false
  }
}

watch(() => props.classId, () => fetchUsers(), { immediate: true })
</script>
