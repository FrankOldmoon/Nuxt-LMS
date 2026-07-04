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

        <!-- 得分表 -->
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-default text-left text-muted">
                <th class="py-2 px-2 font-medium">{{ $t('classSelector.colName') }}</th>
                <th class="py-2 px-2 font-medium whitespace-nowrap">{{ $t('chapter.chapterScore') }}</th>
                <th class="py-2 px-2 font-medium">{{ $t('chapter.tasks') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="s in students"
                :key="s.id"
                class="border-b border-default/50 hover:bg-muted/30"
              >
                <!-- 姓名 -->
                <td class="py-2 px-2">
                  <div class="flex items-center gap-2">
                    <UAvatar :src="s.avatarImg || undefined" :alt="s.name" size="2xs" :text="s.name?.charAt(0)" />
                    <span>{{ s.name }}</span>
                  </div>
                </td>
                <!-- 章节得分 -->
                <td class="py-2 px-2">
                  <span class="font-mono font-bold">{{ getScore(s.id).toFixed(1) }}</span>
                </td>
                <!-- 任务状态点 -->
                <td class="py-2 px-2">
                  <div class="flex items-center gap-1 flex-wrap">
                    <UTooltip
                      v-for="(item, idx) in getItems(s.id)"
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
                    <span v-if="getItems(s.id).length === 0" class="text-xs text-muted">-</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
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

function getScore(userId: number): number {
  return scoreMap.value.get(userId)?.score ?? 0
}

function getItems(userId: number): TaskItem[] {
  return scoreMap.value.get(userId)?.items ?? []
}

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
