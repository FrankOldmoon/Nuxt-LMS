<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-4">
        <h3 class="text-base font-semibold mb-3">{{ $t('chapter.danmaku') }}</h3>

        <!-- Teacher：Danmakuon/off -->
        <div v-if="canEdit" class="flex items-center justify-between mb-3 pb-3 border-b border-default">
          <div>
            <p class="text-sm font-medium">{{ $t('chapter.danmakuToggle') }}</p>
            <p class="text-xs text-muted">{{ $t('chapter.danmakuToggleHint') }}</p>
          </div>
          <USwitch v-model="danmakuEnabled" @update:model-value="toggleDanmaku" />
        </div>

        <!-- Send danmaku -->
        <div v-if="canEdit || danmakuEnabled" class="flex gap-2">
          <UInput
            v-model="danmakuText"
            :placeholder="$t('chapter.danmakuPlaceholder')"
            maxlength="200"
            class="flex-1"
            @keyup.enter="sendDanmaku"
          />
          <UButton :label="$t('chapter.danmakuSend')" color="primary" size="sm" :disabled="!danmakuText.trim()" @click="sendDanmaku" />
        </div>
        <p v-else class="text-sm text-muted">{{ $t('chapter.danmakuDisabled') }}</p>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{ classId: number; canEdit: boolean }>()
const open = defineModel<boolean>('open', { default: false })

const { user } = useAuth()
const { sendDanmaku: wsSendDanmaku } = useWebSocket()
const { showDanmaku } = useLayoutState()
const danmakuText = ref('')

const danmakuEnabled = computed({
  get: () => showDanmaku.value,
  set: (v: boolean) => { showDanmaku.value = v },
})

function toggleDanmaku(val: boolean) {
  showDanmaku.value = val
}

function sendDanmaku() {
  const text = danmakuText.value.trim()
  if (!text || !props.classId) return
  wsSendDanmaku(props.classId, text, user.value?.name || 'anonymous')
  danmakuText.value = ''
  open.value = false
}
</script>
