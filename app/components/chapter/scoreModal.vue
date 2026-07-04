<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'max-w-5xl' }" scrollable>
    <template #content>
      <div class="p-6 space-y-4 min-w-[600px]">
        <h3 class="text-lg font-semibold">{{ $t('chapter.score') }}</h3>

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
          <ClassUsersTable :rows="(tableRows as any)" :class-id="props.classId" :course-id="props.courseId" :loading="loading"
            :hide-actions="true" :hide-teachers="true" :hide-number="true"
            :extra-columns="extraColumns" :default-sort="[{ id: 'score', desc: true }]"
            show-chart show-group>
            <!-- 章节得分列 -->
            <template #score-cell="{ row }">
              <span class="font-mono font-bold text-sm">{{ (row.original.score ?? 0).toFixed(1) }}</span>
            </template>
            <!-- 任务状态列 -->
            <template #tasks-cell="{ row }">
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
import TaskDot from '../course/taskDot.vue'
import TaskModal from '../course/taskModal.vue'

type TaskItem = {
  id: number
  type: 'question' | 'homework' | 'comment'
  status: string
}

const isOpen = defineModel('open', { default: false })
const { t } = useI18n()
const { students, fetchUsers } = useClassUsers()

const props = defineProps({
  courseId: { type: Number, default: 0 },
  chapterId: { type: Number, default: 0 },
  classId: { type: Number, default: 0 },
})

const loading = ref(false)
const scoreData = ref<{ userId: number; score: number; items: TaskItem[] }[]>([])

// ---- 任务弹窗状态 ----
const taskModalOpen = ref(false)
const taskModalItem = reactive<TaskItem>({ type: 'question', id: 0, status: 'todo' })

function onItemClick(item: TaskItem) {
  Object.assign(taskModalItem, item)
  taskModalOpen.value = true
}

const scoreMap = computed(() => new Map(scoreData.value.map(r => [r.userId, r])))

// ClassUsersTable 的行数据：合并 students 和 scoreData
const tableRows = computed(() => {
  return students.value.map(s => {
    const sd = scoreMap.value.get(s.id)
    return {
      id: s.id,
      name: s.name,
      preferName: s.preferName,
      rollNumber: s.rollNumber,
      avatarImg: s.avatarImg,
      score: sd?.score ?? 0,
      items: sd?.items ?? [],
    }
  })
})

// 额外列：章节得分 + 任务状态
const extraColumns = computed(() => [
  { id: 'score', header: t('chapter.chapterScore') },
  { id: 'tasks', header: t('chapter.tasks') },
])

async function loadData() {
  if (!props.chapterId || !props.classId || !props.courseId) return
  loading.value = true
  try {
    // 确保班级用户已加载
    await fetchUsers(props.classId, props.courseId)
    // 获取章节得分
    const data = await cRequest(`/api/lms/chapters/scores?chapterId=${props.chapterId}&classId=${props.classId}&courseId=${props.courseId}`)
    scoreData.value = data || []
  } catch (e) {
    console.error('加载章节得分失败', e)
  } finally {
    loading.value = false
  }
}

watch(isOpen, (val) => {
  if (val) loadData()
})
</script>
