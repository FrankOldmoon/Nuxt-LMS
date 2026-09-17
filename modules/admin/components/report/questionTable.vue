<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="text-xs text-muted">
        <tr class="border-b border-default">
          <th class="text-left px-3 py-2 font-medium">{{ t('admin.report.table.name') }}</th>
          <th class="text-right px-3 py-2 font-medium w-24">{{ t('admin.report.table.submitCount') }}</th>
          <th class="text-right px-3 py-2 font-medium w-24">{{ t('admin.report.table.correctRate') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="`${row.courseId}-${row.cid}`" class="border-b border-default last:border-0">
          <td class="px-3 py-2 truncate max-w-56">
            {{ row.name }}
            <span class="text-muted text-xs">#{{ row.cid }}</span>
          </td>
          <td class="px-3 py-2 text-right tabular-nums">{{ fmt(row.submitCount) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">
            <span :class="rateClass(row.correctRate)">{{ row.correctRate }}%</span>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="3" class="px-3 py-6 text-center text-muted text-xs">{{ t('admin.report.empty') }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

defineProps<{
  rows: Array<{
    courseId: number
    cid: number
    name: string
    submitCount: number
    correctCount: number
    correctRate: number
  }>
}>()

const fmt = (n: number | null | undefined) => Number(n ?? 0).toLocaleString()

// 正确率着色：低红 / 中琥珀 / 高绿
const rateClass = (rate: number) => {
  if (rate >= 80) return 'text-green-500'
  if (rate >= 50) return 'text-amber-500'
  return 'text-red-500'
}
</script>
