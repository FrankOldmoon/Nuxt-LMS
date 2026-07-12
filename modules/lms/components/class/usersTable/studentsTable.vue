<template>
  <div v-show="!showGroup() || activeTab === 'students'">
    <ClassUsersTableTeachers />

    <!-- 学生表格 -->
    <UTable
      v-if="students.length"
      v-model:sorting="sorting"
      :data="students"
      :columns="columns"
      :ui="{ td: 'py-1.5' }"
    >
      <!-- number 列 -->
      <template v-if="!hideNumber()" #number-cell="{ row }">
        <UInput v-model="numberMap[row.original.id]" size="xs" class="w-16"
          :placeholder="'-'"
          @blur="onNumberBlur(row.original.id)"
          @keydown.enter="$event.target.blur()" />
      </template>
      <!-- number 表头：排序按钮 + 一键填充 -->
      <template v-if="!hideNumber()" #number-header="{ column }">
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
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const {
  showGroup, activeTab, sorting, students, columns,
  hideNumber, hideActions, extraColumns,
  numberMap, sortableHeader,
  onNumberBlur, autoFillNumbers, openEdit, openReset,
} = useClassUsersTableContext()
</script>
