<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-base font-semibold">{{ props.row?.name || 'Quiz' }}</h3>
      <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="$emit('close')" />
    </div>
    <ClientOnly>
      <QuizRender :node="renderNode" :course-id="props.row?.courseId" />
      <template #fallback>
        <div class="py-8 text-center text-muted text-sm">Loading...</div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import QuizRender from '../../lms/components/ueditor/extensions/nodes/vue/quiz/render.vue'

const props = defineProps<{
  row: Record<string, any> | null
  fkLabels?: Record<string, Record<number, string>>
}>()

defineEmits<{ close: [] }>()

const renderNode = computed(() => ({
  attrs: { type: 'quiz', content: String((props.row as any)?.cid || '') },
}))
</script>
