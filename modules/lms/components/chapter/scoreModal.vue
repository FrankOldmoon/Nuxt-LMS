<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'max-w-5xl' }" scrollable>
    <template #content>
      <div class="p-6 space-y-4 min-w-[600px]">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">{{ $t('chapter.score') }}</h3>
          <LmsClassSelector v-if="canEdit" :course-id="courseId" />
        </div>

        <div v-if="!classId" class="py-8 text-center text-muted text-sm">
          {{ $t('chapter.noClass') }}
        </div>

        <div v-else-if="loading" class="py-8 text-center text-muted">
          <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-2 inline-block" />
          {{ $t('common.loading') }}
        </div>

        <div v-else-if="!students.length" class="py-8 text-center text-muted text-sm">
          {{ $t('classSelector.noUsers') }}
        </div>

        <!-- 得分表 + 条形图 -->
        <div v-else>
          <ClassUsersTable :rows="(tableRows as any)" :class-id="classId" :course-id="courseId" :loading="loading"
            :hide-actions="true" :hide-teachers="true"
            :extra-columns="extraColumns" :default-sort="[{ id: 'score', desc: true }]"
            show-chart show-group>
            <!-- 章节得分列 -->
            <template #score-cell="{ row }">
              <span class="font-mono font-bold text-sm">{{ (row.original.score ?? 0).toFixed(1) }}</span>
            </template>
            <!-- 任务列 -->
            <template #task-cell="{ row }">
              <div class="flex items-center gap-1 flex-wrap">
                <UTooltip
                  v-for="(item, idx) in row.original.items || []"
                  :key="idx"
                  :text="`${item.type} #${item.id} (${item.status})`"
                >
                  <TaskDot
                    :type="item.type"
                    :status="item.status"
                    :id="item.id"
                    @click="onItemClick(item)"
                  />
                </UTooltip>
                <span v-if="!(row.original.items || []).length" class="text-xs text-muted">-</span>
              </div>
            </template>
            <!-- 进度列：已完成 heading / 总 heading -->
            <template #progress-cell="{ row }">
              <div class="flex items-center gap-2 w-32">
                <UProgress :modelValue="Math.round((row.original.progress || 0) * 100)" size="xs" />
                <span class="text-xs text-muted font-mono shrink-0">{{ Math.round((row.original.progress || 0) * 100) }}%</span>
              </div>
            </template>
          </ClassUsersTable>
        </div>
      </div>
    </template>
  </UModal>

  <!-- 任务预览弹窗 -->
  <TaskModal v-model:open="taskModalOpen" :course-id="courseId" :type="taskModalItem.type" :id="taskModalItem.id"
    :status="taskModalItem.status" />
</template>

<script setup lang="ts">
import TaskDot from '../course/task/dot.vue'
import TaskModal from '../course/task/modal.vue'

const props = defineProps({
  courseId: { type: Number, default: 0 },
  chapterId: { type: Number, default: 0 },
  classId: { type: Number, default: 0 },
})
const isOpen = defineModel<boolean>('open', { default: false })
const { canEditCourse, hasRole } = useAuthLms()
const canEdit = computed(() => hasRole('admin') || canEditCourse(props.courseId))
const {
  students, loading, taskModalOpen, taskModalItem,
  onItemClick, tableRows, extraColumns, loadData,
} = useChapterScore(props, isOpen)
</script>
