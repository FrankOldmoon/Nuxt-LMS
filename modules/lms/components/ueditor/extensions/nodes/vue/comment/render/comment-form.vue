<template>
    <div class="space-y-2">
        <!-- 纯文本框（回帖禁止复制/粘贴/剪切/拖放） -->
        <textarea v-model="content" :rows="3" :placeholder="placeholder"
            class="w-full p-3 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors resize-y"
            @paste.prevent @copy.prevent @cut.prevent @drop.prevent />
        <!-- 提交按钮 -->
        <div class="flex justify-end">
            <UButton size="sm" color="primary" variant="soft" :disabled="!hasContent"
                @click="submit">
                {{ $t('comment.reply') }}
            </UButton>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    parentCid: { type: Number, default: 0 },
    placeholder: { type: String, default: '' },
})

const emit = defineEmits(['submit'])

const content = ref('')

const hasContent = computed(() => !!content.value?.trim())

function submit() {
    if (!hasContent.value) return
    emit('submit', { content: content.value, parentCid: props.parentCid })
    content.value = ''
}
</script>
