<template>
  <!-- Modal mode（Previewmode，Has modelValue） -->
  <UModal v-if="isModal" v-model:open="open" scrollable>
    <template #content>
      <div v-if="form" class="p-6 space-y-4">
        <QuizEditFormBody show-cancel @cancel="open = false" />
      </div>
    </template>
  </UModal>

  <!-- InsideinlinePanelmode（Editeditor mode，None modelValue） -->
  <div v-else-if="form" class="p-6 space-y-4">
    <QuizEditFormBody />
  </div>

  <!-- Question selecteditor -->
  <UeditorContentPicker v-model="pickerOpen" type="questions" @confirm="onPickQuestions" />
</template>

<script setup>
import { useQuizEdit } from './useQuizEdit'
import QuizEditFormBody from './edit/formBody.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: undefined },
  quizId: { type: Number, default: 0 },
  quiz: { type: Object, default: null },
  courseId: { type: [Number, String], default: undefined },
})
const emit = defineEmits(['update:modelValue', 'saved'])

const { isModal, open, form, pickerOpen, onPickQuestions } = useQuizEdit(props, emit)
</script>
