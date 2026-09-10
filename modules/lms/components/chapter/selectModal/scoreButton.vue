<template>
  <UPopover :modal="true">
    <UButton
      :icon="delta > 0 ? 'i-lucide-plus' : 'i-lucide-minus'"
      :color="delta > 0 ? 'success' : 'error'"
      variant="soft"
      size="sm"
      :label="String(Math.abs(delta))"
    />
    <template #content="{ close }">
      <div class="p-3 space-y-2 w-40">
        <p class="text-sm text-muted">{{ t('chapter.scoreConfirm', { delta: deltaStr, n: selectedCount }) }}</p>
        <div class="flex justify-end gap-2">
          <UButton size="xs" variant="ghost" @click="onCancel(close)">{{ t('common.cancel') }}</UButton>
          <UButton size="xs" :color="delta > 0 ? 'success' : 'error'" :loading="saving" @click="onConfirm(close)">{{ t('common.save') }}</UButton>
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
const props = defineProps<{
  delta: number
  selectedCount: number
  saving: boolean
}>()
const emit = defineEmits<{ confirm: [delta: number]; cancel: [] }>()
const { t } = useI18n()
const deltaStr = computed(() => (props.delta > 0 ? '+' : '-') + Math.abs(props.delta))
function onConfirm(close?: () => void) { close?.(); emit('confirm', props.delta) }
function onCancel(close?: () => void) { close?.(); emit('cancel') }
</script>
