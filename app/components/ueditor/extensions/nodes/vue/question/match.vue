<template>
    <div>
        <div class="flex items-center justify-between mb-1">
            <label class="text-xs text-gray-500">{{ $t('question.matchPairsHint') }}</label>
            <UButton variant="ghost" size="2xs" icon="i-heroicons-plus" @click="addPair">{{ $t('question.matchAddPair')
                }}</UButton>
        </div>
        <p class="text-xs text-gray-400 mb-2">{{ $t('question.matchDragHint') }}</p>

        <div class="space-y-2">
            <div v-for="(pair, idx) in pairs" :key="idx"
                class="flex items-center gap-2 p-2 rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                <!-- 序号 -->
                <span
                    class="shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center font-medium">
                    {{ idx + 1 }}
                </span>
                <!-- 左侧项 -->
                <UInput v-model="pair.left" :placeholder="$t('question.matchLeftPlaceholder')" size="sm"
                    class="flex-1" />
                <!-- 连接图标 -->
                <UIcon name="i-heroicons-arrows-right-left" class="w-4 h-4 text-gray-400 shrink-0" />
                <!-- 右侧项 -->
                <UInput v-model="pair.right" :placeholder="$t('question.matchRightPlaceholder')" size="sm"
                    class="flex-1" />
                <!-- 删除 -->
                <UButton variant="ghost" size="2xs" color="red" icon="i-heroicons-x-mark" class="shrink-0"
                    @click="removePair(idx)" />
            </div>
        </div>

        <div v-if="!pairs.length" class="text-xs text-gray-400 py-2 text-center">
            {{ $t('question.matchEmpty') }}
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    form: { type: Object, required: true },
})

// pairs: [{ left: '左', right: '右' }]
const pairs = ref([])

function initPairs() {
    const opts = props.form.options
    if (Array.isArray(opts) && opts.length && typeof opts[0] === 'object' && 'left' in opts[0]) {
        pairs.value = opts.map(p => ({ left: p.left || '', right: p.right || '' }))
    } else {
        pairs.value = [
            { left: '', right: '' },
            { left: '', right: '' },
        ]
    }
}
initPairs()

// pairs 变化时同步到 form.options 和 form.answer
watch(pairs, (val) => {
    props.form.options = val.map(p => ({ left: p.left, right: p.right }))
    props.form.answer = val.map((_, i) => i)
}, { deep: true, immediate: true })

function addPair() {
    pairs.value.push({ left: '', right: '' })
}

function removePair(idx) {
    pairs.value.splice(idx, 1)
}
</script>
