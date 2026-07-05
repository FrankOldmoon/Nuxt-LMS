<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-3xl' }">
    <UButton
      icon="i-lucide-history"
      color="info"
      
      size="sm"
      :label="$t('layout.history')"
      class="justify-start"
    />

    <template #body>
      <div class="flex flex-col gap-4 h-[70vh] min-w-[480px]">
        <!-- 加载中 -->
        <div v-if="pending" class="flex items-center justify-center gap-2 py-10 text-muted">
          <UIcon name="i-lucide-loader-2" class="animate-spin size-5" />
          <span class="text-sm">{{ $t('layout.historyLoading') }}</span>
        </div>

        <!-- 空状态 -->
        <div v-else-if="!versions.length" class="flex items-center justify-center py-10 text-muted text-sm">
          {{ $t('layout.historyEmpty') }}
        </div>

        <template v-else>
          <!-- 上方：内容预览 -->
          <div class="flex-1 min-h-0 overflow-y-auto border border-default rounded-lg p-4 bg-elevated/30">
            <UeditorRender :json="currentVersion?.content" />
          </div>

          <!-- 下方：分页 + 恢复 -->
          <div class="flex items-center justify-between gap-3 pt-2">
            <!-- 版本信息 -->
            <div class="flex items-center gap-2 min-w-0">
              <UIcon name="i-lucide-file-clock" class="size-4 text-muted shrink-0" />
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-medium text-highlighted">
                    {{ $t('layout.versionLabel', { n: page }) }}
                  </p>
                  <UBadge
                    v-if="page === 1"
                    :label="$t('layout.versionNewest')"
                    color="primary"
                    variant="subtle"
                    size="xs"
                  />
                </div>
                <p class="text-xs text-muted">{{ formatTime(currentVersion?.createdAt) }}</p>
              </div>
            </div>

            <!-- 分页按钮 -->
            <div class="flex items-center gap-2">
              <UButton
                icon="i-lucide-chevron-left"
                size="sm"
                color="neutral"
                variant="outline"
                :disabled="page <= 1"
                @click="() => { page-- }"
              />
              <span class="text-sm text-muted min-w-[60px] text-center">
                {{ page }} / {{ versions.length }}
              </span>
              <UButton
                icon="i-lucide-chevron-right"
                size="sm"
                color="neutral"
                variant="outline"
                :disabled="page >= versions.length"
                @click="() => { page++ }"
              />
            </div>

            <!-- 恢复按钮 -->
            <UButton
              :label="$t('layout.restore')"
              icon="i-lucide-rotate-ccw"
              size="sm"
              color="primary"
              variant="soft"
              :loading="restoring"
              @click="handleRestore(currentVersion!.id)"
            />
          </div>
        </template>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  table: string
  id: number
}>()

const { t } = useI18n()
const toast = useToast()
const { notifyContentSaved } = useLayoutState()

const open = ref(false)
const versions = ref<{ id: number; content: any; createdAt: string }[]>([])
const pending = ref(false)
const restoring = ref(false)
// 当前页码（1 起始，versions 按最新在前排序，故 page=1 即最新版本）
const page = ref(1)

const currentVersion = computed(() => versions.value[page.value - 1] ?? null)

async function fetchVersions() {
  if (!props.id || !props.table) {
    versions.value = []
    return
  }
  pending.value = true
  try {
    const data = await cRequest<{ id: number; content: any; createdAt: string }[]>(
      `/api/lms/${props.table}/versions?id=${props.id}`,
    )
    versions.value = data || []
    page.value = 1
  } catch {
    versions.value = []
  } finally {
    pending.value = false
  }
}

async function handleRestore(versionId: number) {
  restoring.value = true
  try {
    await cRequest(`/api/lms/${props.table}/restore`, {
      method: 'POST',
      body: { versionId },
    })
    toast.add({ title: t('layout.restoreSuccess'), color: 'success' })
    // 通知页面刷新数据（contentVersion +1，页面 watch 会重新拉取）
    notifyContentSaved()
    open.value = false
    location.reload()
  } catch {
    // cRequest 已抛错，此处无需额外处理
  } finally {
    restoring.value = false
  }
}

// 打开弹窗时拉取历史版本
watch(open, (val) => {
  if (val) fetchVersions()
})
</script>
