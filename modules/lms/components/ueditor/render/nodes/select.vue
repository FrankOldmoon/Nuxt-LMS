<template>
    <ClientOnly>
        <div ref="rootEl" :class="wrapClass" class="relative inline-block mx-1 align-middle">
            <UDropdownMenu v-model:open="open" :items="menuItems" :content="{ side: 'bottom', align: 'start' }">
                <UButton
                    :label="displayLabel"
                    variant="soft"
                    color="neutral"
                    size="sm"
                    :class="buttonClass"
                    trailing-icon="i-lucide-chevron-down"
                />
            </UDropdownMenu>
        </div>
    </ClientOnly>
</template>

<script setup>
import { registerSelect } from '../../extensions/nodes/vue/question/render/selectStore'

const props = defineProps({
    node: Object,
})
const emit = defineEmits(['update'])

// 从 question 渲染上下文注入 questionData 与 questionId（都是 ref，需 .value 解包）
const questionData = inject('questionData', null)
const questionIdRef = inject('questionId', ref(0))
const options = computed(() => questionData?.value?.options || [])

const open = ref(false)
const value = ref('')
const markState = ref('')

const chosen = computed(() => value.value && value.value.trim() !== '')
const { t } = useI18n()
const displayLabel = computed(() => chosen.value ? value.value : (t('common.selectPlaceholder') || '请选择'))

const wrapClass = computed(() => {
    if (markState.value === 'correct') return '!ring-2 !ring-green-400/50 rounded-lg'
    if (markState.value === 'wrong') return '!ring-2 !ring-red-400/50 rounded-lg'
    return ''
})
// "已选"用中性高亮，不表示对错；对错颜色只由 mark 后的 wrapClass 决定（绿=对 / 红=错）
const buttonClass = computed(() => [
    'justify-between',
    'font-medium',
    'min-w-[176px]',
    'px-3',
    'rounded-lg',
    'border',
    'transition-colors',
    'cursor-pointer',
    chosen.value
        ? 'border-gray-400/80 dark:border-gray-500 bg-gray-100/70 dark:bg-gray-700/40 text-gray-800 dark:text-gray-100'
        : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-600',
].join(' '))

const menuItems = computed(() =>
    options.value.map(opt => ({
        label: opt,
        onSelect: () => pick(opt),
    })),
)

function pick(opt) {
    value.value = opt
    markState.value = ''
    open.value = false
    emit('update', value.value)
}

let unregister = null
onMounted(() => {
    unregister = registerSelect(Number(questionIdRef.value) || 0, {
        value,
        mark: (s) => { markState.value = s },
    })
})
onBeforeUnmount(() => {
    if (typeof unregister === 'function') unregister()
})
</script>