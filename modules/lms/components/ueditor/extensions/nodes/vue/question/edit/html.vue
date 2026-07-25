<template>
    <div>
        <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.htmlCodeLabel') }}</label>
        <Monaco v-model="form.content" language="html"/>
        <!-- 实时预览 -->
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

// HTML 题型：content 存储原始 HTML 字符串
// answer 占位 [1]，实际 correct_rate 由 iframe postMessage 传入
if (!Array.isArray(props.form.answer) || !props.form.answer.length) {
    props.form.answer = [1]
}
if (typeof props.form.content !== 'string') {
    props.form.content = ''
}
</script>
