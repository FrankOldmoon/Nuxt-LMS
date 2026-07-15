<template>
  <!-- Modal mode（Previewmode，Has modelValue） -->
  <UModal v-if="isModal" v-model:open="open" scrollable>
    <template #content>
      <div v-if="form" class="p-6 space-y-4">
        <HomeworkEditFormBody show-cancel @cancel="open = false" />
      </div>
    </template>
  </UModal>

  <!-- InsideinlinePanelmode（Editeditor mode，None modelValue） -->
  <div v-else-if="form" class="p-6 space-y-4">
    <HomeworkEditFormBody />
  </div>
</template>

<script setup>
import { useHomeworkEdit } from './useHomeworkEdit'
import HomeworkEditFormBody from './edit/formBody.vue'

const props = defineProps({
  // Modal mode：Pass v-model control
  modelValue: { type: Boolean, default: undefined },
  homeworkId: { type: Number, default: 0 },
  homework: { type: Object, default: null },
  courseId: { type: [Number, String], default: undefined }, // admin BackreplayTime Usedpass in
})

const emit = defineEmits(['update:modelValue', 'saved'])

const { isModal, open, form } = useHomeworkEdit(props, emit)
</script>
