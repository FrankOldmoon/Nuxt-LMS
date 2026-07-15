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

// UStepper items：title useinstepTitle，description storeRich TextContent
// Pass #description slotRender ueditorRender，eachitemsstepDescriptionStartEndVisible
// noassume icon → DefaultShow 1234 NumberIcon
const stepperItems = computed(() => {
    const steps = config.value.steps || []
    return steps.map((s) => ({
        title: s.title || '',
        description: s.description || '',
    }))
})
</script>
