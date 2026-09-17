<template>
  <div class="space-y-6">
    <!-- 标题栏 -->
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h2 class="text-xl font-semibold">{{ t('admin.broadcast.title') }}</h2>
        <p class="text-xs text-muted mt-1">{{ t('admin.broadcast.subtitle') }}</p>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        variant="soft"
        size="sm"
        :loading="pending"
        :label="t('admin.broadcast.refresh')"
        @click="refresh()"
      />
    </div>

    <USkeleton v-if="!data" class="h-60" />

    <div v-else class="rounded-lg border border-default bg-default overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-xs text-muted">
            <tr class="border-b border-default">
              <th class="text-left px-3 py-2 font-medium">{{ t('admin.broadcast.table.title') }}</th>
              <th class="text-right px-3 py-2 font-medium w-20">{{ t('admin.broadcast.table.delivered') }}</th>
              <th class="text-right px-3 py-2 font-medium w-20">{{ t('admin.broadcast.table.read') }}</th>
              <th class="text-left px-3 py-2 font-medium w-56">{{ t('admin.broadcast.table.readRate') }}</th>
              <th class="text-right px-3 py-2 font-medium w-40">{{ t('admin.broadcast.table.sentAt') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in data.items" :key="b.id" class="border-b border-default last:border-0">
              <td class="px-3 py-2 align-top">
                <div class="font-medium truncate max-w-72">{{ b.name }}</div>
                <div v-if="b.text" class="text-xs text-muted mt-0.5 line-clamp-2 max-w-96">{{ b.text }}</div>
              </td>
              <td class="px-3 py-2 text-right tabular-nums align-top">{{ b.delivered }}</td>
              <td class="px-3 py-2 text-right tabular-nums align-top">{{ b.readCount }}</td>
              <td class="px-3 py-2 align-top">
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-2 rounded-full bg-elevated overflow-hidden min-w-16">
                    <div class="h-full rounded-full bg-primary" :style="{ width: `${b.readRate}%` }" />
                  </div>
                  <span class="text-xs tabular-nums w-12 text-right">{{ b.readRate }}%</span>
                </div>
              </td>
              <td class="px-3 py-2 text-right text-xs text-muted align-top whitespace-nowrap">
                {{ hydrated ? formatTime(b.createdAt) : '' }}
              </td>
            </tr>
            <tr v-if="!data.items.length">
              <td colspan="5" class="px-3 py-8 text-center text-muted text-xs">
                {{ t('admin.broadcast.empty') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const { t } = useI18n()

const { data, pending, refresh } = cRequest.use<any>('/api/admin/broadcasts', {
  default: () => null,
})

// 仅客户端渲染时间（浏览器本地时区），避免 SSR/CSR 时区不一致
const hydrated = ref(false)
onMounted(() => { hydrated.value = true })

function formatTime(ts: string) {
  if (!ts) return ''
  return new Date(ts).toLocaleString()
}
</script>
