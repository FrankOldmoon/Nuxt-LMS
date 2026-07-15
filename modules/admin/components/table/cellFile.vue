<template>
  <UPopover :content="{ align: 'start' }">
    <UBadge color="neutral" variant="subtle" size="sm" class="cursor-pointer">
      <UIcon name="i-lucide-paperclip" class="size-3 mr-1" />
      {{ t('admin.cell.files', { n: fileCount }) }}
    </UBadge>
    <template #content>
      <div class="max-w-[480px] max-h-[320px] overflow-auto p-2 space-y-1">
        <a
          v-for="(url, idx) in fileUrls"
          :key="idx"
          :href="url"
          target="_blank"
          rel="noopener"
          class="flex items-center gap-2 text-xs text-blue-500 hover:underline truncate"
        >
          <UIcon name="i-lucide-link" class="size-3 shrink-0" />
          <span class="truncate">{{ url }}</span>
        </a>
        <div v-if="fileUrls.length === 0" class="text-xs text-muted py-2 text-center">
          {{ t('admin.cell.empty') }}
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
const props = defineProps<{
  value: any
}>()

const { t } = useI18n()

/** File URL list: supports JSON array string / array / single URL */
const fileUrls = computed<string[]>(() => {
  const v = props.value
  if (!v) return []
  if (Array.isArray(v)) return v.filter(Boolean).map(String)
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s) return []
    if (s.startsWith('[')) {
      try {
        const arr = JSON.parse(s)
        if (Array.isArray(arr)) return arr.filter(Boolean).map(String)
      } catch { /* fall through */ }
    }
    if (s.includes('\n')) return s.split(/\n+/).map((x) => x.trim()).filter(Boolean)
    if (s.includes(',')) return s.split(',').map((x) => x.trim()).filter(Boolean)
    return [s]
  }
  return [String(v)]
})

const fileCount = computed(() => fileUrls.value.length)
</script>
