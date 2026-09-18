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
            v-for="item in list.items"
            :key="item.id"
            class="rounded-md border p-3 transition-colors cursor-pointer hover:bg-muted/50"
            :class="item.readAt ? 'bg-background' : 'bg-primary/5 border-primary/20'"
          >
            <div class="flex items-start gap-2">
              <span v-if="!item.readAt" class="size-2 rounded-full bg-primary shrink-0 mt-1.5" />
              <span v-else class="size-2 shrink-0 mt-1.5" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h4 class="font-medium text-sm truncate">{{ displayTitle(item) }}</h4>
                  <span class="text-[10px] rounded-full px-1.5 py-0.5 shrink-0"
                    :class="item.readAt ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'">
                    {{ item.readAt ? $t('notification.read') : $t('notification.unread') }}
                  </span>
                </div>
                <p v-if="displayText(item)" class="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {{ displayText(item) }}
                </p>
                <p class="text-[10px] text-muted-foreground mt-1.5">{{ formatTime(item.createdAt) }}</p>
              </div>
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

// 广播发送成功后：通知弹窗列表刷新 + 未读角标即时更新
async function afterBroadcast() {
  await refresh()
  await refreshUnread()
}
</script>
