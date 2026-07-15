<template>
    <div>
        <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.htmlCodeLabel') }}</label>
        <Monaco v-model="form.content" language="html"/>
        <!-- real-time preview -->
        <div v-if="form.content" class="mt-3">
            <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.htmlPreview') }}</label>
            <div class="border border-gray-200 dark:border-gray-600 rounded overflow-hidden">
                <iframe :srcdoc="form.content" sandbox="allow-scripts" class="w-full"
                    style="min-height: 200px; border: 0;" />
            </div>
        </div>

        <p class="text-xs text-gray-400 mt-2">{{ $t('question.htmlHint') }}</p>
    </div>
</template>

<script setup>
const props = defineProps({
    form: { type: Object, required: true },
})

// HTML question type：content store originalStart HTML charactersstring
// answer placeholder [1]，actual correct_rate by iframe postMessage pass in
if (!Array.isArray(props.form.answer) || !props.form.answer.length) {
    props.form.answer = [1]
}
if (typeof props.form.content !== 'string') {
    props.form.content = ''
}
</script>
