<template>
    <div>
        <!-- 模式切换：HTML 代码 / URL 地址 -->
        <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.htmlModeLabel') }}</label>
        <URadioGroup v-model="mode" :items="modeOptions" value-key="value" label-key="label"
            orientation="horizontal" size="sm" class="mb-3" />

        <!-- HTML 代码模式 -->
        <template v-if="mode === 'html'">
            <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.htmlCodeLabel') }}</label>
            <Monaco v-model="form.content" language="html"/>
            <!-- 实时预览 -->
            <div v-if="form.content" class="mt-3">
                <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.htmlPreview') }}</label>
                <div class="border border-neutral-900 dark:border-neutral-900 rounded overflow-hidden">
                    <iframe :srcdoc="form.content" sandbox="allow-scripts" class="w-full"
                        style="min-height: 200px; border: 0;" />
                </div>
            </div>
            <p class="text-xs text-gray-400 mt-2">{{ $t('question.htmlHint') }}</p>
        </template>

        <!-- URL 模式 -->
        <template v-else>
            <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.htmlUrlLabel') }}</label>
            <UInput v-model="url" type="text" :placeholder="$t('question.htmlUrlPlaceholder')" class="w-full" />
            <!-- 实时预览 -->
            <div v-if="url" class="mt-3">
                <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.htmlPreview') }}</label>
                <div class="border border-neutral-900 dark:border-neutral-900 rounded overflow-hidden">
                    <iframe :src="url" sandbox="allow-scripts allow-same-origin" class="w-full"
                        style="min-height: 200px; border: 0;" />
                </div>
            </div>
        </template>
    </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    form: { type: Object, required: true },
})

// HTML 题型：content 存储原始 HTML 字符串；extra 存储 { mode: 'html'|'url', url?: string }
// answer 占位 [1]，实际 correct_rate 由 iframe postMessage 传入
if (!Array.isArray(props.form.answer) || !props.form.answer.length) {
    props.form.answer = [1]
}
if (typeof props.form.content !== 'string') {
    props.form.content = ''
}
if (!props.form.extra || typeof props.form.extra !== 'object' || Array.isArray(props.form.extra)) {
    props.form.extra = {}
}
if (!props.form.extra.mode) {
    props.form.extra.mode = 'html'
}

const { t } = useI18n()

const modeOptions = computed(() => [
    { value: 'html', label: t('question.htmlModeHtml') },
    { value: 'url', label: t('question.htmlModeUrl') },
])

const mode = computed({
    get: () => (props.form.extra.mode === 'url' ? 'url' : 'html'),
    set: (v) => { props.form.extra.mode = v },
})

const url = computed({
    get: () => props.form.extra.url || '',
    set: (v) => { props.form.extra.url = v },
})
</script>