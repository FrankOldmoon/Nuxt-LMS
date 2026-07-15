<template>
  <div>
    <div v-if="pending" class="flex items-center justify-center py-6 text-muted">
      <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-2" />
      <span class="text-xs">{{ $t('classSelector.loading') }}</span>
    </div>

    <div v-else-if="!users.length" class="text-center py-6 text-muted text-xs">
      {{ $t('classSelector.no users') }}
    </div>

    <template v-else>
      <!-- Groupmode：Tab SwitchStudent/Group -->
      <UTabs v-if="showGroup() && groupTableRows.length" v-model="activeTab" :items="tabItems" class="mb-3" />

      <ClassUsersTableStudentsTable>
        <template v-for="(_, name) in $slots" #[name]="slotData">
          <slot :name="name" v-bind="slotData" />
        </template>
      </ClassUsersTableStudentsTable>

      <ClassUsersTableGroups />
    </template>

    <!-- UserEdit Modal -->
    <AuthUserEditModal v-if="!hideActions()" ref="editModal" :user-id="editingUserId"
      @saved="onEditSaved" />

    <!-- Reset PasswordModal -->
    <ClassUsersTableResetModal />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
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
}>()

// Resolve UI component references at setup stage and pass to composable.
// avoid composable Inside resolveComponent Returncharactersstring causes h() Render Failed。
const UButton = resolveComponent('UButton')
const ctx = useClassUsersTable(props, { UButton })
provideClassUsersTable(ctx)

const {
  pending, users, showGroup, groupTableRows, activeTab, tabItems,
  editModal, editingUserId, hideActions, refresh,
} = ctx

function onEditSaved() {
  if (props.classId) {
    refresh()
  }
}

defineExpose({ refresh })
</script>
