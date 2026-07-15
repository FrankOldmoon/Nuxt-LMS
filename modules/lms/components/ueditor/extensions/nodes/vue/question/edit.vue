<template>
  <!-- Modal mode（Previewmode，Has modelValue） -->
  <UModal v-if="isModal" v-model:open="open" scrollable>
    <template #content>
      <div v-if="form" class="p-6 space-y-4">
        <QuestionEditFormBody show-cancel @cancel="open = false" />
      </div>
    </template>
  </UModal>

  <!-- InsideinlinePanelmode（Editeditor mode，None modelValue） -->
  <div v-else-if="form" class="p-6 space-y-4">
    <QuestionEditFormBody />
  </div>
</template>

<script setup>
import { useQuestionEdit } from './useQuestionEdit'
import QuestionEditFormBody from './edit/formBody.vue'

const props = defineProps({
    modelValue: { type: Boolean, default: undefined },
    questionId: { type: Number, default: 0 },
    question: { type: Object, default: null },
    courseId: { type: Number, default: undefined },
})
const emit = defineEmits(['update:modelValue', 'saved'])

const { isModal, open, form } = useQuestionEdit(props, emit)
</script>
