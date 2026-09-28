<template>
  <UModal v-model:open="open" scrollable fullscreen>
    <template #body>
      <div class="p-6 space-y-4 min-w-[600px]">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">{{ $t('record.questionRecords') }}</h2>
          <div class="flex items-center gap-2">
            <LmsClassSelector :course-id="courseId" />
            <UTooltip :text="$t('common.refresh')">
              <UButton icon="i-lucide-refresh-cw" variant="soft" size="sm" :loading="pending" @click="fetchRecords" />
            </UTooltip>
          </div>
        </div>

        <ClassUsersTable :rows="rows" :loading="pending" :extra-columns="extraColumns" :hide-actions="true"
          :hide-teachers="true" :default-sort="defaultSort">
          <!-- record 列：常规题型显示学生选择/填写的具体内容 + 正确与否；
               OJ 题直接放「查看代码」（跳转到该生在 OJ 上最新一次提交记录页），不另开一列 -->
          <template #record-cell="{ row }">
            <template v-if="isOj">
              <UButton v-if="row.original.oj?.rid" icon="i-lucide-code-xml" variant="soft" size="xs"
                :label="$t('record.viewOjRecord')" :title="$t('record.viewOjRecordHint')"
                @click="openOjRecord(row)" />
              <UIcon v-else-if="ojPending" name="i-lucide-loader-2" class="animate-spin size-3.5 text-muted" />
              <span v-else class="text-xs text-gray-400">-</span>
            </template>
            <div v-else class="flex items-start gap-2">
              <template v-if="row.original.record">
                <UIcon :name="recordIcon(row.original.record)" class="w-3.5 h-3.5 mt-0.5 shrink-0"
                  :class="recordIconClass(row.original.record)" />
                <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span v-for="(ans, idx) in formatUserAnswer(row.original.record)" :key="idx"
                    class="text-xs px-1.5 py-0.5 rounded" :class="answerItemClass(row.original.record, idx)">
                    {{ ans }}
                  </span>
                </div>
              </template>
              <span v-else class="text-xs text-gray-400">-</span>
            </div>
          </template>
          <template #score-cell="{ row }">
            {{ row.original.record?.score || '-'  }}
          </template>
        </ClassUsersTable>

        <!-- 选项分布柱状图（仅 single/multiple 类型） -->
        <ClientOnly v-if="showOptionChart">
          <div class="mt-4 pt-4 border-t border-default">
            <h3 class="text-sm font-medium mb-2">{{ $t('record.optionDistribution') }}</h3>
            <Chart :option="optionChartOption" height="240" />
          </div>
        </ClientOnly>
      </div>
    </template>
  </UModal>
</template>

<script setup>
import { useQuestionRecords } from './useQuestionRecords'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  courseId: { type: Number, default: 0 },
  cid: { type: Number, default: 0 },
  question: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue'])

const {
  open, rows, pending, extraColumns, defaultSort, fetchRecords,
  isOj, ojPending, openOjRecord,
  recordIcon, recordIconClass, formatUserAnswer, answerItemClass, formatCorrectRate,
  showOptionChart, optionChartOption,
} = useQuestionRecords(props, emit)
</script>
