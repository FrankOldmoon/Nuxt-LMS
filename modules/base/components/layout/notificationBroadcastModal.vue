<template>
    <UModal v-model:open="open" :ui="{ content: 'sm:max-w-2xl' }">
        <template #body>
            <div class="p-6 space-y-4">
                <h3 class="text-lg font-semibold">{{ $t('notification.broadcastTitle') }}</h3>

                <UFormField :label="$t('notification.titleLabel')">
                    <UInput v-model="title" :placeholder="$t('notification.titleLabel')" />
                </UFormField>

                <UFormField :label="$t('notification.contentLabel')">
                    <richEditor v-model="content" />
                </UFormField>

                <div class="flex justify-end gap-2">
                    <UButton variant="ghost" @click="open = false">{{ $t('common.cancel') }}</UButton>
                    <UButton color="primary" :disabled="!title.trim()" :loading="sending" @click="send">
                        {{ $t('notification.send') }}
                    </UButton>
                </div>
            </div>
        </template>
    </UModal>
</template>

<script setup>
const emit = defineEmits(['sent'])

const open = defineModel('open', { type: Boolean, default: false })

const { t } = useI18n()
const toast = useToast()

const title = ref('')
const content = ref({})
const sending = ref(false)

watch(open, (val) => {
    if (!val) return
    title.value = ''
    content.value = {}
})

async function send() {
    if (!title.value.trim()) return
    sending.value = true
    try {
        await cRequest('/api/notifications/broadcast', {
            method: 'POST',
            body: { title: title.value.trim(), content: content.value },
        })
        toast.add({ title: t('notification.sent'), color: 'success' })
        open.value = false
        emit('sent')
    } catch (e) {
        toast.add({ title: e?.message || 'error', color: 'error' })
    } finally {
        sending.value = false
    }
}
</script>