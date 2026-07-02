<template>
  <div class="flex flex-wrap items-center gap-1">
    <span
      v-for="(tag, idx) in modelValue"
      :key="idx"
      class="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded text-xs"
    >
      {{ tag }}
      <button class="hover:text-red-500" @click="removeTag(idx)">&times;</button>
    </span>
    <UInput
      ref="inputRef"
      v-model="text"
      size="2xs"
      class="w-24"
      :placeholder="placeholder"
      @keydown.enter.prevent="addTag"
      @keydown.backspace="onBackspace"
    />
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  placeholder: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const text = ref('')
const inputRef = ref(null)

function addTag() {
  if (!text.value.trim()) return
  const val = text.value.trim()
  if (!props.modelValue.includes(val)) {
    emit('update:modelValue', [...props.modelValue, val])
  }
  text.value = ''
}

function removeTag(idx) {
  const tags = [...props.modelValue]
  tags.splice(idx, 1)
  emit('update:modelValue', tags)
}

function onBackspace() {
  if (!text.value && props.modelValue.length > 0) {
    removeTag(props.modelValue.length - 1)
  }
}
</script>
