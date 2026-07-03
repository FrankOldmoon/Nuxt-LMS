<template>
    <UTooltip :text="tooltip">
        <div
            class="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border cursor-pointer hover:scale-125 transition-transform"
            :class="dotClass"
            @click.stop="$emit('click', props)">
            <UIcon v-if="icon" :name="icon" class="size-2.5" />
        </div>
    </UTooltip>
</template>

<script setup>
const props = defineProps({
    type: { type: String, default: '' },  // question | homework | comment
    status: { type: String, default: 'todo' }, // done | partial | todo
    id: { type: Number, default: 0 },
})

defineEmits(['click'])

const { t } = useI18n()

// 类型图标
const iconMap = {
    question: 'i-lucide-help-circle',
    homework: 'i-lucide-file-text',
    comment: 'i-lucide-message-circle',
}
const icon = computed(() => iconMap[props.type] || '')
// 类型名称
const typeName = computed(() =>
    props.type === 'question' ? t('coursePanel.question') :
    props.type === 'homework' ? t('coursePanel.homework') :
    t('coursePanel.comment')
)

// 状态颜色
const dotClass = computed(() => {
    switch (props.status) {
        case 'done':
            return 'bg-green-500 text-white border-green-500'
        case 'partial':
            return 'bg-yellow-400 text-white border-yellow-400'
        default:
            return 'bg-gray-200 text-gray-400 border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-500'
    }
})

// tooltip 文本
const statusText = computed(() => {
    switch (props.status) {
        case 'done': return t('coursePanel.done')
        case 'partial': return t('coursePanel.partial')
        default: return t('coursePanel.todo')
    }
})
const tooltip = computed(() => `${typeName.value} — ${statusText.value}`)
</script>
