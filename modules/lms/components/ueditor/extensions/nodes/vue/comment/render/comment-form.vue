<template>
    <div class="space-y-2">
        <!-- 富文本编辑器（回帖禁用粘贴） -->
        <richEditor v-model="content" :placeholder="placeholder" :pasteable="false" />
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

const hasContent = computed(() => {
    if (!content.value) return false
    if (typeof content.value === 'string') return content.value.trim().length > 0
    // UMO 文档：递归收集文本节点，无可见文本视为空（按钮禁用）
    if (typeof content.value === 'object') {
        let text = ''
        const collect = (n) => {
            if (!n) return
            if (typeof n === 'string') { text += n; return }
            if (Array.isArray(n)) { n.forEach(collect); return }
            if (typeof n === 'object') {
                if (typeof n.text === 'string') text += n.text
                if (Array.isArray(n.content)) n.content.forEach(collect)
            }
        }
        collect(content.value)
        return text.trim().length > 0
    }
    return false
})

function submit() {
    if (!hasContent.value) return
    emit('submit', { content: content.value, parentCid: props.parentCid })
    content.value = ''
}
</script>
