<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-base font-semibold">{{ row?.name || 'Question' }}</h3>
      <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="$emit('close')" />
    </div>
    <ClientOnly>
      <QuestionRender :question="row || undefined" :course-id="row?.courseId" />
      <template #fallback>
        <div class="py-8 text-center text-muted text-sm">Loading...</div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import QuestionRender from '../../lms/components/ueditor/extensions/nodes/vue/question/render.vue'

defineProps<{
  row: Record<string, any> | null
  fkLabels?: Record<string, Record<number, string>>
}>()

defineEmits<{ close: [] }>()
</script>
