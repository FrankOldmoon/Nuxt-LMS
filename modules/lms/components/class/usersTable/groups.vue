<template>
  <div v-if="showGroup() && activeTab === 'groups'">
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
    <ClientOnly v-if="showChart() && groupTableRows.length">
      <div class="mt-4">
        <Chart :option="groupChartOption" height="320" />
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const {
  showGroup, showChart, activeTab,
  groupTableRows, groupColumns, groupSorting, groupChartOption,
} = useClassUsersTableContext()
</script>
