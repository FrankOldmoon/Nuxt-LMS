<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <label class="text-xs text-gray-500">{{ $t('question.sortItemsHint') }}</label>
      <UButton variant="ghost" size="2xs" icon="i-heroicons-plus" @click="addItem">{{ $t('question.addOption') }}</UButton>
    </div>
    <p class="text-xs text-gray-400 mb-2">{{ $t('question.sortDragHint') }}</p>

    <draggable
      v-model="dragItems"
      item-key="id"
      handle=".drag-handle"
      animation="200"
      class="space-y-2"
    >
      <template #item="{ element, index }">
        <div class="flex items-center gap-2 p-2 rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
          <!-- 拖拽手柄 -->
          <span class="drag-handle cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0">
            <UIcon name="i-heroicons-bars-3" class="w-4 h-4" />
          </span>
          <!-- 序号 -->
          <span class="shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium">
            {{ index + 1 }}
          </span>
          <!-- 选项内容 -->
          <UInput v-model="element.text" :placeholder="$t('question.optionPlaceholder')" size="sm" class="flex-1" />
          <!-- 删除 -->
          <UButton variant="ghost" size="2xs" color="red" icon="i-heroicons-x-mark" class="shrink-0" @click="removeItem(index)" />
        </div>
      </template>
    </draggable>

    <div v-if="!dragItems.length" class="text-xs text-gray-400 py-2 text-center">
      {{ $t('question.noOptions') }}
    </div>
  </div>
</template>

<script setup>
import draggable from 'vuedraggable'

const props = defineProps({
  form: { type: Object, required: true },
})

// 使用带稳定 id 的对象数组驱动 vuedraggable，同步到 form.options（字符串数组）
const dragItems = ref([])

function initItems() {
  const opts = props.form.options
  if (Array.isArray(opts) && opts.length) {
    dragItems.value = opts.map((text, i) => ({ id: i, text: typeof text === 'string' ? text : String(text) }))
  } else {
    dragItems.value = [
      { id: 0, text: '' },
      { id: 1, text: '' },
      { id: 2, text: '' },
    ]
  }
}
initItems()

// dragItems 变化时同步到 form.options 和 form.answer
watch(dragItems, (items) => {
  props.form.options = items.map(item => item.text)
  props.form.answer = items.map((_, i) => i)
}, { deep: true })

function addItem() {
  const newId = dragItems.value.length ? Math.max(...dragItems.value.map(i => i.id)) + 1 : 0
  dragItems.value.push({ id: newId, text: '' })
}

function removeItem(idx) {
  dragItems.value.splice(idx, 1)
}
</script>
