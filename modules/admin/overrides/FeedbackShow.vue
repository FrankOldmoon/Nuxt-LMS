<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-base font-semibold">{{ props.row?.name || 'Feedback' }}</h3>
      <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="$emit('close')" />
    </div>

    <div class="space-y-3">
      <div class="grid grid-cols-[120px_1fr] gap-2 text-sm">
        <span class="text-muted">{{ t('admin.feedback.type') }}</span>
        <span><UBadge color="info" variant="subtle" size="sm">{{ typeLabel }}</UBadge></span>

        <span class="text-muted">{{ t('admin.feedback.user') }}</span>
        <span>{{ userName || `#${props.row?.userId ?? '-'}` }}</span>

        <span class="text-muted">{{ t('admin.feedback.createdAt') }}</span>
        <span>{{ createdAtLabel }}</span>
      </div>

      <div>
        <div class="text-sm text-muted mb-1">{{ t('admin.feedback.content') }}</div>
        <img
          v-if="imageSrc"
          :src="imageSrc"
          class="max-h-[60vh] max-w-full rounded border border-default/50 object-contain cursor-zoom-in"
          :alt="props.row?.name || 'feedback'"
          @click="openFullImage"
        />
        <pre v-else class="text-xs whitespace-pre-wrap bg-default rounded p-2">{{ rawContent }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  row: Record<string, any> | null
  fkLabels?: Record<string, Record<number, string>>
}>()

defineEmits<{ close: [] }>()

const { t } = useI18n()

const typeLabels: Record<string, string> = {
  bug: t('feedback.typeBug'),
  suggestion: t('feedback.typeSuggestion'),
  requirement: t('feedback.typeRequirement'),
}

const typeLabel = computed(() => typeLabels[String(props.row?.type || '')] || String(props.row?.type || '-'))

const userName = computed(() => {
  const id = props.row?.userId
  if (id == null) return ''
  return props.fkLabels?.userId?.[Number(id)] || ''
})

const createdAtLabel = computed(() => {
  const v = props.row?.createdAt
  if (!v) return '-'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString()
})

/** content 可能是 { text: base64 }（反馈提交时存为字符串）、纯字符串或旧版 UMO 文档对象 */
const rawContent = computed(() => {
  const c = props.row?.content
  if (typeof c === 'string') return c
  if (c && typeof c === 'object' && typeof c.text === 'string') return c.text
  if (c == null) return '-'
  return JSON.stringify(c, null, 2)
})

const imageSrc = computed(() => {
  const raw = rawContent.value
  if (!raw || typeof raw !== 'string') return ''
  const trimmed = raw.trim()
  if (trimmed.startsWith('data:image/')) return trimmed
  // 兼容历史纯 base64（无 data URL 前缀）
  if (/^[A-Za-z0-9+/=]+$/.test(trimmed)) return `data:image/webp;base64,${trimmed}`
  return ''
})

function openFullImage() {
  if (imageSrc.value) window.open(imageSrc.value, '_blank')
}
</script>
