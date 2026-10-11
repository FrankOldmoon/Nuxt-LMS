<template>
  <button
    v-if="imageSrc"
    class="group inline-flex items-center gap-1 max-w-[180px]"
    :title="t('admin.table.view')"
    @click.stop="$emit('view', row)"
  >
    <img :src="imageSrc" class="h-10 w-16 rounded border border-default/50 object-cover" alt="feedback" />
    <UIcon name="i-lucide-maximize-2" class="size-3.5 text-muted opacity-0 group-hover:opacity-100" />
  </button>
  <span v-else class="text-muted text-xs">-</span>
</template>

<script setup lang="ts">
const props = defineProps<{
  row: Record<string, any>
  value: any
  fkLabel?: string
}>()

const emit = defineEmits<{ view: [row: Record<string, any>] }>()

const { t } = useI18n()

/** content 可能是 { text: base64 }、纯字符串或旧版 UMO 文档对象 */
const rawContent = computed(() => {
  const c = props.row?.content
  if (typeof c === 'string') return c
  if (c && typeof c === 'object' && typeof c.text === 'string') return c.text
  return ''
})

const imageSrc = computed(() => {
  const raw = rawContent.value.trim()
  if (!raw) return ''
  if (raw.startsWith('data:image/')) return raw
  if (/^[A-Za-z0-9+/=]+$/.test(raw)) return `data:image/webp;base64,${raw}`
  return ''
})

/** 点击缩略图打开该行详情（由 TableRow 转发给表格的 view 事件），不再新开浏览器标签 */
function openFullImage() {
  emit('view', props.row)
}
</script>
