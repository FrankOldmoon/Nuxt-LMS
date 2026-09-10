<template>
  <div v-show="!showGroup() || activeTab === 'students'">
    <ClassUsersTableTeachers />

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
      <!-- number 列：仅 select class 弹窗可编辑（editableNumber），其它只读 -->
      <template v-if="!hideNumber()" #number-cell="{ row }">
        <UInput v-if="editableNumber()" v-model="numberMap[row.original.id]" size="xs" class="w-16"
          :placeholder="'-'"
          @blur="onNumberBlur(row.original.id)"
          @keydown.enter="$event.target.blur()" />
        <span v-else class="text-sm text-muted font-mono">{{ row.original.number || '-' }}</span>
      </template>
      <!-- number 表头：排序按钮 + 一键填充（仅 select class 弹窗可编辑时显示） -->
      <template v-if="!hideNumber()" #number-header="{ column }">
        <div class="flex items-center gap-1">
          <component :is="sortableHeader(t('classSelector.colNumber'))({ column })" />
          <UButton v-if="editableNumber()" icon="i-lucide-list-ordered" size="xs" color="neutral" variant="ghost"
            :title="$t('classSelector.autoFillNumber')" @click="autoFillNumbers" />
        </div>
      </template>
      <template #name-cell="{ row }">
        <button type="button" class="flex items-center gap-2 group"
          :title="$t('classSelector.viewStudentStats')"
          @click="openStats(row.original)">
          <UAvatar :src="row.original.avatarImg || undefined" :alt="row.original.name" size="2xs" :text="row.original.name?.charAt(0)" />
          <span class="text-sm text-primary group-hover:underline cursor-pointer">{{ row.original.name }}</span>
          <!-- 前三名金银铜奖杯（按当前表格显示顺序取前 3 行） -->
          <span v-if="showMedal()" class="text-sm leading-none">
            {{ ['🥇', '🥈', '🥉'][row.index] ?? '' }}
          </span>
        </button>
      </template>
      <!-- 重置密码列 -->
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
      <!-- 转发额外列的插槽 -->
      <template v-for="col in (extraColumns() || [])" :key="col.id" #[col.id+'-cell']="slotProps">
        <slot :name="col.id+'-cell'" v-bind="slotProps" />
      </template>
    </UTable>

    <ClassUsersTableChart />

    <!-- 导出弹窗 -->
    <ClassUsersTableExportSheet v-model:open="exportOpen" />

    <!-- 学生学习数据弹窗（点击姓名触发） -->
    <ClassUsersTableStudentStatsModal v-model:open="statsOpen"
      :user-id="statsUserId || 0"
      :course-id="currentCourseId"
      :class-id="classId() || 0"
      :user="statsUser" />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const {
  showGroup, activeTab, sorting, students, columns,
  hideNumber, hideActions, extraColumns, classId, currentCourseId,
  numberMap, sortableHeader, showMedal, editableNumber,
  onNumberBlur, autoFillNumbers, openEdit, openReset, openStats,
  statsOpen, statsUserId, statsUser,
} = useClassUsersTableContext()

const exportOpen = ref(false)
function openExport() {
  exportOpen.value = true
}
</script>
