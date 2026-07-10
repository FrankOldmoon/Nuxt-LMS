<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-base font-semibold">{{ props.row?.name || props.row?.title || 'Chapter' }}</h3>
      <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="$emit('close')" />
    </div>

    <!-- 章节元信息 -->
    <div class="space-y-1 mb-4 text-xs text-muted">
      <div v-if="props.row?.courseId">
        <span class="font-medium">courseId:</span> {{ props.row.courseId }}
      </div>
      <div v-if="props.row?.cid !== undefined">
        <span class="font-medium">cid:</span> {{ props.row.cid }}
      </div>
    </div>

    <!-- content 富文本预览（使用 ueditorRender，传入 course-id 让内部 question 等节点可加载） -->
    <div v-if="contentJson" class="border border-default rounded-md p-3 bg-default/30">
      <ClientOnly>
        <ueditorRender :json="contentJson" :course-id="effectiveCourseId" />
        <template #fallback>
          <div class="py-8 text-center text-muted text-sm">Loading...</div>
        </template>
      </ClientOnly>
    </div>
    <div v-else class="text-xs text-muted py-4 text-center">No content</div>

    <!-- 其他字段（除 content 之外） -->
    <div v-if="otherEntries.length" class="mt-4 space-y-1">
      <div
        v-for="[key, val] in otherEntries"
        :key="key"
        class="grid grid-cols-[160px_1fr] gap-2 py-1.5 border-b border-default/50 items-start"
      >
        <div class="text-xs font-medium text-muted pt-0.5">{{ key }}</div>
        <div class="min-w-0 text-sm break-all">{{ formatValue(val) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  row: Record<string, any> | null
  fkLabels?: Record<string, Record<number, string>>
}>()

defineEmits<{
  close: []
}>()

// 解析 content：可能是对象（jsonb）或字符串（markdown/纯文本）
const contentJson = computed(() => {
  const v: any = props.row?.content
  if (!v) return null
  if (typeof v === 'object') return v
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s) return null
    // 尝试解析为 JSON（jsonb 序列化的对象）
    if (s.startsWith('{') || s.startsWith('[')) {
      try { return JSON.parse(s) } catch { /* fall through */ }
    }
    // 纯文本/markdown
    return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: s }] }] }
  }
  return null
})

// 推导 courseId：优先 courseId，其次 course_id
const effectiveCourseId = computed(() => {
  const r: any = props.row
  if (!r) return undefined
  const v = r.courseId ?? r.course_id
  if (v === undefined || v === null || v === '') return undefined
  return Number(v) || undefined
})

// 其他字段（排除 content、name、title、id）
const otherEntries = computed(() => {
  const r: any = props.row || {}
  return Object.entries(r).filter(([k]) => !['content', 'name', 'title', 'id'].includes(k))
})

function formatValue(v: any): string {
  if (v === null || v === undefined) return '-'
  if (typeof v === 'object') {
    try { return JSON.stringify(v) } catch { return String(v) }
  }
  return String(v)
}
</script>
