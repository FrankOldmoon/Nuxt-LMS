<template>
  <div class="mx-auto max-w-3xl px-4 py-6">
    <div class="mb-5 flex items-center gap-2">
      <UIcon name="i-lucide-share-2" class="size-4 text-primary" />
      <h1 class="text-lg font-semibold truncate">{{ title || '对话记录' }}</h1>
      <UBadge color="neutral" variant="soft" size="sm">只读分享</UBadge>
      <UBadge v-if="sharedAt" color="neutral" variant="soft" size="sm">
        {{ sharedAt }}
      </UBadge>
    </div>

    <div v-if="pending" class="py-10 text-center text-sm text-dimmed">加载中…</div>

    <div v-else-if="error" class="rounded-lg border border-default p-6 text-center text-sm text-dimmed">
      <UIcon name="i-lucide-link-2-off" class="mx-auto mb-2 size-6 opacity-60" />
      {{ error }}
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="m in messages"
        :key="m.id"
        class="flex gap-2"
        :class="m.role === 'user' ? 'flex-row-reverse' : ''"
      >
        <div
          class="shrink-0 size-7 rounded-full flex items-center justify-center"
          :class="m.role === 'user'
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'"
        >
          <UIcon :name="m.role === 'user' ? 'i-lucide-user' : 'i-lucide-bot'" class="size-4" />
        </div>
        <div
          class="max-w-[80%] px-3 py-2 rounded-lg text-sm leading-relaxed whitespace-pre-wrap break-words"
          :class="m.role === 'user'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'"
        >{{ m.content }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()

const token = String(route.params.token || '')
const title = ref('')
const sharedAt = ref('')
const messages = ref<any[]>([])
const pending = ref(true)
const error = ref('')

// 客户端加载：SSR 阶段服务端内部请求拿不到用户 cookie，
// 强行在 setup 里 await 只会得到"链接失效"的假象。
onMounted(async () => {
  try {
    const r: any = await cRequest(`/api/chat/share?token=${encodeURIComponent(token)}`)
    title.value = r?.conversation?.title || ''
    const at = r?.conversation?.sharedAt
    sharedAt.value = at ? new Date(at).toLocaleString() : ''
    messages.value = r?.messages || []
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || '链接已失效或被取消分享'
  } finally {
    pending.value = false
  }
})
</script>
