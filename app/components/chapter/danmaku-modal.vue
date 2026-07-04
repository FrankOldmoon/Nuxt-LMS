<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-4">
        <h3 class="text-base font-semibold mb-3">{{ $t('chapter.danmaku') }}</h3>
        <div class="flex gap-2">
          <UInput
            v-model="danmakuText"
            :placeholder="$t('chapter.danmakuPlaceholder')"
            maxlength="200"
            class="flex-1"
            @keyup.enter="sendDanmaku"
          />
          <UButton :label="$t('chapter.danmakuSend')" color="primary" size="sm" :disabled="!danmakuText.trim()" @click="sendDanmaku" />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{ classId: number }>()
const open = defineModel<boolean>('open', { default: false })

const { user } = useAuth()
const { sendDanmaku: wsSendDanmaku } = useWebSocket()
const danmakuText = ref('')

function sendDanmaku() {
  const text = danmakuText.value.trim()
  if (!text || !props.classId) return
  wsSendDanmaku(props.classId, text, user.value?.name || 'anonymous')
  danmakuText.value = ''
  open.value = false
}
</script>
