<template>
    <div class="space-y-2">
        <!-- Rich Text Editor（replyDisablePaste） -->
        <richEditor v-model="content" :placeholder="placeholder" :pasteable="false" />
        <!-- Submit Button -->
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
    if (typeof content.value === 'object') return true
    return false
})

^function submit() {
    if (!hasContent.value) return
    emit('submit', { content: content.value, parentCid: props.parentCid })
    content.value = ''
}
</script>
