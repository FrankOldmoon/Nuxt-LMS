<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-lg' }" scrollable>
    <template #content>
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">{{ $t('notification.title') }}</h3>
          <UButton v-if="isAdmin" size="xs" color="primary" variant="soft" icon="i-lucide-megaphone"
            :label="$t('notification.broadcast')" @click="broadcastOpen = true" />
        </div>

        <div v-if="pending" class="flex justify-center py-8 text-muted-foreground">
          <UIcon name="i-lucide-loader-2" class="size-5 animate-spin mr-2" />
          {{ $t('notification.loading') }}
        </div>

        <div v-else-if="!list?.items?.length" class="text-center py-8 text-muted-foreground">
          <UIcon name="i-lucide-bell-off" class="size-10 mx-auto mb-2 opacity-30" />
          <p class="text-sm">{{ $t('notification.noNotifications') }}</p>
        </div>

        <div v-else class="space-y-2 max-h-96 overflow-y-auto -mx-2 px-2">
          <div
            v-for="row in rows"
            :key="row.item.id"
            class="rounded-md border p-3 transition-colors"
            :class="[
              row.item.readAt ? 'bg-background' : 'bg-primary/5 border-primary/20',
              row.action ? 'cursor-pointer hover:bg-muted/50' : '',
            ]"
            @click="openNotification(row)"
          >
            <div class="flex items-start gap-2">
              <span v-if="!row.item.readAt" class="size-2 rounded-full bg-primary shrink-0 mt-1.5" />
              <span v-else class="size-2 shrink-0 mt-1.5" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h4 class="font-medium text-sm truncate">{{ displayTitle(row.item) }}</h4>
                  <span class="text-[10px] rounded-full px-1.5 py-0.5 shrink-0"
                    :class="row.item.readAt ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'">
                    {{ row.item.readAt ? $t('notification.read') : $t('notification.unread') }}
                  </span>
                </div>
                <p v-if="displayText(row.item)" class="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {{ displayText(row.item) }}
                </p>
                <p class="text-[10px] text-muted-foreground mt-1.5">{{ formatTime(row.item.createdAt) }}</p>
              </div>
              <!-- 点击按钮：样式参考课程进度里的任务点（小圆点 + 悬浮提示），点击跳转对应课程章节 -->
              <UTooltip v-if="row.action" :text="row.action.label">
                <button
                  type="button"
                  class="notif-action w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-primary/40 text-primary bg-primary/5 cursor-pointer hover:scale-125 transition-transform"
                  @click.stop="openNotification(row)"
                >
                  <UIcon :name="row.action.icon" class="size-3" />
                </button>
              </UTooltip>
            </div>
          </div>
        </div>

        <div v-if="list && list.total > list.pageSize" class="flex items-center justify-between pt-4 mt-2 border-t">
          <span class="text-xs text-muted-foreground">
            {{ $t('notification.page', { page: list.page, total: Math.ceil(list.total / list.pageSize) }) }}
          </span>
          <div class="flex gap-1">
            <UButton variant="outline" size="xs" :disabled="page <= 1" @click="page--">
              <UIcon name="i-lucide-chevron-left" class="size-3.5" />
            </UButton>
            <UButton variant="outline" size="xs" :disabled="page >= Math.ceil(list.total / list.pageSize)" @click="page++">
              <UIcon name="i-lucide-chevron-right" class="size-3.5" />
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>

  <!-- 管理员：发通知给所有人
       Lazy：广播弹窗内含富文本编辑器（tiptap/ProseMirror 内核，数 MB），
       只有管理员点「广播」才需要，不能进入口 chunk -->
  <LazyLayoutNotificationBroadcastModal v-model:open="broadcastOpen" @sent="afterBroadcast" />

  <!-- 直接弹出 Task 详情（由 lms 模块提供 CourseTaskModal；未启用时见 openNotification 回退跳转） -->
  <component
    :is="TaskModalComp"
    v-if="hasTaskModal"
    v-model:open="taskOpen"
    :course-id="task.courseId"
    :type="task.type"
    :id="task.id"
  />
</template>

<script setup lang="ts">
const isOpen = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { page, list, pending, formatTime, refresh } = useNotifications(isOpen)
const { hasRole } = useAuth()
const isAdmin = computed(() => hasRole('admin'))

const broadcastOpen = ref(false)
const { refresh: refreshUnread } = useUnreadCounts()

/**
 * 系统生成的定向通知（作业评分 / 评论过审）服务端只存中文兜底文案，
 * 这里按 data.type 用当前语言重新渲染；管理员广播则直接显示原始标题/内容。
 */
function displayTitle(item: any): string {
  const type = item?.data?.type
  if (type === 'homeworkGraded') return t('notification.homeworkGradedTitle')
  if (type === 'commentApproved') return t('notification.commentApprovedTitle')
  return item?.name || ''
}

function displayText(item: any): string {
  const d = item?.data
  if (d?.type === 'homeworkGraded') return t('notification.homeworkGraded', { score: d.score })
  if (d?.type === 'commentApproved') return t('notification.commentApproved')
  return item?.content?.text || ''
}

/**
 * 通知附带的动作（作业已评分 / 评论已通过）：
 * 依据 data 里的 courseId + 节点 id，直接弹出对应的 Task 详情。
 */
function notificationAction(item: any): { type: string; id: number; courseId: number | string; icon: string; label: string } | null {
  const d = item?.data
  if (!d || !d.courseId) return null
  if (d.type === 'homeworkGraded' && d.homeworkCid) {
    return { type: 'homework', id: Number(d.homeworkCid), courseId: d.courseId, icon: 'i-lucide-file-text', label: t('notification.viewHomework') }
  }
  if (d.type === 'commentApproved' && d.cid) {
    return { type: 'comment', id: Number(d.cid), courseId: d.courseId, icon: 'i-lucide-message-circle', label: t('notification.viewComment') }
  }
  return null
}

// 可选依赖：lms 模块提供的任务详情弹窗。存在时"直接弹出 Task"，
// 不存在（lms 未启用）时回退为跳转课程章节。
const TaskModalComp = resolveComponent('CourseTaskModal')
const hasTaskModal = typeof TaskModalComp !== 'string'
const taskOpen = ref(false)
const task = reactive({ courseId: 0 as number | string, type: '', id: 0 })

// 列表项 + 其可点击动作（无动作则 action 为 null，不可点击）
const rows = computed(() =>
  (list.value?.items || []).map((item: any) => ({ item, action: notificationAction(item) })),
)

// 点击通知：关闭通知弹窗并直接弹出 Task 详情；无 Task 弹窗时跳转到对应课程章节
async function openNotification(row: { item: any; action: ReturnType<typeof notificationAction> }) {
  const a = row?.action
  if (!a) return
  isOpen.value = false
  if (hasTaskModal) {
    task.courseId = a.courseId
    task.type = a.type
    task.id = a.id
    taskOpen.value = true
    return
  }
  await navigateTo(`/course/${a.courseId}/${a.id}`)
}

// 广播发送成功后：通知弹窗列表刷新 + 未读角标即时更新
async function afterBroadcast() {
  await refresh()
  await refreshUnread()
}
</script>
