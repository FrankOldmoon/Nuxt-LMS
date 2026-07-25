<template>
  <UModal v-model:open="openModel" :ui="{ content: 'max-w-lg' }">
    <template #content>
      <div class="p-6 space-y-4">
        <h3 class="text-lg font-medium">{{ $t('navEditor.batchImport') }}</h3>
        <p class="text-sm text-muted whitespace-pre-line">{{ $t('navEditor.batchImportHint') }}</p>

        <!-- AI 生成 -->
        <div class="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div class="flex gap-2">
            <UInput
              v-model="promptModel"
              :placeholder="$t('navEditor.aiPromptPlaceholder')"
              size="sm"
              class="flex-1"
              :disabled="generating"
              @keydown.enter="$emit('generate')"
            />
            <UButton
              icon="i-lucide-sparkles"
              color="primary"
              variant="solid"
              size="sm"
              :loading="generating"
              :disabled="!promptModel.trim() || generating"
              @click="$emit('generate')"
            >
              {{ $t('navEditor.aiGenerate') }}
            </UButton>
          </div>
          <p v-if="generating" class="text-xs text-primary flex items-center gap-1">
            <UIcon name="i-lucide-loader-2" class="animate-spin size-3" />
            {{ $t('navEditor.aiGenerating') }}
          </p>
        </div>

        <UTextarea
          v-model="textModel"
          :placeholder="$t('navEditor.batchImportPlaceholder')"
          :rows="10"
          class="w-full font-mono text-sm"
        />
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="close">{{ $t('common.cancel') }}</UButton>
          <UButton color="primary" @click="$emit('confirm')">{{ $t('navEditor.batchImportConfirm') }}</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  text: string
  prompt: string
  generating: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:text': [value: string]
  'update:prompt': [value: string]
  generate: []
  confirm: []
}>()

const openModel = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

const textModel = computed({
  get: () => props.text,
  set: (val) => emit('update:text', val),
})

const promptModel = computed({
  get: () => props.prompt,
  set: (val) => emit('update:prompt', val),
})

function close() {
  emit('update:open', false)
}
</script>
