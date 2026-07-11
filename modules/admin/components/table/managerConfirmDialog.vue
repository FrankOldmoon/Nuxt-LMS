<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-4">
        <p class="text-sm mb-4">{{ text }}</p>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" :label="t('admin.form.cancel')" @click="open = false; emit('cancel')" />
          <UButton :color="color" :label="t('admin.form.save')" :loading="loading" @click="emit('confirm')" />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
type UiColor = 'success' | 'error' | 'neutral' | 'primary' | 'secondary' | 'info' | 'warning'
const open = defineModel<boolean>('open', { default: false })
defineProps<{ text: string; color: UiColor; loading: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const { t } = useI18n()
</script>
