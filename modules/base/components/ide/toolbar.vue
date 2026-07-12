<template>
  <div class="ide-toolbar">
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-terminal" class="text-gray-500" />
      <span class="text-sm font-medium">{{ t('ide.title') }}</span>
      <UBadge v-if="runnerReady" color="success" size="sm">{{ t('ide.ready') }}</UBadge>
      <UBadge v-else color="warning" size="sm">{{ loadingLabel || t('ide.loading') }}</UBadge>
    </div>
    <div class="flex items-center gap-2">
      <USelect v-model="lang" :items="langItems" size="xs" class="w-36" />
      <UButton
        icon="i-lucide-play"
        color="primary"
        size="xs"
        :loading="running"
        :disabled="!runnerReady || running"
        @click="$emit('run')"
      >
        {{ t('ide.run') }}
      </UButton>
      <UButton
        icon="i-lucide-eraser"
        color="neutral"
        variant="ghost"
        size="xs"
        @click="$emit('clear')"
      >
        {{ t('ide.clear') }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const lang = defineModel<string>('lang', { required: true })

defineProps<{
  langItems: { label: string; value: string }[]
  runnerReady: boolean
  running: boolean
  loadingLabel?: string
}>()

defineEmits<{
  run: []
  clear: []
}>()
</script>

<style scoped>
.ide-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: #252526;
  border-bottom: 1px solid #3c3c3c;
  flex-shrink: 0;
}
</style>
