<template>
  <!-- Modal 模式（预览模式，有 modelValue） -->
  <UModal v-if="isModal" v-model:open="open" scrollable>
    <template #content>
      <div v-if="form" class="p-6 space-y-4">
        <HomeworkEditFormBody show-cancel @cancel="open = false" />
      </div>
    </template>
  </UModal>

  <!-- 内联面板模式（编辑器模式，无 modelValue） -->
  <div v-else-if="form" class="p-6 space-y-4">
    <HomeworkEditFormBody />
  </div>
</template>

<script setup>
import { useHomeworkEdit } from './useHomeworkEdit'
import HomeworkEditFormBody from './edit/formBody.vue'

const props = defineProps({
  // Modal 模式：通过 v-model 控制
  modelValue: { type: Boolean, default: undefined },
  homeworkId: { type: Number, default: 0 },
  homework: { type: Object, default: null },
  courseId: { type: [Number, String], default: undefined }, // admin 后台复用时传入
})

const emit = defineEmits(['update:modelValue', 'saved'])

const { isModal, open, form } = useHomeworkEdit(props, emit)
</script>
