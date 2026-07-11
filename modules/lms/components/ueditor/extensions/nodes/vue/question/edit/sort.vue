<template>
    <div>
        <div class="flex items-center justify-between mb-1">
            <label class="text-xs text-gray-500">{{ $t('question.sortItemsHint') }}</label>
            <UButton variant="ghost" size="2xs" icon="i-heroicons-plus" @click="addItem">{{ $t('question.addOption') }}
            </UButton>
        </div>
        <p class="text-xs text-gray-400 mb-2">{{ $t('question.sortDragHint') }}</p>

        <draggable v-model="dragItems" item-key="id" handle=".drag-handle" animation="200" class="space-y-2"
            @change="syncToForm">
            <template #item="{ element, index }">
                <div
                    class="flex items-center gap-2 p-2 rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                    <!-- 拖拽手柄 -->
                    <span
                        class="drag-handle cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0">
                        <UIcon name="i-heroicons-bars-3" class="w-4 h-4" />
                    </span>
                    <!-- 序号 -->
                    <span
                        class="shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium">
                        {{ index + 1 }}
                    </span>
                    <!-- 选项内容 -->
                    <UInput v-model="element.text" :placeholder="$t('question.optionPlaceholder')" size="sm"
                        class="flex-1" @change="syncToForm" />
                    <!-- 删除 -->
                    <UButton variant="ghost" size="2xs" color="red" icon="i-heroicons-x-mark" class="shrink-0"
                        @click="removeItem(index)" />
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

// 使用带稳定 id 的对象数组驱动 vuedraggable
const dragItems = ref([])

// form.options → dragItems（初始化 + 响应外部变更，如 AI 生成）
watch(() => props.form.options, (opts) => {
    let val
    if (Array.isArray(opts) && opts.length) {
        val = opts.map((text, i) => ({ id: i, text: typeof text === 'string' ? text : String(text) }))
    } else {
        val = [
            { id: 0, text: '' },
            { id: 1, text: '' },
            { id: 2, text: '' },
        ]
    }
    // 比较 text 值，相同时跳过（保留用户拖拽产生的 id 顺序）
    if (JSON.stringify(val.map(i => i.text)) !== JSON.stringify(dragItems.value.map(i => i.text))) {
        dragItems.value = val
    }
}, { immediate: true })

/** 将 dragItems 同步到 form.options 和 form.answer，仅在用户操作时调用 */
function syncToForm() {
    props.form.options = dragItems.value.map(item => item.text)
    props.form.answer = dragItems.value.map((_, i) => i)
}

function addItem() {
    const newId = dragItems.value.length ? Math.max(...dragItems.value.map(i => i.id)) + 1 : 0
    dragItems.value.push({ id: newId, text: '' })
    syncToForm()
}

function removeItem(idx) {
    dragItems.value.splice(idx, 1)
    syncToForm()
}
</script>
