<template>
  <div v-show="!showGroup() || activeTab === 'students'">
    <ClassUsersTableTeachers />

    <!-- Student table -->
    <div v-if="students.length" class="flex justify-end mb-2">
      <UButton icon="i-lucide-download" size="xs" color="neutral" variant="outline"
        :label="t('classSelector.export')" @click="openExport" />
    </div>
    <UTable
      v-if="students.length"
      v-model:sorting="sorting"
      :data="students"
      :columns="columns"
      :ui="{ td: 'py-1.5' }"
    >
      <!-- number column -->
      <template v-if="!hideNumber()" #number-cell="{ row }">
        <UInput v-model="numberMap[row.original.id]" size="xs" class="w-16"
          :placeholder="'-'"
          @blur="onNumberBlur(row.original.id)"
          @keydown.enter="$event.target.blur()" />
      </template>
      <!-- number header: sort button + quick fill -->
      <template v-if="!hideNumber()" #number-header="{ column }">
        <div class="flex items-center gap-1">
          <component :is="sortableHeader(t('classSelector.colNumber'))({ column })" />
          <UButton icon="i-lucide-list-ordered" size="xs" color="neutral" variant="ghost"
            :title="$t('classSelector.autoFillNumber')" @click="autoFillNumbers" />
        </div>
      </template>
      <template #name-cell="{ row }">
        <button type="button" class="flex items-center gap-2 group"
          :title="$t('classSelector.viewStudentStats')"
          @click="openStats(row.original)">
          <UAvatar :src="row.original.avatarImg || undefined" :alt="row.original.name" size="2xs" :text="row.original.name?.charAt(0)" />
          <span class="text-sm text-primary group-hover:underline cursor-pointer">{{ row.original.name }}</span>
        </button>
      </template>
      <!-- Reset password column -->
      <template v-if="!hideActions()" #resetPassword-cell="{ row }">
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
      <!-- Forward extra column slots -->
      <template v-for="col in (extraColumns() || [])" :key="col.id" #[col.id+'-cell']="slotProps">
        <slot :name="col.id+'-cell'" v-bind="slotProps" />
      </template>
    </UTable>

    <ClassUsersTableChart />

    <!-- Export modal -->
    <ClassUsersTableExportSheet v-model:open="exportOpen" />

    <!-- Student learning data modal (triggered by clicking name) -->
    <ClassUsersTableStudentStatsModal v-model:open="statsOpen"
      :user-id="statsUserId || 0"
      :class-id="classId() || 0"
      :user="statsUser" />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const {
  showGroup, activeTab, sorting, students, columns,
  hideNumber, hideActions, extraColumns, classId,
  numberMap, sortableHeader,
  onNumberBlur, autoFillNumbers, openEdit, openReset, openStats,
  statsOpen, statsUserId, statsUser,
} = useClassUsersTableContext()

const exportOpen = ref(false)
function openExport() {
  exportOpen.value = true
}
</script>
