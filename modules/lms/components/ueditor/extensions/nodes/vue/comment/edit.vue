<template>
  <!-- Modal 模式（预览模式，有 modelValue） -->
  <UModal v-if="isModal" v-model:open="open" scrollable>
    <template #content>
      <div v-if="form" class="p-6 space-y-4">
        <CommentEditFormBody show-cancel @cancel="open = false" />
      </div>
    </template>
  </UModal>

  <!-- 内联面板模式（编辑器模式，无 modelValue） -->
  <div v-else-if="form" class="p-6 space-y-4">
    <CommentEditFormBody />
  </div>
</template>

<script setup>
import { useCommentEdit } from './useCommentEdit'
import CommentEditFormBody from './edit/formBody.vue'

const props = defineProps({
  // Modal 模式：通过 v-model 控制
  modelValue: { type: Boolean, default: undefined },
  commentId: { type: Number, default: 0 },
  comment: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const { isModal, open, form } = useCommentEdit(props, emit)
</script>
