<template>
    <div class="stepper-render-container border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 p-3 my-3">
        <UStepper :items="stepperItems" :orientation="orientation" class="w-full">
            <template #description="{ item }">
                <ueditorRender :json="item.description" />
            </template>
        </UStepper>
    </div>
</template>

<script setup>
const props = defineProps({
    node: Object,
})

const config = computed(() => {
    try {
        const raw = props.node?.attrs?.content
        if (raw) return JSON.parse(raw)
    } catch (_) { /* noop */ }
    return {}
})

const orientation = computed(() => config.value.orientation || 'horizontal')

// UStepper items：title 用于步骤标题，description 存放富文本内容
// 通过 #description 插槽渲染 ueditorRender，每个步骤的描述始终可见
// 不设 icon → 默认显示 1234 数字图标
const stepperItems = computed(() => {
    const steps = config.value.steps || []
    return steps.map((s) => ({
        title: s.title || '',
        description: s.description || '',
    }))
})
</script>
