<template>
    <ClientOnly>
        <select v-model="content" class="mx-1 inline-block px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-gray-50 dark:bg-gray-800 w-32"
            @change="onChange">
            <option value="" disabled>{{ $t('common.selectPlaceholder') }}</option>
            <option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option>
        </select>
    </ClientOnly>
</template>

<script setup>
const props = defineProps({
    node: Object,
})
const emit = defineEmits(['update'])

// 从 question 渲染上下文注入 questionData，获取 options
const questionData = inject('questionData', null)
const options = computed(() => questionData?.value?.options || [])

const content = ref('')

function onChange() {
    emit('update', content.value)
}
</script>
